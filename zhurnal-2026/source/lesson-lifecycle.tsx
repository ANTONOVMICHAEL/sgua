import React, { useState } from 'react';
import { Check, CheckCheck, RotateCcw, Trash2 } from 'lucide-react';
import type { JournalStore, Session, State } from './storage';
import './lesson-lifecycle.css';

const timeText = (value: string) => new Date(value).toLocaleString('ru', {timeZone:'Europe/Saratov',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
const dateText = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('ru',{timeZone:'UTC',day:'numeric',month:'long'});
const unit = (value:number,words:[string,string,string]) => words[value%100>10&&value%100<20?2:value%10===1?0:value%10>=2&&value%10<=4?1:2];

export function SessionLifecycleBar({session,marked,total,onFinish,onReopen,onDelete}:{session:Session;marked:number;total:number;onFinish:()=>void;onReopen:()=>void;onDelete:()=>void}) {
 return <div className={`lesson-lifecycle ${session.completedAt?'is-complete':'is-open'}`}>
  <div className="lifecycle-state"><span className="lifecycle-dot">{session.completedAt?<Check size={13}/>:null}</span><div><strong>{session.completedAt?'Занятие завершено':'Занятие открыто'}</strong><span>{session.completedAt?timeText(session.completedAt):`${marked} из ${total} отмечено`}</span></div></div>
  <div className="lifecycle-actions">{session.completedAt?<button className="lifecycle-reopen" onClick={onReopen}><RotateCcw size={14}/>Открыть заново</button>:<button className="button button-primary lifecycle-finish" onClick={onFinish}><CheckCheck size={16}/>Завершить занятие</button>}<button className="lifecycle-delete" onClick={onDelete} aria-label="Удалить занятие"><Trash2 size={16}/><span>Удалить</span></button></div>
 </div>;
}

export function CompletionSummary({state,session,total,onConfirm,onCancel}:{state:State;session:Session;total:number;onConfirm:()=>void;onCancel:()=>void}) {
 const activeIds=new Set(state.students.filter(p=>p.groupCode===session.groupCode&&p.active).map(p=>p.id));
 const marked=state.marks.filter(m=>m.sessionId===session.id&&activeIds.has(m.studentId)).length;
 const answers=state.answers.filter(a=>a.sessionId===session.id).length;
 const debts=state.debts.filter(d=>d.sessionId===session.id).length;
 return <><div className="completion-summary"><div><strong>{marked}<small> / {total}</small></strong><span>Посещаемость</span></div><div><strong>{answers}</strong><span>Ответы</span></div><div><strong>{debts}</strong><span>Задолженности</span></div></div>
  <p className="lifecycle-dialog-copy">{marked<total?`Без отметки ${total-marked} ${unit(total-marked,['студент','студента','студентов'])}. После завершения эти поля останутся пустыми.`:'Посещаемость заполнена для всей группы.'}</p><p className="lifecycle-dialog-note">Статус сохранится в журнале. Отметки и записи можно исправлять и после завершения.</p><footer className="dialog-actions"><button className="button button-quiet" onClick={onCancel}>Продолжить занятие</button><button className="button button-primary" onClick={onConfirm}>Завершить</button></footer></>;
}

export function DeleteSessionSummary({state,session,onConfirm,onCancel}:{state:State;session:Session;onConfirm:()=>void;onCancel:()=>void}) {
 const marked=state.marks.filter(m=>m.sessionId===session.id).length;
 const answers=state.answers.filter(a=>a.sessionId===session.id).length;
 const debts=state.debts.filter(d=>d.sessionId===session.id).length;
 return <><p className="lifecycle-dialog-copy">Занятие будет перемещено в корзину вместе со связанными записями. Они исчезнут из ведомости, профилей студентов и рейтинга.</p><div className="delete-record-counts"><span><b>{marked}</b> {unit(marked,['отметка','отметки','отметок'])}</span><span><b>{answers}</b> {unit(answers,['ответ','ответа','ответов'])}</span><span><b>{debts}</b> {unit(debts,['задолженность','задолженности','задолженностей'])}</span></div><p className="lifecycle-dialog-note">Восстановление занятия вернет все эти записи.</p><footer className="dialog-actions"><button className="button button-quiet" onClick={onCancel}>Оставить</button><button className="button button-danger-matte" onClick={onConfirm}><Trash2 size={15}/>Удалить занятие</button></footer></>;
}

export function DeletedLessons({state,groupCode,store,onRestored}:{state:State;groupCode:string;store:JournalStore;onRestored:(id:string)=>void}) {
 const [error,setError]=useState('');
 const sessions=state.sessions.filter(l=>l.groupCode===groupCode&&l.deletedAt).sort((a,b)=>(b.deletedAt??'').localeCompare(a.deletedAt??''));
 return <div className="deleted-lessons"><p className="lifecycle-dialog-note">В корзине сохраняются посещаемость, ответы и задания. Удаленные занятия исключены из рабочих показателей.</p>{error&&<p className="lifecycle-inline-error" role="alert">{error}</p>}{sessions.length?<div className="deleted-lesson-list">{sessions.map(l=><article key={l.id}><div><span>{dateText(l.date)} · {l.period}-я пара</span><strong>{l.topic||l.kind}</strong><small>{l.completedAt?'Завершено':'Открыто'} · удалено {timeText(l.deletedAt!)}</small></div><button onClick={()=>{try{store.archiveSession(l.id,false);onRestored(l.id);}catch(e){setError(e instanceof Error?e.message:'Не удалось восстановить занятие');}}}><RotateCcw size={15}/><span>Восстановить</span></button></article>)}</div>:<div className="deleted-empty"><Trash2 size={27}/><h3>Корзина пуста</h3><p>Удаленные занятия появятся здесь.</p></div>}</div>;
}
