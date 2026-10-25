import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileCheck2, MessageSquare, RotateCcw } from 'lucide-react';
import type { Attendance, Grade, JournalStore, Session, State, Student } from './storage';
import './focus-lesson.css';

const attendance: { value: Attendance; short: string; label: string }[] = [
  { value: 'present', short: 'П', label: 'Присутствует' },
  { value: 'absent', short: 'Н', label: 'Отсутствует' },
  { value: 'late', short: 'О', label: 'Опоздал' },
  { value: 'excused', short: 'У', label: 'Уважительная причина' },
];
const grades: Grade[] = ['+', '2', '3', '4', '5'];
const plural = (n: number, forms: [string, string, string]) => forms[n % 100 > 10 && n % 100 < 20 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];

type Props = {
  state: State;
  students: Student[];
  session: Session;
  store: JournalStore;
  onProfile: (student: Student) => void;
  onRecords: (student: Student, tab: 'answers' | 'debts') => void;
  onError: (error: unknown) => void;
};

export default function FocusLesson({ state, students, session, store, onProfile, onRecords, onError }: Props) {
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '');
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ studentId: string; id: string } | null>(null);
  const index = Math.max(0, students.findIndex(p => p.id === selectedId));
  const person = students[index];
  const marks = new Map(state.marks.filter(m => m.sessionId === session.id).map(m => [m.studentId, m.status]));
  const marked = students.filter(p => marks.has(p.id)).length;
  const firstUnmarkedOffset = Array.from({ length: Math.max(0, students.length - 1) }, (_, step) => (index + step + 1) % students.length).find(i => !marks.has(students[i].id));

  useEffect(() => { setFeedback(''); setFailed(false); setLastAnswer(null); }, [person?.id, session.id]);
  const choose = (i: number) => { if (students[i]) setSelectedId(students[i].id); };
  const run = (work: () => void, message: string) => {
    try { work(); setFailed(false); setFeedback(message); }
    catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : 'Запись не сохранена'); onError(error); }
  };
  if (!person) return <div className="focus-empty"><h3>В этом списке нет студентов</h3><p>Измени поиск или фильтр, чтобы продолжить.</p></div>;
  const status = marks.get(person.id);
  const answers = state.answers.filter(a => a.studentId === person.id && a.sessionId === session.id);
  const debts = state.debts.filter(d => d.studentId === person.id && d.sessionId === session.id && d.status === 'open');
  const name = person.fullName.trim().split(/\s+/);
  const lastCanUndo = lastAnswer?.studentId === person.id && answers.some(a => a.id === lastAnswer.id);
  const percentage = students.length ? marked / students.length * 100 : 0;
  const navigateByKey = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable=true]')) return;
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); choose(index - 1); }
    if (e.key === 'ArrowRight' && index < students.length - 1) { e.preventDefault(); choose(index + 1); }
  };

  return <section className="focus-desk" aria-label="Работа со студентами по одному" onKeyDown={navigateByKey}>
    <div className="focus-desk-top">
      <div className="focus-page-count"><span>{String(index + 1).padStart(2, '0')}</span><small>из {students.length}</small></div>
      <div className="focus-roll-progress"><span>Отмечено {marked} из {students.length}</span><i><b style={{ width: `${percentage}%` }}/></i></div>
      <div className="focus-turns">
        <button type="button" aria-label="Предыдущий студент" disabled={index === 0} onClick={() => choose(index - 1)}><ArrowLeft size={18}/></button>
        <button type="button" aria-label="Следующий студент" disabled={index === students.length - 1} onClick={() => choose(index + 1)}><ArrowRight size={18}/></button>
      </div>
    </div>

    <div className="focus-desk-body" key={person.id}>
      <div className="focus-person-side">
        <div className="focus-identity-line"><span>{person.groupCode}</span><button type="button" onClick={() => onProfile(person)}>Профиль студента <ChevronRight size={14}/></button></div>
        <button type="button" className="focus-person-name" onClick={() => onProfile(person)} aria-label={`Профиль: ${person.fullName}`}><strong>{name[0]}</strong><span>{name.slice(1).join(' ')}</span></button>
        <div className="focus-attendance-heading"><h3>Посещаемость</h3><span className={status ? `is-${status}` : ''}>{status ? attendance.find(a => a.value === status)?.label : 'Не отмечен'}</span></div>
        <div className="focus-attendance" role="group" aria-label={`Посещаемость: ${person.fullName}`}>
          {attendance.map(a => <button key={a.value} type="button" aria-pressed={status === a.value} aria-label={`${person.fullName}: ${a.label}`} className={status === a.value ? `is-${a.value}` : ''} onClick={() => run(() => store.mark(person.id, session.id, status === a.value ? null : a.value), status === a.value ? 'Отметка снята' : a.label)}><b>{a.short}</b><span>{a.value === 'excused' ? 'Уважительная' : a.label}</span>{status === a.value && <Check size={13}/>}</button>)}
        </div>
        <button className="focus-next-unmarked" type="button" disabled={firstUnmarkedOffset === undefined} onClick={() => { if (firstUnmarkedOffset !== undefined) choose(firstUnmarkedOffset); }}>{firstUnmarkedOffset === undefined ? (marked === students.length ? 'Все в списке отмечены' : 'Остался текущий студент') : 'Следующий неотмеченный'}<ArrowRight size={16}/></button>
      </div>

      <div className="focus-work-side">
        <div className="focus-responses-heading"><h3>Ответы за пару</h3><span>{answers.length}</span></div>
        <div className="focus-answer-history" aria-label={`Ответы за пару: ${person.fullName}`}>
          {answers.length ? answers.map((a, i) => <button type="button" key={a.id} onClick={() => onRecords(person, 'answers')} title={a.note || `Ответ ${i + 1}`} aria-label={`Ответ ${i + 1}: ${a.grade}${a.note ? `, ${a.note}` : ''}`} className={a.grade === '2' ? 'focus-low-grade' : ''}>{a.grade}</button>) : <p>Ответов пока нет.</p>}
        </div>
        <div className="focus-quick-label"><span>Добавить ответ</span><small>«+» без оценки</small></div>
        <div className="focus-quick-grades" role="group" aria-label={`Быстрый ответ: ${person.fullName}`}>
          {grades.map(grade => <button type="button" key={grade} aria-label={`Добавить ответ ${grade}: ${person.fullName}`} onClick={() => run(() => { const id = store.saveAnswer({ studentId: person.id, sessionId: session.id, grade, note: '' }); setLastAnswer({ studentId: person.id, id }); }, `Ответ ${grade} добавлен`)}>{grade}</button>)}
        </div>
        <div className="focus-answer-tools"><button type="button" onClick={() => onRecords(person, 'answers')}><MessageSquare size={15}/>С комментарием</button>{lastCanUndo && <button type="button" aria-label="Отменить последний быстрый ответ" onClick={() => run(() => { store.removeAnswer(lastAnswer!.id); setLastAnswer(null); }, 'Последний ответ удален')}><RotateCcw size={14}/>Отменить</button>}</div>
        <button type="button" className={`focus-debt-link ${debts.length ? 'has-debts' : ''}`} onClick={() => onRecords(person, 'debts')}><FileCheck2 size={18}/><span>{debts.length ? `${debts.length} ${plural(debts.length, ['задолженность', 'задолженности', 'задолженностей'])}` : 'Задолженности за пару'}</span><b>{debts.length ? '+' : 'Добавить'}</b></button>
      </div>
    </div>
    <footer className="focus-desk-footer"><span className={failed ? 'focus-feedback-error' : ''} role="status" aria-live="polite">{feedback || 'Выбор студента не меняет отметки'}</span><span className="focus-key-hint"><kbd>←</kbd><kbd>→</kbd> перейти к студенту</span></footer>
  </section>;
}
