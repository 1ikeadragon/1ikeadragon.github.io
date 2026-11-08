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
const taskMoveDuration = 1050;
const taskDetailStep = 5;
const taskMoveStep = 6;
const taskReviewStep = 7;

function currentTaskStep() {
  return task.dataset.stage === 'review' ? taskReviewStep : taskDetailStep;
}

function moveTask(ready, animate) {
  const destination = ready ? reviewLane : runningLane;
  if (task.parentElement === destination) return;
  const before = animate ? task.getBoundingClientRect() : null;
  taskAnimation?.cancel();
  destination.append(task);
  if (!before) return;
  const after = task.getBoundingClientRect();
  const offset = `translate(${before.x - after.x}px, ${before.y - after.y}px)`;
  taskAnimation = task.animate([
    { transform: offset },
    { transform: 'translate(0, 0)' },
  ], { duration: taskMoveDuration, easing: 'cubic-bezier(.32,.06,.22,1)' });
}

const tourStops = [
  { title: 'Redact before saving', text: 'The recorder writes the cleaned event to disk.' },
  { title: 'Replay recorded events', text: 'The timeline displays the trace without invoking tools again.' },
];
function showTour(index) {
  document.querySelector('.tour-count').textContent = `${index + 1} / ${tourStops.length}`;
  document.querySelector('.tour-title').textContent = tourStops[index].title;
  document.querySelector('.tour-description').textContent = tourStops[index].text;
  for (const target of document.querySelectorAll('[data-stop], [data-review-stop]')) {
    target.classList.toggle('current', Number(target.dataset.stop ?? target.dataset.reviewStop) === index);
  }
}

function showMemory(index) {
  document.querySelectorAll('[data-memory-step]').forEach(card => {
    card.classList.toggle('current', Number(card.dataset.memoryStep) === index);
  });
}

function showAgentStates(finished) {
  document.querySelectorAll('.agent-status:not([data-static-status])').forEach((status, index) => {
    const done = index < finished;
    status.toggleAttribute('data-finished', done);
    status.querySelector('span').textContent = done ? 'Finished' : 'Working';
  });
}

function showWorkState(ready) {
  moveTask(ready, false);
  taskAnimation?.cancel();
  task.dataset.stage = ready ? 'review' : 'working';
  task.querySelector('.task-state').textContent = ready ? 'Ready for review' : 'Agents working';
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
    if (Number(feature.dataset.step) === taskMoveStep) showWorkState(true);
    clearTimeout(timers.get(feature));
    timers.delete(feature);
  } else if (canAnimate(feature)) {
    renderScene(feature, currentTaskStep(), true);
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

// Load only these fixed URLs after their cards enter the viewport. YouTube
// uses the standard player URL so the visitor decides when to start it.
const embeds = {
  youtube: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  x: 'https://platform.twitter.com/embed/Tweet.html?id=2117279420377694564&dnt=true',
};
if ('IntersectionObserver' in window) {
  const embedObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      const frame = target.querySelector('iframe');
      if (target.dataset.embed === 'youtube') {
        target.querySelector('.video-art img').src = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
      }
      frame.addEventListener('load', () => target.classList.add('has-embed'), { once: true });
      frame.src = embeds[target.dataset.embed];
      frame.hidden = false;
      embedObserver.unobserve(target);
    }
  }, { threshold: .15 });
  document.querySelectorAll('[data-embed]').forEach(card => embedObserver.observe(card));
}

const papers = {
  exo: '2611.00463',
  'agentic-scientist': '2610.18933',
  'harness-squared': '2610.14224',
};
const reader = document.querySelector('.paper-reader');
if (typeof reader.showModal === 'function') {
  const frame = reader.querySelector('iframe');
  const title = reader.querySelector('#paper-reader-title');
  const source = reader.querySelector('.paper-reader-source');
  for (const preview of document.querySelectorAll('[data-paper]')) {
    preview.hidden = false;
    preview.addEventListener('click', () => {
      const id = papers[preview.dataset.paper];
      title.textContent = preview.closest('.paper-card').querySelector('.paper-title').textContent;
      source.href = `https://arxiv.org/abs/${id}`;
      frame.title = title.textContent;
      frame.src = `https://arxiv.org/html/${id}`;
      reader.showModal();
    });
  }
  reader.addEventListener('close', () => frame.removeAttribute('src'));
}

const spaceCopyButton = document.querySelector('.space-copy-button');
const spaceCopyToast = document.querySelector('.space-copy-toast');
let spaceCopyTimer;
spaceCopyButton.addEventListener('click', async () => {
  const label = spaceCopyToast.querySelector('span');
  try {
    await navigator.clipboard.writeText('space:72ff4360-95e7-47b0-aee0-aa6e013d9b0c');
    label.textContent = 'Card ID copied';
  } catch {
    label.textContent = 'Couldn’t copy card ID';
  }
  spaceCopyToast.setAttribute('data-visible', '');
  clearTimeout(spaceCopyTimer);
  spaceCopyTimer = setTimeout(() => {
    spaceCopyToast.removeAttribute('data-visible');
    label.textContent = 'Card ID copied';
  }, 1800);
});

const voiceState = document.querySelector('.voice-state');
function showVoiceStatus(ready) {
  voiceState.textContent = ready ? 'Got it · Opening task draft' : 'Listening';
}

const taskFeature = document.querySelector('#tasks');
const taskHandoff = taskFeature.querySelector('.task-handoff-label');
const taskTyped = taskFeature.querySelector('.task-typed-text');
const taskPrompt = [...taskFeature.querySelector('.task-prompt').textContent];
const keyDelays = [24, 38, 27, 46, 25];
let keyTime = 360;
const taskTypingTimes = taskPrompt.map((character, index) => {
  keyTime += '.,?!'.includes(character) ? 95 : character === ' ' ? 48 : keyDelays[index % keyDelays.length];
  return keyTime;
});
const taskTypingDuration = keyTime + 320;
let typingFrame;

function showTaskChat(beat) {
  taskFeature.dataset.taskView = 'chat';
  taskFeature.dataset.taskChatBeat = beat;
  taskHandoff.textContent = beat === 'created' ? 'Task created' : 'Creating task';
}

function typeTaskPrompt() {
  cancelAnimationFrame(typingFrame);
  showTaskChat('typing');
  taskTyped.textContent = '';
  const started = performance.now();
  let typed = 0;
  function typeFrame(now) {
    if (!canAnimate(taskFeature) || taskFeature.dataset.taskChatBeat !== 'typing') return;
    const previous = typed;
    while (typed < taskPrompt.length && taskTypingTimes[typed] <= now - started) typed++;
    if (typed > previous) taskTyped.textContent += taskPrompt.slice(previous, typed).join('');
    if (typed < taskPrompt.length) typingFrame = requestAnimationFrame(typeFrame);
  }
  typingFrame = requestAnimationFrame(typeFrame);
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

const usage = document.querySelector('#usage');
const usageTabs = [...usage.querySelectorAll('[data-usage-tab]')];
const recapPeriods = [...usage.querySelectorAll('[data-recap-period]')];
let usageInteracted = false;

function showUsage(view) {
  for (const tab of usageTabs) {
    const selected = tab.dataset.usageTab === view;
    tab.setAttribute('aria-pressed', String(selected));
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

function stopUsageTour() {
  usageInteracted = true;
  clearTimeout(timers.get(usage));
  timers.delete(usage);
  usage.removeAttribute('data-active');
  usage.setAttribute('data-seen', '');
}
usage.addEventListener('focusin', stopUsageTour);
usage.addEventListener('click', stopUsageTour);
for (const tab of usageTabs) {
  tab.addEventListener('click', () => showUsage(tab.dataset.usageTab));
}
const sessionButtons = [...usage.querySelectorAll('[data-usage-session]')];
for (const button of sessionButtons) {
  button.addEventListener('click', () => {
    for (const item of sessionButtons) {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    }
  });
}
for (const period of recapPeriods) {
  period.addEventListener('click', () => {
    for (const button of recapPeriods) {
      const selected = button === period;
      button.setAttribute('aria-pressed', String(selected));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    }
  });
}

const automationStatus = document.querySelector('.automation-run-state');
const automationSteps = [...document.querySelectorAll('.automation-steps li')];
const automationStates = ['Scheduled', 'Starting', 'Running', 'Running', 'Finished'];

function showAutomationRun(progress) {
  automationStatus.textContent = automationStates[progress];
  automationSteps.forEach((step, index) => {
    step.dataset.status = index < progress - 1 ? 'complete' : index === progress - 1 ? 'current' : 'pending';
  });
}

const scenes = {
  agents: [
    [1100, () => showAgentStates(0)],
    [1100, () => showAgentStates(2)],
    [replayDelay, () => showAgentStates(4)],
  ],
  tasks: [
    [taskTypingDuration, typeTaskPrompt],
    [750, () => showTaskChat('sent')],
    [1050, () => showTaskChat('creating')],
    [1200, () => { showTaskChat('created'); showWorkState(false); }],
    [1550, () => { taskFeature.dataset.taskView = 'board'; }],
    [1800, () => { taskFeature.dataset.taskView = 'detail'; }],
    [taskMoveDuration, animate => moveTask(true, animate)],
    [replayDelay, () => {
      taskFeature.dataset.taskView = 'detail';
      taskFeature.dataset.taskChatBeat = 'created';
      taskHandoff.textContent = 'Task created';
      showWorkState(true);
    }],
  ],
  review: [
    [2200, () => showTour(0)],
    [replayDelay, () => showTour(1)],
  ],
  memory: [
    [2400, () => showMemory(0)],
    [replayDelay, () => showMemory(1)],
  ],
  spaces: [[1400], [replayDelay]],
  voice: [
    [1700, () => showVoiceStatus(false)],
    [replayDelay, () => showVoiceStatus(true)],
  ],
  automations: [
    [1500, () => showAutomationRun(0)],
    [1300, () => showAutomationRun(1)],
    [1600, () => showAutomationRun(2)],
    [1200, () => showAutomationRun(3)],
    [replayDelay + 1000, () => showAutomationRun(4)],
  ],
  library: [[1700, () => showLibraryState(false)], [replayDelay, () => showLibraryState(true)]],
  usage: [
    [2600, () => showUsage('sessions')],
    [2400, () => showUsage('limits')],
    [replayDelay + 2000, () => showUsage('recap')],
  ],
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
  if (feature === usage && usageInteracted) return;
  const active = canAnimate(feature);
  if (active === feature.hasAttribute('data-active')) {
    if (!active && (paused || motion.matches) && feature.dataset.phase !== 'done') {
      renderScene(feature, scenes[feature.dataset.scene].length - 1, false);
    }
    return;
  }
  feature.toggleAttribute('data-active', active);
  if (active) {
    renderScene(feature, feature.dataset.scene === 'tasks' && !trackedDetail.hidden ? currentTaskStep() : 0, true);
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
