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
  { title: 'Redact before saving', text: 'The recorder writes the cleaned event to disk.' },
  { title: 'Replay recorded events', text: 'The timeline displays the trace without invoking tools again.' },
];
function showTour(index) {
  document.querySelector('.tour-count').textContent = `${index + 1} / ${tourStops.length}`;
  document.querySelector('.tour-title').textContent = tourStops[index].title;
  document.querySelector('.tour-description').textContent = tourStops[index].text;
  document.querySelectorAll('[data-stop]').forEach(line => line.classList.toggle('current', Number(line.dataset.stop) === index));
}

const memoryNotes = [
  { kind: 'Architecture', title: 'Redaction rules', text: 'Redact tokens and credential fields before writing an event.', detail: 'Keep the tool name and event order so a trace is still readable.' },
  { kind: 'Review', title: 'Replay checklist', text: 'Check that replay renders recorded results without calling tools.', detail: 'Test a trace with redacted credentials and repeated calls.' },
  { kind: 'Workflow', title: 'Capture handoff', text: 'The capture branch writes events in order.', detail: 'The replay branch consumes the redacted trace format.' },
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
  const feature = trackedTask.closest('[data-scene]');
  if (open) {
    clearTimeout(timers.get(feature));
    timers.delete(feature);
  } else if (canAnimate(feature)) {
    renderScene(feature, 2, true);
  }
}
trackedTask.addEventListener('click', () => showTrackedTask(trackedDetail.hidden));
document.querySelector('#close-tracked').addEventListener('click', () => {
  showTrackedTask(false);
  trackedTask.focus({ preventScroll: true });
});
document.querySelector('#tracked-stage').addEventListener('change', event => {
  document.querySelectorAll('.task-lane')[Number(event.target.value)].append(trackedTask);
});

// Explicit user interaction is required before any third-party media is loaded.
const embeds = {
  paper: 'https://arxiv.org/html/2210.03629',
  youtube: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  x: 'https://platform.twitter.com/embed/Tweet.html?id=2117279420377694564&dnt=true',
  reddit: 'embed/reddit.html',
};
const embedLabels = { paper: 'paper', youtube: 'video', x: 'post', reddit: 'post' };
for (const card of document.querySelectorAll('[data-embed]')) {
  const frame = card.querySelector('iframe');
  const label = card.querySelector('summary > .small-muted');
  const noun = embedLabels[card.dataset.embed];
  card.addEventListener('toggle', () => {
    frame.hidden = !card.open;
    if (card.open) frame.src = embeds[card.dataset.embed];
    else frame.removeAttribute('src');
    label.textContent = card.open ? `Hide ${noun}` : `Load ${noun}`;
  });
}

const voiceState = document.querySelector('.voice-state');
function showVoiceStatus(ready) {
  voiceState.textContent = ready ? 'Got it · Opening task draft' : 'Listening';
}

const taskHandoff = document.querySelector('.task-handoff-label');
function showTaskHandoff(created) {
  taskHandoff.textContent = created ? 'Task created' : 'Creating task';
}

const exampleSkill = document.querySelector('.sample-skill');
function showLibraryState(installed) {
  document.querySelector(installed ? '.installed-skills' : '.available-skills').append(exampleSkill);
  document.querySelector('.install-skills').textContent = installed ? 'Installed' : 'Install selected';
  document.querySelector('.install-hooks').textContent = installed ? 'Uninstall hooks' : 'Install hooks';
  document.querySelectorAll('.hook-state').forEach(state => {
    state.textContent = installed ? 'Installed' : 'Not installed';
  });
}

function showUsage(limits, animate) {
  document.querySelector('.usage-sessions').hidden = animate && limits;
  document.querySelector('.usage-limits').hidden = animate && !limits;
  document.querySelectorAll('.usage-tabs span').forEach((tab, index) => {
    tab.classList.toggle('active', index === Number(animate && limits));
  });
}

const scenes = {
  agents: [
    [1100, () => showAgentStates(0)],
    [1100, () => showAgentStates(2)],
    [replayDelay, () => showAgentStates(4)],
  ],
  tasks: [
    [1400, () => { showWorkState(false); showTaskHandoff(false); }],
    [1000, () => showTaskHandoff(true)],
    [2200],
    [replayDelay, animate => { showTaskHandoff(true); showWorkState(true, animate); }],
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
  library: [[1700, () => showLibraryState(false)], [replayDelay, () => showLibraryState(true)]],
  usage: [[2600, animate => showUsage(false, animate)], [replayDelay, animate => showUsage(true, animate)]],
};

function renderScene(feature, index, animate) {
  const steps = scenes[feature.dataset.scene];
  const [delay, render] = steps[index];
  feature.dataset.step = index;
  feature.dataset.phase = index === 0 ? 'start' : index === steps.length - 1 ? 'done' : 'working';
  render?.(animate);
  if (animate && (feature.dataset.scene !== 'tasks' || trackedDetail.hidden)) {
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
    renderScene(feature, feature.dataset.scene === 'tasks' && !trackedDetail.hidden ? 2 : 0, true);
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
