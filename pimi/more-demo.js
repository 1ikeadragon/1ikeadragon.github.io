// Sample-only demos: images, search, Attack, blame card. No network calls, no visitor input is rendered as markup.
const $ = (root, selector) => root.querySelector(selector);
const $$ = (root, selector) => [...root.querySelectorAll(selector)];
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function segmented(root, attr, onSelect) {
  const buttons = $$(root, `[${attr}]`);
  buttons.forEach(button => button.addEventListener('click', () => {
    const value = button.getAttribute(attr);
    buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    onSelect(value);
  }));
}
// Append `text` to `parent`, wrapping every match of `regex` in <mark>. Returns the marks.
function highlight(parent, text, regex) {
  const marks = [];
  if (!regex) { parent.append(text); return marks; }
  let last = 0;
  for (const match of text.matchAll(regex)) {
    if (!match[0]) continue;
    parent.append(text.slice(last, match.index));
    const mark = el('mark', '', match[0]);
    parent.append(mark);
    marks.push(mark);
    last = match.index + match[0].length;
  }
  parent.append(text.slice(last));
  return marks;
}

// Images: grid plus a <dialog> lightbox.
const images = $(document, '#images');
if (images) {
  const box = $(images, '.lightbox');
  const shots = $$(images, '[data-shot] img');
  let current = 0;
  const show = index => {
    current = (index + shots.length) % shots.length;
    const big = $(box, 'img');
    big.src = shots[current].currentSrc || shots[current].src;
    big.alt = shots[current].alt;
    $(box, '.lightbox-count').textContent = `${current + 1} of ${shots.length}`;
  };
  $$(images, '[data-shot]').forEach(button => button.addEventListener('click', () => { show(Number(button.dataset.shot)); box.showModal(); }));
  $$(box, '[data-shot-step]').forEach(button => button.addEventListener('click', () => show(current + Number(button.dataset.shotStep))));
  $(box, '[data-shot-close]').addEventListener('click', () => box.close());
  box.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });
  box.addEventListener('click', event => { if (event.target === box) box.close(); });
}

// Search: three sample panels.
const search = $(document, '#search');
if (search) {
  const panels = $$(search, '[data-sd-panel]');
  segmented(search, 'data-sd-tab', value => panels.forEach(panel => { panel.hidden = panel.dataset.sdPanel !== value; }));

  const files = [
    ['src/record-event.ts', [[1, 'import { redactCredentials } from "./secrets";'], [8, '  const safe = redactCredentials(event);']]],
    ['src/secrets.ts', [[8, 'export const redactCredentials = mask(privateKeys);']]],
    ['src/record-event.test.ts', [[12, '  expect(redactCredentials(sample).token).toBe("[masked]");']]],
    ['README.md', [[14, 'Playback never calls redactCredentials.']]],
  ];
  const options = { case: false, word: false, regex: false };
  const globRegex = glob => {
    const source = glob.trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?').replace(/\u0000/g, '.*');
    return new RegExp(`^${source}$`);
  };
  function queryRegex() {
    const raw = $(search, '#sd-query').value;
    if (!raw) return null;
    try {
      let source = options.regex ? raw : raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (options.word) source = `\\b(?:${source})\\b`;
      return new RegExp(source, options.case ? 'g' : 'gi');
    } catch { return undefined; }
  }
  const results = $(search, '#sd-results');
  const summary = $(search, '#sd-summary');
  const diff = $(search, '#sd-diff');
  function runSearch() {
    const regex = queryRegex();
    results.replaceChildren();
    diff.hidden = true;
    $(search, '#sd-preview').setAttribute('aria-expanded', 'false');
    if (regex === undefined) { summary.textContent = 'Invalid regular expression.'; return; }
    if (!regex) { summary.textContent = 'Type to search.'; return; }
    let glob;
    try { glob = $(search, '#sd-glob').value.trim() ? globRegex($(search, '#sd-glob').value) : null; } catch { glob = null; }
    let total = 0, fileCount = 0;
    for (const [path, lines] of files) {
      if (glob && !glob.test(path)) continue;
      const hits = lines.filter(([, text]) => { regex.lastIndex = 0; return regex.test(text); });
      if (!hits.length) continue;
      fileCount++;
      total += hits.length;
      const group = el('div', 'sd-file');
      group.append(el('strong', '', path), el('span', 'sd-count', String(hits.length)));
      results.append(group);
      for (const [number, text] of hits) {
        const row = el('div', 'sd-hit');
        row.append(el('small', '', String(number)));
        const code = el('code');
        highlight(code, text.trim(), new RegExp(regex.source, regex.flags));
        row.append(code);
        results.append(row);
      }
    }
    summary.textContent = total ? `${total} result${total === 1 ? '' : 's'} in ${fileCount} file${fileCount === 1 ? '' : 's'}` : 'No results.';
  }
  $$(search, '[data-sd-opt]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sdOpt;
    options[key] = !options[key];
    button.setAttribute('aria-pressed', String(options[key]));
    runSearch();
  }));
  $(search, '#sd-query').addEventListener('input', runSearch);
  $(search, '#sd-glob').addEventListener('input', runSearch);
  $(search, '#sd-preview').addEventListener('click', event => {
    const open = diff.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(open));
    diff.hidden = !open;
    if (!open) return;
    const first = results.querySelector('.sd-hit code');
    diff.replaceChildren();
    if (!first) { diff.append(el('p', '', 'Nothing to replace.')); return; }
    const before = el('div', 'sd-del', `− ${first.textContent}`);
    const query = $(search, '#sd-query').value;
    const after = el('div', 'sd-add', `+ ${first.textContent.split(query).join($(search, '#sd-replace').value)}`);
    diff.append(before, after, el('small', '', 'Preview only. Nothing is written until you apply it.'));
  });
  runSearch();

  // Find in pane
  const chatLines = [
    'Where do we redact secrets before writing a trace?',
    'The recorder calls redactCredentials on each event first. The redaction rules live in Memory.',
    'Playback reads the redacted trace and never reruns tools. Redact once, replay many times.',
  ];
  const chat = $(search, '#sd-chat');
  let marks = [], at = 0;
  function runFind(step = 0) {
    const raw = $(search, '#sd-find').value;
    chat.replaceChildren();
    marks = [];
    const regex = raw ? new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    chatLines.forEach((line, i) => {
      const p = el('p', i === 0 ? 'chat-bubble' : '');
      marks.push(...highlight(p, line, regex));
      chat.append(p);
    });
    at = marks.length ? (at + step + marks.length) % marks.length : 0;
    marks[at]?.classList.add('current');
    $(search, '#sd-find-count').textContent = marks.length ? `${at + 1} of ${marks.length}` : raw ? 'No results' : '';
  }
  $(search, '#sd-find').addEventListener('input', () => { at = 0; runFind(); });
  $(search, '#sd-next').addEventListener('click', () => runFind(1));
  $(search, '#sd-prev').addEventListener('click', () => runFind(-1));
  runFind();

  // Command palette
  const commands = ['New chat', 'Open Review', 'Search files', 'Go to Tasks', 'Open Agent Grid'];
  const settings = [['Appearance', 'Theme'], ['Voice', 'Dictation model'], ['Updates', 'Check for updates'], ['Editor', 'Font size']];
  const palInput = $(search, '#sd-pal');
  const palList = $(search, '#sd-pal-list');
  const palSetting = $(search, '#sd-setting');
  function renderPalette() {
    const raw = palInput.value;
    const isSettings = raw.startsWith('%');
    const needle = (isSettings ? raw.slice(1) : raw).trim().toLowerCase();
    palSetting.hidden = true;
    const rows = isSettings
      ? settings.filter(([group, name]) => `${group} ${name}`.toLowerCase().includes(needle)).map(([group, name]) => ({ label: name, hint: `Settings · ${group}`, setting: [group, name] }))
      : commands.filter(name => name.toLowerCase().includes(needle)).map(name => ({ label: name, hint: 'Command' }));
    palList.replaceChildren(...rows.map(row => {
      const button = el('button', 'sd-pal-row');
      button.type = 'button';
      button.append(el('strong', '', row.label), el('small', '', row.hint));
      button.addEventListener('click', () => {
        if (!row.setting) return;
        palSetting.replaceChildren(el('small', '', `Settings · ${row.setting[0]}`), el('label', 'sd-field', row.setting[1]));
        palSetting.hidden = false;
        palSetting.focus?.();
      });
      return button;
    }));
    if (!rows.length) palList.append(el('p', 'sd-empty', 'No matches.'));
  }
  palInput.addEventListener('input', renderPalette);
  renderPalette();
}

// Attack: subviews and a selectable finding.
const attack = $(document, '#attack');
if (attack) {
  const views = $$(attack, '[data-ad-panel]');
  segmented(attack, 'data-ad-view', value => views.forEach(view => { view.hidden = view.dataset.adPanel !== value; }));
  const findings = [
    ['Pay button throws on an empty cart', 'Repro: open the cart with no items and press Pay. Evidence: TypeError "total is undefined" in the console.'],
    ['Sign-up accepts an empty email', 'Repro: leave Email blank and press Create account. Evidence: the account is created and no error is shown.'],
    ['Key-shaped value in .env.example', 'Evidence: line 2 holds a value shaped like an API key. It is a placeholder here, but the pattern is worth a look.'],
  ];
  const detail = $(attack, '#ad-detail');
  const pick = index => {
    $$(attack, '[data-ad-finding]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.adFinding) === index)));
    detail.replaceChildren(el('p', '', findings[index][1]));
    const fix = el('button', 'sd-btn', 'Fix it');
    fix.type = 'button';
    const note = el('small', '', '');
    fix.addEventListener('click', () => { note.textContent = 'Opens a chat with this finding prefilled. Nothing is sent until you send it.'; });
    detail.append(fix, note);
  };
  $$(attack, '[data-ad-finding]').forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.adFinding))));
  pick(0);
  const run = $(attack, '[data-ad-run]');
  run.addEventListener('click', () => {
    const paused = run.getAttribute('aria-pressed') !== 'true';
    run.setAttribute('aria-pressed', String(paused));
    run.textContent = paused ? 'Resume' : 'Pause';
    const live = $(attack, '.ad-live');
    live.toggleAttribute('data-paused', paused);
    live.lastChild.textContent = paused ? 'Paused' : 'Running';
  });
}

// Blame card: hover and focus show it through CSS; click keeps it open.
const blame = $(document, '.blame-line');
if (blame) blame.addEventListener('click', () => blame.parentElement.toggleAttribute('data-open'));
