const root = document.documentElement;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');
const video = document.querySelector('#overview-video');
const overviewFrame = video.closest('.overview-frame');
const foldAt = Number(video.dataset.foldAt);
const phoneAt = Number(video.dataset.phoneAt);
const unfoldAt = Number(video.dataset.unfoldAt);
const overviewMedia = {
  light: { src: video.querySelector('source').getAttribute('src'), poster: video.getAttribute('poster') },
  dark: { src: video.dataset.darkSrc, poster: video.dataset.darkPoster },
};
let overviewTheme = 'light';
let seekAfterThemeChange = 0;
function syncOverviewFrame() {
  const time = seekAfterThemeChange || video.currentTime;
  const beforeLoop = !Number.isFinite(video.duration) || time < video.duration - .1;
  overviewFrame.toggleAttribute('data-handheld', time >= foldAt && beforeLoop);
  overviewFrame.toggleAttribute('data-phone', time >= phoneAt && time < unfoldAt);
}
video.addEventListener('timeupdate', syncOverviewFrame);
video.addEventListener('seeked', syncOverviewFrame);
video.addEventListener('loadedmetadata', () => {
  if (seekAfterThemeChange > 0 && Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = seekAfterThemeChange % video.duration;
  }
  seekAfterThemeChange = 0;
  syncOverviewFrame();
});

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeColor.content = theme === 'dark' ? '#21252b' : '#f8f5f2';
  if (overviewTheme !== theme) {
    seekAfterThemeChange = video.currentTime || seekAfterThemeChange;
    overviewTheme = theme;
    video.poster = overviewMedia[theme].poster;
    video.src = overviewMedia[theme].src;
    video.load();
  }
  const x = document.querySelector('[data-embed="x"] iframe[src]');
  if (x) {
    const source = new URL(x.src);
    if (source.searchParams.get('theme') !== theme) {
      source.searchParams.set('theme', theme);
      x.src = source.href;
    }
  }
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
  const apply = () => { setTheme(theme); syncVideo(); };
  if (!motion.matches && document.startViewTransition) {
    themeTransition = document.startViewTransition(apply);
  } else apply();
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
const visible = new Set();
const timers = new Map();
const replayDelay = 2000;

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

const review = document.querySelector('#review');
const reviewBeats = [
  [3400, 'capture-overview'],
  [3900, 'capture-changes'],
  [2700, 'capture-secrets'],
  [3400, 'replay-overview'],
  [3900, 'replay-changes'],
];
let reviewInteracted = false;
review.addEventListener('review-interaction', () => {
  reviewInteracted = true;
  clearTimeout(timers.get(review));
  timers.delete(review);
  review.removeAttribute('data-active');
});

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
      frame.src = target.dataset.embed === 'x'
        ? `${embeds.x}&theme=${root.dataset.theme}`
        : embeds.youtube;
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
const voiceExamples = [...document.querySelectorAll('[data-voice-example]')];
const voiceMessages = ['Listening', 'Got it · Opening task draft', 'Got it · Opening chat draft', 'Got it · Opening chat draft'];
function showVoiceExample(count) {
  voiceState.textContent = voiceMessages[count];
  voiceExamples.forEach((card, index) => card.toggleAttribute('data-waiting', index >= count));
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

const ide = document.querySelector('#ide');
const ideShell = ide.querySelector('.ide-shell');
const ideModes = [...ide.querySelectorAll('[data-ide-mode]')];
const ideSearch = ide.querySelector('#ide-search');
const ideSearchToggle = ide.querySelector('.ide-search-toggle');
let ideInteracted = false;
let ideSearchAnimation;

function showIdeSearch(open, animate = true) {
  const changed = ideSearch.hidden === open;
  ideSearch.hidden = !open;
  ideSearchToggle.setAttribute('aria-expanded', String(open));
  if (!changed) return;
  ideSearchAnimation?.cancel();
  if (open && animate && !document.hidden && !motion.matches) {
    ideSearchAnimation = ideSearch.animate([
      { opacity: .5, translate: '0 -5px' },
      { opacity: 1, translate: '0 0' },
    ], { duration: 240, easing: 'ease-out' });
  }
}

const ideFiles = {
  record: { path: 'record-event.ts', lines: [
    '<i>import</i> { redactCredentials } <i>from</i> "./secrets";',
    '<i>import type</i> { ToolEvent, TraceSink } <i>from</i> "./types";',
    '',
    '<i>export async function</i> <b>recordEvent</b>(',
    '  event: ToolEvent,',
    '  sink: TraceSink,',
    ') {',
    '  <i>const</i> safe = <b>redactCredentials</b>(event);',
    '  <i>const</i> line = JSON.stringify(safe);',
    '',
    '  <i>await</i> sink.write(line + "\\n");',
    '}',
  ] },
  playback: { path: 'playback.ts', lines: [
    '<i>import type</i> { ToolEvent } <i>from</i> "./types";', '',
    '<i>export function</i> <b>replay</b>(events: ToolEvent[], timeline) {',
    '  <i>for</i> (<i>const</i> event <i>of</i> events) {',
    '    timeline.append(event);', '  }', '}', '',
    '// Read the recording. Never invoke tools here.',
  ] },
  types: { path: 'types.ts', lines: [
    '<i>export type</i> ToolEvent = {',
    '  tool_name: string;', '  event_order: number;',
    '  payload: Record&lt;string, unknown&gt;;', '};', '',
    '<i>export type</i> TraceSink = {',
    '  write(line: string): Promise&lt;void&gt;;', '};',
  ] },
};
function showIdeFile(id) {
  const file = ideFiles[id];
  ide.querySelector('.ide-tabs > strong').textContent = file.path;
  ide.querySelector('.ide-current-path').textContent = file.path;
  const pre = ide.querySelector('pre');
  pre.setAttribute('aria-label', `Source of src/${file.path}`);
  pre.querySelector('code').replaceChildren(...file.lines.map((line, index) => {
    const row = document.createElement('span');
    row.dataset.line = index + 1;
    // Only this fixed, local sample contains markup; no visitor input is rendered.
    row.innerHTML = line || ' ';
    row.classList.toggle('ide-target-line', id === 'record' && index === 7);
    return row;
  }));
  pre.scrollTop = 0;
  pre.scrollLeft = 0;
  ide.querySelectorAll('[data-ide-file]').forEach(button => {
    const selected = button.dataset.ideFile === id;
    button.classList.toggle('ide-selected-file', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
showIdeFile('record');
let ideModeAnimation;
let ideModeRevision = 0;
async function showIdeMode(mode, animate = true) {
  const revision = ++ideModeRevision;
  ideModeAnimation?.cancel();
  const panels = [...ide.querySelectorAll('.ide-agent, .ide-editor')];
  const next = ide.querySelector(mode === 'agent' ? '.ide-agent' : '.ide-editor');
  const previous = panels.find(panel => !panel.hidden);
  ideShell.dataset.mode = mode;
  ideModes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ideMode === mode)));
  showIdeSearch(false);
  if (previous === next) return;
  const shouldAnimate = animate && !document.hidden && !motion.matches;
  if (shouldAnimate && previous) {
    ideModeAnimation = previous.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(6px)' },
    ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    try { await ideModeAnimation.finished; } catch { return; } // A newer mode selection cancels this transition.
  }
  if (revision !== ideModeRevision) return;
  // A programmatic mode change must never leave keyboard focus in a hidden panel.
  if (previous?.contains(document.activeElement)) {
    ideModes.find(button => button.dataset.ideMode === mode).focus({ preventScroll: true });
  }
  ideModeAnimation?.cancel();
  panels.forEach(panel => { panel.hidden = panel !== next; });
  if (shouldAnimate) ideModeAnimation = next.animate([
    { opacity: 0, transform: 'translateY(10px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
}

function stopIdeTour() {
  ideInteracted = true;
  clearTimeout(timers.get(ide));
  timers.delete(ide);
  ide.removeAttribute('data-active');
}

ide.addEventListener('focusin', stopIdeTour);
ide.addEventListener('pointerdown', stopIdeTour);
ide.querySelectorAll('[data-ide-file]').forEach(button => button.addEventListener('click', () => showIdeFile(button.dataset.ideFile)));
ide.querySelector('.ide-agent-file').addEventListener('click', () => { showIdeFile('record'); showIdeMode('editor'); });
ide.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !ideSearch.hidden) {
    showIdeSearch(false);
    ideSearchToggle.focus();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && ideShell.dataset.mode === 'editor') {
    event.preventDefault();
    showIdeSearch(true);
    ide.querySelector('.ide-result').focus();
  }
});
ideModes.forEach(button => button.addEventListener('click', () => showIdeMode(button.dataset.ideMode)));
ideSearchToggle.addEventListener('click', () => {
  showIdeSearch(ideSearch.hidden);
  if (!ideSearch.hidden) ide.querySelector('.ide-result').focus({ preventScroll: true });
});
ide.querySelector('.ide-result').addEventListener('click', () => {
  showIdeFile('record');
  showIdeSearch(false);
  ide.querySelector('pre').focus({ preventScroll: true });
});

let usageAnimation;
function showUsagePanel(buttons, current, animate) {
  for (const button of buttons) {
    const selected = button === current;
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const entering = selected && panel.hidden;
    button.setAttribute('aria-pressed', String(selected));
    panel.hidden = !selected;
    if (entering && animate && !document.hidden && !motion.matches) {
      usageAnimation?.cancel();
      usageAnimation = panel.animate([
        { opacity: .5, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 290, easing: 'ease-out' });
    }
  }
}

function showUsage(view, animate = true) {
  showUsagePanel(usageTabs, usageTabs.find(tab => tab.dataset.usageTab === view), animate);
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
  button.addEventListener('click', () => showUsagePanel(sessionButtons, button, true));
}
for (const period of recapPeriods) {
  period.addEventListener('click', () => showUsagePanel(recapPeriods, period, true));
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
  review: reviewBeats.map(([delay, beat]) => [delay, animate => {
    review.dispatchEvent(new CustomEvent('review-tour-step', { detail: animate ? beat : null }));
  }]),
  ide: [
    [6500, animate => showIdeMode('agent', animate)],
    [7000, animate => showIdeMode('editor', animate)],
    [5000, animate => showIdeSearch(true, animate)],
    [6500, animate => { showIdeMode('editor', animate); showIdeSearch(false); }],
  ],
  memory: [
    [2400, () => showMemory(0)],
    [replayDelay, () => showMemory(1)],
  ],
  spaces: [[0]],
  voice: [
    [950, () => showVoiceExample(0)],
    [1200, () => showVoiceExample(1)],
    [1700, () => showVoiceExample(2)],
    [replayDelay + 2400, () => showVoiceExample(3)],
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
    [2400, animate => showUsage('limits', animate)],
    [2600, animate => showUsage('sessions', animate)],
    [replayDelay + 2000, animate => showUsage('recap', animate)],
  ],
};

function renderScene(feature, index, animate) {
  const steps = scenes[feature.dataset.scene];
  const [delay, render] = steps[index];
  feature.dataset.step = index;
  feature.dataset.phase = index === 0 ? 'start' : index === steps.length - 1 ? 'done' : 'working';
  render?.(animate);
  if (animate && steps.length > 1 && (feature.dataset.scene !== 'tasks' || trackedDetail.hidden)) {
    timers.set(feature, setTimeout(() => renderScene(feature, (index + 1) % steps.length, true), delay));
  }
}

function canAnimate(element) {
  return visible.has(element) && !document.hidden && !motion.matches;
}

function finishIdeMotion() {
  ideSearchAnimation?.cancel();
  if (ideModeAnimation?.playState !== 'running') return;
  const visibleMode = ide.querySelector('.ide-agent').hidden ? 'editor' : 'agent';
  if (visibleMode === ideShell.dataset.mode) ideModeAnimation.cancel();
  else showIdeMode(ideShell.dataset.mode, false);
}

function syncFeature(feature) {
  const active = canAnimate(feature);
  if (feature === review) review.dispatchEvent(new CustomEvent('review-motion-change', { detail: active }));
  if (!active) {
    if (feature === usage) usageAnimation?.cancel();
    if (feature === ide) finishIdeMotion();
    if (feature === taskFeature) taskAnimation?.cancel();
  }
  if ((feature === usage && usageInteracted) || (feature === ide && ideInteracted) || (feature === review && reviewInteracted)) return;
  if (active === feature.hasAttribute('data-active')) {
    if (!active && motion.matches && feature.dataset.phase !== 'done') {
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
    if (motion.matches) {
      renderScene(feature, scenes[feature.dataset.scene].length - 1, false);
    }
  }
}

function syncVideo() {
  if (canAnimate(video)) void video.play().catch(() => {});
  else video.pause();
}

function syncMotion() {
  features.forEach(syncFeature);
  syncVideo();
}

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
