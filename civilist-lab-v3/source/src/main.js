import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/cyrillic-700.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/latin-600.css';
import './style.css';
import { cases, finalMap } from './cases.js';
import { mountBooks, renderFallbackBooks } from './books3d.js';
import logoUrl from './assets/logo.svg?url';

const app = document.getElementById('app');
const storageKey = 'civilist-legal-atlas-v3';
const safe = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const roman = ['I', 'II', 'III'];
const defaultState = { view: 'library', caseIndex: 0, sceneIndex: 0, progress: [0, 0, 0] };
let state = { ...defaultState, progress: [...defaultState.progress] };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && ['library', 'case', 'final'].includes(saved.view)) {
    state = { ...state, ...saved, progress: Array.isArray(saved.progress) ? saved.progress.slice(0, 3) : [0, 0, 0] };
    state.caseIndex = Math.max(0, Math.min(2, Number(state.caseIndex) || 0));
    state.sceneIndex = Math.max(0, Math.min(cases[state.caseIndex].scenes.length - 1, Number(state.sceneIndex) || 0));
  }
} catch { /* local storage may be disabled in private projection setups */ }

let booksInstance = null;
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* nonessential */ }
}
function setState(next) {
  state = { ...state, ...next };
  if (state.view === 'case') state.progress[state.caseIndex] = state.sceneIndex;
  persist();
  render();
}
function openCase(index) {
  if (index < 0 || index > 2) return;
  setState({ view: 'case', caseIndex: index, sceneIndex: Math.max(0, Math.min(cases[index].scenes.length - 1, Number(state.progress[index]) || 0)) });
}
function next() {
  if (state.view === 'library') { openCase(0); return; }
  if (state.view === 'final') return;
  const count = cases[state.caseIndex].scenes.length;
  if (state.sceneIndex < count - 1) setState({ sceneIndex: state.sceneIndex + 1 });
  else if (state.caseIndex < 2) setState({ view: 'case', caseIndex: state.caseIndex + 1, sceneIndex: 0 });
  else setState({ view: 'final' });
}
function previous() {
  if (state.view === 'final') { setState({ view: 'case', caseIndex: 2, sceneIndex: cases[2].scenes.length - 1 }); return; }
  if (state.view !== 'case') return;
  if (state.sceneIndex > 0) setState({ sceneIndex: state.sceneIndex - 1 });
  else setState({ view: 'library' });
}
function nextLabel() {
  if (state.view !== 'case') return '';
  const c = cases[state.caseIndex];
  if (state.sceneIndex < c.scenes.length - 1) {
    return c.scenes[state.sceneIndex + 1].kind === 'resolution' ? 'Открыть правовой вывод' : 'Следующий материал';
  }
  return state.caseIndex === 2 ? 'Итоговая карта' : `Перейти к делу ${roman[state.caseIndex + 1]}`;
}
function header() {
  return `<header class="masthead">
    <button class="brand" data-action="library" aria-label="Вернуться в библиотеку дел"><img src="${logoUrl}" alt="Логотип СГЮА 95 лет" /><span>ЦИВИЛИСТ<span class="brand-slash"> / </span><small>ПРАВОВАЯ ЛАБОРАТОРИЯ</small></span></button>
    <div class="masthead-center">СЕМИНАР · ГРАЖДАНСКОЕ ПРАВО · II КУРС</div>
    <button class="screen-toggle" data-action="fullscreen" aria-label="Переключить полноэкранный режим" title="Полноэкранный режим"><span class="screen-icon" aria-hidden="true"></span><span>НА ВЕСЬ ЭКРАН</span></button>
  </header>`;
}
function library() {
  return `<div class="library-screen screen-enter">
    <div class="library-hero">
      <div class="hero-index"><span class="staple"></span> АВТОРСКИЙ ИНТЕРАКТИВНЫЙ АТЛАС <b>01 / 03</b></div>
      <h1>ГОСУДАРСТВО<br /><em>НА РАВНЫХ?</em></h1>
      <div class="hero-bottom"><p>Публично-правовые образования<br />как субъекты гражданского права</p><p>Три юридических дела.<br />Один вопрос о субъекте.</p></div>
    </div>
    <div class="library-selection">
      <div class="library-stage-head"><span>ВЫБЕРИТЕ ТОМ</span><span>1 / 2 / 3 НА КЛАВИАТУРЕ</span></div>
      <div class="books-stage" id="books-stage" aria-hidden="true"><div class="stage-loading">ТРИ ДЕЛА · ТРИ ПРАВОВЫЕ МОДЕЛИ</div></div>
      <div class="volume-index" aria-label="Выбор юридического дела">
        ${cases.map((c, i) => `<button class="volume-line volume-line-${i + 1}" data-case="${i}" aria-label="Открыть дело ${roman[i]}: ${safe(c.title)}"><span class="volume-no">0${i + 1}</span><span class="volume-name">${safe(c.title)}</span><span class="volume-arrow" aria-hidden="true">↗</span></button>`).join('')}
      </div>
      <p class="library-note">Один преподаватель · один экран · обсуждение в аудитории</p>
    </div>
    <footer class="library-footer"><span>АНТОНОВ М. А. · КАФЕДРА ГРАЖДАНСКОГО ПРАВА</span><span>СГЮА / 2026</span></footer>
  </div>`;
}

const placements = [
  { city: [19, 31], committee: [53, 22], alpha: [78, 70], building: [19, 73], record: [18, 28], title: [77, 28], agreement: [77, 74], power: [18, 74] },
  { rf: [49, 19], treasury: [19, 59], budget: [78, 59], suppliers: [49, 84], k: [18, 61], b: [78, 61], creditors: [49, 84] },
  { atlas: [78, 60], port: [18, 60], mfc: [19, 19], rosreestr: [52, 18], rf: [82, 20], kazna: [51, 83] },
];
function diagram(diagramData, caseIndex) {
  const nodes = diagramData.nodes || [], links = diagramData.links || [];
  const positions = placements[caseIndex];
  const defaultPositions = [[18, 25], [50, 23], [82, 26], [27, 72], [73, 72]];
  const coords = Object.fromEntries(nodes.map((n, i) => [n.id, positions[n.id] || defaultPositions[i] || [50, 50]]));
  const lines = links.filter(l => coords[l.from] && coords[l.to]).map((l, i) => {
    const [x1, y1] = coords[l.from], [x2, y2] = coords[l.to];
    return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" class="diagram-line diagram-line-${safe(l.kind)}" marker-end="url(#arrow)" />`;
  }).join('');
  return `<div class="diagram-panel case-panel-${caseIndex + 1}">
    <div class="panel-head"><span>КАРТА ПРАВООТНОШЕНИЙ</span><span>СХЕМА / ${roman[caseIndex]}</span></div>
    <div class="diagram-art" role="img" aria-label="Схема участников и связей">
      <svg class="diagram-wires" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>${lines}</svg>
      ${nodes.map((n, i) => `<div class="graph-node" style="--x:${coords[n.id][0]}%;--y:${coords[n.id][1]}%"><span class="graph-index">0${i + 1}</span><strong>${safe(n.label)}</strong><small>${safe(n.role)}</small></div>`).join('')}
    </div>
    <div class="relation-ledger">${links.map((l, i) => `<div class="relation-row"><b>${String(i + 1).padStart(2, '0')}</b><span>${safe(nodes.find(n => n.id === l.from)?.label || l.from)}</span><i>→</i><span>${safe(nodes.find(n => n.id === l.to)?.label || l.to)}</span><em>${safe(l.label)}</em></div>`).join('')}</div>
  </div>`;
}
function documentPanel(doc, caseIndex) {
  return `<div class="document-panel case-panel-${caseIndex + 1}">
    <div class="doc-border"><div class="doc-head"><span>${safe(doc.label)}</span><span>ЦИВИЛИСТ / ДОСЬЕ</span></div>
      <h3>${safe(doc.title)}</h3><div class="doc-rows">${doc.rows.map((r, i) => `<div class="doc-row"><span class="doc-num">${String(i + 1).padStart(2, '0')}</span><span class="doc-term">${safe(r.label)}</span><p>${safe(r.value)}</p></div>`).join('')}</div>
      <div class="doc-question"><span>ВОПРОС К ДОКУМЕНТУ</span><strong>${safe(doc.question)}</strong></div>
      <div class="doc-mark">${safe(doc.note || 'Учебная модель')}</div>
    </div>
  </div>`;
}
function textPanel(scene, caseIndex) {
  return `<div class="analysis-panel case-panel-${caseIndex + 1}"><div class="panel-head"><span>ПРАВОВАЯ КВАЛИФИКАЦИЯ</span><span>МАТЕРИАЛ / ${roman[caseIndex]}</span></div><div class="analysis-grid">
    ${(scene.body || []).map((p, i) => `<div class="analysis-item"><span>${String(i + 1).padStart(2, '0')}</span><p>${safe(p)}</p></div>`).join('')}
  </div><div class="analysis-footer">Сопоставьте факты, компетенцию и основание требования.</div></div>`;
}
function visual(scene, caseIndex) {
  if (scene.document) return documentPanel(scene.document, caseIndex);
  if (scene.diagram) return diagram(scene.diagram, caseIndex);
  return textPanel(scene, caseIndex);
}
function caseScreen() {
  const c = cases[state.caseIndex], scene = c.scenes[state.sceneIndex], n = state.sceneIndex + 1;
  const evidence = !!scene.document;
  return `<div class="case-screen screen-enter case-${state.caseIndex + 1} kind-${safe(scene.kind)}">
    <div class="case-strip"><button data-action="library" class="back-library"><span aria-hidden="true">←</span> БИБЛИОТЕКА</button><span class="case-strip-center">ТОМ ${roman[state.caseIndex]} <b>·</b> ${safe(c.short)}</span><span class="step-count">${String(n).padStart(2, '0')} <i>/</i> ${String(c.scenes.length).padStart(2, '0')}</span></div>
    <div class="case-content">
      <div class="case-narrative">
        <div class="scene-eyebrow"><span class="scene-pip"></span>${safe(scene.eyebrow)}<span class="scene-timing">${safe(c.timing)}</span></div>
        <h2>${safe(scene.title)}</h2>
        <p class="scene-lead">${safe(scene.lead)}</p>
        ${evidence ? `<div class="evidence-instruction">${(scene.body || []).map(p => `<p>${safe(p)}</p>`).join('')}</div>` : `<div class="scene-body">${(scene.body || []).map(p => `<p>${safe(p)}</p>`).join('')}</div>`}
        ${scene.legal ? `<div class="legal-norms"><span>НОРМАТИВНАЯ ОПОРА</span>${scene.legal.map(p => `<p>${safe(p)}</p>`).join('')}</div>` : ''}
        <div class="discussion-prompt"><span>ВОПРОС АУДИТОРИИ</span><p>${safe(scene.probe || c.question)}</p></div>
      </div>
      <div class="case-visual">${visual(scene, state.caseIndex)}</div>
    </div>
    <div class="scene-controls"><div class="step-track" aria-label="Этапы дела">${c.scenes.map((s, i) => `<button data-scene="${i}" class="step-dot ${i === state.sceneIndex ? 'active' : ''}" aria-current="${i === state.sceneIndex ? 'step' : 'false'}" aria-label="Перейти к этапу ${i + 1}: ${safe(s.eyebrow)}"><span>${String(i + 1).padStart(2, '0')}</span></button>`).join('')}</div><div class="control-buttons"><button data-action="prev" class="secondary-button" aria-label="Предыдущий материал">← НАЗАД</button><button data-action="next" class="primary-button">${safe(nextLabel())}<span aria-hidden="true">↗</span></button></div></div>
  </div>`;
}
function finalScreen() {
  const models = finalMap.models || [];
  return `<div class="final-screen screen-enter"><div class="final-heading"><div class="final-kicker">${safe(finalMap.eyebrow)}</div><h2>ГОСУДАРСТВО<br /><em>НА РАВНЫХ?</em></h2><p>${safe(finalMap.question)}</p></div><div class="final-models">
    ${models.map((m, i) => `<div class="final-row final-row-${i + 1}"><span class="final-no">0${i + 1}</span><div><span class="final-kind">ДЕЛО ${roman[i]} / ${safe(m.norm)}</span><h3>${safe(m.label)}</h3><p class="final-formula">${safe(m.formula)}</p><p>${safe(m.detail)}</p></div><span class="final-sign" aria-hidden="true">${['↗', '∥', '→'][i]}</span></div>`).join('')}
    <div class="final-conclusion"><b>КЛЮЧЕВОЕ РАЗЛИЧИЕ</b><p>${safe(finalMap.closing)}</p></div>
  </div><div class="final-bottom"><button data-action="prev" class="secondary-button">← К ПОСЛЕДНЕМУ ДЕЛУ</button><button data-action="library" class="primary-button">В БИБЛИОТЕКУ <span aria-hidden="true">↗</span></button></div></div>`;
}
function render() {
  if (booksInstance) { booksInstance.destroy(); booksInstance = null; }
  app.innerHTML = `${header()}<main id="main-content">${state.view === 'case' ? caseScreen() : state.view === 'final' ? finalScreen() : library()}</main>`;
  document.body.dataset.view = state.view;
  if (state.view === 'library') {
    const stage = document.getElementById('books-stage');
    requestAnimationFrame(() => {
      if (state.view !== 'library' || !stage.isConnected) return;
      try {
        booksInstance = mountBooks(stage, volume => openCase(volume - 1));
        if (booksInstance) stage.classList.add('webgl-ready');
        else { booksInstance = renderFallbackBooks(stage, volume => openCase(volume - 1)); stage.classList.add('fallback-ready'); }
      } catch (err) {
        console.warn('3D недоступен; включен запасной просмотр томов.', err);
        booksInstance = renderFallbackBooks(stage, volume => openCase(volume - 1));
        stage.classList.add('fallback-ready');
      }
    });
  }
}
app.addEventListener('click', e => {
  const c = e.target.closest('[data-case]');
  if (c) { openCase(Number(c.dataset.case)); return; }
  const scene = e.target.closest('[data-scene]');
  if (scene) { setState({ sceneIndex: Number(scene.dataset.scene) }); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'library') setState({ view: 'library' });
  else if (action === 'next') next();
  else if (action === 'prev') previous();
  else if (action === 'fullscreen') {
    const operation = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    operation?.catch(() => { e.target.closest('[data-action="fullscreen"]').title = 'Браузер не разрешил полноэкранный режим'; });
  }
});
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (state.view === 'library' && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); openCase(Number(e.key) - 1); return; }
  if (e.key === 'Escape' && state.view !== 'library') { e.preventDefault(); setState({ view: 'library' }); return; }
  if ((e.code === 'Space' || e.key === 'ArrowRight') && state.view === 'case') { e.preventDefault(); next(); return; }
  if (e.key === 'ArrowLeft' && ['case', 'final'].includes(state.view)) { e.preventDefault(); previous(); }
});
render();
if (import.meta.env.PROD && import.meta.env.MODE !== 'offline' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  }, { once: true });
}
