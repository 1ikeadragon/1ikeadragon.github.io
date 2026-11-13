# Native workspace panels

These are the actual native Pimi Tasks, Work, Memory and Spaces panels, served by
`pimi/server.mjs` from `pimi/public`. UI JavaScript, markup, icons and CSS have not
been reconstructed. `source-manifest.json` records the checkout source, served
hash and exported hash for each asset. `LICENSE` is copied from the app repository.

The native server selected `data-appearance="light"` in its HTML. Website changes
are confined to relative resource URLs, relative texture URLs, and an entrypoint
that installs `fixture-host.js` before importing the unchanged `app.js`.
No extra UI stylesheet is used. All required CSS and texture files are included.

## Mount

Use an iframe with `src="./real-ui/index.html?view=spaces"`; other `view` values are
`memory`, `tasks`, and `board` (Work). Add `appearance=dark` for Dark. Memory accepts
an optional real fixture project ID, e.g. `projectId=prj_ce30d88258e741a4` for api.
Use `allow="clipboard-write; fullscreen"` if reference copying and fullscreen
embeds should work. Surrounding native window chrome belongs to the parent; the
production `data-workspace-chrome="mac"` contract hides the workspace's own topbar.

Same-origin parent messages supported:

- `{type:"pimi-workspace-navigate", destination:{view:"spaces"}}`
- `{type:"pimi-workspace-appearance", appearance:"light"}` (or `dark`)
- `{type:"pimi-workspace-layout", layout:"hidden"}` (or `inline`, `attached`)

The iframe reports `pimi-real-ui-ready` after initial navigation, and
`pimi-workspace-section` when the actual UI switches section. Review and app-link
handoffs are reported to the parent, never sent to an installed app or daemon.

## Data boundary

`fixtures.json` contains read responses from the isolated Sidetrack fixture host.
Memory text and Spaces text/URLs/previews are preserved without further shortening.
The YouTube poster is the native endpoint's exported image bytes. Public external
links and native click-to-load YouTube/X/arXiv embeds retain their real URLs.

The adapter intercepts `/api/*` fetches and EventSource in this iframe. No daemon
URL, credentials, provider configuration or agent launcher is shipped. Reads are
served from fixture data; unknown or mutating operations display the native error
state. Task-stage changes are the sole mutation: they update in-memory state and
emit the event consumed by native live-updates and board-motion code. They reset
on reload. Spaces search uses literal matching over the complete stored text; it
does not reproduce production retrieval/indexing. Report document fetches and
native app Review navigation are unavailable in this fixture.

Native Memory starts at the actual note picker; opening a note uses the unchanged
native note control. There is no fabricated preselected-note host capability.

## Validation

The exporter and read-contract verification live outside the website under
`/tmp/pimi-real-site-20261113/`. Syntax checks and copied-asset hash checks passed.
Visual/interactive rendering must be verified in CUA at the intended iframe size;
static syntax and adapter checks alone do not prove rendering fidelity.

## Playback driver

All commands require the same-origin parent. They are website playback controls,
not additional production host capabilities. Send to `iframe.contentWindow` with
`location.origin` as target origin. The native UI files remain untouched.

- Open a native Spaces card using the real host destination:
  `{type:"pimi-workspace-navigate",destination:{view:"spaces",action:{kind:"open",id:ITEM_ID}}}`.
- Close its native dialog: `{type:"pimi-fixture-spaces-close"}`.
- Activate the original reference-copy control:
  `{type:"pimi-fixture-spaces-copy",itemId:ITEM_ID}`. This performs the real clipboard
  call. It does not synthesize a success state; browser permission failure is shown
  by the native UI. Trigger from a real click and grant iframe clipboard permission.
- Select a Memory note through its original native button/handler:
  `{type:"pimi-fixture-memory-select",projectId:"prj_ce30d88258e741a4",key:"preview-environment-rules"}`.
  Omitting projectId preserves native current scope; start with the default global
  Memory route when selecting the global `review-preferences` note.
- Move a task in isolated memory, emitting the native `tasks` update event:
  `{type:"pimi-fixture-task-stage",taskId:TASK_ID,stage:"review"}`.
  Valid stages: `backlog`, `ready`, `in-progress`, `review`, `done`, or `null` (automatic).
- Reset original task stages: `{type:"pimi-fixture-reset-tasks"}`.

Driver commands optionally accept `requestId`. They report
`pimi-fixture-command-accepted` or `pimi-fixture-command-error`; acceptance is not a
render-completion or clipboard-success claim. There are no automatic timers in
the driver. The parent owns visibility, playback and reduced-motion behavior.

The canonical task snapshot was refreshed from the current isolated host after
its repository-alias cleanup. Current fixture IDs:

- `c46178f1-59a6-4c18-8a26-6cb5b61917cb`: Preview deploys (in progress)
- `f4f1a1c4-58b1-47fd-af62-c1678c128fb5`: Wait for healthy preview (review)
- `5fb67ae9-2d30-4fad-9fc4-b00c40527f5e`: Write deploy quickstart (to do)
- `3bdcd4da-7efb-4c89-b41e-92fc7b7cddc1`: Reject weak TLS keys (done)
- `509be81e-2497-48a7-8f79-d153488ad1b0`: Capture failed deploy logs (ready)

## Ask Pimi voice-state fixture

The exact native `app.js` voice handler is now wired through the production
`pimiWorkspace.onVoiceState` callback. The UI HTML, CSS, mascot, waveform and
receipt bubbles are unchanged. Set inputs from the same-origin parent:

```js
iframe.contentWindow.postMessage({
  type: 'pimi-fixture-voice-state',
  state: {
    visible: true,
    active: false,
    status: '',
    level: 0,
    receipt: {
      transcript: 'find the harness paper in spaces and start a chat with it',
      message: 'Opened a chat with Harness² attached.',
      state: 'finished'
    }
  }
}, location.origin);
```

The state is validated against the current `PimiVoiceBubbleState` shape:
receipt states are `working`, `finished`, and `error` (`done` is invalid).
The presentation feeds hearing levels, Transcribing, Working, then a finished
receipt. These are fixture inputs only; no microphone, speech model, transcript
recognition, agent dispatch or actual new chat is invoked. The exact native
Dismiss control clears the receipt. The exact native microphone control reports
`pimi-fixture-voice-toggle` to the parent; it does not start audio capture.

The artifact documents use the production `withPreviewCsp` and theme wrapper.
A UTF-8 charset declaration is added for file delivery; `srcdoc` inherits this
encoding in the app. The generated body, controls and CSP are unchanged. The
parent uses measured, per-theme capture bounds and an opaque `allow-scripts`
sandbox. It cannot inspect or script the artifact's controls.

Desktop captures remove only the screen-sharing badge and automation cursor
from the OS titlebar. The presentation restores the standard macOS traffic
lights; all product content remains captured app pixels or unchanged native UI.
Usage is the deliberately separate design preview requested for the website.
