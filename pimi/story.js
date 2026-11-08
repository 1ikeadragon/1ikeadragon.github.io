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

// These are local illustrative scenes, not live agents or a connected account.
// Each timeline runs once on entry. Replay is explicit; offscreen work is stopped.
const features = [...document.querySelectorAll('[data-scene]')];
const timelines = new Map(features.map(feature => [feature, new Set()]));
const task = document.querySelector('.animated-task');
const runningLane = document.querySelector('.running-lane');
const reviewLane = document.querySelector('.review-lane');
let taskAnimation;

function stopTimeline(feature) {
  for (const timer of timelines.get(feature)) clearTimeout(timer);
  timelines.get(feature).clear();
}
function later(feature, delay, callback) {
  const timer = setTimeout(() => {
    timelines.get(feature).delete(timer);
    callback();
  }, delay);
  timelines.get(feature).add(timer);
}
function moveTask(ready, animate = false) {
  taskAnimation?.cancel();
  const before = task.getBoundingClientRect();
  (ready ? reviewLane : runningLane).append(task);
  task.querySelector('.task-state').textContent = ready ? 'Ready for review' : 'Agents working';
  if (animate && !motion.matches) {
    const after = task.getBoundingClientRect();
    taskAnimation = task.animate([
      { transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` },
      { transform: 'translate(0, 0)' },
    ], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
}
const tourStops = [
  { title: 'Keep the context', text: 'Include the tenant and provider in the cache key.' },
  { title: 'Compare the lifetime', text: 'Check when shared data expires before reusing it.' },
];
let tourIndex = 0;
function showTour(index) {
  tourIndex = index;
  document.querySelector('.tour-count').textContent = `${index + 1} / ${tourStops.length}`;
  document.querySelector('.tour-title').textContent = tourStops[index].title;
  document.querySelector('.tour-description').textContent = tourStops[index].text;
  document.querySelectorAll('[data-stop]').forEach(line => line.classList.toggle('current', Number(line.dataset.stop) === index));
}
const memoryNotes = [
  { kind: 'Architecture', title: 'Provider cache decision', text: 'Keep cache keys scoped to the tenant and provider.', detail: 'Compare each approach in its own worktree before choosing one.' },
  { kind: 'Code review', title: 'Review conventions', text: 'Show the change and the trade-off together.', detail: 'Leave a clear question when a decision needs a human.' },
  { kind: 'Workflow', title: 'Agent handoffs', text: 'Carry the branch, findings, and open questions forward.', detail: 'The next agent should know where to pick up.' },
];
let memoryIndex = 0;
function showMemory(index) {
  memoryIndex = index;
  const note = document.querySelector('.memory-note');
  const data = memoryNotes[index];
  note.querySelector('small').textContent = data.kind;
  note.querySelector('h3').textContent = data.title;
  note.querySelector('p').textContent = data.text;
  note.querySelector('p.small-muted').textContent = data.detail;
  document.querySelectorAll('.memory-list span').forEach((item, i) => item.classList.toggle('selected', i === index));
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
const voiceText = document.querySelector('.voice-transcript').textContent;

function finishScene(feature) {
  stopTimeline(feature);
  feature.dataset.phase = 'done';
  if (feature.dataset.scene === 'agents') {
    feature.querySelectorAll('.agent-status span').forEach(status => { status.textContent = 'Ready for review'; });
  } else if (feature.dataset.scene === 'tasks') moveTask(true, true);
  else if (feature.dataset.scene === 'voice') {
    feature.querySelector('.voice-transcript').textContent = voiceText;
    feature.querySelector('.voice-state').textContent = 'Inserted';
  }
}
function startScene(feature) {
  stopTimeline(feature);
  feature.dataset.phase = 'start';
  if (motion.matches) { finishScene(feature); return; }
  const kind = feature.dataset.scene;
  if (kind === 'agents') {
    feature.querySelectorAll('.agent-status span').forEach(status => { status.textContent = 'Working'; });
    later(feature, 1200, () => { feature.dataset.phase = 'working'; });
    later(feature, 4200, () => finishScene(feature));
  } else if (kind === 'tasks') {
    moveTask(false);
    later(feature, 600, () => { feature.dataset.phase = 'working'; });
    later(feature, 3200, () => finishScene(feature));
  } else if (kind === 'review') {
    showTour(0);
    later(feature, 2800, () => { showTour(1); finishScene(feature); });
  } else if (kind === 'memory') {
    showMemory(0);
    later(feature, 3000, () => { showMemory(1); finishScene(feature); });
  } else if (kind === 'voice') {
    const transcript = feature.querySelector('.voice-transcript');
    transcript.textContent = '';
    feature.querySelector('.voice-state').textContent = 'Listening';
    later(feature, 700, () => {
      feature.dataset.phase = 'working';
      let character = 0;
      function typeNext() {
        character += 1;
        transcript.textContent = voiceText.slice(0, character);
        if (character < voiceText.length) later(feature, 38, typeNext);
        else later(feature, 500, () => finishScene(feature));
      }
      typeNext();
    });
  }
}

for (const feature of features) {
  feature.querySelectorAll('button[hidden]').forEach(button => { button.hidden = false; });
  feature.querySelector('[data-replay]')?.addEventListener('click', () => startScene(feature));
}
document.querySelector('#tour-next').addEventListener('click', () => {
  const feature = document.querySelector('#review');
  stopTimeline(feature);
  showTour((tourIndex + 1) % tourStops.length);
  feature.dataset.phase = 'done';
});
document.querySelector('#memory-next').addEventListener('click', () => {
  const feature = document.querySelector('#memory');
  stopTimeline(feature);
  showMemory((memoryIndex + 1) % memoryNotes.length);
  feature.dataset.phase = 'done';
});
showTour(0);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { target: feature, isIntersecting } of entries) {
      feature.toggleAttribute('data-active', isIntersecting && !document.hidden);
      if (isIntersecting) {
        feature.setAttribute('data-seen', '');
        if (feature.dataset.phase !== 'done' && !document.hidden) startScene(feature);
      } else {
        stopTimeline(feature);
      }
    }
  }, { threshold: .25 });
  features.forEach(feature => { feature.setAttribute('data-ready', ''); observer.observe(feature); });
} else {
  // Static, complete scenes preserve all content on older browsers.
  features.forEach(finishScene);
}
function settleMotion() {
  if (motion.matches) features.forEach(finishScene);
}
motion.addEventListener('change', settleMotion);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    features.forEach(feature => {
      feature.removeAttribute('data-active');
      stopTimeline(feature);
    });
  } else {
    for (const feature of features) {
      const bounds = feature.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < innerHeight) {
        feature.setAttribute('data-active', '');
        if (feature.dataset.phase !== 'done') startScene(feature);
      }
    }
  }
});

// Video remains user-controlled, with native playback, seeking, and fullscreen.
// Avoid autoplay motion, unexpected downloads, or resuming after a manual pause.
const video = document.querySelector('#overview-video');
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
