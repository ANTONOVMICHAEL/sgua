import React, { useId, useMemo, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { DEFAULT_RATING_SETTINGS, isVisibleDebt } from './storage';
import type { Attendance, Debt, Session, State, Student } from './storage';
import { buildRanking } from './rating';

type Props = {
  state: State;
  student: Student;
  sessions: Session[];
  onEditStudent: () => void;
  onDebt: (debt?: Debt) => void;
  onRecords: (session: Session, tab: 'answers' | 'debts') => void;
};
const attendance: Record<Attendance, { letter: string; label: string }> = {
  present: { letter: 'П', label: 'Присутствие' },
  absent: { letter: 'Н', label: 'Пропуск' },
  late: { letter: 'О', label: 'Опоздание' },
  excused: { letter: 'У', label: 'Уважительная причина' },
};
function currentDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Saratov', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)?.value).join('-');
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}
const unit = (count: number, forms: [string, string, string]) => { const value = count % 100; return forms[value > 10 && value < 20 ? 2 : count % 10 === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 ? 1 : 2]; };
const decimal = (value: number | null) => value === null ? '—' : value.toLocaleString('ru', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function StudentProfile({ state, student, sessions, onEditStudent, onDebt, onRecords }: Props) {
  const [tab, setTab] = useState<'history' | 'debts'>('history');
  const [debtScope, setDebtScope] = useState<'open' | 'all'>('open');
  const id = useId();
  const throughDate = currentDate();
  const lessons = useMemo(() => sessions.filter(lesson => lesson.groupCode === student.groupCode && !lesson.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period), [sessions, student.groupCode]);
  const pastIds = new Set(lessons.filter(lesson => lesson.date <= throughDate).map(lesson => lesson.id));
  const answers = state.answers.filter(answer => answer.studentId === student.id && pastIds.has(answer.sessionId));
  const marks = state.marks.filter(mark => mark.studentId === student.id && pastIds.has(mark.sessionId));
  const debts = state.debts.filter(debt => debt.studentId === student.id && isVisibleDebt(state,debt)).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.createdAt.localeCompare(a.createdAt));
  const openDebts = debts.filter(debt => debt.status === 'open');
  const present = marks.filter(mark => mark.status === 'present' || mark.status === 'late').length;
  const denominator = marks.filter(mark => mark.status !== 'excused').length;
  const rate = denominator ? Math.round(present / denominator * 100) : null;
  const numeric = answers.filter(answer => answer.grade !== '+').map(answer => Number(answer.grade));
  const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
  const ranking = buildRanking(state, [student.groupCode], state.ratingSettings ?? DEFAULT_RATING_SETTINGS, throughDate);
  const ranked = ranking.find(row => row.student.id === student.id);
  const days = [...new Set(lessons.map(lesson => lesson.date))];
  const visibleDebts = debtScope === 'open' ? openDebts : debts;
  const initials = student.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('');
  const changeTab = (next: 'history' | 'debts') => setTab(next);

  return <div className="dossier">
    <div className="dossier-identity">
      <span className="dossier-monogram" aria-hidden="true">{initials}</span>
      <div className="dossier-group"><strong>{student.groupCode}</strong><span>{student.active ? 'В составе группы' : 'В архиве'}</span></div>
      {ranked?.rank !== null && ranked?.rank !== undefined && <div className="dossier-place"><strong>{ranked.rank}</strong><span>место<br/>в группе</span></div>}
      <button type="button" className="dossier-edit" onClick={onEditStudent} aria-label="Изменить студента"><Pencil size={16}/><span>Изменить</span></button>
    </div>

    <section className="dossier-numbers" aria-label="Показатели студента">
      <div><span>Посещаемость</span><strong>{rate === null ? '—' : rate}<small>{rate === null ? '' : '%'}</small></strong><p>{marks.length ? `${present} из ${denominator} без учета «У»` : 'Нет отметок'}</p></div>
      <div><span>Ответы</span><strong>{answers.length}</strong><p>Все ответы за пары</p></div>
      <div><span>Средняя оценка</span><strong>{decimal(average)}</strong><p>{numeric.length ? `${numeric.length} ${unit(numeric.length, ['числовая оценка', 'числовые оценки', 'числовых оценок'])}` : 'Оценок пока нет'}</p></div>
      <div className={openDebts.length ? 'dossier-number-debts' : ''}><span>Открытые долги</span><strong>{openDebts.length}</strong><p>{debts.length - openDebts.length ? `Погашено: ${debts.length - openDebts.length}` : 'Работы к сдаче'}</p></div>
    </section>

    <div className="dossier-tabs" role="tablist" aria-label="Разделы карточки студента" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'history' : event.key === 'End' ? 'debts' : tab === 'history' ? 'debts' : 'history';
      changeTab(next);
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next === 'history' ? 0 : 1]?.focus();
    }}>
      <button type="button" id={`${id}-history`} role="tab" aria-controls={`${id}-panel`} aria-selected={tab === 'history'} tabIndex={tab === 'history' ? 0 : -1} onClick={() => changeTab('history')}>История <span>{lessons.length}</span></button>
      <button type="button" id={`${id}-debts`} role="tab" aria-controls={`${id}-panel`} aria-selected={tab === 'debts'} tabIndex={tab === 'debts' ? 0 : -1} onClick={() => changeTab('debts')}>Задолженности <span>{openDebts.length}</span></button>
    </div>

    <div className="dossier-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
      {tab === 'history' ? <>
        {days.length ? <div className="dossier-timeline">{days.map(day => <section className="dossier-day" key={day}>
          <h3>{formatDate(day)}</h3>
          <div className="dossier-day-entries">{lessons.filter(lesson => lesson.date === day).map(lesson => {
            const mark = state.marks.find(value => value.studentId === student.id && value.sessionId === lesson.id);
            const lessonAnswers = state.answers.filter(value => value.studentId === student.id && value.sessionId === lesson.id);
            const lessonDebts = debts.filter(value => value.sessionId === lesson.id && value.status === 'open');
            return <button type="button" className="dossier-lesson" key={lesson.id} onClick={() => onRecords(lesson, 'answers')} aria-label={`${formatDate(day)}, ${lesson.period}-я пара: открыть записи студента`}>
              <span className={`dossier-attendance ${mark?.status ?? 'unmarked'}`} title={mark ? attendance[mark.status].label : 'Не отмечен'}>{mark ? attendance[mark.status].letter : '—'}</span>
              <span className="dossier-lesson-copy"><strong>{lesson.topic || lesson.kind}</strong><small>{lesson.period}-я пара · {lesson.kind}{lesson.completedAt?' · Завершено':' · Открыто'}{lesson.date > throughDate ? ' · Будущее занятие' : ''}</small>
                <span className="dossier-lesson-state">{mark ? attendance[mark.status].label : 'Посещаемость не отмечена'}{lessonDebts.length > 0 && <em>{lessonDebts.length} {unit(lessonDebts.length, ['долг', 'долга', 'долгов'])}</em>}</span>
                {lessonAnswers.some(answer => answer.note) && <span className="dossier-answer-notes">{lessonAnswers.filter(answer => answer.note).map(answer => <span key={answer.id}>{answer.note}</span>)}</span>}
              </span>
              <span className="dossier-grades" aria-label={lessonAnswers.length ? `Ответы: ${lessonAnswers.map(answer => answer.grade).join(', ')}` : 'Ответов нет'}>{lessonAnswers.length ? lessonAnswers.map(answer => <b key={answer.id} className={answer.grade === '2' ? 'dossier-grade-low' : ''} title={answer.note || 'Ответ на занятии'}>{answer.grade}</b>) : <span>Нет ответов</span>}</span>
            </button>;
          })}</div>
        </section>)}</div> : <div className="dossier-empty"><span className="dossier-empty-rule"/><h3>История еще не началась</h3><p>Здесь появятся посещения, ответы и оценки после занятий группы.</p></div>}
      </> : <>
        <div className="dossier-debt-toolbar"><div role="group" aria-label="Фильтр задолженностей"><button type="button" aria-pressed={debtScope === 'open'} onClick={() => setDebtScope('open')}>Открытые <span>{openDebts.length}</span></button><button type="button" aria-pressed={debtScope === 'all'} onClick={() => setDebtScope('all')}>Все <span>{debts.length}</span></button></div><button type="button" className="dossier-add-debt" onClick={() => onDebt()}><Plus size={15}/>Добавить</button></div>
        {visibleDebts.length ? <div className="dossier-debt-list">{visibleDebts.map(debt => {
          const lesson = lessons.find(value => value.id === debt.sessionId);
          const overdue = debt.status === 'open' && Boolean(debt.dueDate) && debt.dueDate < throughDate;
          return <button type="button" key={debt.id} className={`dossier-debt ${debt.status} ${overdue ? 'overdue' : ''}`} onClick={() => onDebt(debt)}>
            <span className="dossier-debt-sign" aria-hidden="true">{debt.status === 'resolved' ? <Check size={18}/> : <span/>}</span>
            <span className="dossier-debt-copy"><strong>{debt.title}</strong><small>{debt.kind}{lesson ? ` · ${formatDate(lesson.date)}, ${lesson.period}-я пара` : ''}</small>{debt.note && <p>{debt.note}</p>}{debt.resolution && <p className="dossier-resolution">{debt.resolution}</p>}</span>
            <span className="dossier-debt-date">{debt.status === 'resolved' ? <>Погашена<small>{formatDate(debt.resolvedAt)}</small></> : debt.dueDate ? <>{overdue ? 'Срок истек' : 'До'}<small>{formatDate(debt.dueDate)}</small></> : 'Без срока'}</span>
          </button>;
        })}</div> : <div className="dossier-empty dossier-empty-debt"><span className="dossier-empty-rule"/><h3>{debtScope === 'open' ? 'Открытых долгов нет' : 'Задолженностей нет'}</h3><p>{debtScope === 'open' && debts.length ? 'Все внесенные работы погашены.' : 'Задания и сроки можно добавить отдельно для каждой работы.'}</p></div>}
      </>}
    </div>
    <div className="dossier-footnote">Показатели по сохраненным записям на {formatDate(throughDate)} Незакрытые задолженности — за всю историю.</div>
  </div>;
}
