import type { RatingSettings, State, Student } from './storage';

export type RatingRow = {
  student: Student;
  rank: number | null;
  score: number | null;
  present: number;
  recorded: number;
  attendanceRate: number | null;
  answers: number;
  averageGrade: number | null;
  openDebts: number;
  resolvedDebts: number;
  attendancePoints: number;
  answerPoints: number;
  debtPenalty: number;
};

/** Cumulative activity points. Missing records never count as absences. */
export function buildRanking(state: State, codes: string[], settings: RatingSettings, throughDate: string): RatingRow[] {
  const allowed = new Set(codes);
  const sessionIds = new Set(state.sessions.filter(l => allowed.has(l.groupCode) && !l.deletedAt && l.date <= throughDate).map(l => l.id));
  const rows = state.students.filter(p => p.active && allowed.has(p.groupCode)).map(student => {
    const marks = state.marks.filter(m => m.studentId === student.id && sessionIds.has(m.sessionId));
    const answers = state.answers.filter(a => a.studentId === student.id && sessionIds.has(a.sessionId));
    const debts = state.debts.filter(d => d.studentId === student.id);
    const present = marks.filter(m => m.status === 'present' || m.status === 'late').length;
    const denominator = marks.filter(m => m.status !== 'excused').length;
    const numeric = answers.filter(a => a.grade !== '+').map(a => Number(a.grade));
    const openDebts = debts.filter(d => d.status === 'open').length;
    const attendancePoints = present * settings.attendance;
    const answerPoints = answers.reduce((sum, a) => sum + (a.grade === '+' ? settings.answerPlus : settings[`grade${a.grade}`]), 0);
    const debtPenalty = openDebts * settings.openDebt;
    const observed = marks.length + answers.length + debts.length > 0;
    return {
      student, rank: null, score: observed ? attendancePoints + answerPoints - debtPenalty : null,
      present, recorded: marks.length, attendanceRate: denominator ? Math.round(present / denominator * 100) : null,
      answers: answers.length, averageGrade: numeric.length ? numeric.reduce((a,b) => a+b, 0) / numeric.length : null,
      openDebts, resolvedDebts: debts.length - openDebts, attendancePoints, answerPoints, debtPenalty,
    } as RatingRow;
  }).sort((a,b) => (a.score === null ? 1 : 0) - (b.score === null ? 1 : 0) || (b.score ?? 0) - (a.score ?? 0) || a.student.fullName.localeCompare(b.student.fullName, 'ru'));
  let rank = 0;
  rows.forEach((row, i) => { if (row.score !== null) { if (i === 0 || row.score !== rows[i-1].score) rank = i + 1; row.rank = rank; } });
  return rows;
}
