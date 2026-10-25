import React, { useEffect, useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Answer, Grade, JournalStore, Session, Student } from './storage';

export default function QuickAnswer({student,session,answers,store,onDetails}:{student:Student;session:Session;answers:Answer[];store:JournalStore;onDetails:()=>void}) {
 const [open,setOpen]=useState(false), [note,setNote]=useState(''),[message,setMessage]=useState(''),[last,setLast]=useState<string>();
 const ref=useRef<HTMLDivElement>(null), button=useRef<HTMLButtonElement>(null), panelId=useId();
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 const add=(grade:Grade)=>{try{setLast(store.saveAnswer({studentId:student.id,sessionId:session.id,grade,note}));setNote('');setMessage(`Ответ ${grade} добавлен`);}catch(e){setMessage(e instanceof Error?e.message:'Не удалось сохранить ответ');}};
 return <div className="quick-response" ref={ref} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);button.current?.focus();}}}>
  <div className="answer-sequence">{answers.length>0&&<button className="answers-recorded" aria-label={`Ответы: ${student.fullName}`} onClick={onDetails}>{answers.slice(0,3).map(a=><span key={a.id} className={`response-grade grade-${a.grade}`} title={a.note||a.grade}>{a.grade}</span>)}{answers.length>3&&<small>еще {answers.length-3}</small>}</button>}
   <button type="button" ref={button} className={`record-add ${open?'active':''}`} aria-label={`Добавить ответ: ${student.fullName}`} aria-expanded={open} aria-controls={panelId} title="Быстрый ответ" onClick={()=>{setOpen(v=>!v);setMessage('');}}><Plus size={17}/></button>
  </div>
  {open&&<div className="quick-response-panel" id={panelId} role="group" aria-label={`Быстрый ответ: ${student.fullName}`}><header><span>Ответ за занятие</span><button aria-label="Закрыть быстрый ответ" onClick={()=>setOpen(false)}><X size={15}/></button></header><input aria-label={`Комментарий к быстрому ответу: ${student.fullName}`} placeholder="Комментарий, если нужен" maxLength={3000} value={note} onChange={e=>setNote(e.target.value)}/><div className="quick-grades">{(['+','2','3','4','5'] as Grade[]).map(g=><button type="button" key={g} onClick={()=>add(g)} aria-label={`Быстрый ответ ${g}: ${student.fullName}`}>{g}</button>)}</div><footer><span role="status">{message||'Выбери отметку для записи'}</span>{last&&<button onClick={()=>{try{store.removeAnswer(last);setLast(undefined);setMessage('Последний ответ отменен');}catch(e){setMessage(e instanceof Error?e.message:'Не удалось отменить');}}}>Отменить</button>}</footer><button className="quick-history" type="button" onClick={onDetails}>Все ответы за эту пару · {answers.length}</button></div>}
 </div>;
}
