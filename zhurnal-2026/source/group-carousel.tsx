import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Group, Session, Student } from './storage';
import './group-rotor.css';

const count = (n: number, forms: [string, string, string]) => {
  const v = Math.abs(n) % 100;
  return `${n} ${forms[v > 10 && v < 20 ? 2 : v % 10 === 1 ? 0 : v % 10 >= 2 && v % 10 <= 4 ? 1 : 2]}`;
};

type Gesture = { x: number; y: number; pointerId: number; horizontal: boolean };

/** A manually controlled group deck: its movement never changes journal records. */
export default function GroupCarousel({ groups, students, sessions, selected, onSelect }: {
  groups: Group[];
  students: Student[];
  sessions: Session[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const wheel = useRef({ distance: 0, at: 0 });
  const [width, setWidth] = useState(900);
  const [drag, setDrag] = useState(0);
  const index = Math.max(0, groups.findIndex(g => g.code === selected));
  const cardWidth = Math.min(342, Math.max(226, width * .72));
  const step = Math.max(1, Math.min(cardWidth * .94, width * .61));

  useEffect(() => {
    if (!frame.current) return;
    const root = frame.current;
    const update = () => setWidth(root.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const select = (next: number, focus = false) => {
    if (!groups.length) return;
    const safe = (next % groups.length + groups.length) % groups.length;
    onSelect(groups[safe].code);
    if (focus) cards.current[safe]?.focus({ preventScroll: true });
  };
  const relative = (i: number) => {
    let distance = i - index;
    if (distance > groups.length / 2) distance -= groups.length;
    if (distance < -groups.length / 2) distance += groups.length;
    return distance;
  };
  const release = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const current = gesture.current;
    if (!current || current.pointerId !== e.pointerId) return;
    const dx = e.clientX - current.x;
    if (current.horizontal) {
      suppressClick.current = true;
      if (!cancelled && Math.abs(dx) > Math.min(65, cardWidth * .2)) select(index + (dx < 0 ? 1 : -1));
    }
    gesture.current = null;
    setDrag(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  if (!groups.length) return null;

  return <section className="group-browser group-rotor" aria-label="Учебные группы">
    <div className="rotor-heading"><span>Учебные группы</span><div className="rotor-navigation"><span>{String(index + 1).padStart(2, '0')}<i>/</i>{String(groups.length).padStart(2, '0')}</span><button type="button" aria-label="Предыдущая группа" disabled={groups.length < 2} onClick={() => select(index - 1)}><ChevronLeft size={17}/></button><button type="button" aria-label="Следующая группа" disabled={groups.length < 2} onClick={() => select(index + 1)}><ChevronRight size={17}/></button></div></div>
    <div ref={frame} className={`rotor-stage ${drag ? 'is-dragging' : ''}`} role="tablist" aria-label="Переключение учебных групп"
      onPointerDown={e => {
        if (e.button !== 0 || groups.length < 2) return;
        suppressClick.current = false;
        gesture.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, horizontal: false };
      }}
      onPointerMove={e => {
        const current = gesture.current;
        if (!current || current.pointerId !== e.pointerId) return;
        const dx = e.clientX - current.x, dy = e.clientY - current.y;
        if (!current.horizontal && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
        if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
          current.horizontal = true;
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        }
        if (current.horizontal) setDrag(Math.max(-step * .92, Math.min(step * .92, dx)));
      }}
      onPointerUp={e => release(e)} onPointerCancel={e => release(e, true)}
      onClickCapture={e => { if (suppressClick.current && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
      onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        select(e.key === 'Home' ? 0 : e.key === 'End' ? groups.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1), true);
      }}
      onWheel={e => {
        const delta = e.shiftKey ? e.deltaY : e.deltaX;
        if (groups.length < 2 || Math.abs(delta) < 2 || (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX))) return;
        const now = Date.now();
        if (now - wheel.current.at < 450) return;
        wheel.current.distance += delta;
        if (Math.abs(wheel.current.distance) > 65) { select(index + (wheel.current.distance > 0 ? 1 : -1)); wheel.current = { distance: 0, at: now }; }
      }}>
      {groups.map((g, i) => {
        const offset = relative(i), position = offset + drag / step;
        const people = students.filter(p => p.active && p.groupCode === g.code).length;
        const lessons = sessions.filter(l => l.groupCode === g.code && !l.deletedAt);
        const completed = lessons.filter(l => l.completedAt).length;
        const isSelected = i === index;
        const visible = Math.abs(offset) <= 1 || (drag !== 0 && Math.abs(position) < 1.8);
        const style = { width: cardWidth, '--rotor-x': `${offset * step + drag}px`, '--rotor-turn': `${Math.max(-32, Math.min(32, -position * 27))}deg`, '--rotor-depth': `${-Math.abs(position) * 65}px`, '--rotor-scale': Math.max(.8, 1 - Math.abs(position) * .08), zIndex: Math.round(20 - Math.abs(position) * 4) } as React.CSSProperties;
        return <button ref={el => { cards.current[i] = el; }} key={g.code} type="button" data-group-card role="tab" aria-selected={isSelected} aria-hidden={!visible} tabIndex={isSelected ? 0 : -1} aria-controls="workspace" aria-label={`${g.code}, ${count(people, ['студент','студента','студентов'])}, завершено ${completed} из ${lessons.length} занятий`} className={`rotor-card ${isSelected ? 'selected' : ''} ${visible ? '' : 'outside'}`} style={style} onClick={() => select(i)}>
          <span className="rotor-card-top"><span>Учебная группа</span><span>{String(i + 1).padStart(2, '0')}</span></span>
          <strong>{g.code}</strong>
          <span className="rotor-card-bottom"><span>{count(people, ['студент','студента','студентов'])}</span><span><b>{completed}</b><i>/</i>{lessons.length} завершено</span></span>
        </button>;
      })}
    </div>
    <div className="rotor-footer"><span>Выбрана группа {groups[index].code}</span><div className="rotor-dots" role="group" aria-label="Быстрый выбор группы">{groups.map((g,i) => <button type="button" key={g.code} aria-label={`Выбрать группу ${g.code}`} aria-pressed={i === index} className={i === index ? 'selected' : ''} onClick={() => select(i)}/>)}</div><span className="rotor-hint">Листай или перетаскивай</span></div>
    <span className="sr-only" role="status">Выбрана группа {groups[index].code}</span>
  </section>;
}
