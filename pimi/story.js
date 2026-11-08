const root = document.documentElement;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeColor.content = theme === 'dark' ? '#18161e' : '#f8f5f2';
}
try {
  setTheme(localStorage.getItem('pimi-site-theme') === 'dark' ? 'dark' : 'light');
} catch {
  // Storage is optional. The theme control still works for this visit.
  setTheme('light');
}
themeToggle.hidden = false;
let themeTransition;
themeToggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  themeTransition?.skipTransition();
  if (!motion.matches && document.startViewTransition) {
    themeTransition = document.startViewTransition(() => setTheme(theme));
  } else setTheme(theme);
  try { localStorage.setItem('pimi-site-theme', theme); } catch {
    // Private browsing may deny storage; no persistence is required.
  }
});

const pet = document.querySelector('.pet');
let petTimer;
pet.addEventListener('click', () => {
  pet.setAttribute('data-petted', '');
  clearTimeout(petTimer);
  petTimer = setTimeout(() => pet.removeAttribute('data-petted'), 1200);
});

// The showcase uses sample work. Each visible scene runs independently.
const features = [...document.querySelectorAll('[data-scene]')];
const video = document.querySelector('#overview-video');
const motionToggle = document.querySelector('.motion-toggle');
const visible = new Set();
const timers = new Map();
const replayDelay = 2000;
let paused = false;

const task = document.querySelector('.animated-task');
const runningLane = document.querySelector('.running-lane');
const reviewLane = document.querySelector('.review-lane');
let taskAnimation;

function moveTask(ready, animate) {
  taskAnimation?.cancel();
  const before = animate ? task.getBoundingClientRect() : null;
  (ready ? reviewLane : runningLane).append(task);
  task.querySelector('.task-state').textContent = ready ? 'Ready for review' : 'Agents working';
  if (before) {
    const after = task.getBoundingClientRect();
    taskAnimation = task.animate([
      { transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` },
      { transform: 'translate(0, 0)' },
    ], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
}

const tourStops = [
  { title: 'Scope the cache key', text: 'Include both the tenant and the provider.' },
  { title: 'Check expiry', text: 'Reuse a shared entry while its data is fresh.' },
];
function showTour(index) {
  document.querySelector('.tour-count').textContent = `${index + 1} / ${tourStops.length}`;
  document.querySelector('.tour-title').textContent = tourStops[index].title;
  document.querySelector('.tour-description').textContent = tourStops[index].text;
  document.querySelectorAll('[data-stop]').forEach(line => line.classList.toggle('current', Number(line.dataset.stop) === index));
}

const memoryNotes = [
  { kind: 'Architecture', title: 'Provider cache decision', text: 'Scope every cache key to a tenant and a provider.', detail: 'Compare the two approaches in separate worktrees before choosing one.' },
  { kind: 'Code review', title: 'Review conventions', text: 'Explain the trade-off alongside the change.', detail: 'Flag anything that needs a human decision.' },
  { kind: 'Workflow', title: 'Agent handoffs', text: 'Share the branch, findings, and open questions.', detail: 'The next agent should know where to pick up.' },
];
function showMemory(index) {
  const note = document.querySelector('.memory-note');
  const data = memoryNotes[index];
  note.querySelector('small').textContent = data.kind;
  note.querySelector('h3').textContent = data.title;
  note.querySelector('p').textContent = data.text;
  note.querySelector('p.small-muted').textContent = data.detail;
  document.querySelectorAll('.memory-list span').forEach((item, i) => item.classList.toggle('selected', i === index));
}

function showAgentStates(finished) {
  document.querySelectorAll('.agent-status').forEach((status, index) => {
    const done = index < finished;
    status.toggleAttribute('data-finished', done);
    status.querySelector('span').textContent = done ? 'Finished' : 'Working';
  });
}

function showWorkState(ready, animate = false) {
  moveTask(ready, animate);
  document.querySelectorAll('.work-state').forEach(state => {
    state.textContent = ready ? 'Ready for review' : 'In progress';
  });
  document.querySelector('.task-work-items').hidden = ready;
  document.querySelector('.task-report').hidden = !ready;
  document.querySelectorAll('.report-panel .tabs span').forEach((tab, index) => {
    tab.classList.toggle('active', index === Number(ready));
  });
}

const trackedTask = document.querySelector('.personal-task');
const trackedDetail = document.querySelector('#tracked-task-detail');
const report = document.querySelector('.report-panel');
function showTrackedTask(open) {
  trackedDetail.hidden = !open;
  report.hidden = open;
  trackedTask.setAttribute('aria-expanded', String(open));
}
trackedTask.addEventListener('click', () => showTrackedTask(trackedDetail.hidden));
document.querySelector('#close-tracked').addEventListener('click', () => {
  showTrackedTask(false);
  trackedTask.focus({ preventScroll: true });
});
document.querySelector('#tracked-stage').addEventListener('change', event => {
  document.querySelectorAll('.task-lane')[Number(event.target.value)].append(trackedTask);
});

const voiceState = document.querySelector('.voice-state');
function showVoiceStatus(ready) {
  voiceState.textContent = ready ? 'Got it · Opening task draft' : 'Listening';
}

const scenes = {
  agents: [
    [1100, () => showAgentStates(0)],
    [1100, () => showAgentStates(2)],
    [replayDelay, () => showAgentStates(4)],
  ],
  tasks: [
    [2200, () => showWorkState(false)],
    [replayDelay, animate => showWorkState(true, animate)],
  ],
  review: [
    [2200, () => showTour(0)],
    [replayDelay, () => showTour(1)],
  ],
  memory: [
    [2200, () => showMemory(0)],
    [2200, () => showMemory(1)],
    [replayDelay, () => showMemory(2)],
  ],
  spaces: [[1400], [replayDelay]],
  voice: [
    [1700, () => showVoiceStatus(false)],
    [replayDelay, () => showVoiceStatus(true)],
  ],
  automations: [[900], [replayDelay]],
};

function renderScene(feature, index, animate) {
  const steps = scenes[feature.dataset.scene];
  const [delay, render] = steps[index];
  feature.dataset.phase = index === 0 ? 'start' : index === steps.length - 1 ? 'done' : 'working';
  render?.(animate);
  if (animate) {
    timers.set(feature, setTimeout(() => renderScene(feature, (index + 1) % steps.length, true), delay));
  }
}

function canAnimate(element) {
  return visible.has(element) && !document.hidden && !motion.matches && !paused;
}

function syncFeature(feature) {
  const active = canAnimate(feature);
  if (active === feature.hasAttribute('data-active')) {
    if (!active && (paused || motion.matches) && feature.dataset.phase !== 'done') {
      renderScene(feature, scenes[feature.dataset.scene].length - 1, false);
    }
    return;
  }
  feature.toggleAttribute('data-active', active);
  if (active) {
    renderScene(feature, 0, true);
  } else {
    clearTimeout(timers.get(feature));
    timers.delete(feature);
    if (paused || motion.matches) {
      renderScene(feature, scenes[feature.dataset.scene].length - 1, false);
    }
  }
}

function syncVideo() {
  if (canAnimate(video)) void video.play().catch(() => {});
  else video.pause();
}

function syncMotion() {
  motionToggle.hidden = motion.matches || !('IntersectionObserver' in window);
  features.forEach(syncFeature);
  syncVideo();
}

motionToggle.addEventListener('click', () => {
  paused = !paused;
  root.toggleAttribute('data-showcase-paused', paused);
  motionToggle.textContent = paused ? 'Resume motion' : 'Pause motion';
  syncMotion();
});
document.addEventListener('visibilitychange', syncMotion);
motion.addEventListener('change', syncMotion);

for (const feature of features) renderScene(feature, scenes[feature.dataset.scene].length - 1, false);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target;
      const inView = entry.intersectionRatio >= .25;
      if (inView) visible.add(element);
      else visible.delete(element);
      if (element === video) syncVideo();
      else {
        if (inView) element.setAttribute('data-seen', '');
        syncFeature(element);
      }
    }
  }, { threshold: .25 });
  observer.observe(video);
  features.forEach(feature => { feature.setAttribute('data-ready', ''); observer.observe(feature); });
}
syncMotion();
