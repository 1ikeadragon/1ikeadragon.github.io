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
  const history = [{ mode: 'prs', pr: 'capture', tab: 'overview', file: 'record' }];
  let index = 0;

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
    $('#review-demo-pr-list').replaceChildren(...prs.map((pr) => {
      const row = button('review-demo-pr-row', '', () => push({
        mode: 'prs', pr: pr.id, tab: 'overview', file: lastFile.get(pr.id),
      }));
      row.setAttribute('aria-pressed', String(state.pr === pr.id));
      row.append(
        element('small', '', `${pr.repo} · #${pr.number}`),
        element('strong', '', pr.title),
        element('span', 'review-demo-pr-state', pr.checks),
      );
      return row;
    }));
  }
  function renderOverview(pr) {
    const comparison = element('div', 'review-demo-overview-card');
    comparison.append(
      element('small', '', 'Comparison'),
      element('strong', '', `${pr.branch} → main`),
      element('p', '', pr.summary),
    );
    const checks = element('div', 'review-demo-overview-card');
    checks.append(element('small', '', 'Checks'), element('strong', '', pr.checks));
    const activity = element('div', 'review-demo-overview-card');
    activity.append(
      element('small', '', 'Conversation'),
      element('strong', '', `${pr.author} opened this pull request`),
      element('p', '', 'Open Changes to inspect the files in this sample review.'),
    );
    $('#review-demo-overview').replaceChildren(comparison, checks, activity);
  }
  function renderChanges(state, pr) {
    const currentFile = pr.files.find((file) => file.id === state.file) ?? pr.files[0];
    const fileList = $('#review-demo-file-list');
    fileList.replaceChildren(...pr.files.map((file) => {
      const row = button('review-demo-file-row', '', () => {
        lastFile.set(pr.id, file.id);
        push({ ...state, file: file.id });
      });
      row.setAttribute('aria-pressed', String(file.id === currentFile.id));
      row.append(element('span', '', file.path), element('small', '', file.stats));
      return row;
    }));
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
  function render() {
    const state = history[index];
    const isPrMode = state.mode === 'prs';
    $('#review-demo-prs').hidden = !isPrMode;
    $('#review-demo-worktrees').hidden = isPrMode;
    for (const mode of reviewScene.querySelectorAll('[data-demo-mode]'))
      mode.setAttribute('aria-pressed', String(mode.dataset.demoMode === state.mode));
    $('#review-demo-back').disabled = index === 0;
    $('#review-demo-forward').disabled = index === history.length - 1;
    if (!isPrMode) return;
    const pr = byId.get(state.pr);
    $('#review-demo-pr-context').textContent = `${pr.repo} · #${pr.number} · ${pr.author}`;
    $('#review-demo-pr-title').textContent = pr.title;
    for (const tab of reviewScene.querySelectorAll('[data-demo-tab]'))
      tab.setAttribute('aria-selected', String(tab.dataset.demoTab === state.tab));
    $('#review-demo-overview').hidden = state.tab !== 'overview';
    $('#review-demo-changes').hidden = state.tab !== 'changes';
    renderPrList(state);
    renderOverview(pr);
    if (state.tab === 'changes') renderChanges(state, pr);
  }

  reviewScene.querySelectorAll('[data-demo-mode]').forEach((control) => {
    control.addEventListener('click', () => push({ ...history[index], mode: control.dataset.demoMode }));
  });
  reviewScene.querySelectorAll('[data-demo-tab]').forEach((control) => {
    control.addEventListener('click', () => push({ ...history[index], tab: control.dataset.demoTab }));
  });
  $('#review-demo-back').addEventListener('click', () => move(-1));
  $('#review-demo-forward').addEventListener('click', () => move(1));
  render();
}
