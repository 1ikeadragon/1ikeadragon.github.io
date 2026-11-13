// Static host/data adapter for the unchanged Apache-2.0 Pimi workspace UI.
// No daemon, provider, filesystem or agent actions are connected here.
const base = new URL('./', import.meta.url);
const nativeFetch = window.fetch.bind(window);
const response = await nativeFetch(new URL('fixtures.json', base));
if (!response.ok) throw new Error('Unable to load workspace data.');
const state = await response.json();
const initialTasks = structuredClone(state.tasks);
const params = new URLSearchParams(location.search);
const callbacks = {};
let voiceState = {visible:false,active:false,status:'',level:0};
// Mirrors PimiVoiceBubbleState in packages/protocol/src/pimi-task.ts.
function validateVoiceState(value) {
  const valid = value && typeof value === 'object' &&
    Object.keys(value).every(key => ['visible','active','status','level','receipt'].includes(key)) &&
    typeof value.visible === 'boolean' && typeof value.active === 'boolean' &&
    typeof value.status === 'string' && value.status.length <= 240 &&
    Number.isFinite(value.level) && value.level >= 0 && value.level <= 1;
  if (!valid) throw new Error('Invalid voice state.');
  const receipt = value.receipt;
  if (receipt !== undefined && (!receipt || typeof receipt !== 'object' ||
    Object.keys(receipt).some(key => !['transcript','message','state'].includes(key)) ||
    typeof receipt.transcript !== 'string' || receipt.transcript.length > 4096 ||
    typeof receipt.message !== 'string' || receipt.message.length > 1600 ||
    !['working','finished','error'].includes(receipt.state))) throw new Error('Invalid voice receipt.');
  return structuredClone(value);
}
const sources = new Set();
const clone = value => structuredClone(value);
const send = (type, detail = {}) => {
  if (parent !== window) parent.postMessage({type, ...detail}, location.origin);
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {'Content-Type': 'application/json'},
});
const scope = projectId => state.memory.scopes[projectId || 'global'];
function api(route, body) {
  if (route === 'board') return clone(state.board);
  if (route === 'tasks') return clone(state.tasks);
  if (route === 'memory') {
    if (body.action === 'catalog') return clone(state.memory.catalog);
    const selected = scope(body.projectId);
    if (!selected) throw new Error('This project is no longer registered on this host.');
    if (body.action === 'list') return clone(selected);
    if (body.action === 'read') {
      const note = selected.notes.find(note => note.key === body.key);
      if (!note) throw new Error('Note not found.');
      return {note: clone(note)};
    }
  }
  if (route === 'spaces') {
    if (body.action === 'list') return clone(state.spaces);
    if (body.action === 'search') {
      // Fixture search is literal text matching; production indexing is not emulated.
      const query = String(body.query || '').toLocaleLowerCase();
      return {items: clone(state.spaces.items.filter(item =>
        [item.text, item.url, item.preview?.title, item.preview?.text, item.caption]
          .filter(Boolean).join('\n').toLocaleLowerCase().includes(query))), unindexedLinks: state.spaces.items.filter(item => item.kind === 'link' && !item.preview).length};
    }
    if (body.action === 'preview-link') {
      const item = state.spaces.items.find(item => item.id === body.id);
      if (!item) throw new Error('Card not found.');
      return {item: clone(item)};
    }
  }
  if (route === 'tasks/stage') {
    const task = state.tasks.tasks.find(task => task.id === body.id);
    if (!task) throw new Error('Task not found.');
    if (body.stage !== null && !['backlog','ready','in-progress','review','done'].includes(body.stage))
      throw new Error('Unknown task stage.');
    if (body.stage !== 'done') delete task.completedAt;
    else if (!task.done) task.completedAt = new Date().toISOString();
    task.stage = body.stage;
    task.done = body.stage === 'done';
    delete task.completedByPullRequest;
    for (const source of sources) source.dispatchEvent(new MessageEvent('tasks', {data: '{}'}));
    return clone(task);
  }
  throw new Error('This action is unavailable in the website preview.');
}
window.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : input, location.href);
  const signal = init.signal || (input instanceof Request ? input.signal : undefined);
  signal?.throwIfAborted();
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    try {
      const bodyText = init.body || (input instanceof Request ? await input.clone().text() : '');
      const data = api(url.pathname.slice(5) + url.search, bodyText ? JSON.parse(bodyText) : {});
      signal?.throwIfAborted();
      return json(data);
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      return json({error: error.message}, 400);
    }
  }
  // Only packaged assets can reach the network through fetch. Unknown APIs never fall through.
  if (url.origin === location.origin && url.pathname.startsWith(base.pathname))
    return nativeFetch(input, init);
  return json({error: 'External data connections are disabled in this preview.'}, 403);
};
class FixtureEventSource extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  readyState = FixtureEventSource.OPEN;
  constructor(url) {
    super();
    if (new URL(url, location.href).pathname !== '/api/events') throw new Error('Unsupported event source.');
    sources.add(this);
    queueMicrotask(() => {
      if (this.readyState === FixtureEventSource.OPEN) this.dispatchEvent(new MessageEvent('ready', {data:'{}'}));
    });
  }
  close() { this.readyState = FixtureEventSource.CLOSED; sources.delete(this); }
}
window.EventSource = FixtureEventSource;
// Native Spaces assigns image.src; map its same-origin image endpoints to exported bytes.
const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
Object.defineProperty(HTMLImageElement.prototype, 'src', {
  configurable: imageSrc.configurable,
  enumerable: imageSrc.enumerable,
  get: imageSrc.get,
  set(value) {
    const url = new URL(value, location.href);
    const key = url.pathname + url.search;
    if (url.origin === location.origin && key.startsWith('/api/spaces/')) {
      const asset = state.assets[key];
      if (!asset) { this.dispatchEvent(new Event('error')); return; }
      value = new URL(asset, base).href;
    }
    imageSrc.set.call(this, value);
  },
});
window.pimiWorkspace = {
  chrome: 'mac',
  setSection: section => send('pimi-workspace-section', {section}),
  openReview: request => send('pimi-workspace-review', {request}),
  onLayoutChange: apply => { callbacks.layout = apply; apply('inline'); },
  onAppearanceChange: apply => {
    callbacks.appearance = apply;
    apply(params.get('appearance') === 'dark' ? 'dark' : 'light');
  },
  onNavigate: apply => { callbacks.navigate = apply; },
  onVoiceState: apply => { callbacks.voice = apply; apply(voiceState); },
  onSpaceLinkError: apply => { callbacks.spaceError = apply; },
  onPaperUnavailable: apply => { callbacks.paperUnavailable = apply; },
  onReportLinkError: apply => { callbacks.reportError = apply; },
};
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'pimi-workspace-appearance' && ['light','dark'].includes(data.appearance))
    callbacks.appearance?.(data.appearance);
  if (data.type === 'pimi-workspace-layout' && ['inline','attached','hidden'].includes(data.layout))
    callbacks.layout?.(data.layout);
  if (data.type === 'pimi-workspace-navigate' && ['spaces','memory','tasks','board','task'].includes(data.destination?.view))
    void callbacks.navigate?.(data.destination);
});
// Website-only playback driver. These are not claimed to be production host APIs.
// Selection/copy uses the original native controls and their original handlers.
window.addEventListener('message', async event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || typeof data !== 'object' || !data.type?.startsWith('pimi-fixture-')) return;
  try {
    if (data.type === 'pimi-fixture-voice-state') {
      voiceState = validateVoiceState(data.state);
      callbacks.voice?.(voiceState);
    } else if (data.type === 'pimi-fixture-task-stage') {
      api('tasks/stage', {id: data.taskId, stage: data.stage});
    } else if (data.type === 'pimi-fixture-reset-tasks') {
      state.tasks = clone(initialTasks);
      for (const source of sources) source.dispatchEvent(new MessageEvent('tasks', {data: '{}'}));
    } else if (data.type === 'pimi-fixture-memory-select') {
      const destination = {view: 'memory'};
      if (data.projectId) destination.projectId = data.projectId;
      await callbacks.navigate(destination);
      const row = [...document.querySelectorAll('#memory-notes button')]
        .find(node => node.dataset.key === data.key);
      if (!row) throw new Error('Note not found in this scope.');
      row.click();
    } else if (data.type === 'pimi-fixture-spaces-copy') {
      const control = document.getElementById('space-card-' + data.itemId)?.querySelector('.spaces-reference');
      if (!control) throw new Error('Card not found in this view.');
      // Never synthesize a copied state: clipboard permission errors stay visible natively.
      control.click();
    } else if (data.type === 'pimi-fixture-spaces-close') {
      document.getElementById('spaces-close').click();
    } else return;
    send('pimi-fixture-command-accepted', {command: data.type, requestId: data.requestId});
  } catch (error) {
    send('pimi-fixture-command-error', {command: data.type, requestId: data.requestId, message: error.message});
  }
});
// Equivalent to the native preload's external-link handoff, confined to genuine HTTP(S) URLs.
window.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('#pimi-voice-dismiss')) {
    const {receipt, ...withoutReceipt} = voiceState;
    voiceState = withoutReceipt;
    callbacks.voice?.(voiceState);
    send('pimi-fixture-voice-dismiss');
  }
  if (target?.closest('#pimi-voice-toggle')) send('pimi-fixture-voice-toggle');
  const space = target?.closest('button[data-space-url]');
  if (space) {
    const url = new URL(space.dataset.spaceUrl);
    if (['http:', 'https:'].includes(url.protocol)) window.open(url.href, '_blank', 'noopener,noreferrer');
  }
  const link = target?.closest('a[href]');
  if (link && !['http:', 'https:', 'mailto:'].includes(new URL(link.href, location.href).protocol)) {
    event.preventDefault();
    send('pimi-workspace-link', {href: link.getAttribute('href')});
  }
}, true);
window.addEventListener('pagehide', () => { for (const source of sources) source.close(); });
await import('./app.js');
const view = ['spaces','memory','tasks','board'].includes(params.get('view')) ? params.get('view') : 'spaces';
const destination = {view};
if (view === 'memory' && params.get('projectId')) destination.projectId = params.get('projectId');
await callbacks.navigate(destination);
send('pimi-real-ui-ready', {view});
