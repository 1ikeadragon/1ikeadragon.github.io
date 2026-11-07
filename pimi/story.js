const workflow = document.querySelector('.workflow');
const sticky = workflow.querySelector('.workflow-sticky');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const tallViewport = window.matchMedia('(min-height: 651px)');
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');
const root = document.documentElement;

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeColor.content = theme === 'dark' ? '#18161e' : '#f8f5f2';
}

try {
  setTheme(localStorage.getItem('pimi-site-theme') === 'dark' ? 'dark' : 'light');
} catch {
  setTheme('light');
}
themeToggle.hidden = false;
let themeTransition;
themeToggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  themeTransition?.skipTransition();
  if (!motion.matches && document.startViewTransition) {
    themeTransition = document.startViewTransition(() => setTheme(theme));
  } else {
    setTheme(theme);
  }
  try {
    localStorage.setItem('pimi-site-theme', theme);
  } catch {
    // The toggle still works for this page if storage is disabled.
  }
});

const reviews = [
  {
    repo: 'RelayKit',
    branch: 'Request cache',
    file: 'src/provider-cache.ts',
    summary: 'Cache metadata for one request to avoid duplicate lookups.',
    diff: [
      [' ', 'export async function metadata(id, request) {'],
      ['-', '  return fetchMetadata(id)'],
      ['+', '  const cached = request.cache.get(id)'],
      ['+', '  if (cached) return cached'],
      ['+', '  const value = await fetchMetadata(id)'],
      ['+', '  request.cache.set(id, value)'],
      ['+', '  return value'],
      [' ', '}'],
    ],
  },
  {
    repo: 'ControlPlane',
    branch: 'Expiring shared cache',
    file: 'src/shared-cache.ts',
    summary: 'Reuse cached metadata across requests with a short expiry.',
    diff: [
      [' ', 'export async function read(key) {'],
      ['-', '  return provider.lookup(key)'],
      ['+', '  const cached = await store.get(key)'],
      ['+', '  if (cached) return cached'],
      ['+', '  const value = await provider.lookup(key)'],
      ['+', '  await store.set(key, value, { ttl: 60 })'],
      ['+', '  return value'],
      [' ', '}'],
    ],
  },
  {
    repo: 'Observatory',
    branch: 'Cache metrics',
    file: 'src/telemetry.ts',
    summary: 'Track cache hits and misses to compare both approaches.',
    diff: [
      [' ', 'export function recordLookup(hit) {'],
      ['-', '  metrics.lookup.add(1)'],
      ['+', '  metrics.lookup.add(1, {'],
      ['+', "    outcome: hit ? 'hit' : 'miss',"],
      ['+', '  })'],
      [' ', '}'],
    ],
  },
];

const stages = [
  { view: 'tasks' },
  { view: 'tasks', ready: true },
  { view: 'chat' },
  { view: 'voice', dictation: true },
  { view: 'work' },
  { view: 'reports' },
  { view: 'review', compare: 1 },
  { view: 'review', compare: 2, tour: true },
  { view: 'memory' },
  { view: 'setup' },
  { view: 'import' },
];

const next = document.querySelector('#demo-next');
const panels = [...document.querySelectorAll('.demo-view')];
const nav = [...document.querySelectorAll('[data-view]')];
const grid = document.querySelector('.demo-review-grid');
const tile = document.querySelector('#demo-tile');
const tour = document.querySelector('#demo-tour');
const tourNote = document.querySelector('.demo-tour-note');
const tourStep = tourNote.querySelector('strong');
const tourCopy = document.createTextNode('');
tourNote.replaceChild(tourCopy, tourStep.nextSibling);
const task = document.querySelector('.moving-task');
const taskStatus = task.querySelector('.card-status');
const board = document.querySelector('.demo-board');
const laneRunning = document.querySelector('[data-lane="running"]');
const laneReview = document.querySelector('[data-lane="review"]');
const voice = document.querySelector('#demo-voice');
const transcript = document.querySelector('#demo-transcript');
const voiceStatus = document.querySelector('#demo-voice-status');
const record = document.querySelector('#demo-record');

let shown = 'tasks';
let currentStep = 0;
let scrollStep = 0;
let scrollFrame = 0;
let recordingTimer;
let petTimer;

function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

for (const [index, review] of reviews.entries()) {
  const work = node('button', '', 'demo-work-item');
  work.type = 'button';
  work.dataset.open = 'reports';
  work.append(node('strong', review.branch), node('small', review.repo), node('span', 'Ready for review'));
  document.querySelector('#demo-work-items').append(work);

  const report = node('button', '', 'demo-report');
  report.type = 'button';
  report.dataset.open = 'review';
  report.dataset.review = String(index);
  report.append(node('strong', review.branch), node('span', review.repo), node('small', review.summary));
  document.querySelector('#demo-reports-list').append(report);
}

const pickers = ['Primary review', 'Comparison review'].map((label) => {
  const pane = node('article', '', 'diff-card');
  const header = node('div', '', 'diff-header');
  const picker = document.createElement('select');
  picker.setAttribute('aria-label', label);
  for (const [index, review] of reviews.entries()) {
    picker.add(new Option(review.repo + ' · ' + review.branch, index));
  }
  const file = node('div', '', 'diff-file');
  const code = node('pre', '', 'diff-code');
  header.append(picker, file);
  pane.append(header, code);
  grid.append(pane);
  return { picker, file, code };
});

function renderDiff(pane, index) {
  const { picker, file, code } = pickers[pane];
  const review = reviews[index];
  picker.value = index;
  const added = review.diff.filter(([kind]) => kind === '+').length;
  const removed = review.diff.filter(([kind]) => kind === '-').length;
  file.replaceChildren(node('code', review.file), node('span', '+' + added + ' / −' + removed));
  code.replaceChildren(...review.diff.map(([kind, source]) => {
    const line = node('span', '', 'diff-line');
    if (kind === '+') line.classList.add('added');
    if (kind === '-') line.classList.add('removed');
    line.append(node('b', kind), document.createTextNode(source));
    return line;
  }));
}

function setReview(pane, index) {
  const otherPane = 1 - pane;
  const otherIndex = Number(pickers[otherPane].picker.value);
  if (otherIndex === index) {
    renderDiff(otherPane, (index + 1) % reviews.length);
  }
  renderDiff(pane, index);
}

for (const [pane, { picker }] of pickers.entries()) {
  picker.addEventListener('change', () => setReview(pane, Number(picker.value)));
}
renderDiff(0, 0);
renderDiff(1, 1);

tile.addEventListener('click', () => {
  const stacked = grid.dataset.layout !== 'stacked';
  grid.dataset.layout = stacked ? 'stacked' : 'side-by-side';
  const label = stacked ? 'Tile reviews side by side' : 'Stack review panes';
  tile.setAttribute('aria-pressed', String(stacked));
  tile.setAttribute('aria-label', label);
  tile.title = label;
});

const tourNotes = [
  'Cache the lookup at the request boundary so workers can reuse it safely.',
  'Compare the other worktree to see how it handles the lifetime of cached data.',
];

function showTour(open, index = 0) {
  tour.setAttribute('aria-expanded', String(open));
  tourNote.hidden = !open;
  if (!open) return;
  tourStep.textContent = (index + 1) + ' / ' + tourNotes.length;
  tourCopy.textContent = tourNotes[index];
  tourNote.dataset.step = index;
}

tour.addEventListener('click', () => showTour(tourNote.hidden));
document.querySelector('#demo-tour-next').addEventListener('click', () => {
  showTour(true, (Number(tourNote.dataset.step) + 1) % tourNotes.length);
});

const wave = document.querySelector('.wave');
for (const [index, height] of [6, 13, 10, 24, 16, 26, 15, 22, 10, 15, 7].entries()) {
  const bar = document.createElement('i');
  bar.style.setProperty('--amplitude', height + 'px');
  bar.style.setProperty('--delay', -index * 73 + 'ms');
  wave.append(bar);
}

function finishRecording() {
  clearTimeout(recordingTimer);
  voice.removeAttribute('data-recording');
  voiceStatus.textContent = 'Inserted';
  transcript.textContent = 'Compare request caching and a shared cache across RelayKit and ControlPlane. Add metrics so we can see which approach helps.';
  record.setAttribute('aria-label', 'Try sample dictation again');
  record.title = 'Try sample dictation again';
}

function startRecording() {
  clearTimeout(recordingTimer);
  voice.setAttribute('data-recording', '');
  voiceStatus.textContent = 'Listening';
  transcript.textContent = 'Listening to the sample brief…';
  record.setAttribute('aria-label', 'Insert brief');
  record.title = 'Insert brief';
  recordingTimer = setTimeout(finishRecording, 2600);
}

record.addEventListener('click', () => {
  if (voice.hasAttribute('data-recording')) finishRecording();
  else startRecording();
});

const memory = {
  project: [
    {
      title: 'Provider cache decision',
      kind: 'Architecture',
      text: 'Start with request-scoped caching. Keep the shared cache behind a flag until hit-rate metrics justify the added complexity.',
      detail: 'Measure cache hit rate and p95 request latency before enabling the flag for more traffic.',
    },
    {
      title: 'Cache expiry',
      kind: 'Reliability',
      text: 'Expire shared metadata after 60 seconds. Invalidate it immediately when a provider configuration changes.',
    },
    {
      title: 'Telemetry contract',
      kind: 'Observability',
      text: 'Record hit or miss on each lookup. Keep provider IDs out of metric labels so dashboards stay usable.',
    },
    {
      title: 'Release gate',
      kind: 'Rollout',
      text: 'Review the RelayKit and ControlPlane diffs together before flipping the shared cache flag.',
    },
  ],
  global: [
    {
      title: 'Review conventions',
      kind: 'Code review',
      text: 'Show a short summary and the main trade-off before opening the diff. Flag anything that needs a human decision.',
    },
    {
      title: 'Agent handoffs',
      kind: 'Workflow',
      text: 'Hand off the branch, what changed, and how to verify it. Record open questions where the next agent can find them.',
    },
    {
      title: 'Commit messages',
      kind: 'Convention',
      text: 'Use a short subject that says what changed. Put the reason and any rollout notes in the body.',
    },
    {
      title: 'Parallel work',
      kind: 'Workflow',
      text: 'Give each approach its own worktree. Compare the results against the same brief and baseline.',
    },
  ],
};
const scopes = [...document.querySelectorAll('[data-scope]')];
const memoryList = document.querySelector('.demo-memory-list');
const note = document.querySelector('.demo-note');

function showMemory(scope) {
  for (const button of scopes) {
    button.setAttribute('aria-pressed', String(button.dataset.scope === scope));
  }
  const entries = memory[scope];
  const buttons = entries.map(({ title, kind }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.append(node('strong', title), node('small', kind));
    button.addEventListener('click', () => selectNote(index));
    return button;
  });

  function selectNote(index) {
    const { title, kind, text, detail } = entries[index];
    note.replaceChildren(node('small', kind), node('h3', title), node('p', text));
    if (detail) note.append(node('p', detail));
    buttons.forEach((button, position) => {
      button.setAttribute('aria-pressed', String(position === index));
    });
  }

  memoryList.replaceChildren(...buttons);
  selectNote(0);
}
showMemory('project');
for (const button of scopes) button.addEventListener('click', () => showMemory(button.dataset.scope));

const sessionList = document.querySelector('.demo-import-list');
const importSession = document.querySelector('#demo-import-session');
const importStatus = document.querySelector('.demo-import-status');
const importedSessions = new Set();

function selectedSession() {
  return sessionList.querySelector('input:checked');
}

function updateImport() {
  const imported = importedSessions.has(selectedSession());
  importSession.disabled = imported;
  importSession.querySelector('span').textContent = imported ? 'Imported' : 'Import';
}

sessionList.addEventListener('change', () => {
  importStatus.textContent = '';
  updateImport();
});
importSession.addEventListener('click', () => {
  const session = selectedSession();
  importedSessions.add(session);
  importStatus.textContent = session.labels[0].querySelector('strong').textContent + ' imported.';
  updateImport();
});

const pet = document.querySelector('.pet');
pet.addEventListener('click', () => {
  pet.setAttribute('data-petted', '');
  clearTimeout(petTimer);
  petTimer = setTimeout(() => pet.removeAttribute('data-petted'), 1200);
});

function moveTask(ready) {
  const target = ready ? laneReview : laneRunning;
  if (task.parentElement === target) return;
  const from = task.getBoundingClientRect();
  target.append(task);
  laneRunning.querySelector('h3 small').textContent = ready ? '0' : '1';
  laneReview.querySelector('h3 small').textContent = ready ? '1' : '0';
  taskStatus.textContent = ready ? '3 reports ready' : 'Agents working';
  const to = task.getBoundingClientRect();
  const reveal = ready ? Math.max(0, target.offsetLeft + target.offsetWidth - board.clientWidth) : 0;
  board.scrollTo({ left: reveal, behavior: motion.matches ? 'instant' : 'smooth' });
  if (!motion.matches && from.width && to.width) {
    const x = from.left - to.left;
    const y = from.top - to.top;
    task.animate([
      { transform: 'translate(' + x + 'px, ' + y + 'px)' },
      { transform: 'translate(' + x / 2 + 'px, ' + (y / 2 - 4) + 'px)' },
      { transform: 'translate(0, 0)' },
    ], { duration: 340, easing: 'cubic-bezier(.25,.65,.25,1)' });
  }
}

function showView(view, focusHeading = false) {
  if (shown === view) return;
  if (shown === 'voice' && voice.hasAttribute('data-recording')) finishRecording();
  const panel = document.querySelector('#demo-' + view);
  const focusWasInPanel = panels.some((item) => item.contains(document.activeElement));
  shown = view;
  for (const item of panels) {
    item.hidden = item !== panel;
    item.classList.toggle('demo-enter', item === panel);
  }
  const navView = ['voice', 'reports'].includes(view) ? 'tasks' : view === 'import' ? 'setup' : view;
  for (const button of nav) {
    if (button.dataset.view === navView) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  if (focusHeading || focusWasInPanel) {
    const heading = panel.querySelector('h2');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function showStep(index) {
  currentStep = index;
  const stage = stages[index];
  showView(stage.view);
  if (stage.view === 'tasks') moveTask(Boolean(stage.ready));
  if (stage.dictation) startRecording();
  if (stage.compare) {
    renderDiff(0, 0);
    renderDiff(1, stage.compare);
    showTour(Boolean(stage.tour));
  }
}

workflow.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-view], button[data-open]');
  if (!button) return;
  const view = button.dataset.view ?? button.dataset.open;
  const index = stages.findIndex((stage) => stage.view === view);
  currentStep = index;
  showView(view, button.hasAttribute('data-open'));
  if (button.dataset.review !== undefined) setReview(0, Number(button.dataset.review));
});
next.addEventListener('click', () => showStep((currentStep + 1) % stages.length));

function updateScroll() {
  scrollFrame = 0;
  const top = parseFloat(getComputedStyle(sticky).top);
  const start = workflow.getBoundingClientRect().top + window.scrollY - top;
  const end = document.documentElement.scrollHeight - window.innerHeight;
  const distance = Math.min(workflow.offsetHeight - sticky.offsetHeight, end - start);
  if (distance <= 0 || !Number.isFinite(top)) return;
  const progress = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
  const index = Math.min(stages.length - 1, Math.floor(progress * stages.length));
  if (index === scrollStep) return;
  scrollStep = index;
  showStep(index);
}

function scheduleScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}

function configureScroll() {
  const enabled = !motion.matches && tallViewport.matches;
  workflow.toggleAttribute('data-scroll', enabled);
  if (enabled) {
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll);
    scheduleScroll();
  } else {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    window.removeEventListener('scroll', scheduleScroll);
    window.removeEventListener('resize', scheduleScroll);
  }
}
motion.addEventListener('change', configureScroll);
tallViewport.addEventListener('change', configureScroll);
configureScroll();
