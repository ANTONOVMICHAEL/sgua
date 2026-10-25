import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, ChevronDown, CircleHelp, Search, Settings2 } from 'lucide-react';
import { DEFAULT_RATING_SETTINGS, csvCell } from './storage';
import type { RatingSettings, State, Student } from './storage';
import { buildRanking } from './rating';
import ActivityChart from './activity-chart';
import './rating-v12.css';
const unit = (n: number, forms: [
    string,
    string,
    string
]) => { const v = Math.abs(n) % 100; return forms[v > 10 && v < 20 ? 2 : v % 10 === 1 ? 0 : v % 10 >= 2 && v % 10 <= 4 ? 1 : 2]; };
const number = (v: number | null, digits = 0) => v === null ? '—' : new Intl.NumberFormat('ru', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
const formatDate = (date: string) => new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'));
export function RatingSettingsForm({ value, onSave, onCancel }: {
    value: RatingSettings;
    onSave: (value: RatingSettings) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(value);
    const fields: {
        key: keyof RatingSettings;
        title: string;
        hint?: string;
    }[] = [{ key: 'attendance', title: 'Посещение', hint: 'П и О' }, { key: 'answerPlus', title: 'Ответ «+»', hint: 'без оценки' }, { key: 'grade2', title: 'Оценка 2' }, { key: 'grade3', title: 'Оценка 3' }, { key: 'grade4', title: 'Оценка 4' }, { key: 'grade5', title: 'Оценка 5' }, { key: 'openDebt', title: 'Открытый долг', hint: 'вычитается' }];
    return <form onSubmit={e => { e.preventDefault(); onSave(draft); }}><p className="dialog-text">Баллы — рабочий показатель активности. Он не меняет выставленные оценки. Значения от 0 до 20 применяются ко всей истории журнала.</p><div className="rating-settings-fields">{fields.map(f => <label key={f.key}><span>{f.title}<small>{f.hint}</small></span><span className="rating-number-field">{f.key === 'openDebt' && <i>−</i>}<input type="number" min="0" max="20" step="1" required aria-label={`Баллы: ${f.title}`} value={Number.isNaN(draft[f.key]) ? '' : draft[f.key]} onChange={e => setDraft({ ...draft, [f.key]: e.target.value === '' ? NaN : Number(e.target.value) })}/><small>балл.</small></span></label>)}</div><button className="text-button" type="button" onClick={() => setDraft(DEFAULT_RATING_SETTINGS)}>Вернуть исходные баллы</button><p className="form-help rating-help">Незаполненные отметки не считаются пропусками. За «Н» и «У» баллы не вычитаются; задолженность влияет на рейтинг только пока открыта. Будущие и скрытые занятия в расчет не входят.</p><footer className="dialog-actions"><button className="button button-quiet" type="button" onClick={onCancel}>Отмена</button><button className="button button-primary" type="submit">Применить</button></footer></form>;
}
export default function RatingDashboard({ state, groupCode, throughDate, onStudent, onSettings }: {
    state: State;
    groupCode: string;
    throughDate: string;
    onStudent: (student: Student) => void;
    onSettings: () => void;
}) {
    const [scope, setScope] = useState<'group' | 'all'>('group'), [query, setQuery] = useState(''), [sort, setSort] = useState<'score' | 'attendance' | 'answers' | 'grade' | 'debts'>('score'), [explanation, setExplanation] = useState(false);
    const settings = state.ratingSettings ?? DEFAULT_RATING_SETTINGS;
    const codes = scope === 'all' ? state.groups.map(g => g.code) : [groupCode];
    const ranking = useMemo(() => buildRanking(state, codes, settings, throughDate), [state, groupCode, scope, throughDate]);
    const ranked = ranking.filter(r => r.score !== null), leader = ranked[0], tied = ranked.filter(r => r.rank === 1).length;
    const currentSessions = state.sessions.filter(l => codes.includes(l.groupCode) && !l.deletedAt && l.date <= throughDate).sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
    const recent = currentSessions.slice(-9).map(l => ({ lesson: l, answers: state.answers.filter(a => a.sessionId === l.id && ranking.some(r => r.student.id === a.studentId)).length, visits: state.marks.filter(m => m.sessionId === l.id && (m.status === 'present' || m.status === 'late') && ranking.some(r => r.student.id === m.studentId)).length }));
    const answerTotal = ranking.reduce((s, r) => s + r.answers, 0), openTotal = ranking.reduce((s, r) => s + r.openDebts, 0), attendanceTotal = ranking.reduce((s, r) => s + r.present, 0);
    const maxScore = Math.max(1, ...ranked.map(r => Math.abs(r.score ?? 0)));
    const visible = ranking.filter(r => r.student.fullName.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => { if (sort === 'score')
        return (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.student.fullName.localeCompare(b.student.fullName, 'ru'); if (sort === 'attendance')
        return (b.attendanceRate ?? -1) - (a.attendanceRate ?? -1); if (sort === 'answers')
        return b.answers - a.answers; if (sort === 'grade')
        return (b.averageGrade ?? -1) - (a.averageGrade ?? -1); return a.openDebts - b.openDebts || (a.rank ?? 1e9) - (b.rank ?? 1e9); });
    const exportCsv = () => { const rows = [['Место', 'Студент', 'Группа', 'Баллы', 'Посещений', 'Посещаемость по отметкам, %', 'Ответов', 'Средняя оценка', 'Открытых долгов', 'Баллы за посещения', 'Баллы за ответы', 'Вычет за долги'], ...ranking.map(r => [r.rank ?? '', r.student.fullName, r.student.groupCode, r.score ?? '', r.present, r.attendanceRate ?? '', r.answers, r.averageGrade === null ? '' : number(r.averageGrade, 2), r.openDebts, r.attendancePoints, r.answerPoints, r.debtPenalty])]; const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `Рейтинг_${scope === 'all' ? 'все_группы' : groupCode}_${throughDate}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    return <section className="rating-dashboard rating-v12">
      <div className="rating-topline">
        <div className="rating-scope" role="group" aria-label="Охват рейтинга">
          <button aria-pressed={scope === 'group'} className={scope === 'group' ? 'selected' : ''} onClick={() => setScope('group')}>{groupCode}</button>
          <button aria-pressed={scope === 'all'} className={scope === 'all' ? 'selected' : ''} onClick={() => setScope('all')}>Все группы</button>
        </div>
        <span className="rating-through">По состоянию на {formatDate(throughDate)}</span>
      </div>

      <div className="rating-feature-grid">
        <article className={`rating-leader ${leader ? '' : 'no-leader'}`}>
          <div className="rating-feature-top"><span>{leader ? (tied > 1 ? 'Первое место разделяют' : 'Первое место') : 'Лидер рейтинга'}</span><span className="leader-status-tag">{scope === 'all' ? 'Все группы' : groupCode}</span></div>
          <div className="leader-rank-v12" aria-hidden="true">{leader ? String(leader.rank).padStart(2, '0') : '—'}</div>
          <div className="rating-leader-main">
            <div className="rating-leader-copy">{leader ? <>
              <button onClick={() => onStudent(leader.student)}><h3>{leader.student.fullName.split(' ')[0]}<span>{leader.student.fullName.split(' ').slice(1).join(' ')}</span></h3></button>
              <p>{tied > 1 ? `${tied} студентов с равным результатом` : leader.student.groupCode}</p>
            </> : <><h3>Пока нет<br/>результатов</h3><p>Отметь посещение или ответ,<br/>чтобы увидеть первые результаты.</p></>}</div>
            <div className="rating-leader-score"><strong>{leader ? number(leader.score) : '—'}</strong><span>{leader ? unit(leader.score ?? 0, ['балл активности', 'балла активности', 'баллов активности']) : 'пока без результата'}</span></div>
          </div>
          <div className="rating-leader-breakdown"><span>Посещения<b>{leader ? `+${leader.attendancePoints}` : '—'}</b></span><span>Ответы<b>{leader ? `+${leader.answerPoints}` : '—'}</b></span><span>Открытые долги<b>{leader ? `−${leader.debtPenalty}` : '—'}</b></span></div>
        </article>
        <article className="rating-activity"><div className="rating-feature-top"><span>Работа на занятиях</span><span className="chart-period">{currentSessions.length ? `Последние ${Math.min(9,currentSessions.length)}` : 'История группы'}</span></div><ActivityChart entries={recent}/><footer><span>{currentSessions.length} {unit(currentSessions.length, ["занятие", "занятия", "занятий"])} в расчете</span><span>По заполненным отметкам</span></footer></article>
      </div>

      <div className="rating-analysis">
        <section className="rating-totals" aria-label="Показатели группы">
          <div><span>Студентов с записями</span><strong>{ranked.length}<small> / {ranking.length}</small></strong><small className="total-note">В выбранных группах</small></div>
          <div><span>Посещений</span><strong>{attendanceTotal}</strong><small className="total-note">Присутствие и опоздания</small></div>
          <div><span>Ответов</span><strong>{answerTotal}</strong><small className="total-note">С оценкой и без</small></div>
          <div><span>Открытых долгов</span><strong>{openTotal}</strong><small className="total-note">До погашения</small></div>
        </section>
        <aside className="rating-podium">
          <div className="rating-feature-top"><span>Первые три места</span><small>Равные баллы — равное место</small></div>
          {ranked.length ? <div className="podium-list">{ranked.slice(0, 3).map((r, i) => <button key={r.student.id} onClick={() => onStudent(r.student)} className={`podium-person podium-${i + 1}`}><span className="podium-position">{String(r.rank).padStart(2, '0')}</span><span className="podium-name"><strong>{r.student.fullName.split(' ')[0]}</strong><small>{r.student.fullName.split(' ').slice(1).join(' ')}</small></span><span className="podium-score">{number(r.score)}<small>{unit(r.score ?? 0, ['балл', 'балла', 'баллов'])}</small></span></button>)}</div> : <p className="podium-empty-v12">Первая отметка откроет рейтинг.<br/>Места рассчитываются автоматически.</p>}
        </aside>
      </div>

      <section className="rating-table-surface">
        <div className="rating-list-heading"><div><h3>Все студенты<span>{ranking.length}</span></h3><p>Посещения, ответы и задолженности</p></div><div><button className="circle-button" aria-label="Как считается рейтинг" title="Как считается рейтинг" onClick={() => setExplanation(v => !v)} aria-expanded={explanation}><CircleHelp size={18}/></button><button className="circle-button" aria-label="Выгрузить рейтинг CSV" title="Выгрузить рейтинг" onClick={exportCsv}><ArrowDownToLine size={17}/></button></div></div>
        {explanation && <div className="rating-explanation"><strong>Посещения + ответы − открытые долги</strong><p>Посещение «П» или «О»: {settings.attendance} балл.; ответ «+»: {settings.answerPlus}; оценки 2 / 3 / 4 / 5: {settings.grade2} / {settings.grade3} / {settings.grade4} / {settings.grade5}; открытый долг: −{settings.openDebt}. Погашение снимает вычет. Уважительные пропуски не уменьшают баллы. Будущие и скрытые занятия исключены.</p><p>Баллы накапливаются по всей истории. При сравнении разных групп учитывайте число занятий. Процент посещаемости рассчитан только по заполненным отметкам; «У» исключается из знаменателя. Рабочий рейтинг не заменяет оценку преподавателя.</p><button className="text-button" onClick={onSettings}><Settings2 size={14}/>Настроить баллы</button></div>}
        <div className="rating-list-toolbar"><label className="search-field"><Search size={16}/><input type="search" aria-label="Найти студента в рейтинге" value={query} placeholder="Фамилия студента" onChange={e => setQuery(e.target.value)}/></label><label className="rating-sort">Порядок <select aria-label="Сортировка рейтинга" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="score">По баллам</option><option value="attendance">По посещаемости</option><option value="answers">По ответам</option><option value="grade">По средней оценке</option><option value="debts">Меньше долгов</option></select><ChevronDown size={13}/></label></div>
        <div className="rating-table" role="table" aria-label="Рейтинг студентов"><div className="rating-table-head" role="row"><span role="columnheader">Место</span><span role="columnheader">Студент</span><span role="columnheader">Посещаемость</span><span role="columnheader">Ответы</span><span role="columnheader">Средняя</span><span role="columnheader">Долги</span><span role="columnheader">Баллы</span></div>{visible.map(row => <button key={row.student.id} role="row" className={`rating-row ${row.rank === 1 ? 'first-place' : ''} ${row.score === null ? 'no-data' : ''}`} aria-label={`${row.student.fullName}: ${row.rank === null ? 'без места' : `место ${row.rank}`}, ${row.score === null ? 'нет данных' : `${row.score} ${unit(row.score ?? 0, ["балл", "балла", "баллов"])}`}`} onClick={() => onStudent(row.student)}><span role="cell" className="rating-position">{row.rank === null ? '—' : String(row.rank).padStart(2, '0')}</span><span role="cell" className="rating-person"><span><strong>{row.student.fullName.split(' ')[0]}</strong><small>{row.student.fullName.split(' ').slice(1).join(' ')}<i>{row.student.groupCode}</i></small></span></span><span role="cell" className="rating-attendance"><small>Посещения</small><b>{row.attendanceRate === null ? '—' : `${row.attendanceRate}%`}</b><i>{row.present} по журналу</i></span><span role="cell" className="rating-detail"><small>Ответы</small><b>{row.answers || '—'}</b></span><span role="cell" className="rating-detail"><small>Средняя</small><b>{number(row.averageGrade, 1)}</b></span><span role="cell" className={`rating-detail ${row.openDebts ? 'debt-present' : ''}`}><small>Долги</small><b>{row.openDebts || '—'}</b></span><span role="cell" className="rating-score" title={`${row.attendancePoints} + ${row.answerPoints} − ${row.debtPenalty}`}><strong>{number(row.score)}</strong><span><i className={(row.score ?? 0) < 0 ? 'negative' : ''} style={{ width: `${row.score === null ? 0 : Math.abs(row.score) / maxScore * 100}%` }}/></span></span></button>)}</div>
        {!visible.length && <div className="inline-empty"><Search size={24}/><h4>Студент не найден</h4><p>Измените поисковый запрос.</p></div>}
        <footer className="rating-table-footer"><span>Расчет по сохраненным данным журнала</span><button onClick={onSettings}>Правила начисления баллов</button></footer>
      </section>
    </section>;
}
