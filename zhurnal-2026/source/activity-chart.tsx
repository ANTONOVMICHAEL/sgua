import React, { useRef, useState } from 'react';
import './chart-interaction.css';

type Entry = { lesson: { id: string; date: string; groupCode: string; period: number }; visits: number; answers: number };
type Series = 'visits' | 'answers';
const series: { key: Series; label: string }[] = [{ key: 'visits', label: 'Посещения' }, { key: 'answers', label: 'Ответы' }];
const dateLabel = (date: string) => new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));

export default function ActivityChart({ entries }: { entries: Entry[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<Series, boolean>>({ visits: true, answers: true });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, entries.findIndex(e => e.lesson.id === selectedId) >= 0 ? entries.findIndex(e => e.lesson.id === selectedId) : entries.length - 1);
  const previewIndex = entries.findIndex(e => e.lesson.id === previewId);
  const activeIndex = previewIndex >= 0 ? previewIndex : selectedIndex;
  const active = entries[activeIndex];
  const max = Math.max(2, Math.ceil(Math.max(0, ...entries.flatMap(e => series.filter(s => visible[s.key]).map(s => e[s.key]))) / 2) * 2);
  const toggle = (key: Series) => setVisible(old => old[key] && !old[key === 'visits' ? 'answers' : 'visits'] ? old : { ...old, [key]: !old[key] });
  const move = (index: number) => {
    const safe = Math.max(0, Math.min(entries.length - 1, index));
    setSelectedId(entries[safe].lesson.id);
    setPreviewId(null);
    buttons.current[safe]?.focus({ preventScroll: true });
    buttons.current[safe]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  };
  if (!entries.length) return <div className="activity-interactive-empty"><span className="chart-empty-rule" aria-hidden="true"/><strong>Пока нет занятий</strong><p>После первой пары здесь появится<br/>история посещений и ответов.</p></div>;

  return <div className="activity-interactive" role="group" aria-label="График посещений и ответов">
    <div className="chart-series-controls" role="group" aria-label="Показатели графика">{series.map(s => <button type="button" key={s.key} className={`chart-series-control series-${s.key}`} aria-pressed={visible[s.key]} onClick={() => toggle(s.key)}><i/>{s.label}</button>)}</div>
    <div className="chart-selected-entry" aria-live="polite" aria-atomic="true">
      <div className="chart-selected-date"><strong>{dateLabel(active.lesson.date)}</strong><span>{active.lesson.period}-я пара · {active.lesson.groupCode}</span></div>
      <div className={`chart-selected-metric visits ${visible.visits ? '' : 'series-muted'}`}><small>Посещения</small><strong>{active.visits}</strong></div>
      <div className={`chart-selected-metric answers ${visible.answers ? '' : 'series-muted'}`}><small>Ответы</small><strong>{active.answers}</strong></div>
    </div>
    <div className="chart-instrument">
      <div className="chart-value-axis" aria-hidden="true"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
      <div className="chart-column-scroll" onPointerLeave={() => setPreviewId(null)}>
        <div className="chart-column-list" style={{ '--entry-count': entries.length } as React.CSSProperties}>
          {entries.map((entry, index) => <button type="button" key={entry.lesson.id} ref={el => { buttons.current[index] = el; }}
            className={`chart-column ${index === activeIndex ? 'is-active' : ''} ${index === selectedIndex ? 'is-selected' : ''}`}
            aria-label={`${dateLabel(entry.lesson.date)}, ${entry.lesson.period}-я пара, ${entry.lesson.groupCode}: посещений ${entry.visits}, ответов ${entry.answers}`}
            aria-pressed={index === selectedIndex} tabIndex={index === selectedIndex ? 0 : -1}
            onPointerEnter={e => { if (e.pointerType === 'mouse') setPreviewId(entry.lesson.id); }}
            onFocus={() => { setSelectedId(entry.lesson.id); setPreviewId(null); }}
            onClick={() => { setSelectedId(entry.lesson.id); setPreviewId(null); }}
            onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); move(e.key === 'Home' ? 0 : e.key === 'End' ? entries.length - 1 : selectedIndex + (e.key === 'ArrowRight' ? 1 : -1)); } }}>
            <span className="chart-bar-field" aria-hidden="true">{series.filter(s => visible[s.key]).map(s => <span key={s.key} className={`chart-bar chart-bar-${s.key}`} style={{ height: `${entry[s.key] / max * 100}%` }}><span>{entry[s.key]}</span></span>)}</span>
            <span className="chart-column-label"><strong>{dateLabel(entry.lesson.date)}</strong><small>{entry.lesson.period}-я пара</small></span>
          </button>)}
        </div>
      </div>
    </div>
    <div className="chart-selection-hint">Выбери занятие на графике<span aria-hidden="true">← →</span></div>
  </div>;
}
