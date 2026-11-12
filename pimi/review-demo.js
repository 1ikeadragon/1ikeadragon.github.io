// Interactive sample Review scene for the download page. No repository or GitHub calls.
const reviewScene = document.querySelector('#review');

if (reviewScene) {
  const $ = (selector) => reviewScene.querySelector(selector);
  const prs = [
    {
      id: 'capture', repo: 'trace-core', number: 42, title: 'Record redacted events', requested: false,
      author: 'Maya', branch: 'capture-events', checks: 'Checks failing', status: 'failed',
      summary: 'Clean MCP event payloads before they are written to the local trace. Playback can read the ordered lines without exposing credentials.',
      checkList: [['failed', 'Unit tests', '1 failing'], ['passed', 'Typecheck', ''], ['passed', 'Build', '']],
      log: ['FAIL src/record-event.test.ts', '  masks proxy-authorization', '  expected "[masked]"', '  received "Bearer demo-token"'],
      threads: [{ file: 'secrets', author: 'Jules', text: 'Should proxy-authorization be masked too?', resolved: false }, { file: 'record', author: 'Maya', text: 'Moved the write after the redaction call.', resolved: true }],
      commits: [['Mask credentials before writing', '7c32d1a'], ['Write one event per line', 'a41be09']],
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
        { id: 'test', path: 'src/record-event.test.ts', stats: '+2 −0', lines: [
          ['context', 12, ' test("masks credentials", () => {'],
          ['added', 13, '+  const out = redactCredentials(sample);'],
          ['added', 14, '+  expect(out.token).toBe("[masked]");'],
          ['context', 15, ' });'],
        ] },
      ],
    },
    {
      id: 'replay', repo: 'replay-ui', number: 18, title: 'Replay a recorded trace', requested: true,
      author: 'Jules', branch: 'timeline-player', checks: 'Checks running', status: 'running',
      summary: 'Show each recorded tool event in the timeline in its original order. The replay view reads the trace and does not rerun tools.',
      checkList: [['running', 'Build', ''], ['passed', 'Typecheck', ''], ['passed', 'Unit tests', '']],
      log: [],
      threads: [],
      commits: [['Render events from the saved trace', '3be90c4']],
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
    {
      id: 'fixture', repo: 'trace-core', number: 43, title: 'Add the sample trace fixture', requested: true,
      author: 'Sam', branch: 'seed-fixture', checks: 'Checks passed', status: 'passed',
      summary: 'Commit a small recorded run so replay tests can run offline.',
      checkList: [['passed', 'Typecheck', ''], ['passed', 'Unit tests', ''], ['passed', 'Build', '']],
      log: [],
      threads: [],
      commits: [['Add the sample trace', '90d2e1f']],
      files: [
        { id: 'fixture', path: 'fixtures/sample-run.ndjson', stats: '+2 −0', lines: [
          ['added', 1, '+{"tool_name":"read_file","event_order":1}'],
          ['added', 2, '+{"tool_name":"write_file","event_order":2}'],
        ] },
      ],
    },
  ];

  const byId = new Map(prs.map((pr) => [pr.id, pr]));
  const lastFile = new Map(prs.map((pr) => [pr.id, pr.files[0].id]));
  const fileScroll = new Map();
  const viewed = new Set();
  const initial = { mode: 'prs', pr: 'capture', tab: 'overview', file: 'record' };
  const tourSteps = {
    'capture-overview': initial,
    'capture-changes': { ...initial, tab: 'changes' },
    'capture-secrets': { ...initial, tab: 'changes', file: 'secrets' },
    'replay-overview': { ...initial, pr: 'replay', file: 'playback' },
    'replay-changes': { ...initial, pr: 'replay', tab: 'changes', file: 'playback' },
  };
  const history = [initial];
  let index = 0;
  let renderedState;
  let interacted = false;
  let motionActive = false;
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
    const matches = prs.filter(pr => `${pr.repo} ${pr.title} #${pr.number}`.toLowerCase().includes(query) && (filter === 'all' || pr.requested));
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
        (() => { const chip = element('span', 'review-demo-pr-state', pr.checks); chip.dataset.status = pr.status; return chip; })(),
      );
      return row;
    }));
    if (!matches.length) list.append(element('p', 'review-demo-empty', 'No matching pull requests.'));
  }
  let threadFilter = 'unresolved';
  const draftFor = (pr, check, note) => [
    `Fix the failing check "${check[1]}" on ${pr.repo} #${pr.number} (${pr.title}).`,
    '', 'Log tail:', ...pr.log.map(line => `  ${line}`),
    ...(note ? ['', `Note: ${note}`] : []),
  ].join('\n');
  function openSheet(pr, check) {
    $('#review-demo-sheet-target').textContent = `${check[1]} · ${pr.repo} #${pr.number}`;
    $('#review-demo-note').value = '';
    const sheet = $('#review-demo-sheet');
    sheet.dataset.pr = pr.id;
    sheet.showModal();
  }
  function showChat(text) {
    $('#review-demo-draft').value = text;
    $('#review-demo-chat').hidden = false;
    $('#review-demo-back-to-review').focus({ preventScroll: true });
  }
  function overviewCard(title, ...children) {
    const card = element('div', 'review-demo-overview-card');
    card.append(element('small', '', title), ...children);
    return card;
  }
  function renderThreads(pr, list) {
    const shown = pr.threads.filter(t => threadFilter === 'all' || !t.resolved);
    list.replaceChildren(...(shown.length ? shown : [element('p', '', 'No unresolved threads.')]).map(t => {
      if (!t.text) return t;
      const row = element('div', 'review-demo-thread-row');
      row.append(element('strong', '', t.author), element('span', '', t.text), element('small', '', `${t.resolved ? 'Resolved' : 'Unresolved'} · ${pr.files.find(f => f.id === t.file).path}`));
      return row;
    }));
  }
  function renderOverview(pr) {
    const description = overviewCard('Description', element('p', '', pr.summary));
    description.classList.add('review-demo-description');
    const checks = overviewCard('Checks');
    for (const [status, label] of [['failed', 'Failed'], ['running', 'Running'], ['passed', 'Passed']]) {
      const items = pr.checkList.filter(c => c[0] === status);
      if (!items.length) continue;
      const head = element('div', 'review-demo-check-head');
      head.append(element('strong', '', label), element('span', 'review-demo-badge', String(items.length)));
      checks.append(head);
      for (const item of items) {
        const row = element('div', 'review-demo-check');
        row.dataset.status = status;
        row.append(element('span', '', status === 'failed' ? '✕' : status === 'running' ? '…' : '✓'), element('strong', '', item[1]), element('small', '', item[2] || (status === 'running' ? 'Running' : 'Passed')));
        checks.append(row);
        if (status === 'failed' && pr.log.length) {
          const log = element('pre', 'review-demo-log', pr.log.join('\n'));
          log.tabIndex = 0;
          log.setAttribute('aria-label', `Log tail for ${item[1]}`);
          checks.append(log, button('review-demo-fix', 'Fix this', () => openSheet(pr, item)));
        }
      }
    }
    const threads = overviewCard('Threads');
    const filters = element('div', 'review-demo-thread-filter');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Thread filter');
    const list = element('div', 'review-demo-thread-list');
    for (const [value, label] of [['unresolved', 'Unresolved'], ['all', 'All']]) {
      const b = button('', label, () => {
        threadFilter = value;
        for (const other of filters.children) other.setAttribute('aria-pressed', String(other === b));
        renderThreads(pr, list);
      });
      b.setAttribute('aria-pressed', String(threadFilter === value));
      filters.append(b);
    }
    renderThreads(pr, list);
    threads.append(filters, list);
    const commits = overviewCard('Commits');
    for (const [message, sha] of pr.commits) {
      const row = element('div', 'review-demo-commit');
      row.append(element('strong', '', message), element('code', '', sha));
      commits.append(row);
    }
    const openChanges = button('review-demo-open-changes', 'Inspect changed files →', () => {
      push({ ...history[index], tab: 'changes' });
      $('#review-demo-changes-tab').focus({ preventScroll: true });
    });
    $('#review-demo-overview').replaceChildren(description, checks, threads, commits, openChanges);
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
        const marks = pr.threads.filter(t => t.file === file.id && !t.resolved).length;
        row.append(element('span', '', file.path), element('small', '', `${file.stats}${marks ? ` · ${marks} thread` : ''}`));
        row.dataset.viewedMark = '';
        return row;
      }));
    }
    for (const row of fileList.children) {
      row.setAttribute('aria-pressed', String(row.dataset.file === currentFile.id));
      row.classList.toggle('viewed', viewed.has(`${pr.id}:${row.dataset.file}`));
    }
    $('#review-demo-viewed').textContent = `${pr.files.filter(f => viewed.has(`${pr.id}:${f.id}`)).length}/${pr.files.length} viewed`;
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
    const key = `${pr.id}:${currentFile.id}`;
    const mark = button('review-demo-viewed-toggle', viewed.has(key) ? 'Viewed ✓' : 'Mark viewed', () => {
      if (viewed.has(key)) viewed.delete(key); else viewed.add(key);
      renderedState = null;
      render(history[index], false);
    });
    mark.setAttribute('aria-pressed', String(viewed.has(key)));
    fileHeading.append(mark);
    panel.append(heading, fileHeading, pre);
    for (const t of pr.threads.filter(x => x.file === currentFile.id)) {
      const box = element('div', 'review-demo-thread');
      box.append(element('strong', '', `${t.author} · ${t.resolved ? 'Resolved' : 'Unresolved'}`), element('p', '', t.text),
        button('review-demo-ask', 'Ask in chat', () => showChat(`About ${currentFile.path} in ${pr.repo} #${pr.number}:\n${t.author} said "${t.text}"\n\nWhat should change?`)));
      panel.append(box);
    }
    $('#review-demo-diff').replaceChildren(panel);
    const scroll = fileScroll.get(`${pr.id}:${currentFile.id}`);
    if (scroll) { pre.scrollTop = scroll.top; pre.scrollLeft = scroll.left; }
  }
  function stopMotion() {
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
      if (shouldAnimate && previous.mode !== state.mode) animateArrival($('.review-body'), false);
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
  $('#review-demo-sheet-cancel').addEventListener('click', () => $('#review-demo-sheet').close());
  $('#review-demo-sheet-open').addEventListener('click', () => {
    const sheet = $('#review-demo-sheet');
    const pr = byId.get(sheet.dataset.pr);
    const check = pr.checkList.find(c => c[0] === 'failed');
    const text = draftFor(pr, check, $('#review-demo-note').value.trim());
    sheet.close();
    showChat(text);
  });
  $('#review-demo-back-to-review').addEventListener('click', () => { $('#review-demo-chat').hidden = true; });
  $('#review-demo-back').addEventListener('click', () => move(-1));
  $('#review-demo-forward').addEventListener('click', () => move(1));
  render();
}
