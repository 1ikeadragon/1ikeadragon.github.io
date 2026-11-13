import { mountUsage } from './usage-showcase.js';

// Presentation only. Every app pixel comes from an explicitly listed real capture
// or from the unchanged native workspace renderer inside the measured rectangle.
const captureBase = new URL('./captures/', import.meta.url);
const nativeBase = new URL('./real-ui/index.html', import.meta.url);
const WIDTH = 1440, HEIGHT = 876;
const PREVIEW_TASK = 'c46178f1-59a6-4c18-8a26-6cb5b61917cb';
const MEMORY_PROJECT = 'prj_ce30d88258e741a4';
const LABELS = {
  agent:'One conversation', work:'Work', tasks:'Tasks', 'task-detail':'A task, in detail', agents:'Your agents',
  ide:'Stay with the code', 'ide-references':'Find references', 'ide-annotation':'Leave a note',
  'ide-annotation-chat':'Bring it into the conversation', 'review-overview':'Review across repos',
  'review-changes':'Read the changes', 'review-split':'Compare side by side', attack:'Build it, then break it',
  automations:'Give the routine a workflow', 'automation-output':'Follow the result',
  memory:'Keep the backstory', spaces:'A playground for your mind', 'spaces-paper':'Open a reference',
  visual:'Work through an idea', profile:'Make it work like you do', 'ask-pimi':'Ask Pimi',
  'mobile-chat':'Take the conversation with you', 'mobile-tasks':'Keep your tasks close', 'mobile-task-detail':'Open the task',
};
const HERO = ['agent','tasks','agents','ide','ide-references','ide-annotation','ide-annotation-chat','review-overview','review-changes','attack','spaces','visual','automations','automation-output','memory','mobile-chat','mobile-tasks','mobile-task-detail'];
const GROUPS = [
  ['orchestrate','One conversation. Your whole swarm.',['agent','agents','tasks','task-detail']],
  ['work','Keep your work in view.',['work']],
  ['build-review','Stay with the code.',['ide','ide-references','ide-annotation','ide-annotation-chat']],
  ['review','Review across repos.',['review-overview','review-changes','review-split']],
  ['attack','Build it, then break it.',['attack']],
  ['spaces','A playground for your mind.',['spaces','spaces-paper','visual']],
  ['automations','Give the routine a workflow.',['automations','automation-output']],
  ['memory','You can stop repeating yourself.',['memory']],
  ['voice','Ask Pimi.',['ask-pimi','visual']],
  ['profiles','Make it work like you do.',['profile']],
  ['mobile','Take it with you.',['mobile-chat','mobile-tasks','mobile-task-detail']],
];
let manifestPromise;
let sequence = 0;
const mounted = new WeakMap();
const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
function asset(path) {
  const url = new URL(path, captureBase);
  if (url.origin !== captureBase.origin || !url.pathname.startsWith(captureBase.pathname))
    throw new Error('Capture assets must be inside captures/.');
  return url.href;
}
async function manifest() {
  if (!manifestPromise) manifestPromise = fetch(new URL('manifest.json', captureBase)).then(async response => {
    if (!response.ok) throw new Error('Capture manifest is unavailable.');
    const data = await response.json();
    const list = Array.isArray(data) ? data : data.scenes;
    if (!Array.isArray(list)) throw new Error('Capture manifest must contain a scenes array.');
    const entries = new Map();
    for (const item of list) {
      const entry = typeof item === 'string' ? {id:item,light:`${item}-light.webp`,dark:`${item}-dark.webp`} : item;
      if (!entry?.id || !entry.light || !entry.dark) throw new Error('Each capture needs an id and both theme paths.');
      if (entries.has(entry.id)) throw new Error(`Duplicate capture: ${entry.id}`);
      entries.set(entry.id,{...entry,light:asset(entry.light),dark:asset(entry.dark),label:entry.label || LABELS[entry.id] || entry.id,mobile:entry.mobile ?? entry.id.startsWith('mobile-')});
    }
    return entries;
  }).catch(error => {manifestPromise = undefined; throw error;});
  return manifestPromise;
}
function element(tag, cls, text) {
  const node=document.createElement(tag); if(cls)node.className=cls; if(text)node.textContent=text; return node;
}
function post(frame, message) { frame?.contentWindow?.postMessage(message, location.origin); }
function sleepTimer(set, action, delay) { const id=setTimeout(()=>{set.delete(id);action();},delay);set.add(id);return id; }

async function createFrame(entry, appearance, {live, onReady}) {
  const frame=element('div','rs-frame');
  frame.dataset.scene=entry.id;
  frame.classList.toggle('rs-mobile-frame',entry.mobile);
  const world=element('div','rs-world');
  const image=new Image();image.className='rs-capture';image.alt=entry.label+' in Pimi';image.decoding='async';image.draggable=false;
  image.src=entry[appearance];
  await image.decode();
  // The decoded capture is authoritative: preserve its aspect at logical width
  // 1440 rather than stretching a 1748px-high capture to the common 1752px size.
  const frameHeight=entry.mobile?HEIGHT:image.naturalHeight/(image.naturalWidth/WIDTH);
  world.style.height=`${frameHeight}px`;
  world.style.setProperty('--rs-frame-height',`${frameHeight}px`);
  world.append(image);frame.append(world);
  let osControls;
  if(!entry.mobile){
    // Authorized OS-only decoration redraw. App source window/window-manager.ts
    // sets MAC_TRAFFIC_LIGHT_POSITION={x:16,y:14}; the observed outer capture
    // positions are x16/39/62,y16 with 14px circles. No product chrome is drawn.
    osControls=element('div','rs-os-controls');
    osControls.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++)osControls.append(element('i'));
    world.append(osControls);
  }
  let iframe;
  const nativeView={tasks:'tasks',memory:'memory',spaces:'spaces','ask-pimi':'spaces'}[entry.id];
  if(live&&nativeView){
    iframe=document.createElement('iframe');
    iframe.className='rs-native-panel';iframe.title=`Pimi ${nativeView}`;
    iframe.style.height=`${frameHeight-36}px`;
    iframe.setAttribute('allow','clipboard-write; fullscreen');
    const url=new URL(nativeBase);url.searchParams.set('view',nativeView);url.searchParams.set('appearance',appearance);
    if(nativeView==='memory')url.searchParams.set('projectId',MEMORY_PROJECT);
    iframe.src=url.href;
    world.append(iframe);
  }
  let artifactIframe;
  if(live&&entry.id==='visual'){
    artifactIframe=document.createElement('iframe');
    artifactIframe.className='rs-artifact-panel';
    artifactIframe.title='Preview deploy budget';
    artifactIframe.setAttribute('sandbox','allow-scripts');
    artifactIframe.referrerPolicy='no-referrer';
    const bounds=entry.artifactBounds?.[appearance];
    if(!bounds||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite))
      throw new Error('The artifact needs measured capture bounds.');
    Object.assign(artifactIframe.style,{left:`${bounds.x}px`,top:`${bounds.y}px`,width:`${bounds.width}px`,height:`${bounds.height}px`});
    artifactIframe.src=new URL(appearance==='dark'?'./real-ui/deploy-budget-dark.html':'./real-ui/deploy-budget.html',import.meta.url).href;
    // The original exported document owns its controls and input handlers.
    // Opaque sandbox origin deliberately prevents parent DOM/slider scripting.
    // Keep the measured capture bounds; do not consume height messages.
    artifactIframe.addEventListener('load',()=>artifactIframe.classList.add('rs-artifact-ready'),{once:true});
    world.append(artifactIframe);
  }
  return {entry,node:frame,world,image,iframe,artifactIframe,osControls,frameHeight,ready:!iframe,onReady};
}

async function createPlayer(host, entries, {hero=false,live=true,lazy=false}={}) {
  if(!entries.length)throw new Error('No captures are listed for this presentation.');
  host.classList.add('rs-player');
  const uid='rs-player-'+ ++sequence;
  const stage=element('div','rs-stage');stage.id=uid;
  const controls=element('div','rs-controls');
  const choices=element('div','rs-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose a scene');
  const caption=element('p','rs-caption');
  const errorLabel=element('p','rs-error');errorLabel.hidden=true;errorLabel.setAttribute('role','status');
  entries.forEach((entry,index)=>{const button=element('button','rs-choice');button.type='button';button.title=entry.label;button.dataset.index=String(index);button.setAttribute('aria-label',entry.label);button.setAttribute('aria-controls',uid);button.setAttribute('aria-pressed',String(index===0));button.tabIndex=index===0?0:-1;button.append(element('span','rs-dot'));choices.append(button);});
  choices.hidden=entries.length<2;
  controls.append(choices,caption);host.replaceChildren(stage,controls,errorLabel);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const events=new AbortController();
  const timers=new Set();
  const motionTimers=new Set();
  let current, index=0, visible=false, destroyed=false, manual=false, active=false, generation=0, timer;
  let started=!lazy;
  const frames=new Set();
  let scale=1;
  function resize(){const width=stage.getBoundingClientRect().width;const height=current?.entry.mobile&&width<650?Math.min(width*1.85,740):(current?.frameHeight??HEIGHT)*width/WIDTH;scale=width/WIDTH;stage.style.height=`${height}px`;stage.style.aspectRatio=`${WIDTH}/${current?.frameHeight??HEIGHT}`;for(const frame of frames){const frameScale=frame.entry.mobile?height/frame.frameHeight:scale;frame.world.style.transform=`scale(${frameScale})`;frame.world.style.left=`${(width-WIDTH*frameScale)/2}px`;frame.world.style.top=`${(height-frame.frameHeight*frameScale)/2}px`;}}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  function clearClock(){if(timer){clearTimeout(timer);timers.delete(timer);timer=undefined;}}
  function schedule(){clearClock();if(destroyed||!current||!active||manual||reduced.matches||entries.length<2)return;timer=sleepTimer(timers,()=>{void show((index+1)%entries.length);},hero?5000:6500);}
  function nativeActivity(){
    for(const frame of frames)if(frame.iframe)post(frame.iframe,{type:'pimi-workspace-layout',layout:active&&frame===current?'inline':'hidden'});
  }
  function clearMotion(){for(const id of motionTimers)clearTimeout(id);motionTimers.clear();}
  function setActive(){const previous=active;active=visible&&!document.hidden;nativeActivity();if(!active||reduced.matches){clearMotion();if(reduced.matches&&current?.entry.id==='ask-pimi'&&current.ready)voice(current,finishedVoice);}else if(!previous&&current)startNativeMotion(current);schedule();}
  // These are prerecorded fixture inputs to the actual voice renderer, not microphone processing.
  const voiceTranscript='use the scientist paper in spaces to model deploy retries in a new chat';
  const finishedVoice={visible:true,active:false,status:'',level:0,receipt:{transcript:voiceTranscript,message:'Opened a chat with The Agentic Scientist attached.',state:'finished'}};
  function voice(frame,state){post(frame.iframe,{type:'pimi-fixture-voice-state',state});}
  function dispatchNativeState(frame){
    if(frame.entry.id==='ask-pimi')voice(frame,finishedVoice);
    if(frame.entry.id==='memory')post(frame.iframe,{type:'pimi-fixture-memory-select',projectId:MEMORY_PROJECT,key:'preview-environment-rules'});
    if(frame.entry.id==='tasks')post(frame.iframe,{type:'pimi-fixture-reset-tasks'});
    nativeActivity();
  }
  function startNativeMotion(frame){
    if(!active||manual||reduced.matches||frame!==current||!frame.ready)return;
    if(frame.entry.id==='ask-pimi'){
      clearMotion();
      voice(frame,{visible:true,active:true,status:'Hearing you…',level:.2});
      [.45,.8,.35,.7,.25,.6,.3].forEach((level,i)=>sleepTimer(motionTimers,()=>{
        if(active&&!manual&&frame===current)voice(frame,{visible:true,active:true,status:'Hearing you…',level});
      },180*(i+1)));
      sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)voice(frame,{visible:true,active:false,status:'Transcribing…',level:0});},1600);
      sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)voice(frame,{visible:true,active:false,status:'',level:0,receipt:{transcript:voiceTranscript,message:'Working…',state:'working'}});},2500);
      sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)voice(frame,finishedVoice);},4300);
      sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)startNativeMotion(frame);},11000);
      return;
    }
    if(frame.entry.id!=='tasks')return;
    clearMotion();
    post(frame.iframe,{type:'pimi-fixture-reset-tasks'});
    sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)post(frame.iframe,{type:'pimi-fixture-task-stage',taskId:PREVIEW_TASK,stage:'review'});},1800);
    sleepTimer(motionTimers,()=>{if(active&&!manual&&frame===current)post(frame.iframe,{type:'pimi-fixture-task-stage',taskId:PREVIEW_TASK,stage:'in-progress'});},3900);
  }
  function remove(frame){frames.delete(frame);frame.node.remove();}
  async function show(next, {instant=false}={}){
    started=true;
    const request=++generation;
    clearClock();clearMotion();
    let incoming;
    try{incoming=await createFrame(entries[next],theme(),{live});}
    catch(error){if(request===generation&&!destroyed){errorLabel.hidden=false;errorLabel.textContent=`Unable to load ${entries[next].label}.`;host.dispatchEvent(new CustomEvent('pimi-capture-error',{bubbles:true,detail:{scene:entries[next].id,error}}));}return;}
    if(destroyed||request!==generation){incoming.node.remove();return;}
    errorLabel.hidden=true;
    const previous=current;
    previous?.node.classList.remove('rs-instant');
    current=incoming;index=next;stage.classList.toggle('rs-stage-mobile',Boolean(incoming.entry.mobile));frames.add(incoming);incoming.world.style.transform=`scale(${scale})`;
    incoming.node.style.opacity='0';stage.append(incoming.node);
    for(const frame of frames)if(frame!==incoming&&frame!==previous)remove(frame);
    choices.querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));button.tabIndex=i===index?0:-1;});
    caption.textContent=entries[index].label;
    resize();
    // Whole captured frames crossfade. The crease is an external presentation
    // transition made from the outgoing screenshot, never reconstructed app UI.
    const fold=hero&&previous&&!previous.entry.mobile&&incoming.entry.mobile&&!reduced.matches&&!instant;
    if(fold){
      previous.node.classList.add('rs-folding');
      if(previous.iframe)previous.iframe.style.visibility='hidden';
      previous.image.style.visibility='hidden';
      if(previous.osControls)previous.osControls.style.visibility='hidden';
      for(const side of ['left','right']){const half=element('div',`rs-fold-half rs-fold-${side}`);const copy=previous.image.cloneNode();copy.alt='';copy.setAttribute('aria-hidden','true');copy.style.visibility='visible';half.append(copy);if(side==='left'&&previous.osControls){const controlsCopy=previous.osControls.cloneNode(true);controlsCopy.style.visibility='visible';half.append(controlsCopy);}previous.world.append(half);}
      incoming.node.classList.add('rs-fold-arrival');
    }
    requestAnimationFrame(()=>{if(destroyed)return;incoming.node.style.opacity='1';if(previous)previous.node.style.opacity='0';});
    if(previous){previous.node.inert=true;previous.node.setAttribute('aria-hidden','true');sleepTimer(timers,()=>remove(previous),instant||reduced.matches?0:fold?1000:650);}
    if(instant||reduced.matches)incoming.node.classList.add('rs-instant');
    nativeActivity();startNativeMotion(incoming);schedule();
  }
  host.addEventListener('click',event=>{const button=event.target.closest('.rs-choice');if(!button)return;manual=true;void show(Number(button.dataset.index));},{signal:events.signal});
  choices.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();manual=true;const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowRight'?1:entries.length-1))%entries.length;choices.children[next].focus();void show(next);},{signal:events.signal});
  // Interacting with a live native panel stops automatic scene replacement.
  host.addEventListener('pointerdown',event=>{if(event.target.closest('.rs-stage')){manual=true;clearClock();clearMotion();}},{signal:events.signal});
  window.addEventListener('blur',()=>{if(current&&[current.iframe,current.artifactIframe].filter(Boolean).includes(document.activeElement)){manual=true;clearClock();clearMotion();}},{signal:events.signal});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.data?.type!=='pimi-real-ui-ready')return;
    const frame=[...frames].find(frame=>frame.iframe?.contentWindow===event.source);
    if(!frame)return;frame.ready=true;frame.iframe.classList.add('rs-native-ready');dispatchNativeState(frame);startNativeMotion(frame);
  },{signal:events.signal});
  document.addEventListener('visibilitychange',setActive,{signal:events.signal});
  reduced.addEventListener('change',setActive,{signal:events.signal});
  function ensureInitial(){if(started||destroyed)return;started=true;void show(0,{instant:true});}
  // Decode below-the-fold captures only near their section. Playback still follows
  // the separate actual-visibility observer, never this preloading margin.
  const preload=lazy?new IntersectionObserver(entries=>{if(entries[0].isIntersecting){ensureInitial();preload.disconnect();}},{rootMargin:'500px 0px'}):null;
  preload?.observe(host);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)ensureInitial();setActive();},{threshold:.12});intersection.observe(host);
  const appearanceObserver=new MutationObserver(()=>{if(current)void show(index,{instant:true});});appearanceObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(!lazy)await show(0,{instant:true});
  return {select(id){const next=entries.findIndex(entry=>entry.id===id);if(next<0)return false;manual=true;void show(next);return true;},destroy(){destroyed=true;generation++;events.abort();resizeObserver.disconnect();intersection.disconnect();preload?.disconnect();appearanceObserver.disconnect();for(const timer of timers)clearTimeout(timer);clearMotion();for(const frame of frames)frame.node.remove();frames.clear();host.replaceChildren();host.classList.remove('rs-player');}};
}

export async function mountRealHero(node){
  mounted.get(node)?.destroy();
  const all=await manifest();const entries=HERO.filter(id=>all.has(id)).map(id=>all.get(id));
  const player=await createPlayer(node,entries,{hero:true,live:true});mounted.set(node,player);return player;
}
export async function mountRealFeatures(node){
  mounted.get(node)?.destroy();
  const all=await manifest();const players=[];const roots=[];
  node.classList.add('rs-features');node.replaceChildren();
  for(const [id,title,ids] of GROUPS){
    const entries=ids.filter(id=>all.has(id)).map(id=>all.get(id));if(!entries.length)continue;
    const section=element('section','rs-section');section.id=id;
    const heading=element('h2','rs-heading',title);const scene=element('div','rs-scene');
    section.append(heading);
    if(id==='voice')section.append(element('p','rs-supporting-copy','Just say what you want Pimi to do. And don’t forget to pet her.'));
    section.append(scene);node.append(section);roots.push(section);
    players.push(await createPlayer(scene,entries,{live:true,lazy:true}));
  }
  const usageSection=element('section','rs-section');usageSection.id='usage';usageSection.append(element('h2','rs-heading','See what went in. And what came out.'));
  const usageNode=element('div','rs-usage');usageSection.append(usageNode);node.append(usageSection);roots.push(usageSection);
  const usage=mountUsage(usageNode);
  const api={destroy(){for(const player of players)player.destroy();usage.destroy();for(const root of roots)root.remove();node.classList.remove('rs-features');mounted.delete(node);}};
  mounted.set(node,api);return api;
}
