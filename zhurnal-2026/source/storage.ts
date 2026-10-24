export type Attendance = "present" | "absent" | "late" | "excused";
export type Grade = "+" | "2" | "3" | "4" | "5";
export type Group = { code: string; institute: string; position: number };
export type Student = { id: string; groupCode: string; position: number; fullName: string; active: number };
export type Session = { id: string; groupCode: string; date: string; period: number; kind: string; topic: string; createdAt: string; deletedAt?: string };
export type Mark = { studentId: string; sessionId: string; status: Attendance; updatedAt: string };
export type Answer = { id: string; studentId: string; sessionId: string; grade: Grade; note: string; updatedAt: string };
export type Debt = { id: string; studentId: string; groupCode: string; sessionId: string; title: string; kind: string; dueDate: string; note: string; status: "open" | "resolved"; resolution: string; createdAt: string; updatedAt: string; resolvedAt: string };
export type RatingSettings = { attendance: number; answerPlus: number; grade2: number; grade3: number; grade4: number; grade5: number; openDebt: number };
export const DEFAULT_RATING_SETTINGS: RatingSettings = { attendance: 1, answerPlus: 2, grade2: 0, grade3: 1, grade4: 2, grade5: 3, openDebt: 2 };
export function validateRatingSettings(input: unknown): RatingSettings {
  if (!input || typeof input !== "object") throw new Error("Проверьте баллы рейтинга");
  const keys = Object.keys(DEFAULT_RATING_SETTINGS) as (keyof RatingSettings)[];
  const value = input as RatingSettings;
  if (keys.some(k => !Number.isInteger(value[k]) || value[k] < 0 || value[k] > 20) || keys.every(k => value[k] === 0)) throw new Error("Баллы должны быть от 0 до 20; хотя бы один показатель должен быть больше нуля");
  return Object.fromEntries(keys.map(k => [k, value[k]])) as RatingSettings;
}
export type State = { schemaVersion: 2; ratingSettings?: RatingSettings; savedAt?: string; groups: Group[]; students: Student[]; sessions: Session[]; marks: Mark[]; answers: Answer[]; debts: Debt[] };
export type Seed = readonly { code: string; institute: string; students: readonly string[] }[];
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export const STORAGE_KEY = "sgua-journal-v1";
export const RECOVERY_KEY = "sgua-journal-before-import";
const states: Attendance[] = ["present", "absent", "late", "excused"];
const grades: Grade[] = ["+", "2", "3", "4", "5"];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const stamp = () => new Date().toISOString();
const id = () => typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const isDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime()) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const text = (value: unknown, max = 3000): value is string => typeof value === "string" && value.length <= max;
function ensure(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function initialState(seed: Seed): State {
  return { schemaVersion: 2, groups: seed.map((r, position) => ({ code: r.code, institute: r.institute, position })), students: seed.flatMap(r => r.students.map((fullName, i) => ({ id: `${r.code}-${i + 1}`, groupCode: r.code, fullName, active: 1, position: i + 1 }))), sessions: [], marks: [], answers: [], debts: [] };
}
export function validateState(input: unknown): State {
  ensure(input && typeof input === "object", "Файл не содержит журнал");
  const v = input as Record<string, unknown>;
  ensure(!v.schemaVersion || v.schemaVersion === 1 || v.schemaVersion === 2, "Файл создан более новой версией журнала");
  for (const key of ["groups", "students", "sessions", "marks"]) ensure(Array.isArray(v[key]), "Неверный формат журнала");
  ensure(v.answers === undefined || Array.isArray(v.answers), "Повреждены записи ответов");
  ensure(v.debts === undefined || Array.isArray(v.debts), "Повреждены записи задолженностей");
  const s = clone({ ...v, schemaVersion: 2, answers: v.answers ?? [], debts: v.debts ?? [] }) as State;
  if (s.ratingSettings !== undefined) s.ratingSettings = validateRatingSettings(s.ratingSettings);
  if (s.savedAt !== undefined) ensure(text(s.savedAt) && Number.isFinite(Date.parse(s.savedAt)), "Повреждена дата сохранения");
  const groupIds = new Set<string>(), studentIds = new Set<string>(), sessionIds = new Set<string>();
  for (const g of s.groups) { ensure(text(g.code, 80) && g.code.trim() && text(g.institute) && Number.isFinite(g.position) && !groupIds.has(g.code), "Поврежден список групп"); groupIds.add(g.code); }
  for (const p of s.students) { ensure(text(p.id, 150) && p.id && !studentIds.has(p.id) && groupIds.has(p.groupCode) && text(p.fullName, 200) && p.fullName.trim() && Number.isFinite(p.position) && [0, 1].includes(p.active), "Поврежден список студентов"); studentIds.add(p.id); }
  for (const l of s.sessions) { ensure(text(l.id, 150) && l.id && !sessionIds.has(l.id) && groupIds.has(l.groupCode) && isDate(l.date) && Number.isInteger(l.period) && l.period > 0 && l.period < 13 && text(l.kind, 100) && text(l.topic) && text(l.createdAt), "Повреждено занятие"); sessionIds.add(l.id); }
  const person = (studentId: string, sessionId: string) => s.students.find(p => p.id === studentId)?.groupCode === s.sessions.find(l => l.id === sessionId)?.groupCode && studentIds.has(studentId) && sessionIds.has(sessionId);
  const markKeys = new Set<string>(), answerKeys = new Set<string>(), debtIds = new Set<string>();
  for (const m of s.marks) { const k = `${m.studentId}/${m.sessionId}`; ensure(person(m.studentId, m.sessionId) && states.includes(m.status) && text(m.updatedAt) && !markKeys.has(k), "Повреждены отметки посещаемости"); markKeys.add(k); }
  for (const a of s.answers) { const k = `${a.studentId}/${a.sessionId}`; ensure(person(a.studentId, a.sessionId) && text(a.id, 150) && grades.includes(a.grade) && text(a.note) && text(a.updatedAt) && !answerKeys.has(k), "Повреждены записи ответов"); answerKeys.add(k); }
  for (const d of s.debts) { ensure(text(d.id, 150) && d.id && !debtIds.has(d.id) && studentIds.has(d.studentId) && s.students.find(p => p.id === d.studentId)?.groupCode === d.groupCode && text(d.title, 200) && d.title.trim() && text(d.kind, 100) && (!d.dueDate || isDate(d.dueDate)) && text(d.note) && ["open", "resolved"].includes(d.status) && text(d.resolution) && text(d.createdAt) && text(d.updatedAt) && text(d.resolvedAt) && text(d.sessionId) && (d.status !== "resolved" || isDate(d.resolvedAt.slice(0, 10))), "Повреждены записи задолженностей"); debtIds.add(d.id); }
  return s;
}
export class JournalStore {
  private value: State;
  private listeners = new Set<() => void>();
  readonly storage: StoragePort;
  constructor(storage: StoragePort, seed: Seed) {
    this.storage = storage;
    const saved = storage.getItem(STORAGE_KEY);
    this.value = saved ? validateState(JSON.parse(saved)) : initialState(seed);
  }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(change: (draft: State) => void) {
    const latest = this.storage.getItem(STORAGE_KEY);
    const draft = latest ? validateState(JSON.parse(latest)) : clone(this.value);
    change(draft);
    draft.savedAt = stamp();
    this.storage.setItem(STORAGE_KEY, JSON.stringify(draft));
    this.value = draft; this.listeners.forEach(l => l());
  }
  setRatingSettings(settings: RatingSettings) { const value = validateRatingSettings(settings); this.update(s => { s.ratingSettings = value; }); }
  reload = () => { const raw = this.storage.getItem(STORAGE_KEY); if (raw) { this.value = validateState(JSON.parse(raw)); this.listeners.forEach(l => l()); } };
  export = () => JSON.stringify(this.value, null, 2);
  import = (input: unknown) => {
    const next = validateState(input);
    this.storage.setItem(RECOVERY_KEY, this.export());
    this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.value = next; this.listeners.forEach(l => l());
  };
  recover = () => { const saved = this.storage.getItem(RECOVERY_KEY); ensure(saved, "Предыдущая копия не найдена"); this.import(JSON.parse(saved)); };
  saveSession(input: Omit<Session, "id" | "createdAt"> & { id?: string }): string {
    ensure(isDate(input.date) && input.period >= 1 && input.period <= 12, "Проверьте дату и номер пары");
    let result = "";
    this.update(s => {
      ensure(s.groups.some(g => g.code === input.groupCode), "Группа не найдена");
      const duplicate = s.sessions.find(l => !l.deletedAt && l.id !== input.id && l.groupCode === input.groupCode && l.date === input.date && l.period === input.period);
      if (duplicate) { if (input.id) throw new Error("На эту дату и пару уже есть занятие"); result = duplicate.id; return; }
      const existing = s.sessions.find(l => l.id === input.id);
      if (existing) { Object.assign(existing, input); result = existing.id; }
      else { result = id(); s.sessions.push({ ...input, id: result, createdAt: stamp() }); }
    }); return result;
  }
  archiveSession(sessionId: string, archived = true) { this.update(s => { const l = s.sessions.find(l => l.id === sessionId); ensure(l, "Занятие не найдено"); l.deletedAt = archived ? stamp() : undefined; }); }
  mark(studentId: string, sessionId: string, status: Attendance | null) {
    this.update(s => { this.checkPair(s, studentId, sessionId); ensure(status === null || states.includes(status), "Неверная отметка"); s.marks = s.marks.filter(m => !(m.studentId === studentId && m.sessionId === sessionId)); if (status) s.marks.push({ studentId, sessionId, status, updatedAt: stamp() }); });
  }
  markRemaining(sessionId: string) { this.update(s => { const l = s.sessions.find(l => l.id === sessionId && !l.deletedAt); ensure(l, "Занятие не найдено"); for (const p of s.students.filter(p => p.groupCode === l.groupCode && p.active)) if (!s.marks.some(m => m.sessionId === sessionId && m.studentId === p.id)) s.marks.push({ studentId: p.id, sessionId, status: "present", updatedAt: stamp() }); }); }
  answer(studentId: string, sessionId: string, grade: Grade | null, note = "") {
    this.update(s => { this.checkPair(s, studentId, sessionId); ensure(grade === null || grades.includes(grade), "Неверная оценка"); ensure(text(note), "Комментарий слишком длинный"); const old = s.answers.find(a => a.studentId === studentId && a.sessionId === sessionId); s.answers = s.answers.filter(a => !(a.studentId === studentId && a.sessionId === sessionId)); if (grade) s.answers.push({ id: old?.id ?? id(), studentId, sessionId, grade, note: note.trim(), updatedAt: stamp() }); });
  }
  saveStudent(input: { id?: string; fullName: string; groupCode: string; active: number }): string {
    ensure(input.fullName.trim() && input.fullName.trim().length <= 200, "Укажите имя студента"); let result = "";
    this.update(s => { ensure(s.groups.some(g => g.code === input.groupCode), "Группа не найдена"); const old = s.students.find(p => p.id === input.id); if (old) { old.fullName = input.fullName.trim(); old.active = input.active ? 1 : 0; result = old.id; } else { result = id(); s.students.push({ id: result, fullName: input.fullName.trim(), groupCode: input.groupCode, active: 1, position: Math.max(0, ...s.students.filter(p => p.groupCode === input.groupCode).map(p => p.position)) + 1 }); } }); return result;
  }
  saveDebt(input: { id?: string; studentId: string; groupCode: string; sessionId: string; title: string; kind: string; dueDate: string; note: string }): string {
    ensure(input.title.trim() && input.title.trim().length <= 200, "Укажите тему задолженности"); ensure(!input.dueDate || isDate(input.dueDate), "Проверьте срок"); ensure(text(input.note), "Комментарий слишком длинный"); let result = "";
    this.update(s => { ensure(s.students.some(p => p.id === input.studentId && p.groupCode === input.groupCode), "Студент не найден"); const old = s.debts.find(d => d.id === input.id); if (old) { Object.assign(old, input, { title: input.title.trim(), updatedAt: stamp() }); result = old.id; } else { result = id(); s.debts.push({ ...input, title: input.title.trim(), id: result, status: "open", resolution: "", resolvedAt: "", createdAt: stamp(), updatedAt: stamp() }); } }); return result;
  }
  resolveDebt(debtId: string, resolved: boolean, resolution = "") { this.update(s => { const d = s.debts.find(d => d.id === debtId); ensure(d, "Задолженность не найдена"); d.status = resolved ? "resolved" : "open"; d.resolvedAt = resolved ? stamp() : ""; d.resolution = resolved ? resolution.trim() : ""; d.updatedAt = stamp(); }); }
  private checkPair(s: State, studentId: string, sessionId: string) { const l = s.sessions.find(l => l.id === sessionId && !l.deletedAt); ensure(l && s.students.some(p => p.id === studentId && p.groupCode === l.groupCode), "Студент или занятие не найдены"); }
}
export function csvCell(value: unknown) { const v = String(value ?? ""); return `"${(/^[\t\r\n ]*[=+@-]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`; }
