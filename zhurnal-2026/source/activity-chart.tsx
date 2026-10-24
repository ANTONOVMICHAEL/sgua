import React from 'react';

type Entry = { lesson: { id: string; date: string; groupCode: string; period: number }; visits: number; answers: number };
const dateLabel = (date: string) => new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));

export default function ActivityChart({ entries }: { entries: Entry[] }) {
  if (!entries.length) return <div className="activity-empty"><span/><span/><span/><p>График появится после<br/>первого занятия</p></div>;
  const top = 17, bottom = 147, left = 40, right = 650;
  const max = Math.max(2, Math.ceil(Math.max(...entries.flatMap(e => [e.visits, e.answers])) / 2) * 2);
  const x = (i: number) => entries.length === 1 ? (left + right) / 2 : left + i / (entries.length - 1) * (right - left);
  const y = (n: number) => bottom - n / max * (bottom - top);
  const path = (key: 'visits' | 'answers') => entries.map((e,i) => `${i ? 'L' : 'M'}${x(i)},${y(e[key])}`).join(' ');
  const labelIndexes = entries.length <= 4 ? entries.map((_,i) => i) : [0, Math.floor((entries.length - 1) / 2), entries.length - 1];
  return <svg className="activity-plot" viewBox="0 0 680 186" role="img" aria-label={`Посещения и ответы. Занятий на графике: ${entries.length}`}>
    <defs><linearGradient id="visits-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#36B89B" stopOpacity=".17"/><stop offset="1" stopColor="#36B89B" stopOpacity="0"/></linearGradient></defs>
    {[0,max/2,max].map(n=><g key={n}><line x1={left} x2={right} y1={y(n)} y2={y(n)} className="activity-grid"/><text x="0" y={y(n)+4} className="activity-axis">{n}</text></g>)}
    {entries.length>1 && <path d={`${path('visits')} L${x(entries.length-1)},${bottom} L${x(0)},${bottom} Z`} fill="url(#visits-area)"/>}
    <path d={path('visits')} className="activity-line line-visits"/>
    <path d={path('answers')} className="activity-line line-answers"/>
    {entries.map((e,i)=><g key={e.lesson.id}>{(['visits','answers'] as const).map(key=><circle key={key} cx={x(i)} cy={y(e[key])} r="4" className={`activity-point point-${key}`}><title>{e.lesson.groupCode}, {dateLabel(e.lesson.date)}, {e.lesson.period}-я пара: {key==='visits'?'посещений':'ответов'} — {e[key]}</title></circle>)}</g>)}
    {labelIndexes.map(i=><text key={i} x={x(i)} y="180" textAnchor={i===0&&entries.length>1?'start':i===entries.length-1&&entries.length>1?'end':'middle'} className="activity-axis">{dateLabel(entries[i].lesson.date)} · {entries[i].lesson.period} пара</text>)}
  </svg>;
}
