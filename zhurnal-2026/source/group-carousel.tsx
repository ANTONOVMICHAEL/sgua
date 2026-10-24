import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';
import type { Group, Session, Student } from './storage';
const count = (n: number, forms: [
    string,
    string,
    string
]) => { const v = Math.abs(n) % 100; return `${n} ${forms[v > 10 && v < 20 ? 2 : v % 10 === 1 ? 0 : v % 10 >= 2 && v % 10 <= 4 ? 1 : 2]}`; };
export default function GroupCarousel({ groups, students, sessions, selected, onSelect }: {
    groups: Group[];
    students: Student[];
    sessions: Session[];
    selected: string;
    onSelect: (code: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null), callback = useRef(onSelect), selectedRef = useRef(selected), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), programmatic = useRef(false), programTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), gesture = useRef<{
        x: number;
        y: number;
        left: number;
        dragged: boolean;
        pointer: number;
    } | null>(null);
    const [dragging, setDragging] = useState(false);
    callback.current = onSelect;
    selectedRef.current = selected;
    const index = Math.max(0, groups.findIndex(g => g.code === selected));
    const cards = () => [...(ref.current?.querySelectorAll<HTMLButtonElement>('[data-group-card]') ?? [])];
    const align = (i: number, smooth = true) => { const root = ref.current, items = cards(); if (!root || !items[i])
        return; programmatic.current = true; clearTimeout(programTimer.current); root.scrollTo({ left: items[i].offsetLeft - (items[0]?.offsetLeft ?? 0), behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' }); programTimer.current = setTimeout(() => { programmatic.current = false; }, 650); };
    const select = (i: number) => { const safe = Math.max(0, Math.min(groups.length - 1, i)); if (groups[safe]) {
        programmatic.current = true;
        callback.current(groups[safe].code);
        align(safe);
    } };
    const settle = () => { const root = ref.current; if (!root || programmatic.current || root.scrollWidth <= root.clientWidth + 2)
        return; const items = cards(); let closest = 0; for (let i = 1; i < items.length; i++)
        if (Math.abs(items[i].offsetLeft - items[0].offsetLeft - root.scrollLeft) < Math.abs(items[closest].offsetLeft - items[0].offsetLeft - root.scrollLeft))
            closest = i; if (groups[closest] && groups[closest].code !== selectedRef.current)
        callback.current(groups[closest].code); align(closest); };
    useEffect(() => { align(Math.max(0, groups.findIndex(g => g.code === selected))); }, [selected]);
    useEffect(() => () => { clearTimeout(timer.current); clearTimeout(programTimer.current); }, []);
    const finish = (e: React.PointerEvent<HTMLDivElement>) => { const g = gesture.current, root = ref.current; if (!g || !root)
        return; const dx = e.clientX - g.x; const canScroll = root.scrollWidth > root.clientWidth + 2; if (g.dragged || Math.abs(dx) > 40) {
        if (!canScroll)
            select(index + (dx < 0 ? 1 : -1));
        else {
            programmatic.current = false;
            clearTimeout(timer.current);
            timer.current = setTimeout(settle, 180);
        }
    } setDragging(false); if (root.hasPointerCapture(e.pointerId))
        root.releasePointerCapture(e.pointerId); };
    return <div className="group-browser"><div className="group-browser-heading"><span>Мои группы <i>{String(index + 1).padStart(2, '0')} / {String(groups.length).padStart(2, '0')}</i></span><div><span className="group-drag-hint"><ArrowLeftRight size={13}/><b>Листайте группы</b></span><button type="button" aria-label="Предыдущая группа" disabled={index === 0} onClick={() => select(index - 1)}><ChevronLeft size={16}/></button><button type="button" aria-label="Следующая группа" disabled={index === groups.length - 1} onClick={() => select(index + 1)}><ChevronRight size={16}/></button></div></div><div ref={ref} className={`group-carousel ${dragging ? 'dragging' : ''}`} role="tablist" aria-label="Переключение учебных групп" onScroll={() => { if (!programmatic.current) {
        clearTimeout(timer.current);
        timer.current = setTimeout(settle, 180);
    } }} onWheel={e => { if (Math.abs(e.deltaX) > 2 || e.shiftKey)
        programmatic.current = false; }} onPointerDown={e => { if (e.button !== 0)
        return; clearTimeout(timer.current); clearTimeout(programTimer.current); programmatic.current = false; gesture.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, dragged: false, pointer: e.pointerId }; }} onPointerMove={e => { const g = gesture.current; if (!g || e.buttons !== 1 || e.pointerType === 'touch')
        return; const dx = e.clientX - g.x; if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(e.clientY - g.y)) {
        g.dragged = true;
        setDragging(true);
        if (!e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.scrollLeft = g.left - dx;
    } }} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; setDragging(false); }} onClickCapture={e => { if (gesture.current?.dragged && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
        gesture.current = null;
    } }} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? groups.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1);
        select(next);
        cards()[Math.max(0, Math.min(groups.length - 1, next))]?.focus({ preventScroll: true });
    } }}>{groups.map((g, i) => { const people = students.filter(p => p.active && p.groupCode === g.code), lessons = sessions.filter(l => l.groupCode === g.code && !l.deletedAt); return <button type="button" key={g.code} data-group-card role="tab" aria-selected={selected === g.code} tabIndex={selected === g.code ? 0 : -1} aria-controls="workspace" className={`group-card ${selected === g.code ? 'selected' : ''}`} onClick={() => select(i)}><span className="group-card-top"><span className="group-card-index">{String(i + 1).padStart(2, '0')}</span>{selected === g.code ? <span className="group-card-current"><Check size={13}/><b className="sr-only">Выбрана</b></span> : <ArrowUpRight size={15}/>}</span><strong>{g.code}</strong><span className="group-card-bottom"><span>{count(people.length, ["студент", "студента", "студентов"])}</span><span>{count(lessons.length, ["занятие", "занятия", "занятий"])}</span></span><span className="group-card-line"/></button>; })}</div><div className="group-pagination" aria-label="Выбор группы по порядку">{groups.map((g, i) => <button type="button" key={g.code} className={g.code === selected ? 'selected' : ''} aria-label={`Перейти к группе ${g.code}`} aria-current={g.code === selected ? 'true' : undefined} onClick={() => select(i)}/>)}</div><span className="sr-only" role="status">Выбрана группа {selected}</span></div>;
}
