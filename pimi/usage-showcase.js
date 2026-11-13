// Usage is the deliberately custom showcase. All numbers and activity below are
// presentation fixtures, not account telemetry, billing estimates or live data.
const glyph = name => `<svg class="us-icon" aria-hidden="true"><use href="${new URL('app-icons.svg', import.meta.url)}#icon-${name}"/></svg>`;
const providers = ['Claude', 'Codex', 'OpenCode'];
const sessions = [
  {name:'Preview deploys',provider:'Codex',host:'This Mac',context:42,compactions:2,output:'18.4k',tokens:['31k','58k','18k','4k'],costs:[[2,1,3,0],[3,1,8,2],[5,1,13,3],[7,2,20,5],[9,2,26,6]]},
  {name:'Dashboard review',provider:'Claude',host:'devbox',context:29,compactions:1,output:'9.2k',tokens:['24k','42k','9k','3k'],costs:[[1,0,2,1],[2,1,5,1],[4,2,8,2],[6,2,12,3],[7,3,14,4]]},
];
const shipped = [
  {id:'preview',icon:'tasks',title:'Preview deploys',status:'Done',detail:'Each pull request gets its own preview environment, with isolated configuration and deploy logs.'},
  {id:'health',icon:'work',title:'Wait for healthy preview',status:'api #42 · merged',detail:'The deploy pipeline waits for a healthy preview before routing traffic. A failed check preserves the last healthy deployment.'},
  {id:'dashboard',icon:'work',title:'Live deploy status cards',status:'dashboard #18 · merged',detail:'The dashboard shows build output, health checks and the current route together.'},
  {id:'docs',icon:'tasks',title:'Document preview environments',status:'Done',detail:'The quickstart covers opening a preview, reading a failed deploy log and cleaning up an environment.'},
];
const money = cents => '$' + (cents / 100).toFixed(2);
let sequence = 0;
const mounted = new WeakMap();
export function mountUsage(node) {
  mounted.get(node)?.destroy();
  const uid = 'pimi-usage-' + ++sequence;
  const controller = new AbortController();
  const options = {signal:controller.signal};
  node.classList.add('us-showcase');
  node.innerHTML = `<header class="us-toolbar"><span>Usage</span><div class="us-tabs" role="tablist" aria-label="Usage views">${['Provider limits','Sessions','Recap'].map((name,i)=>`<button id="${uid}-tab-${i}" type="button" role="tab" aria-controls="${uid}-pane-${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-us-tab="${i}">${name}</button>`).join('')}</div></header>
  <div class="us-pane" id="${uid}-pane-0" role="tabpanel" aria-labelledby="${uid}-tab-0"><div class="us-limits">${[['Claude','5-hour limit',42,'Resets in 2h 18m'],['Codex','Session limit',28,'Resets in 3h 42m'],['OpenCode','API usage',18,'Provider-reported usage']].map(([name,label,value,reset])=>`<article>${provider(name)}<h3>${name}</h3><div class="us-limit-label"><span>${label}</span><b>${value}%</b></div><div class="us-limit-bar" role="meter" aria-label="${name} ${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><i style="width:${value}%"></i></div><small>${reset}</small></article>`).join('')}</div></div>
  <div class="us-pane" id="${uid}-pane-1" role="tabpanel" aria-labelledby="${uid}-tab-1" hidden><div class="us-sessions"><aside aria-label="Sessions"><b>Sessions</b>${sessions.map((s,i)=>`<button type="button" data-us-session="${i}" aria-pressed="${i===0}"><span>${s.name}</span><small>${s.provider} · ${s.host}</small></button>`).join('')}</aside><div class="us-session-detail"></div></div></div>
  <div class="us-pane" id="${uid}-pane-2" role="tabpanel" aria-labelledby="${uid}-tab-2" hidden><div class="us-recap"><header><div><small>THIS WEEK</small><h3>You shipped preview deploys.</h3></div><span>Nov 9–13</span></header><div class="us-stat-cells"><span><b>4</b>Tasks completed</span><span><b>3</b>PRs merged</span><span><b>2</b>Repositories</span></div><div class="us-shipped-list">${shipped.map(item=>`<a class="us-shipped" href="#${uid}-shipped-detail" data-us-shipped="${item.id}">${glyph(item.icon)}<span>${item.title}</span><small>${item.status}</small>${glyph('arrow')}</a>`).join('')}</div></div></div>
  <dialog id="${uid}-shipped-detail" class="us-shipped-dialog" aria-labelledby="${uid}-shipped-title"><div><small data-us-shipped-status></small><h3 id="${uid}-shipped-title"></h3><p></p><form method="dialog"><button type="submit">Close</button></form></div></dialog>`;
  let selectedSession = 0;
  function selectTab(index, focus = false) {
    if (![0,1,2].includes(index)) return;
    node.querySelectorAll('[data-us-tab]').forEach((tab,i)=>{
      tab.setAttribute('aria-selected',String(i===index)); tab.tabIndex=i===index?0:-1;
      node.querySelector(`#${uid}-pane-${i}`).hidden=i!==index;
      if (focus && i===index) tab.focus();
    });
  }
  function showPoint(index) {
    const s = sessions[selectedSession];
    const cells = s.costs[index];
    const tip = node.querySelector('.us-chart-tooltip');
    tip.hidden = false;
    tip.innerHTML = `<strong>Nov ${9+index}<span>${money(cells.reduce((a,b)=>a+b,0))}</span></strong>${['Input','Cache read','Output','Reasoning'].map((label,i)=>`<span>${label}<b>${money(cells[i])}</b></span>`).join('')}`;
    tip.style.setProperty('--point', `${index * 25}%`);
    node.querySelectorAll('[data-us-point]').forEach((button,i)=>button.classList.toggle('us-point-active',i===index));
  }
  function selectSession(index) {
    if (!sessions[index]) return;
    selectedSession = index;
    const s = sessions[index];
    const values=s.costs.map(c=>c.reduce((a,b)=>a+b,0));
    const coordinates=values.map((v,i)=>`${20+i*115},${112-v/50*90}`);
    const detail=node.querySelector('.us-session-detail');
    detail.innerHTML=`<h3>${s.name}</h3><div class="us-stat-cells"><span><b>${s.context}%</b>Context window</span><span><b>${s.compactions}</b>Compactions</span><span><b>${s.output}</b>Output tokens</span><span><b>${money(values.at(-1))}</b>Reported cost</span></div><div class="us-context-bar" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="us-context-legend">${['Input','Cache read','Output','Reasoning'].map((label,i)=>`<span>${label} ${s.tokens[i]}</span>`).join('')}</div><div class="us-chart-heading"><span>Reported cost</span><small>Nov 9–13</small></div><div class="us-chart"><svg viewBox="0 0 500 140" role="img" aria-label="Cumulative reported cost, November 9 to 13"><path class="us-grid-line" d="M20 25H480M20 65H480M20 105H480"/><polyline points="${coordinates.join(' ')}"/>${coordinates.map(p=>{const [x,y]=p.split(',');return `<circle cx="${x}" cy="${y}" r="3"/>`;}).join('')}</svg><div class="us-chart-targets">${values.map((value,i)=>`<button type="button" data-us-point="${i}" aria-label="Nov ${9+i}: ${money(value)}. Show cost breakdown."><span>Nov ${9+i}</span></button>`).join('')}</div><div class="us-chart-tooltip" role="status" hidden></div></div><small class="us-counter-note">Reported counters can overlap.</small>`;
    node.querySelectorAll('[data-us-session]').forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));
  }
  selectSession(0);
  node.addEventListener('click',event=>{
    const tab=event.target.closest('[data-us-tab]'); if(tab)selectTab(Number(tab.dataset.usTab));
    const session=event.target.closest('[data-us-session]'); if(session)selectSession(Number(session.dataset.usSession));
    const point=event.target.closest('[data-us-point]'); if(point)showPoint(Number(point.dataset.usPoint));
    const link=event.target.closest('[data-us-shipped]');
    if(link){event.preventDefault();const item=shipped.find(item=>item.id===link.dataset.usShipped);const dialog=node.querySelector('dialog');dialog.querySelector('h3').textContent=item.title;dialog.querySelector('small').textContent=item.status;dialog.querySelector('p').textContent=item.detail;dialog.showModal();}
  },options);
  node.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-us-tab]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const current=Number(tab.dataset.usTab);selectTab(event.key==='Home'?0:event.key==='End'?2:(current+(event.key==='ArrowRight'?1:2))%3,true);}
    if(event.key==='Escape'){const tip=node.querySelector('.us-chart-tooltip');if(tip)tip.hidden=true;}
  },options);
  const pointInteraction=event=>{const point=event.target.closest('[data-us-point]');if(point)showPoint(Number(point.dataset.usPoint));};
  node.addEventListener('pointerover',pointInteraction,options);
  node.addEventListener('focusin',pointInteraction,options);
  node.addEventListener('pointerout',event=>{const chart=event.target.closest('.us-chart');if(chart&&!chart.contains(event.relatedTarget)&&!chart.contains(document.activeElement))chart.querySelector('.us-chart-tooltip').hidden=true;},options);
  node.addEventListener('focusout',event=>{const chart=event.target.closest('.us-chart');if(chart&&!chart.contains(event.relatedTarget))chart.querySelector('.us-chart-tooltip').hidden=true;},options);
  const api={selectTab,selectSession,destroy(){controller.abort();node.querySelector('dialog')?.close();node.replaceChildren();node.classList.remove('us-showcase');mounted.delete(node);}};
  mounted.set(node,api);
  return api;
}
// Exact provider artwork copied from the existing page sprite; no shared shell required.
const providerArtwork = {"Claude": "<svg viewBox=\"0 0 24 24\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>", "Codex": "<svg viewBox=\"0 0 24 24\"><path d=\"M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z\"/></svg>", "OpenCode": "<svg viewBox=\"0 0 16 16\"><path fill-rule=\"evenodd\" d=\"M13 14H3V2H13V14ZM10.5 4.4H5.5V11.6H10.5V4.4Z\"/></svg>"};
function provider(name) { return `<span class="us-provider us-${name.toLowerCase()}" aria-hidden="true">${providerArtwork[name]}</span>`; }
