import React from 'react';
import {ArrowUpRight, BookOpen, Check, ChevronRight, Plus} from 'lucide-react';
import type {State,Session,Student} from './storage';
import {isVisibleDebt,DEFAULT_RATING_SETTINGS} from './storage';
import {buildRanking} from './rating';
import CampusCover from './campus-cover';
import GroupCarousel from './group-carousel';

const unit=(n:number,a:[string,string,string])=>a[n%100>10&&n%100<20?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];
const date=(v:string)=>new Date(v+'T12:00:00Z').toLocaleDateString('ru',{day:'numeric',month:'long',timeZone:'UTC'});

export default function AcademicDashboard({state,groupCode,throughDate,onGroup,onLesson,onNew,onStudent,onRating,onDebts,onStudents}:{state:State;groupCode:string;throughDate:string;onGroup:(code:string)=>void;onLesson:(s:Session)=>void;onNew:()=>void;onStudent:(s:Student)=>void;onRating:()=>void;onDebts:()=>void;onStudents:()=>void}){
 const group=state.groups.find(g=>g.code===groupCode)!;
 const students=state.students.filter(s=>s.groupCode===groupCode&&s.active);
 const sessions=state.sessions.filter(s=>s.groupCode===groupCode&&!s.deletedAt).sort((a,b)=>b.date.localeCompare(a.date)||b.period-a.period);
 const completed=sessions.filter(s=>s.completedAt).length, latest=sessions[0];
 const marks=state.marks.filter(m=>m.sessionId===latest?.id&&students.some(s=>s.id===m.studentId));
 const ids=new Set(sessions.map(s=>s.id)),answers=state.answers.filter(a=>ids.has(a.sessionId));
 const debts=state.debts.filter(d=>d.groupCode===groupCode&&d.status==='open'&&isVisibleDebt(state,d));
 const leaders=buildRanking(state,[groupCode],state.ratingSettings??DEFAULT_RATING_SETTINGS,throughDate).filter(r=>r.score!==null).slice(0,3);
 return <main id="dashboard" tabIndex={-1} className="academic-dashboard" aria-label="Обзор учебной работы">
  <div className="command-center">
   <CampusCover recorded={false}>
    <div className="campus-board-heading"><span>Саратовская государственная юридическая академия</span><h2>{group.institute}</h2></div>
    

    <div className="campus-data-strip">
     <div><span>Проведено</span><strong>{completed}<small> / {sessions.length}</small></strong><p>{sessions.length-completed} {unit(sessions.length-completed,['занятие открыто','занятия открыто','занятий открыто'])}</p></div>
     <button onClick={onRating}><span>Ответы</span><strong>{answers.length}</strong><p>За все занятия <ArrowUpRight size={12}/></p></button>
     <button onClick={onDebts}><span>Долги</span><strong>{debts.length}</strong><p>{debts.length?'Ожидают погашения':'Открытых нет'} <ArrowUpRight size={12}/></p></button>
    </div>
   </CampusCover>
   <aside className="group-console">
    <GroupCarousel groups={state.groups} students={state.students} sessions={state.sessions} selected={groupCode} onSelect={onGroup}/>
    <div className="campus-attendance"><div><span>Последнее занятие</span>{latest?<button onClick={()=>onLesson(latest)}>{date(latest.date)}<small>{latest.period}-я пара</small><ArrowUpRight size={14}/></button>:<strong>Занятий пока нет</strong>}</div><div className="campus-attendance-dots" aria-label={latest?`${marks.length} из ${students.length} отмечено`:'Занятий пока нет'}>{students.map(s=>{const status=marks.find(m=>m.studentId===s.id)?.status;return <span key={s.id} className={status||'unmarked'} title={`${s.fullName}: ${status?({present:'Присутствует',absent:'Отсутствует',late:'Опоздал',excused:'Уважительная причина'}[status]):'Не отмечен'}`}/>;})}</div><small>{latest?`${marks.length} из ${students.length} отмечено`:'Посещаемость появится после первого занятия'}</small></div>
    <div className="group-console-roster"><div><span className="group-console-avatars">{students.slice(0,4).map((s,i)=><i key={s.id} style={{zIndex:4-i}}>{s.fullName.split(' ').slice(0,2).map(x=>x[0]).join('')}</i>)}</span><span><strong>{students.length} {unit(students.length,['студент','студента','студентов'])}</strong><small>В составе группы</small></span></div><button onClick={onStudents} aria-label="Открыть состав группы"><ArrowUpRight size={17}/></button></div>
    <button className="group-console-open" onClick={()=>latest?onLesson(latest):onNew()}><span>{latest?"Открыть последнее занятие":"Создать первое занятие"}</span><ArrowUpRight size={16}/></button>
   </aside>
  </div>
  <div className="dashboard-lower">
   <section className="dashboard-lessons"><header><h2>Занятия группы</h2><button onClick={onNew}><Plus size={15}/>Добавить</button></header>{sessions.length?<div className="dashboard-session-list">{sessions.slice(0,3).map(s=><button key={s.id} onClick={()=>onLesson(s)}><span className="dashboard-session-date"><b>{new Date(s.date+'T12:00:00Z').getUTCDate().toString().padStart(2,'0')}</b><small>{new Date(s.date+'T12:00:00Z').toLocaleDateString('ru',{month:'short',timeZone:'UTC'}).replace('.','')}</small></span><span className="dashboard-session-copy"><strong>{s.topic||s.kind}</strong><small>{s.period}-я пара · {s.kind}</small></span><span className={`dashboard-session-state ${s.completedAt?'complete':''}`}>{s.completedAt?<Check size={12}/>:<i/>}{s.completedAt?'Завершено':'Открыто'}</span><ChevronRight size={15}/></button>)}</div>:<div className="dashboard-empty"><span><BookOpen size={45} strokeWidth={1}/></span><div><h3>Занятий пока нет</h3><p>Создай занятие, чтобы отмечать посещаемость<br/>и сохранять ответы студентов.</p><button onClick={onNew}>Создать занятие <ArrowUpRight size={14}/></button></div></div>}</section>
   <section className="dashboard-leaders"><header><h2>Активность студентов</h2><button onClick={onRating}>Рейтинг <ArrowUpRight size={14}/></button></header>{leaders.length?<div>{leaders.map(r=><button key={r.student.id} className="dashboard-leader-row" onClick={()=>onStudent(r.student)}><span>{String(r.rank).padStart(2,'0')}</span><span><strong>{r.student.fullName.split(' ')[0]}</strong><small>{r.student.fullName.split(' ').slice(1).join(' ')}</small></span><b>{r.score}<small>балл.</small></b></button>)}</div>:<div className="dashboard-ranking-empty"><span className="dashboard-no-score" aria-hidden="true">—</span><p>Рейтинг появится после первой отметки.<br/>Учитываются посещения, ответы и долги.</p></div>}</section>
  </div>
 </main>;
}
