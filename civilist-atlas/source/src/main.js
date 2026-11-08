import '@fontsource/cormorant-garamond/cyrillic-400.css';
import '@fontsource/cormorant-garamond/cyrillic-500.css';
import '@fontsource/cormorant-garamond/cyrillic-400-italic.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import './style.css';
import logo from './logo.svg';
import {cases,finale} from './content.js';
import {homework,normNotes} from './homework.js';
import {mountWorld,mountFinalWorld} from './world.js';
import {mountBooks} from './books.js';

const root=document.querySelector('#app'),key='civilist-atlas-v5-position';
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}},remove(k){try{localStorage.removeItem(k)}catch{}}};
let remembered;try{remembered=JSON.parse(store.get(key)||'null')}catch{}
function valid(p){return p&&Number.isInteger(p.case)&&p.case>=0&&p.case<3&&Number.isInteger(p.step)&&p.step>=0&&p.step<cases[p.case].steps.length}
if(!valid(remembered))remembered=null;
const state={mode:'library',case:0,step:0,reading:null,motion:store.get('civilist-motion')!=='off',large:false};
let world=null,books=null,lastFocus=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleCase=s=>s[0]+s.slice(1).toLocaleLowerCase('ru');
function dispose(){world?.destroy();books?.destroy();world=books=null}
function save(){remembered={case:state.case,step:state.step};store.set(key,JSON.stringify(remembered))}
function header(){return `<header class="masthead"><button class="wordmark" data-action="library" aria-label="Цивилист. Вернуться в атлас"><span class="brand-symbol">ц<span>л</span></span><span>Цивилист<small>Правовая лаборатория</small></span></button><div class="academic"><img src="${logo}" alt="СГЮА 95 лет"><span>Саратовская государственная<br>юридическая академия</span></div><div class="tools"><button data-action="motion" aria-pressed="${state.motion}" title="Отключить анимацию">${state.motion?'Движение вкл':'Движение выкл'}</button><button data-action="large" aria-pressed="${state.large}" title="Увеличить текст для проектора">Аа</button><button data-action="fullscreen" aria-label="Полный экран" title="Полный экран · F">⛶</button></div></header>`}
function footer(left,right){return `<footer class="footer"><div class="footer-left">${left}</div><div class="footer-right">${right}</div></footer>`}
function library(){dispose();state.mode='library';state.reading=null;document.body.dataset.view='library';
  root.innerHTML=`${header()}<main class="library"><div class="opening"><div class="opening-title"><div class="eyebrow">Интерактивный юридический атлас <span>Серия 01</span></div><h1>Государство<br><em>на равных?</em></h1></div><div class="opening-note"><span class="edition-index">I / II / III</span><p>Публично-правовые образования<br>как субъекты гражданского права</p><div class="opening-caption">Три дела о границах участия<br>и ответственности государства.</div>${remembered?`<button class="resume" data-action="resume">Продолжить <span>Том ${cases[remembered.case].roman} · ${remembered.step+1}/${cases[remembered.case].steps.length} ↗</span></button>`:`<div class="opening-meta">II курс <i></i> 90 минут <i></i> Очный семинар</div>`}</div></div><div class="collection"><div class="collection-caption"><span>Коллекция исследований</span><span>Выберите том или нажмите 1, 2, 3</span></div><div id="book-stage" class="book-stage"></div><nav class="editions" aria-label="Выбор дела">${cases.map((c,i)=>`<button data-case="${i}"><span class="edition-no">${c.roman}</span><span class="edition-title">${esc(titleCase(c.name))}<small>${esc(c.subtitle)}</small></span><span class="edition-arrow">↗</span></button>`).join('')}</nav></div></main>${footer('<span>Антонов М. А. <i>·</i> Кафедра гражданского права</span>','<button data-action="help">Управление</button><button data-action="reset">Сбросить прогресс</button>')}`;
  const stage=document.querySelector('#book-stage');books=mountBooks(stage,i=>openCase(i),{motion:state.motion});rendererNote(stage);document.querySelectorAll('[data-case]').forEach(b=>{b.addEventListener('pointerenter',()=>books?.focus(+b.dataset.case));b.addEventListener('pointerleave',()=>books?.focus(-1));b.addEventListener('focus',()=>books?.focus(+b.dataset.case));b.addEventListener('blur',()=>books?.focus(-1))});
}
function rendererNote(stage){if(stage.dataset.renderer==='software'){const n=document.createElement('span');n.className='render-note';n.textContent='Резервная графика · WebGL недоступен';stage.append(n)}}
function openCase(i,step=0){if(i<0||i>2)return;dispose();Object.assign(state,{mode:'case',case:i,step:Math.max(0,Math.min(step,cases[i].steps.length-1)),reading:null});document.body.dataset.view='case';const c=cases[i];
  root.innerHTML=`${header()}<main class="case-layout"><div class="case-bar"><button data-action="library">↖ Атлас</button><div class="case-tabs">${cases.map((item,j)=>`<button data-case="${j}" aria-current="${j===i?'page':'false'}">Том ${item.roman}</button>`).join('')}</div><span>${esc(c.subtitle)}</span><b id="step-count"></b></div><div class="case-body"><section class="narrative" id="narrative"></section><section class="scene-region" aria-label="Предметное пространство дела"><div class="scene-caption"><span id="scene-caption"></span><span>${c.roman} / Цивилист</span></div><div id="world-stage" class="world-stage"></div><div class="scene-tools" id="scene-tools"></div></section><aside id="reading" class="reading" hidden></aside></div><section class="question-band"><span>Вопрос<br>аудитории</span><p id="question"></p></section></main>${footer('<div id="steps" class="steps" aria-label="Этапы дела"></div>','<button data-action="prev" class="previous">← Назад</button><button data-action="next" class="next">Следующий факт <span>→</span></button>')}`;
  const stage=document.querySelector('#world-stage');world=mountWorld(stage,c.id,()=>openReading('document'),{motion:state.motion});rendererNote(stage);renderStep(false);
}
function renderStep(animate=true){const c=cases[state.case],s=c.steps[state.step];state.reading=null;document.querySelector('.case-body').classList.remove('is-reading');document.querySelector('#reading').hidden=true;
  document.querySelector('#step-count').textContent=`${String(state.step+1).padStart(2,'0')} / ${String(c.steps.length).padStart(2,'0')}`;
  document.querySelector('#narrative').innerHTML=`<div class="chapter-meta"><span>${esc(s.label)}</span><small>${esc(c.time.toLowerCase())}</small></div><h2 tabindex="-1">${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>${s.fact?`<p class="fact">${esc(s.fact)}</p>`:''}${s.norm?`<div class="norm"><span>Нормативная опора</span><p>${esc(s.norm)}</p></div>`:''}<div class="narrative-bottom"><span class="stage-kind">${s.reveal?'Правовая квалификация':'Исследование обстоятельств'}</span><button data-action="homework">Полное условие ↗</button></div>`;
  document.querySelector('#question').textContent=s.question;
  document.querySelector('#scene-caption').textContent=s.doc?'Материалы дела':'Предмет исследования';
  document.querySelector('#scene-tools').innerHTML=(s.doc?`<button data-action="document" class="document-trigger"><span class="paper-icon"></span><span>Читать документ<small>${esc(s.doc.head.toLocaleLowerCase('ru'))}</small></span><b>↗</b></button>`:'')+(!s.reveal&&normNotes[`${c.id}:${state.step}`]?'<button data-action="norms" class="norm-trigger">Нормы права ↗</button>':'');
  document.querySelector('#steps').innerHTML=c.steps.map((step,j)=>`<button data-step="${j}" ${j>state.step?'disabled':''} aria-current="${j===state.step?'step':'false'}" aria-label="Этап ${j+1}: ${esc(j<=state.step?step.label:'еще не раскрыт')}">${String(j+1).padStart(2,'0')}</button>`).join('');
  const next=document.querySelector('.next');next.innerHTML=`${state.step===c.steps.length-2?'К правовому выводу':s.reveal?(state.case===2?'К общему итогу':'К следующему делу'):'Следующий факт'} <span>→</span>`;
  if(s.reveal){document.querySelector('#scene-tools').innerHTML=[`<div class="legal-relations"><span>Полномочие: Город Н → комитет</span><span>Передача здания: Город Н → ООО «Альфа»</span></div>`,`<div class="legal-relations"><span>ФКУ: непосредственный ответчик по контракту А</span><span>ФБУ: самостоятельный должник по договору Б</span></div>`,`<div class="legal-relations"><span>Орган: незаконное действие · РФ: возможный должник</span><span>Казна: источник возмещения доказанных убытков</span></div>`][state.case]+(state.case===1?'<button data-action="norms" class="norm-trigger">Нормы и условия ↗</button>':'')};world?.setMotion(state.motion);world?.setStep(state.step,animate);save();root.dataset.case=c.roman;root.dataset.step=state.step+1;
}
function openReading(kind){if(state.mode!=='case')return;const c=cases[state.case],s=c.steps[state.step],d=s.doc;if(kind==='document'&&!d)return;
  state.reading=kind;world?.setMotion(false);lastFocus=document.activeElement;const panel=document.querySelector('#reading');panel.hidden=false;document.querySelector('.case-body').classList.add('is-reading');let body,title,tag;
  if(kind==='document'){title=d.head;tag=d.tag;body=`<div class="document-rows">${d.rows.map(([k,v],i)=>`<section><div><span>0${i+1}</span><h4>${esc(k)}</h4></div><p>${esc(v)}</p></section>`).join('')}</div>`}
  else if(kind==='homework'){title='Исходная фабула';tag='Домашнее задание · учебный казус';body=homework[state.case].map(p=>`<p class="reading-paragraph">${esc(p)}</p>`).join('')}
  else{title='Нормативная опора';tag='Для проверки квалификации';body=`<p class="reading-paragraph">${esc(normNotes[`${c.id}:${state.step}`]||s.norm||'На этом этапе необходимо сначала установить факты. Общая основа: ст. 124-126 ГК РФ.')}</p>`}
  panel.innerHTML=`<div class="reading-top"><span>Досье ${c.roman} / ${String(state.step+1).padStart(2,'0')}</span><button data-action="close-reading" aria-label="Закрыть документ">×</button></div><div class="reading-content"><span class="reading-tag">${esc(tag)}</span><h3>${esc(titleCase(title))}</h3>${body}${kind!=='document'?'<div class="reading-disclaimer">Все лица, события и документы условные. Учебная модель не является официальным актом.</div>':''}</div><div class="reading-bottom"><span>Esc: вернуться к предмету</span><button data-action="close-reading">Закрыть ↗</button></div>`;panel.querySelector('button').focus();
}
function closeReading(){state.reading=null;world?.setMotion(state.motion);document.querySelector('#reading').hidden=true;document.querySelector('.case-body').classList.remove('is-reading');lastFocus?.isConnected&&lastFocus.focus()}
function next(){if(state.mode==='library'){openCase(0);return}if(state.mode==='final'){library();return}const c=cases[state.case];if(state.step<c.steps.length-1){state.step++;renderStep()}else if(state.case<2)openCase(state.case+1);else finalScene()}
function prev(){if(state.mode==='final'){openCase(2,8);return}if(state.mode==='case'){if(state.step){state.step--;renderStep()}else library()}}
function finalScene(){dispose();state.mode='final';state.reading=null;document.body.dataset.view='final';root.innerHTML=`${header()}<main class="finale"><div class="finale-heading"><span class="eyebrow">Систематизация <span>78-84 мин</span></span><h2>Три основания.<br><em>Три конструкции.</em></h2><p>Сначала характер отношения и субъект.<br>Затем основание и способ защиты.</p></div><div class="finale-stage" id="final-stage"></div><div class="finale-comparison">${finale.items.map(([n,h,p],i)=>`<section><span class="finale-numeral">${n}</span><div class="finale-rule rule-${i}"></div><h3>${esc(titleCase(h))}</h3><p>${esc(p)}</p><button data-case="${i}">Вернуться к делу ↗</button></section>`).join('')}</div><div class="finale-prompt"><span>Обсудите</span><p>Почему орган, должник и источник исполнения<br>не всегда совпадают?</p></div></main>${footer('Антонов М. А. · Кафедра гражданского права','<button data-action="prev">← К делу III</button><button class="next" data-action="library">Вернуться в атлас ↗</button>')}`;const stage=document.querySelector('#final-stage');world=mountFinalWorld(stage,{motion:state.motion});rendererNote(stage)}
function help(){const el=document.createElement('dialog');el.className='help-dialog';el.innerHTML='<div><span class="eyebrow">Пульт преподавателя</span><button aria-label="Закрыть справку" data-close-help>×</button></div><h2>Один экран.<br><em>Ваш темп.</em></h2><dl><dt>1 / 2 / 3</dt><dd>Открыть дело</dd><dt>Пробел / →</dt><dd>Следующий факт</dd><dt>←</dt><dd>Предыдущий этап</dd><dt>Esc</dt><dd>Закрыть документ, затем вернуться в атлас</dd><dt>F</dt><dd>Полный экран</dd><dt>R</dt><dd>Повторить движение</dd></dl><p>На каждом этапе сцена останавливается. Прогресс сохраняется на этом устройстве. Режим Аа увеличивает текст.</p>';root.append(el);el.querySelector('[data-close-help]').onclick=()=>{el.close();el.remove()};el.addEventListener('close',()=>el.remove());el.showModal()}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Полный экран недоступен в этом браузере. Используйте F11.')}}
function toast(msg){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;root.append(t);setTimeout(()=>t.remove(),5000)}
root.addEventListener('click',e=>{const target=e.target.closest('[data-action],[data-case],[data-step]');if(!target)return;const {action:a}=target.dataset;
  if(target.dataset.case!==undefined){const n=+target.dataset.case;if(state.mode==='library'&&books)books.choose(n);else openCase(n);return}
  if(target.dataset.step!==undefined&&!target.disabled){const n=+target.dataset.step;if(n!==state.step){state.step=n;renderStep()}return}
  if(a==='next')next();if(a==='prev')prev();if(a==='library')library();if(['document','homework','norms'].includes(a))openReading(a);if(a==='close-reading')closeReading();if(a==='help')help();if(a==='fullscreen')fullscreen();
  if(a==='motion'){state.motion=!state.motion;store.set('civilist-motion',state.motion?'on':'off');world?.setMotion(state.motion);books?.setMotion(state.motion);target.textContent=state.motion?'Движение вкл':'Движение выкл';target.setAttribute('aria-pressed',state.motion)}
  if(a==='large'){state.large=!state.large;document.body.classList.toggle('large-type',state.large);target.setAttribute('aria-pressed',state.large)}
  if(a==='resume'&&valid(remembered))openCase(remembered.case,remembered.step);
  if(a==='reset'){store.remove(key);remembered=null;library();toast('Прогресс сброшен')}
});
document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(document.querySelector('dialog[open]'))return;
  if(e.code==='Space'&&document.activeElement?.tagName==='BUTTON')return;
  if(e.code==='ArrowRight'||e.code==='Space'){e.preventDefault();next()}
  if(e.code==='ArrowLeft'){e.preventDefault();prev()}
  if(e.code==='Escape'){if(state.reading)closeReading();else if(state.mode!=='library')library()}
  if(e.code==='KeyF'){e.preventDefault();fullscreen()}
  if(e.code==='KeyR'){e.preventDefault();if(state.mode==='case')world?.setStep(state.step,true,true)}
  if(/^(Digit|Numpad)[123]$/.test(e.code)){e.preventDefault();if(state.mode==='library'&&books)books.choose(+e.code.slice(-1)-1);else openCase(+e.code.slice(-1)-1)}
  if(e.code==='Home'&&state.mode==='case'){e.preventDefault();state.step=0;renderStep()}
});
document.fonts.ready.then(library);
