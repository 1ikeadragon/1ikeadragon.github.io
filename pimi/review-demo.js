// Interactive sample Review scene for the download page. No repository or GitHub calls.
const reviewScene = document.querySelector('#review');

if (reviewScene) {
  const $ = (selector) => reviewScene.querySelector(selector);
  const prs = [
    {
      id: 'capture', repo: 'trace-core', number: 42, title: 'Record redacted events',
      author: 'Maya', branch: 'capture-events', checks: 'Checks passed',
      summary: 'Clean MCP event payloads before they are written to the local trace. Playback can read the ordered lines without exposing credentials.',
      files: [
        { id: 'record', path: 'src/record-event.ts', stats: '+3 −1', lines: [
          ['context', 5, ' import { redactCredentials } from "./secrets";'],
          ['context', 6, ' '],
          ['context', 7, ' async function recordEvent(event, sink) {'],
          ['removed', 8, '−  await sink.write(JSON.stringify(event));'],
          ['added', 8, '+  const safe = redactCredentials(event);'],
          ['added', 9, '+  const line = JSON.stringify(safe);'],
          ['added', 10, '+  await sink.write(line + "\\n");'],
          ['context', 11, ' }'],
        ] },
        { id: 'secrets', path: 'src/secrets.ts', stats: '+4 −0', lines: [
          ['context', 3, ' const privateKeys = new Set(['],
          ['added', 4, '+  "authorization",'],
          ['added', 5, '+  "api_key",'],
          ['added', 6, '+  "token",'],
          ['context', 7, ' ]);'],
          ['added', 8, '+ export const redactCredentials = mask(privateKeys);'],
        ] },
      ],
    },
    {
      id: 'replay', repo: 'replay-ui', number: 18, title: 'Replay a recorded trace',
      author: 'Jules', branch: 'timeline-player', checks: 'Review requested',
      summary: 'Show each recorded tool event in the timeline in its original order. The replay view reads the trace and does not rerun tools.',
      files: [
        { id: 'playback', path: 'src/playback.ts', stats: '+3 −1', lines: [
          ['context', 9, ' import type { ToolEvent } from "./types";'],
          ['context', 10, ' '],
          ['context', 11, ' function replay(events, timeline) {'],
          ['removed', 12, '−  return runTools(events);'],
          ['added', 12, '+  for (const event of events) {'],
          ['added', 13, '+    timeline.append(event);'],
          ['added', 14, '+  }'],
          ['context', 15, ' }'],
        ] },
        { id: 'timeline', path: 'src/timeline.ts', stats: '+3 −0', lines: [
          ['context', 18, ' export function append(event) {'],
          ['added', 19, '+  const row = formatEvent(event);'],
          ['added', 20, '+  rows.push(row);'],
          ['added', 21, '+  renderRow(row);'],
          ['context', 22, ' }'],
        ] },
      ],
    },
  ];

  const byId = new Map(prs.map((pr) => [pr.id, pr]));
  const lastFile = new Map(prs.map((pr) => [pr.id, pr.files[0].id]));
  const fileScroll = new Map();
  const initial = { mode: 'prs', pr: 'capture', tab: 'overview', file: 'record' };
  const tourSteps = {
    'capture-overview': initial,
    'capture-changes': { ...initial, tab: 'changes' },
    'capture-secrets': { ...initial, tab: 'changes', file: 'secrets' },
    'replay-overview': { ...initial, pr: 'replay', file: 'playback' },
    'replay-changes': { ...initial, pr: 'replay', tab: 'changes', file: 'playback' },
  };
  const worktreeStops = [
    { title: 'Redact before saving', text: 'The recorder writes the cleaned event to disk.' },
    { title: 'Replay recorded events', text: 'The timeline displays the trace without invoking tools again.' },
  ];
  const history = [initial];
  let index = 0;
  let renderedState;
  let interacted = false;
  let motionActive = false;
  let worktreeTimer;
  let panelAnimation;
  let hunkAnimation;
  let query = '';
  let filter = 'all';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function button(className, text, click) {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', click);
    return node;
  }
  function rememberScroll() {
    const state = history[index];
    const pre = $('#review-demo-diff pre');
    if (state.mode === 'prs' && state.tab === 'changes' && pre)
      fileScroll.set(`${state.pr}:${state.file}`, { top: pre.scrollTop, left: pre.scrollLeft });
  }
  function push(next) {
    if (JSON.stringify(next) === JSON.stringify(history[index])) return;
    rememberScroll();
    history.splice(index + 1);
    history.push(next);
    if (history.length > 40) history.shift();
    index = history.length - 1;
    render();
  }
  function move(delta) {
    const next = index + delta;
    if (next < 0 || next >= history.length) return;
    rememberScroll();
    index = next;
    render();
  }
  function renderPrList(state) {
    const matches = prs.filter(pr => `${pr.repo} ${pr.title} #${pr.number}`.toLowerCase().includes(query) && (filter === 'all' || pr.id === 'replay'));
    const list = $('#review-demo-pr-list');
    list.replaceChildren(...matches.map((pr) => {
      const row = button('review-demo-pr-row', '', () => push({
        mode: 'prs', pr: pr.id, tab: 'overview', file: lastFile.get(pr.id),
      }));
      row.setAttribute('aria-pressed', String(state.pr === pr.id));
      row.dataset.pr = pr.id;
      row.append(
        element('small', '', `${pr.repo} · #${pr.number}`),
        element('strong', '', pr.title),
        element('span', 'review-demo-pr-state', pr.checks),
      );
      return row;
    }));
    if (!matches.length) list.append(element('p', 'review-demo-empty', 'No matching pull requests.'));
  }
  function renderOverview(pr) {
    const description = element('div', 'review-demo-overview-card review-demo-description');
    description.append(element('small', '', 'Description'), element('p', '', pr.summary));
    const scope = element('ul', 'review-demo-scope');
    for (const text of (pr.id === 'capture'
      ? ['Redact credentials before serialization', 'Keep event order and tool names intact', 'Write one event per line']
      : ['Read events from the saved trace', 'Keep the original event order', 'Render playback without invoking tools']))
      scope.append(element('li', '', text));
    description.append(scope);
    const checks = element('div', 'review-demo-overview-card');
    checks.append(element('small', '', 'Checks'));
    for (const label of ['Typecheck', 'Unit tests', 'Build']) {
      const row = element('div', 'review-demo-check');
      row.append(element('span', '', '✓'), element('strong', '', label), element('small', '', 'Passed'));
      checks.append(row);
    }
    const reviewers = element('div', 'review-demo-overview-card');
    reviewers.append(element('small', '', 'Review'), element('strong', '', pr.id === 'capture' ? 'Ready for your review' : 'Review requested'), element('p', '', 'Compare the branch, then inspect each changed file.'));
    const activity = element('div', 'review-demo-overview-card review-demo-activity');
    activity.append(element('small', '', 'Conversation'));
    const entry = element('div', 'review-demo-activity-entry');
    const copy = element('div');
    copy.append(element('strong', '', `${pr.author} opened this pull request`), element('p', '', pr.id === 'capture' ? 'The recorder is ready. Please check the redaction boundary before the UI work lands.' : 'Playback is ready to review alongside the recorder changes.'));
    entry.append(element('span', 'review-demo-avatar', pr.author[0]), copy);
    activity.append(entry);
    const openChanges = button('review-demo-open-changes', 'Inspect changed files →', () => {
      push({ ...history[index], tab: 'changes' });
      $('#review-demo-changes-tab').focus({ preventScroll: true });
    });
    $('#review-demo-overview').replaceChildren(description, checks, reviewers, activity, openChanges);
  }

  function renderChanges(state, pr) {
    const currentFile = pr.files.find((file) => file.id === state.file) ?? pr.files[0];
    const fileList = $('#review-demo-file-list');
    if (fileList.dataset.pr !== pr.id) {
      fileList.dataset.pr = pr.id;
      fileList.replaceChildren(...pr.files.map((file) => {
        const row = button('review-demo-file-row', '', () => {
          lastFile.set(pr.id, file.id);
          push({ ...history[index], file: file.id });
        });
        row.dataset.file = file.id;
        row.append(element('span', '', file.path), element('small', '', file.stats));
        return row;
      }));
    }
    for (const row of fileList.children)
      row.setAttribute('aria-pressed', String(row.dataset.file === currentFile.id));
    const panel = element('article', 'diff-panel');
    const heading = element('header');
    heading.append(element('strong', '', pr.repo), element('small', '', pr.branch));
    const fileHeading = element('div', 'diff-file');
    fileHeading.append(element('span', '', currentFile.path), element('span', 'diff-stats', currentFile.stats));
    const pre = element('pre');
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', `Diff for ${currentFile.path} in ${pr.repo}`);
    const code = element('code');
    for (const [kind, line, content] of currentFile.lines) {
      const row = element('span', kind === 'context' ? 'code-context' : `line ${kind}`, content);
      row.dataset.line = line;
      code.append(row);
    }
    pre.append(code);
    panel.append(heading, fileHeading, pre);
    $('#review-demo-diff').replaceChildren(panel);
    const scroll = fileScroll.get(`${pr.id}:${currentFile.id}`);
    if (scroll) { pre.scrollTop = scroll.top; pre.scrollLeft = scroll.left; }
  }
  function stopMotion() {
    clearTimeout(worktreeTimer);
    panelAnimation?.cancel();
    hunkAnimation?.cancel();
  }

  function animateArrival(panel, tour) {
    panelAnimation = panel.animate([
      { opacity: .5, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 340, easing: 'ease-out' });
    const addition = tour ? panel.querySelector('.added') : null;
    if (addition) hunkAnimation = addition.animate([
      { boxShadow: 'inset 3px 0 transparent' },
      { boxShadow: 'inset 3px 0 var(--focus)', offset: .26 },
      { boxShadow: 'inset 3px 0 var(--focus)', offset: .78 },
      { boxShadow: 'inset 3px 0 transparent' },
    ], { duration: 1600, easing: 'ease-out' });
  }

  function showWorktreeStop(step, animate) {
    const caption = $('.tour-panel');
    caption.querySelector('.tour-title').textContent = worktreeStops[step].title;
    caption.querySelector('.tour-description').textContent = worktreeStops[step].text;
    caption.querySelector('.tour-count').textContent = `${step + 1} / ${worktreeStops.length}`;
    for (const target of reviewScene.querySelectorAll('[data-stop], [data-review-stop]')) {
      target.classList.toggle('current', Number(target.dataset.stop ?? target.dataset.reviewStop) === step);
    }
    if (animate) animateArrival(caption.querySelector('div'), false);
    worktreeTimer = setTimeout(() => showWorktreeStop((step + 1) % worktreeStops.length, true), 6500);
  }

  function render(state = history[index], animate = true, tour = false) {
    const previous = renderedState;
    if (previous === state) return;
    renderedState = state;
    stopMotion();
    const isPrMode = state.mode === 'prs';
    const shouldAnimate = previous && animate && motionActive && !document.hidden && !reducedMotion.matches;
    $('#review-demo-prs').hidden = !isPrMode;
    $('#review-demo-worktrees').hidden = isPrMode;
    for (const mode of reviewScene.querySelectorAll('[data-demo-mode]'))
      mode.setAttribute('aria-pressed', String(mode.dataset.demoMode === state.mode));
    $('#review-demo-back').disabled = index === 0;
    $('#review-demo-forward').disabled = index === history.length - 1;
    if (!isPrMode) {
      if (shouldAnimate && previous.mode !== state.mode) {
        animateArrival($('.review-body'), false);
        showWorktreeStop(0, false);
      }
      return;
    }

    const pr = byId.get(state.pr);
    if (previous?.pr !== state.pr) {
      $('#review-demo-pr-context').textContent = `${pr.repo} · #${pr.number} · ${pr.author}`;
      $('#review-demo-pr-title').textContent = pr.title;
      $('#review-demo-pr-meta').replaceChildren(
        element('span', 'review-demo-open-state', 'Open'),
        element('span', '', `${pr.branch} → main`),
        element('span', '', `${pr.files.length} files changed`),
      );
      renderOverview(pr);
    }
    if (!previous) renderPrList(state);
    for (const row of $('#review-demo-pr-list').querySelectorAll('[data-pr]'))
      row.setAttribute('aria-pressed', String(row.dataset.pr === state.pr));
    for (const tab of reviewScene.querySelectorAll('[data-demo-tab]')) {
      const selected = tab.dataset.demoTab === state.tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    const overview = $('#review-demo-overview');
    const changes = $('#review-demo-changes');
    overview.hidden = state.tab !== 'overview';
    changes.hidden = state.tab !== 'changes';
    if (state.tab === 'changes') renderChanges(state, pr);
    if (shouldAnimate) {
      let panel = overview;
      if (previous.mode !== state.mode) panel = $('.review-demo-pr-detail');
      else if (state.tab === 'changes') {
        const changingFile = previous.tab === state.tab && previous.pr === state.pr;
        panel = changingFile ? $('#review-demo-diff') : changes;
      }
      animateArrival(panel, tour && state.tab === 'changes');
    }
  }

  function takeOver() {
    if (interacted) return;
    interacted = true;
    history[0] = renderedState;
    stopMotion();
    reviewScene.dispatchEvent(new Event('review-interaction'));
  }

  for (const event of ['pointerdown', 'focusin', 'click', 'input']) {
    reviewScene.addEventListener(event, takeOver, { capture: true });
  }
  reviewScene.addEventListener('review-tour-step', event => {
    if (interacted) return;
    render(tourSteps[event.detail] ?? initial, Boolean(event.detail), true);
  });
  reviewScene.addEventListener('review-motion-change', event => {
    const wasActive = motionActive;
    motionActive = event.detail;
    reviewScene.toggleAttribute('data-motion', motionActive);
    if (!motionActive) {
      stopMotion();
      if (reducedMotion.matches && !interacted) render(initial, false);
    } else if (!wasActive && renderedState.mode === 'worktrees') {
      showWorktreeStop(0, false);
    }
  });

  reviewScene.querySelectorAll('[data-demo-mode]').forEach((control) => {
    control.addEventListener('click', () => push({ ...history[index], mode: control.dataset.demoMode }));
  });
  reviewScene.querySelectorAll('[data-demo-tab]').forEach((control) => {
    control.addEventListener('click', () => push({ ...history[index], tab: control.dataset.demoTab }));
  });
  $('#review-demo-search').addEventListener('input', event => {
    query = event.target.value.trim().toLowerCase();
    renderPrList(history[index]);
  });
  reviewScene.querySelectorAll('[data-pr-filter]').forEach(control => {
    control.addEventListener('click', () => {
      filter = control.dataset.prFilter;
      reviewScene.querySelectorAll('[data-pr-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === control)));
      renderPrList(history[index]);
    });
  });
  $('.review-demo-pr-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'changes' : history[index].tab === 'overview' ? 'changes' : 'overview';
    push({ ...history[index], tab: next });
    $(`[data-demo-tab="${next}"]`).focus({ preventScroll: true });
  });
  $('#review-demo-back').addEventListener('click', () => move(-1));
  $('#review-demo-forward').addEventListener('click', () => move(1));
  render();
}
