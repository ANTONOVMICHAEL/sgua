import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Answer, Debt, Grade, JournalStore, Session, State, Student } from './storage';

export default function SessionRecords({ state, student, session, store, initialTab }: {
  state: State; student: Student; session: Session; store: JournalStore; initialTab: 'answers' | 'debts';
}) {
  const [tab, setTab] = useState(initialTab);
  const [answerId, setAnswerId] = useState<string>(), [grade, setGrade] = useState<Grade>('+'), [note, setNote] = useState('');
  const [debtId, setDebtId] = useState<string>(), [title, setTitle] = useState(''), [kind, setKind] = useState('Тема'), [dueDate, setDueDate] = useState(''), [debtNote, setDebtNote] = useState(''), [resolution, setResolution] = useState('');
  const [feedback, setFeedback] = useState(''), [error, setError] = useState(''), [removed, setRemoved] = useState<Answer>();
  const answers = state.answers.filter(a => a.studentId === student.id && a.sessionId === session.id);
  const debts = state.debts.filter(d => d.studentId === student.id && d.sessionId === session.id);
  const editingDebt = debts.find(d => d.id === debtId);
  const clearAnswer = () => { setAnswerId(undefined); setGrade('+'); setNote(''); };
  const clearDebt = () => { setDebtId(undefined); setTitle(''); setDueDate(''); setDebtNote(''); setResolution(''); };
  const act = (work: () => void, message: string) => { try { work(); setError(''); setFeedback(message); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить запись'); } };
  const editAnswer = (a: Answer) => { setAnswerId(a.id); setGrade(a.grade); setNote(a.note); setError(''); setFeedback(''); };
  const editDebt = (d: Debt) => { setDebtId(d.id); setTitle(d.title); setKind(d.kind); setDueDate(d.dueDate); setDebtNote(d.note); setResolution(d.resolution); setError(''); setFeedback(''); };
  const date = (value: string) => new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0,10)}T12:00:00Z`));

  return <div className="session-records">
    {session.topic && <p className="records-topic">{session.topic}</p>}
    <div className="records-tabs" role="tablist" aria-label="Записи студента за занятие">
      <button type="button" id="answers-tab" role="tab" aria-selected={tab === 'answers'} aria-controls="records-panel" onClick={() => {setTab('answers'); setError(''); setFeedback('');}}>Ответы <span>{answers.length}</span></button>
      <button type="button" id="debts-tab" role="tab" aria-selected={tab === 'debts'} aria-controls="records-panel" onClick={() => {setTab('debts'); setError(''); setFeedback('');}}>Задолженности <span>{debts.length}</span></button>
    </div>
    <div id="records-panel" role="tabpanel" aria-labelledby={tab === 'answers' ? 'answers-tab' : 'debts-tab'}>
      {tab === 'answers' ? <>
        <div className="records-list" aria-label="Ответы за занятие">
          {answers.length ? answers.map((a, i) => <article className={`record-line ${answerId === a.id ? 'editing' : ''}`} key={a.id}>
            <span className={`record-grade grade-${a.grade === '+' ? 'plus' : a.grade}`}>{a.grade}</span>
            <div><strong>{a.note || (a.grade === '+' ? 'Ответ без оценки' : 'Ответ на занятии')}</strong><small>Ответ {i + 1}</small></div>
            <button className="record-edit" type="button" aria-label={`Изменить ответ ${i + 1}`} onClick={() => editAnswer(a)}>Изменить</button>
          </article>) : <p className="records-empty">Ответов за это занятие пока нет.</p>}
        </div>
        {removed && <div className="record-undo"><span>Ответ удален</span><button type="button" onClick={() => act(() => {store.restoreAnswer(removed); setRemoved(undefined);}, 'Ответ восстановлен')}>Вернуть</button></div>}
        <form className="record-composer" onSubmit={e => {e.preventDefault(); act(() => {store.saveAnswer({id:answerId, studentId:student.id, sessionId:session.id, grade, note}); clearAnswer();}, answerId ? 'Изменения сохранены' : 'Ответ добавлен');}}>
          <div className="composer-heading"><h3>{answerId ? 'Изменить ответ' : 'Новый ответ'}</h3>{answerId && <button className="text-button" type="button" onClick={clearAnswer}>Отмена</button>}</div>
          <div className="response-entry"><div className="record-grade-picker" role="group" aria-label="Оценка за ответ">{(['+', '2', '3', '4', '5'] as Grade[]).map(v => <button type="button" key={v} aria-label={v === '+' ? 'Без оценки' : `Оценка ${v}`} aria-pressed={grade === v} className={grade === v ? 'selected' : ''} onClick={() => setGrade(v)}>{v}</button>)}</div><span className="grade-caption">«+» без оценки</span></div>
          <label className="field"><span>Тема или комментарий <small>необязательно</small></span><textarea rows={2} maxLength={3000} value={note} onChange={e => setNote(e.target.value)} placeholder="О чем был ответ"/></label>
          <div className="composer-actions">{answerId && <button type="button" className="record-remove" onClick={() => act(() => {setRemoved(store.removeAnswer(answerId)); clearAnswer();}, 'Ответ удален')}>Удалить ответ</button>}<button type="submit" className="button button-primary">{answerId ? 'Сохранить изменения' : 'Добавить ответ'}</button></div>
        </form>
      </> : <>
        <div className="records-list" aria-label="Задолженности за занятие">
          {debts.length ? debts.map((d, i) => <article className={`record-line debt-record ${debtId === d.id ? 'editing' : ''} ${d.status}`} key={d.id}>
            <span className="record-debt-number">{d.status === 'resolved' ? <Check size={17}/> : String(i+1).padStart(2,'0')}</span>
            <div><strong>{d.title}</strong><small>{d.kind}{d.status === 'resolved' ? ` · Погашена ${date(d.resolvedAt)}` : d.dueDate ? ` · До ${date(d.dueDate)}` : ''}</small>{d.note && <p>{d.note}</p>}{d.resolution && <p>{d.resolution}</p>}</div>
            <div className="record-debt-actions"><button className="record-edit" type="button" aria-label={`Изменить задолженность ${i+1}`} onClick={() => editDebt(d)}>Изменить</button><button className="record-resolve" type="button" aria-label={`${d.status === 'open' ? 'Погасить' : 'Открыть повторно'}: ${d.title}`} onClick={() => act(() => {store.resolveDebt(d.id, d.status === 'open'); if (debtId === d.id) clearDebt();}, d.status === 'open' ? 'Задолженность погашена' : 'Задолженность открыта')}>{d.status === 'open' ? 'Погасить' : 'Открыть'}</button></div>
          </article>) : <p className="records-empty">Задолженностей за это занятие нет.</p>}
        </div>
        <form className="record-composer" onSubmit={e => {e.preventDefault(); act(() => {store.saveDebt({id:debtId,studentId:student.id,groupCode:student.groupCode,sessionId:session.id,title,kind,dueDate,note:debtNote}); clearDebt();}, debtId ? 'Изменения сохранены' : 'Задолженность добавлена');}}>
          <div className="composer-heading"><h3>{debtId ? 'Изменить задолженность' : 'Новая задолженность'}</h3>{debtId && <button className="text-button" type="button" onClick={clearDebt}>Отмена</button>}</div>
          <label className="field"><span>Тема или задание</span><input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Что нужно подготовить"/></label>
          <div className="form-two"><label className="field"><span>Вид работы</span><select value={kind} onChange={e => setKind(e.target.value)}>{['Тема','Задание','Отработка','Контрольная','Другое'].map(v => <option key={v}>{v}</option>)}</select></label><label className="field"><span>Срок <small>необязательно</small></span><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></label></div>
          <label className="field"><span>Комментарий <small>необязательно</small></span><textarea rows={2} maxLength={3000} value={debtNote} onChange={e => setDebtNote(e.target.value)}/></label>
          {editingDebt?.status === 'open' && <label className="field"><span>Запись о погашении <small>при сдаче</small></span><input value={resolution} maxLength={3000} onChange={e => setResolution(e.target.value)}/></label>}
          <div className="composer-actions">{editingDebt?.status === 'open' && <button className="text-button" type="button" onClick={() => act(() => {store.saveDebt({id:debtId,studentId:student.id,groupCode:student.groupCode,sessionId:session.id,title,kind,dueDate,note:debtNote}); store.resolveDebt(editingDebt.id,true,resolution); clearDebt();}, 'Задолженность погашена')}>Погасить с комментарием</button>}<button type="submit" className="button button-primary">{debtId ? 'Сохранить изменения' : 'Добавить задолженность'}</button></div>
        </form>
      </>}
    </div>
    <p className={`records-feedback ${error ? 'error' : ''}`} role="status" aria-live="polite">{error || feedback || '\u00a0'}</p>
  </div>;
}
