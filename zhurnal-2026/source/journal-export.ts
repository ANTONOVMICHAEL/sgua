import type { State } from './storage';
import { csvCell, isVisibleDebt } from './storage.ts';

/** Every answer and linked assignment is retained; no first-answer lookup. */
export function journalCsv(state: State, groupCode: string): string {
  const lessons = state.sessions.filter(l => l.groupCode === groupCode && !l.deletedAt).sort((a,b) => a.date.localeCompare(b.date) || a.period-b.period);
  const statuses = {present:'Присутствует',absent:'Отсутствует',late:'Опоздал',excused:'Уважительная причина'};
  const headers = ['Порядок','Студент','В составе',...lessons.flatMap(l => [`${l.date} / ${l.period}: посещаемость`,`${l.date} / ${l.period}: ответы`,`${l.date} / ${l.period}: комментарии к ответам`,`${l.date} / ${l.period}: задания`]),'Открытые задолженности','Погашено задолженностей'];
  const rows = state.students.filter(p => p.groupCode === groupCode).sort((a,b) => a.position-b.position).map(p => {
    const debts = state.debts.filter(d => d.studentId === p.id && isVisibleDebt(state, d));
    return [p.position,p.fullName,p.active ? 'Да' : 'Архив',...lessons.flatMap(l => {
      const mark = state.marks.find(m => m.studentId === p.id && m.sessionId === l.id);
      const answers = state.answers.filter(a => a.studentId === p.id && a.sessionId === l.id);
      return [mark ? statuses[mark.status] : '', answers.map(a => a.grade).join(' / '),answers.map((a,i) => `${i+1}. ${a.grade}${a.note ? `: ${a.note}` : ''}`).join('\n'), debts.filter(d => d.sessionId === l.id).map(d => `${d.title} (${d.status === 'resolved' ? 'погашена' : 'открыта'})${d.dueDate ? `, до ${d.dueDate}` : ''}${d.note ? ` — ${d.note}` : ''}${d.resolution ? ` — ${d.resolution}` : ''}`).join('\n')];
    }),debts.filter(d => d.status === 'open').map(d => `${d.title}${d.dueDate ? ` (до ${d.dueDate})` : ''}`).join('; '), debts.filter(d => d.status === 'resolved').length];
  });
  return '\uFEFF' + [headers,...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
}
