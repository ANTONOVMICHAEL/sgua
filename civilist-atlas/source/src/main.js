import './style.css';
import {cases} from './content.js';
import {homework,normNotes} from './homework.js';
import {volumes,traces,synopsis,closingNotes} from './interpretation.js';
import {createScene} from './scene.js';

const app=document.querySelector('#app');
const STORAGE='civilist-atlas-v7';
const oldKeys=['civilist-atlas-v6-position','civilist-atlas-v5-position'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const pad=n=>String(n).padStart(2,'0');
const clean=s=>String(s??'').replaceAll('ё','е').replaceAll('Ё','Е');
const esc=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeRead=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const safeWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const valid=p=>Number.isInteger(p?.case)&&cases[p.case]&&Number.isInteger(p?.step)&&p.step>=0&&p.step<cases[p.case].steps.length;
const saved=safeRead(STORAGE);
const legacy=oldKeys.map(safeRead).find(x=>valid(x?.point)||valid(x));
const initial=valid(saved?.point)?saved.point:valid(legacy?.point)?legacy.point:valid(legacy)?legacy:null;
const state={
  view:'home',case:initial?.case??0,step:initial?.step??0,
  point:initial,positions:Array.isArray(saved?.positions)?saved.positions.slice(0,3):[0,0,0],
  max:Array.isArray(saved?.max)?saved.max.slice(0,3):[0,0,0],
  reading:null,motion:saved?.motion!==false,large:false,zoom:1,highlight:-1,
  renderer:'pending',help:false
};
while(state.positions.length<3)state.positions.push(0);
while(state.max.length<3)state.max.push(0);
const sceneHost=document.createElement('div');
sceneHost.id='scene';
sceneHost.setAttribute('aria-label','Объемное пространство атласа');
let scene=null,focusReturn=null;

function persist(){
  safeWrite(STORAGE,{point:state.point,positions:state.positions,max:state.max,motion:state.motion});
}
function announce(message){const el=document.querySelector('#announcement');if(el)el.textContent=clean(message)}
function header(){
  return `<header class="header">
    <button class="brand" data-action="home" aria-label="К коллекции томов"><span class="brand-mark">Ц</span><span><b>ЦИВИЛИСТ</b><small>ПРАВОВАЯ ЛАБОРАТОРИЯ</small></span></button>
    <div class="header-topic">Государство на равных? <span>Публично-правовые образования</span></div>
    <div class="header-actions">
      <button data-action="motion" aria-pressed="${state.motion&&!reduced.matches}" title="Пауза или продолжение движения">${state.motion&&!reduced.matches?'Пауза':'Движение'}</button>
      <button data-action="fullscreen" title="Полный экран">На весь экран</button>
      <button data-action="help" title="Управление">?</button>
    </div>
  </header>`;
}
function transport(){
  if(state.view==='home')return `<footer class="transport"><div class="transport-identity"><span>АНТОНОВ М. А.</span><span>КАФЕДРА ГРАЖДАНСКОГО ПРАВА СГЮА</span></div>
    <button class="button-primary" data-action="next">Открыть том I <b>→</b></button></footer>`;
  if(state.view==='final')return `<footer class="transport"><button class="button-back" data-action="prev">← К последнему делу</button><span class="transport-identity">ИТОГ / 23</span><button class="button-primary" data-action="home">К коллекции томов <b>↗</b></button></footer>`;
  const c=cases[state.case],s=c.steps[state.step],next=c.steps[state.step+1];
  const label=next?`Далее: ${next.label.toLocaleLowerCase('ru')}`:state.case===2?'К общему итогу':`К тому ${volumes[state.case+1].roman}`;
  return `<footer class="transport">
    <button class="button-back" data-action="prev">← ${state.step?'Назад':'К томам'}</button>
    <div class="step-track" role="group" aria-label="Кадры дела">${c.steps.map((item,i)=>`<button data-step="${i}" ${i>state.max[state.case]?'disabled':''} ${i===state.step?'aria-current="step"':''} aria-label="Кадр ${i+1}: ${esc(i<=state.max[state.case]?item.label:'еще не открыт')}">${pad(i+1)}</button>`).join('')}</div>
    <span class="progress">${volumes[state.case].roman} / ${pad(state.step+1)} <i>из ${pad(c.steps.length)}</i></span>
    <button class="button-primary" data-action="next">${esc(label)} <b>→</b></button>
  </footer>`;
}
function home(){
  return `<main class="surface home" data-view="home">
    <div class="home-field" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div>
    <div class="home-intro">
      <p class="eyebrow"><span class="dot"></span> ИНТЕРАКТИВНЫЙ ЮРИДИЧЕСКИЙ АТЛАС <span class="edition">СЕМИНАР · II КУРС</span></p>
      <h1>ГОСУДАРСТВО<br><em>на равных?</em></h1>
      <p class="home-description">Три дела о том, как публичный субъект входит в гражданское право и где проходят границы его ответственности.</p>
      ${state.point?`<button class="resume" data-action="resume">Продолжить с тома ${volumes[state.point.case].roman}, кадр ${pad(state.point.step+1)} <span>↗</span></button>`:''}
    </div>
    <div class="book-visual" id="scene-slot"></div>
    <nav class="catalog" aria-label="Выбрать дело">${volumes.map((v,i)=>`<button data-case="${i}" style="--volume:${['#005aa5','#e84b30','#087d70'][i]}" aria-label="Открыть том ${v.roman}: ${esc(v.title)}"><span class="catalog-no">${v.roman}</span><span><small>ТОМ ${v.roman} / ${esc(v.label)}</small><b>${esc(v.title)}</b></span><strong>↗</strong></button>`).join('')}</nav>
    <p class="home-hint">${state.renderer==='fallback'?'Выберите том. Каждое дело откроется одним нажатием.':'Книги можно вращать мышью. Нажатие открывает дело.'}</p>
  </main>`;
}
function relation(){
  const item=traces[state.case][state.step][1];
  const k=item.kind;
  return `<div class="relation" data-kind="${k}" aria-label="Связь обстоятельств">
    <div><small>${esc(item.cells[0][0])}</small><b>${esc(item.cells[0][1])}</b></div>
    <span class="relation-link" aria-hidden="true"><i></i><em>${esc(item.relation|| (k==='money'?'СОПОСТАВИТЬ':'РАЗЛИЧИТЬ'))}</em><i></i></span>
    <div><small>${esc(item.cells[1][0])}</small><b>${esc(item.cells[1][1])}</b></div>
  </div>`;
}
function caseView(){
  const c=cases[state.case],s=c.steps[state.step],v=volumes[state.case];
  const placement=['left','bottom','right','left','bottom','right','left'][state.step%7];
  return `<main class="surface case-view" data-view="case" data-case="${v.roman}" data-placement="${placement}">
    <div class="case-color" aria-hidden="true"></div>
    <nav class="case-nav" aria-label="Выбор дела"><span class="case-index">ДЕЛО ${v.roman}</span>${volumes.map((b,i)=>`<button data-case="${i}" ${i===state.case?'aria-current="page"':''} title="${esc(b.title)}">0${i+1}</button>`).join('')}</nav>
    <div class="scene-shell" id="scene-slot"></div>
    <section class="case-copy" aria-labelledby="case-heading">
      <p class="case-kicker">${esc(s.label)} <span>${pad(state.step+1)} / ${pad(c.steps.length)}</span></p>
      <h1 id="case-heading" tabindex="-1">${esc(s.title)}</h1>
      <p class="case-lead">${esc(s.lead)}</p>
      ${s.fact?`<p class="case-fact">${esc(s.fact)}</p>`:''}
      <div class="case-links">${s.doc?`<button data-action="document">Читать документ <span>↗</span></button>`:''}<button data-action="homework">Полное условие <span>↗</span></button>${s.reveal||normNotes[`${c.id}:${state.step}`]?`<button data-action="norms">Нормы и условия <span>↗</span></button>`:''}</div>
    </section>
    <div class="object-note"><span class="object-note-num">0${state.case+1} / ${pad(state.step+1)}</span><b>${esc(traces[state.case][state.step][0])}</b></div>
    <div class="case-bottom"><section class="question"><span>ВОПРОС АУДИТОРИИ</span><p>${esc(s.question)}</p></section>${relation()}</div>
    <aside class="reader" id="reader" hidden></aside>
  </main>`;
}
function finalView(){
  return `<main class="surface final-view" data-view="final">
    <div class="final-scene" id="scene-slot"></div>
    <div class="final-heading"><p class="eyebrow">СИСТЕМАТИЗАЦИЯ / 78–84 МИН</p><h1>Три основания.<br><em>Три конструкции.</em></h1><p>Какой факт изменил правовую квалификацию в каждом деле?</p></div>
    <div class="final-grid">${synopsis.map((row,i)=>`<section><span class="final-num">${volumes[i].roman}</span><h2>${esc(row[0].replace(/^...· /,''))}</h2><dl><dt>Кто действует</dt><dd>${esc(row[1])}</dd><dt>На ком обязанность</dt><dd>${esc(row[2])}</dd><dt>Пределы</dt><dd>${esc(row[3])}</dd></dl><button data-case="${i}">Вернуться к делу ↗</button></section>`).join('')}</div>
  </main>`;
}
function documentReader(kind){
  const s=cases[state.case].steps[state.step],doc=s.doc;
  let title,tag,body;
  if(kind==='document'){
    title=doc.head;tag=doc.tag;
    body=`<div class="doc-fields">${doc.rows.map(([a,b],i)=>`<section data-field="${i}" ${state.highlight===i?'data-marked="true"':''}><span class="field-index">${pad(i+1)}</span><h3>${esc(a)}</h3><p>${esc(b)}</p></section>`).join('')}</div>`;
  }else if(kind==='homework'){
    title='Исходная фабула';tag='Домашнее задание · учебный казус';
    body=homework[state.case].map(p=>`<p class="reader-paragraph">${esc(p)}</p>`).join('');
  }else{
    title='Нормы и условия';tag='Правовая опора для обсуждения';
    const note=normNotes[`${cases[state.case].id}:${state.step}`];
    body=(s.reveal?closingNotes[state.case]:[note]).filter(Boolean).map(p=>`<p class="reader-paragraph">${esc(p)}</p>`).join('');
  }
  return `<div class="reader-top"><span>ДОСЬЕ ${volumes[state.case].roman} / ${pad(state.step+1)}</span><button data-action="close" aria-label="Закрыть документ">✕</button></div>
    <div class="reader-scroll" style="--reader-zoom:${state.zoom}">
      <p class="reader-tag">${esc(tag)}</p><h2 id="reader-title" tabindex="-1">${esc(title)}</h2>
      ${body}
      ${kind==='document'?`<p class="reader-note">Учебная модель документа. Выделение меняет акцент, не добавляет фактов.</p>`:''}
    </div>
    <div class="reader-bottom">
      ${kind==='document'?'<button data-action="mark">Выделить фрагмент</button>':''}
      <div class="zoom"><button data-action="zoom-out" aria-label="Уменьшить текст">−</button><span>${Math.round(state.zoom*100)}%</span><button data-action="zoom-in" aria-label="Увеличить текст">+</button></div>
      <button data-action="close" class="reader-close">К обсуждению ↗</button>
    </div>`;
}
function helpPanel(){
  return `<div class="help-backdrop" data-action="close-help"></div><section class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div class="help-top"><span>ПУЛЬТ ПРЕПОДАВАТЕЛЯ</span><button data-action="close-help" aria-label="Закрыть управление">✕</button></div>
    <h2 id="help-title">Твой темп.<br><em>Одна команда.</em></h2>
    <dl><dt>Page Down / →</dt><dd>Следующий факт</dd><dt>Page Up / ←</dt><dd>Возврат</dd><dt>1, 2, 3</dt><dd>Выбор дела</dd><dt>Esc</dt><dd>Закрыть документ, затем перейти к томам</dd><dt>M</dt><dd>Пауза движения</dd><dt>F</dt><dd>Полный экран</dd></dl>
    <p>Позиция в каждом деле сохраняется. После перезагрузки используй «Продолжить».</p>
    <button class="reset" data-action="reset">Сбросить для новой группы</button>
  </section>`;
}
function render({focus=false}={}){
  const existing=sceneHost.parentElement;
  if(existing)existing.removeChild(sceneHost);
  app.innerHTML=`${header()}${state.view==='home'?home():state.view==='case'?caseView():finalView()}${transport()}<div id="announcement" class="sr-only" aria-live="polite"></div>${state.help?helpPanel():''}`;
  document.querySelector('#scene-slot').append(sceneHost);
  document.body.dataset.view=state.view;
  document.body.dataset.case=state.view==='case'?volumes[state.case].roman:'';
  document.body.classList.toggle('large-type',state.large);
  scene?.show(state.view,state.case,state.step);
  scene?.setMotion(state.motion&&!reduced.matches);
  scene?.setReading(false);
  if(state.reading)showReader(false);
  if(focus)document.querySelector('#case-heading, .home-intro h1, .final-heading h1')?.focus({preventScroll:true});
  announce(state.view==='case'?`Том ${volumes[state.case].roman}, кадр ${state.step+1} из ${cases[state.case].steps.length}. ${cases[state.case].steps[state.step].title}`:state.view==='final'?'Общий итог':'Коллекция трех томов');
}
function visit(i,step=state.positions[i]||0){
  if(!cases[i])return;
  state.view='case';state.case=i;state.step=Math.max(0,Math.min(step,cases[i].steps.length-1));
  state.positions[i]=state.step;state.max[i]=Math.max(state.max[i],state.step);
  state.point={case:i,step:state.step};state.reading=null;state.highlight=-1;
  persist();render({focus:true});
}
function next(){
  if(state.reading)return;
  if(state.view==='home'){visit(0,0);return}
  if(state.view==='final'){state.view='home';render();return}
  if(state.step<cases[state.case].steps.length-1){visit(state.case,state.step+1);return}
  if(state.case<2)visit(state.case+1,0);else{state.view='final';render({focus:true})}
}
function prev(){
  if(state.reading)return;
  if(state.view==='final'){visit(state.point?.case??2,state.point?.step??8);return}
  if(state.view==='home')return;
  if(state.step>0)visit(state.case,state.step-1);
  else{state.view='home';render({focus:true})}
}
function showReader(focus=true){
  if(!state.reading||state.view!=='case')return;
  const panel=document.querySelector('#reader');
  panel.innerHTML=documentReader(state.reading);panel.hidden=false;
  document.querySelector('.case-view').dataset.reading='true';
  scene?.setReading(true);
  if(focus)panel.querySelector('#reader-title').focus({preventScroll:true});
}
function openReader(kind){
  if(state.view!=='case'||state.reading||kind==='document'&&!cases[state.case].steps[state.step].doc)return;
  focusReturn=document.activeElement;state.reading=kind;state.zoom=1;state.highlight=-1;
  showReader();
}
function closeReader(){
  if(!state.reading)return;
  state.reading=null;document.querySelector('#reader').hidden=true;
  document.querySelector('.case-view').dataset.reading='false';
  scene?.setReading(false);
  if(focusReturn?.isConnected)focusReturn.focus({preventScroll:true});else document.querySelector('#case-heading')?.focus({preventScroll:true});
}
async function fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{announce('Полный экран недоступен')}
}
function action(name){
  switch(name){
    case 'home':if(state.reading)closeReader();state.view='home';render({focus:true});break;
    case 'resume':if(valid(state.point))visit(state.point.case,state.point.step);break;
    case 'next':next();break;
    case 'prev':prev();break;
    case 'document':case 'homework':case 'norms':openReader(name);break;
    case 'close':closeReader();break;
    case 'motion':state.motion=!state.motion;persist();scene?.setMotion(state.motion&&!reduced.matches);document.querySelector('[data-action="motion"]').textContent=state.motion&&!reduced.matches?'Пауза':'Движение';document.querySelector('[data-action="motion"]').setAttribute('aria-pressed',String(state.motion&&!reduced.matches));break;
    case 'fullscreen':void fullscreen();break;
    case 'help':state.help=true;render();document.querySelector('.help-panel [data-action="close-help"]')?.focus();break;
    case 'close-help':state.help=false;render();document.querySelector('[data-action="help"]')?.focus();break;
    case 'reset':
      state.point=null;state.positions=[0,0,0];state.max=[0,0,0];state.reading=null;state.highlight=-1;state.zoom=1;state.help=false;state.view='home';persist();render({focus:true});break;
    case 'mark':
      state.highlight=(state.highlight+1)%cases[state.case].steps[state.step].doc.rows.length;showReader(false);
      document.querySelector(`[data-field="${state.highlight}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});break;
    case 'zoom-in':case 'zoom-out':
      state.zoom=Math.max(.85,Math.min(1.6,state.zoom+(name==='zoom-in'?.1:-.1)));showReader(false);break;
  }
}
app.addEventListener('click',e=>{
  const target=e.target.closest('button[data-action],button[data-case],button[data-step],.help-backdrop');
  if(!target||target.disabled)return;
  if(target.dataset.case!==undefined){visit(Number(target.dataset.case));return}
  if(target.dataset.step!==undefined){visit(state.case,Number(target.dataset.step));return}
  action(target.dataset.action);
});
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
  if(state.help){if(e.key==='Escape'){e.preventDefault();action('close-help')}return}
  if(e.key==='Escape'){e.preventDefault();if(state.reading)closeReader();else action('home');return}
  if(e.code==='KeyF'){e.preventDefault();void fullscreen();return}
  if(e.code==='KeyM'){e.preventDefault();action('motion');return}
  if(state.reading)return;
  if(/^(Digit|Numpad)[123]$/.test(e.code)){e.preventDefault();visit(Number(e.code.slice(-1))-1);return}
  if(e.code==='Space'&&e.target.closest?.('button,a'))return;
  if(['Space','ArrowRight','PageDown'].includes(e.code)){e.preventDefault();next()}
  if(['ArrowLeft','PageUp'].includes(e.code)){e.preventDefault();prev()}
});
reduced.addEventListener('change',()=>{scene?.setMotion(state.motion&&!reduced.matches);const b=document.querySelector('[data-action="motion"]');if(b){b.textContent=state.motion&&!reduced.matches?'Пауза':'Движение';b.setAttribute('aria-pressed',String(state.motion&&!reduced.matches))}});
render();
scene=createScene(sceneHost,{
  onSelectBook:i=>visit(i,0),
  onDocument:()=>{if(state.view==='case'&&cases[state.case].steps[state.step].doc)openReader('document')},
  onModeChange:mode=>{
    state.renderer=mode;sceneHost.dataset.renderer=mode;document.body.dataset.renderer=mode;
    const hint=document.querySelector('.home-hint');
    if(hint)hint.textContent=mode==='fallback'?'Выберите том. Каждое дело откроется одним нажатием.':'Книги можно вращать мышью. Нажатие открывает дело.';
  }
});
scene.show(state.view,state.case,state.step);
scene.setMotion(state.motion&&!reduced.matches);
