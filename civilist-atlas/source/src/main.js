import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/cyrillic-700.css';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/latin-600.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-700.css';
import './style.css';
import logo from './logo.svg';
import {cases,finale} from './content.js';
import {mountWorld,mountFinalWorld} from './world.js';

const root=document.querySelector('#app');
const key='civilist-atlas-v4-position';
let stored;try{stored=JSON.parse(localStorage.getItem(key)||'null')}catch{}
const state={mode:'library',case:2,step:0,docOpen:false,motion:localStorage.getItem('civilist-atlas-motion')!=='off'};
let world=null,books=null,busy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){if(state.mode==='case'){stored={case:state.case,step:state.step};localStorage.setItem(key,JSON.stringify(stored))}}
function destroy(){world?.destroy();books?.destroy?.();world=books=null}
function header(){return `<header class="top"><div class="brand"><img src="${logo}" alt="СГЮА 95 лет"><span>ЦИВИЛИСТ<small>ПРАВОВАЯ ЛАБОРАТОРИЯ</small></span></div><div class="course">СГЮА · ГРАЖДАНСКОЕ ПРАВО · II КУРС</div><div class="top-actions"><button data-action="motion" title="Отключить или включить кинематографическое движение" aria-label="Переключить анимацию">${state.motion?'ДВИЖЕНИЕ: ВКЛ':'ДВИЖЕНИЕ: ВЫКЛ'}</button><button data-action="fullscreen" title="Полный экран, клавиша F">⛶ <span>НА ВЕСЬ ЭКРАН</span></button></div></header>`}
function bottom(left,right){return `<footer class="bottom"><div class="bottom-left">${left}</div><div class="bottom-right">${right}</div></footer>`}
function library(){
  destroy();state.mode='library';
  root.innerHTML=`${header()}<main class="library"><div class="library-art"><div id="book-stage" class="book-stage" aria-hidden="true"></div><div class="library-heading"><span class="eyebrow">АВТОРСКИЙ ИНТЕРАКТИВНЫЙ АТЛАС <b>01 / 03</b></span><h1>ГОСУДАРСТВО<br><em>НА РАВНЫХ?</em></h1><p>Публично-правовые образования<br>как субъекты гражданского права</p></div><div class="library-index">ТРИ ДЕЛА. ОДИН ВОПРОС О СУБЪЕКТЕ.</div></div><div class="library-choose"><div class="section-label">ВЫБЕРИ ТОМ <span>1 / 2 / 3 НА КЛАВИАТУРЕ</span></div><div class="book-links">${cases.map((c,i)=>`<button data-case="${i}"><b>0${i+1}</b><span>${esc(c.name)}<small>${esc(c.subtitle)}</small></span><i>↗</i></button>`).join('')}</div>${stored&&Number.isInteger(stored.case)?`<button class="resume" data-action="resume">↗ ПРОДОЛЖИТЬ: ДЕЛО ${cases[stored.case]?.roman||'I'}, ШАГ ${(stored.step||0)+1}</button>`:''}</div></main>${bottom('<span>АНТОНОВ М. А. · КАФЕДРА ГРАЖДАНСКОГО ПРАВА</span>','<button data-action="reset">СБРОСИТЬ ПРОГРЕСС</button>')}`;
  // The library module is lazy to keep the first legal scene independent of book loading.
  import('./books.js').then(({mountBooks})=>{if(state.mode!=='library')return;books=mountBooks(document.querySelector('#book-stage'),i=>openCase(i));if(!books)document.querySelector('#book-stage').innerHTML=libraryFallback()}).catch(()=>{if(state.mode==='library')document.querySelector('#book-stage').innerHTML=libraryFallback()});
}
function libraryFallback(){return `<div class="fallback-books">${cases.map((c,i)=>`<button data-case="${i}" class="fb-book fb-${i}" aria-label="Открыть том ${c.roman}"><b>${c.roman}</b><small>ЦИВИЛИСТ / ${c.roman}</small><strong>${esc(c.name)}</strong><i>СГЮА · 2026</i></button>`).join('')}</div><div class="fallback-library-note">РЕЗЕРВНЫЙ РЕЖИМ БЕЗ WEBGL</div>`}
function fallbackArt(c,step){
  const all=c.id==='institutions';
  return `<div class="fallback-scene ${c.hue}" aria-hidden="true"><div class="fallback-grid"></div><svg viewBox="0 0 900 650" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="face" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e9f9ff"/><stop offset="1" stop-color="#65a6d8"/></linearGradient></defs>${all?`<g transform="translate(105 125)">${buildingSvg(260,330)}</g><g transform="translate(490 95)">${buildingSvg(260,330)}</g>`:`<g transform="translate(250 100)">${buildingSvg(420,410)}</g>`}<path d="M90 565 L450 635 L840 558" fill="none" stroke="#c4f84a" stroke-width="2" opacity=".8"/><path d="M90 580 L450 650 L840 573" fill="none" stroke="#c4f84a" stroke-width="1" opacity=".4"/></svg><div class="fallback-number">0${step+1}</div><div class="fallback-note">РЕЗЕРВНЫЙ РЕЖИМ БЕЗ WEBGL</div></div>`
}
function buildingSvg(w,h){return `<path d="M0 ${h*.22} L${w*.78} 0 L${w} ${h*.10} L${w*.23} ${h*.33}Z" fill="#62d2ee" stroke="#d4ffff" stroke-width="3"/><path d="M0 ${h*.22} L${w*.23} ${h*.33} V${h} L0 ${h*.83}Z" fill="#1c4b96" stroke="#d4ffff" stroke-width="3"/><path d="M${w*.23} ${h*.33} L${w} ${h*.10} V${h*.78} L${w*.23} ${h}Z" fill="url(#face)" stroke="#d4ffff" stroke-width="3"/>${Array.from({length:4},(_,j)=>Array.from({length:6},(_,i)=>`<path d="M${w*(.29+i*.105)} ${h*(.40+j*.125)} l${w*.067} -${h*.019} v${h*.075} l-${w*.067} ${h*.019}z" fill="#1543a1" stroke="#88e4f3" stroke-width="2"/>`).join('')).join('')}<path d="M${w*.57} ${h*.90} v-${h*.26} l${w*.14} -${h*.04} v${h*.26}z" fill="#103174" stroke="#d4ffff" stroke-width="3"/>`}
function openCase(i,step=0){
  if(i<0||i>=cases.length)return;destroy();state.mode='case';state.case=i;state.step=Math.min(Math.max(step,0),cases[i].steps.length-1);state.docOpen=!!cases[i].steps[state.step].doc;save();
  const c=cases[i];root.innerHTML=`${header()}<main class="case-view ${c.hue}"><div class="case-head"><button data-action="library">↖ АТЛАС</button><span>ДЕЛО ${c.roman} / ${esc(c.subtitle)}</span><strong id="count"></strong></div><div class="case-main"><section class="narrative" id="narrative"></section><div class="visual"><div id="world-stage" class="world-stage"></div><div class="visual-mark">ЦИВИЛИСТ / ${c.roman}</div><div class="relation-labels" id="relation-labels"></div><div class="spatial-label" id="spatial-label"></div><div id="doc-layer" class="doc-layer"></div></div></div></main>${bottom('<div id="step-dots" class="step-dots"></div>','<button data-action="prev">← НАЗАД</button><button class="next" data-action="next">ДАЛЕЕ <b>→</b></button>')}`;
  const stage=document.querySelector('#world-stage');world=mountWorld(stage,c.id,()=>showDoc());
  if(!world)stage.innerHTML=fallbackArt(c,state.step);
  else stage.querySelector('canvas')?.addEventListener('webglcontextlost',e=>{e.preventDefault();world?.destroy();world=null;stage.innerHTML=fallbackArt(c,state.step)});
  world?.setMotion(!state.motion);renderStep(true);
}
function renderStep(animate=true){
  const c=cases[state.case],s=c.steps[state.step];
  document.querySelector('#count').textContent=`${String(state.step+1).padStart(2,'0')} / ${String(c.steps.length).padStart(2,'0')}`;
  document.querySelector('#narrative').innerHTML=`<div class="narrative-top"><div class="eyebrow"><i></i> ТОМ ${c.roman} / ${esc(s.label)}</div><div class="timing">${c.time}</div></div><div class="narrative-body"><h2>${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>${s.fact?`<p class="fact">${esc(s.fact)}</p>`:''}${s.norm?`<p class="norm"><b>НОРМАТИВНАЯ ОПОРА</b>${esc(s.norm)}</p>`:''}</div><div class="question"><span>ВОПРОС АУДИТОРИИ</span><p>${esc(s.question)}</p></div>`;
  document.querySelector('#step-dots').innerHTML=c.steps.map((x,j)=>`<button data-step="${j}" aria-label="Шаг ${j+1}: ${esc(x.label)}" title="${esc(x.label)}" class="${j===state.step?'active':''}">${String(j+1).padStart(2,'0')}</button>`).join('');
  document.querySelector('#spatial-label').innerHTML=`<span>0${state.case+1} / ${String(state.step+1).padStart(2,'0')}</span><b>${esc(s.label)}</b>`;
  const relation=document.querySelector('#relation-labels');
  if(relation)relation.innerHTML=relationLabels(c.id,state.step,c.steps.length-1);
  world?.setStep(state.step,animate);
  if(!world)document.querySelector('#world-stage').innerHTML=fallbackArt(c,state.step);
  updateDoc();save();
}
function relationLabels(id,step,last){
  if(id==='municipality'&&step===last)return '<div class="relation-tag relation-left">ГОРОД Н <small>собственник и сторона</small></div><div class="relation-tag relation-right">КОМИТЕТ <small>действует от имени Города Н</small></div><div class="relation-tag relation-below">ООО «АЛЬФА» <small>покупатель</small></div>';
  if(id==='institutions'&&step===last)return '<div class="relation-tag relation-left">КАЗЕННОЕ <small>непосредственный ответчик</small></div><div class="relation-tag relation-right">БЮДЖЕТНОЕ <small>самостоятельный должник</small></div>';
  if(id==='registration'&&step===last)return '<div class="relation-tag relation-left">ОРГАН РЕГИСТРАЦИИ <small>незаконный отказ</small></div><div class="relation-tag relation-right">РОССИЙСКАЯ ФЕДЕРАЦИЯ <small>при доказанности убытков</small></div>';
  return '';
}
function updateDoc(){const s=cases[state.case].steps[state.step],d=s.doc,el=document.querySelector('#doc-layer');if(!el)return;
  if(!d||!state.docOpen){el.innerHTML=d?`<button class="open-document" data-action="doc">ОТКРЫТЬ ДОКУМЕНТ ↗</button>`:'';el.classList.remove('visible');return}
  el.classList.add('visible');el.innerHTML=`<article class="document" aria-label="${esc(d.head)}"><div class="doc-top"><span>${esc(d.tag)}</span><button data-action="close-doc" aria-label="Закрыть документ">×</button></div><div class="doc-title">${esc(d.head)}</div><div class="doc-rows">${d.rows.map(([k,v],i)=>`<div><b>0${i+1} / ${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div><div class="doc-foot">УСЛОВНЫЙ ДОКУМЕНТ · ЦИВИЛИСТ</div></article>`;
}
function showDoc(){if(state.mode==='case'&&cases[state.case].steps[state.step].doc){state.docOpen=true;updateDoc()}}
function next(){if(state.mode==='library'){openCase(0);return}if(state.mode==='final'){library();return}const c=cases[state.case];if(state.step<c.steps.length-1){state.step++;state.docOpen=!!c.steps[state.step].doc;renderStep()}else if(state.case<2)openCase(state.case+1);else finalScene()}
function prev(){if(state.mode==='final'){openCase(2,cases[2].steps.length-1);return}if(state.mode==='case'){if(state.step>0){state.step--;state.docOpen=!!cases[state.case].steps[state.step].doc;renderStep()}else library()}}
function finalFallback(){return `<div class="final-fallback"><svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="face" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f0fcff"/><stop offset="1" stop-color="#75b3d9"/></linearGradient></defs><g transform="translate(75 44) scale(.7)">${buildingSvg(300,360)}</g><g transform="translate(438 54) scale(.56)">${buildingSvg(250,320)}</g><g transform="translate(610 54) scale(.56)">${buildingSvg(250,320)}</g><g transform="translate(887 44) scale(.7)">${buildingSvg(300,360)}</g><path d="M70 355H315M438 355H786M890 355H1135" stroke="#e8ff55" stroke-width="3" fill="none"/></svg><div class="final-fallback-captions"><span>I / ПУБЛИЧНЫЙ СУБЪЕКТ</span><span>II / ДВА УЧРЕЖДЕНИЯ</span><span>III / ОТКАЗ И УБЫТКИ</span></div></div>`}
function finalScene(){destroy();state.mode='final';root.innerHTML=`${header()}<main class="finale"><div class="finale-head"><span>ИТОГ / 80–88 МИН</span><h2>${esc(finale.title)}</h2><p>Как меняется источник гражданско-правового обязательства?</p></div><div class="finale-art" id="final-stage"></div><div class="finale-grid">${finale.items.map(([n,h,p])=>`<section><span>${n}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></section>`).join('')}</div><div class="finale-foot">${esc(finale.close)}</div></main>${bottom('<span>СНАЧАЛА СУБЪЕКТ. ЗАТЕМ ОСНОВАНИЕ.</span>','<button data-action="prev">← К ДЕЛУ III</button><button class="next" data-action="library">В АТЛАС ↗</button>')}`;const stage=document.querySelector('#final-stage');world=mountFinalWorld(stage);if(!world)stage.innerHTML=finalFallback()}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{const e=document.querySelector('.top-actions');e?.setAttribute('data-tip','Браузер не разрешил полный экран');setTimeout(()=>e?.removeAttribute('data-tip'),3000)}}
root.addEventListener('click',e=>{const target=e.target.closest('[data-action],[data-case],[data-step]');if(!target)return;const a=target.dataset.action;
  if(target.dataset.case!==undefined){openCase(+target.dataset.case);return}
  if(target.dataset.step!==undefined&&state.mode==='case'){const n=+target.dataset.step;if(n!==state.step){state.step=n;state.docOpen=!!cases[state.case].steps[n].doc;renderStep()}return}
  if(a==='next')next();if(a==='prev')prev();if(a==='library')library();if(a==='doc')showDoc();if(a==='close-doc'){state.docOpen=false;updateDoc()}
  if(a==='fullscreen')fullscreen();if(a==='motion'){state.motion=!state.motion;localStorage.setItem('civilist-atlas-motion',state.motion?'on':'off');world?.setMotion(!state.motion);target.textContent=`ДВИЖЕНИЕ: ${state.motion?'ВКЛ':'ВЫКЛ'}`}
  if(a==='reset'){localStorage.removeItem(key);stored=null;library()};if(a==='resume'&&stored)openCase(stored.case,stored.step);
});
document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(['ArrowRight','Space'].includes(e.code)){e.preventDefault();next()}
  if(e.code==='ArrowLeft'){e.preventDefault();prev()}
  if(e.code==='Escape'){if(state.docOpen){state.docOpen=false;updateDoc()}else if(state.mode!=='library')library()}
  if(e.code==='KeyF'){e.preventDefault();fullscreen()}
  if(e.code==='KeyR'&&state.mode==='case'){e.preventDefault();world?.setStep(state.step,true,true)}
  if(['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(e.code)){e.preventDefault();openCase(+e.code.slice(-1)-1)}
});
library();
