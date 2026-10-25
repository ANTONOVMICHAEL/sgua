import React, { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BarChart3, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, Download, Ellipsis, FileCheck2, FolderArchive, GraduationCap, LayoutGrid, MessageSquare, Pencil, Plus, RotateCcw, Search, Settings2, Upload, UsersRound, X } from "lucide-react";
import { Answer, Attendance, Debt, Grade, Group, JournalStore, Session, State, Student, RECOVERY_KEY, DEFAULT_RATING_SETTINGS, csvCell, validateState } from "./storage";
import GroupCarousel from "./group-carousel";
import CampusCover from "./campus-cover";
import SessionRecords from "./session-records";
import { journalCsv } from "./journal-export";
import RatingDashboard, { RatingSettingsForm } from "./rating-dashboard";
const statusMeta: Record<Attendance, {
    short: string;
    label: string;
}> = { present: { short: "П", label: "Присутствует" }, absent: { short: "Н", label: "Отсутствует" }, late: { short: "О", label: "Опоздал" }, excused: { short: "У", label: "Уважительная причина" } };
const attendanceOrder: Attendance[] = ["present", "absent", "late", "excused"];
type View = "journal" | "debts" | "students" | "rating";
type DialogState = {
    type: "session";
    session?: Session;
} | {
    type: "records";
    student: Student;
    session: Session;
    tab: "answers" | "debts";
} | {
    type: "debt";
    studentId?: string;
    debt?: Debt;
} | {
    type: "student";
    student?: Student;
} | {
    type: "profile";
    studentId: string;
} | {
    type: "archive";
    session: Session;
} | {
    type: "data";
} | {
    type: "rating-settings";
} | null;
const tabs: {
    key: View;
    title: string;
    Icon: typeof LayoutGrid;
}[] = [{ key: "journal", title: "Журнал", Icon: BookOpen }, { key: "rating", title: "Рейтинг", Icon: BarChart3 }, { key: "debts", title: "Задолженности", Icon: FileCheck2 }, { key: "students", title: "Студенты", Icon: UsersRound }];
export function today() { const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Saratov", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); return ["year", "month", "day"].map(k => p.find(v => v.type === k)?.value).join("-"); }
function dateText(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) { return new Intl.DateTimeFormat("ru", { ...options, timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`)); }
function countUnit(count: number, words: [
    string,
    string,
    string
]) { const n = count % 100; return words[n > 10 && n < 20 ? 2 : count % 10 === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 ? 1 : 2]; }
function countWord(count: number, words: [
    string,
    string,
    string
]) { return `${count} ${countUnit(count, words)}`; }
function shortName(name: string) { return name.split(" ")[0]; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map(p => p[0]).join(""); }
function saveFile(contents: string, name: string, type: string) { const url = URL.createObjectURL(new Blob([contents], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function AttendanceMap({ students, marks }: {
    students: Student[];
    marks: Map<string, Attendance>;
}) {
    return <div className="attendance-map" aria-label="Отметки выбранного занятия">{students.map(p => <span key={p.id} className={marks.get(p.id) ?? "unmarked"} title={`${p.fullName}: ${marks.has(p.id) ? statusMeta[marks.get(p.id)!].label : "Не отмечен"}`}/>)}</div>;
}
function JournalOverview({ students, groupCode, session, sessions, marks, answerCount, debtCount, start, rating, debts }: {
  students: Student[]; groupCode: string; session?: Session; sessions: Session[]; marks: Map<string, Attendance>;
  answerCount: number; debtCount: number; start: () => void; rating: () => void; debts: () => void;
}) {
  const recorded = students.filter(p => marks.has(p.id)).length;
  const present = students.filter(p => ["present", "late"].includes(marks.get(p.id) ?? "")).length;
  const coverage = students.length ? Math.round(recorded / students.length * 100) : 0;
  return <div className={`overview-grid ${session ? "overview-recorded" : ""}`}>
    <CampusCover recorded={Boolean(session)}>
      <div className="scene-heading"><span>Институт прокуратуры</span><h2>{groupCode}</h2></div>
      <div className="scene-note"><span>{students.length}</span> {countUnit(students.length,["студент","студента","студентов"])} в группе</div>
    </CampusCover>
    <aside className="overview-summary" aria-label="Показатели группы">
      <div className="summary-heading"><h3>Работа группы</h3><span>За все время</span></div>
      <div className="summary-metrics">
        <div><span><BookOpen size={18}/>Занятия</span><strong>{sessions.length}</strong></div>
        <button onClick={rating}><span><MessageSquare size={18}/>Ответы</span><strong>{answerCount}</strong></button>
        <button onClick={debts}><span><FileCheck2 size={18}/>Задолженности</span><strong>{debtCount}</strong></button>
      </div>
      {session ? <div className="summary-current"><div><span>{dateText(session.date)} · {session.period}-я пара</span><strong>{recorded} <small>из {students.length} отмечено</small></strong></div><div className="summary-track"><i style={{width:`${coverage}%`}}/></div><a className="button button-ink" href="#workspace">К занятию</a></div> : <div className="summary-start"><p>Занятий пока нет.</p><button className="button button-ink" onClick={start}>Начать занятие</button></div>}
    </aside>
  </div>;
}
function EmptyJournal({ students, showStudents, onStudent }: { students: Student[]; groupCode: string; start: () => void; showStudents: () => void; onStudent: (id:string) => void }) {
  return <section className="prepared-roster"><div className="prepared-heading"><div><h2>Состав группы <span>{students.length}</span></h2></div><button className="text-button" onClick={showStudents}>Управление составом</button></div><div className="prepared-people">{students.map((p,i)=><button key={p.id} onClick={() => onStudent(p.id)}><span className="prepared-avatar">{String(i+1).padStart(2,"0")}</span><span><strong>{p.fullName.split(" ")[0]}</strong><small>{p.fullName.split(" ").slice(1).join(" ")}</small></span></button>)}</div></section>;
}
function Modal({ title, subtitle, children, close, wide = false }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    close: () => void;
    wide?: boolean;
}) {
    const titleId = useId(), ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const last = document.activeElement as HTMLElement | null, before = document.body.style.overflow; document.body.style.overflow = "hidden"; const root = ref.current!; const first = root.querySelector<HTMLElement>("input:not([type=file]), select, textarea, button"); first?.focus(); const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") {
        e.stopPropagation();
        close();
    } if (e.key === "Tab") {
        const a = [...root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type=hidden]):not([type=file]), select, textarea, a[href], [tabindex="0"]')].filter(v => v.offsetParent !== null);
        const first = a[0], last = a.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    } }; document.addEventListener("keydown", onKey); return () => { document.body.style.overflow = before; document.removeEventListener("keydown", onKey); last?.focus(); }; }, []);
    return <div className="modal-shade" onMouseDown={e => { if (e.target === e.currentTarget)
        close(); }}><div ref={ref} className={`dialog ${wide ? "dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><header className="dialog-head"><div>{subtitle && <p>{subtitle}</p>}<h2 id={titleId}>{title}</h2></div><button type="button" className="circle-button" onClick={close} aria-label="Закрыть окно"><X size={19}/></button></header>{children}</div></div>;
}
function Field({ title, children, hint }: {
    title: string;
    children: React.ReactNode;
    hint?: string;
}) { return <label className="field"><span>{title}{hint && <small>{hint}</small>}</span>{children}</label>; }
function SessionForm({ group, session, store, done, error, close }: {
    group: Group;
    session?: Session;
    store: JournalStore;
    done: (id: string) => void;
    error: (e: unknown) => void;
    close: () => void;
}) {
    const [date, setDate] = useState(session?.date ?? today()), [period, setPeriod] = useState(session?.period ?? 1), [kind, setKind] = useState(session?.kind ?? "Семинар"), [topic, setTopic] = useState(session?.topic ?? "");
    return <Modal title={session ? "Изменить занятие" : "Новое занятие"} subtitle={group.code} close={close}><form onSubmit={e => { e.preventDefault(); try {
        done(store.saveSession({ id: session?.id, groupCode: group.code, date, period, kind, topic: topic.trim() }));
    }
    catch (e) {
        error(e);
    } }}><div className="form-two"><Field title="Дата"><input autoFocus type="date" required value={date} onChange={e => setDate(e.target.value)}/></Field><Field title="Пара"><select value={period} onChange={e => setPeriod(+e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}-я пара</option>)}</select></Field></div><Field title="Формат"><select value={kind} onChange={e => setKind(e.target.value)}>{["Семинар", "Практическое занятие", "Лекция", "Консультация", "Другое"].map(k => <option key={k}>{k}</option>)}</select></Field><Field title="Тема" hint="необязательно"><textarea maxLength={3000} rows={3} value={topic} placeholder="Например, исполнение обязательств" onChange={e => setTopic(e.target.value)}/></Field><footer className="dialog-actions"><button type="button" className="button button-quiet" onClick={close}>Отмена</button><button className="button button-primary" type="submit">{session ? "Сохранить" : "Открыть занятие"}</button></footer></form></Modal>;
}
function DebtForm({ state, groupCode, studentId, debt, sessionId, store, close, done, error }: {
    state: State;
    groupCode: string;
    studentId?: string;
    debt?: Debt;
    sessionId: string;
    store: JournalStore;
    close: () => void;
    done: () => void;
    error: (e: unknown) => void;
}) {
    const people = state.students.filter(p => p.groupCode === groupCode && (p.active || p.id === debt?.studentId));
    const [linkedSession, setLinkedSession] = useState(debt?.sessionId ?? sessionId);
    const availableSessions = state.sessions.filter(l => l.groupCode === groupCode && (!l.deletedAt || l.id === linkedSession)).sort((a,b) => b.date.localeCompare(a.date) || b.period-a.period);
    const [person, setPerson] = useState(debt?.studentId ?? studentId ?? people[0]?.id ?? ""), [title, setTitle] = useState(debt?.title ?? ""), [kind, setKind] = useState(debt?.kind ?? "Тема"), [due, setDue] = useState(debt?.dueDate ?? ""), [note, setNote] = useState(debt?.note ?? ""), [resolution, setResolution] = useState(debt?.resolution ?? "");
    const resolve = () => { if (!debt)
        return; try {
        store.resolveDebt(debt.id, debt.status === "open", resolution);
        done();
    }
    catch (e) {
        error(e);
    } };
    return <Modal title={debt ? "Задолженность" : "Добавить задолженность"} subtitle={groupCode} close={close}><form onSubmit={e => { e.preventDefault(); try {
        store.saveDebt({ id: debt?.id, studentId: person, groupCode, sessionId: linkedSession, title, kind, dueDate: due, note });
        done();
    }
    catch (e) {
        error(e);
    } }}><Field title="Студент"><select value={person} required disabled={Boolean(debt)} onChange={e => setPerson(e.target.value)}>{people.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></Field><Field title="Занятие"><select value={linkedSession} onChange={e => setLinkedSession(e.target.value)}><option value="">Без привязки к занятию</option>{availableSessions.map(l => <option key={l.id} value={l.id}>{dateText(l.date)} · {l.period}-я пара{l.topic ? ` · ${l.topic}` : ""}</option>)}</select></Field><Field title="Тема или задание"><input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required placeholder="Что нужно подготовить"/></Field><div className="form-two"><Field title="Вид работы"><select value={kind} onChange={e => setKind(e.target.value)}>{["Тема", "Задание", "Отработка", "Контрольная", "Другое"].map(v => <option key={v}>{v}</option>)}</select></Field><Field title="Срок" hint="необязательно"><input type="date" value={due} onChange={e => setDue(e.target.value)}/></Field></div><Field title="Комментарий" hint="необязательно"><textarea rows={2} value={note} maxLength={3000} onChange={e => setNote(e.target.value)}/></Field>{debt && <div className="debt-resolution"><span className={`debt-status ${debt.status}`}>{debt.status === "resolved" ? "Погашена" : "Открыта"}</span>{debt.status === "resolved" && <small>{dateText(debt.resolvedAt)}</small>}<Field title={debt.status === "open" ? "Как погашена" : "Запись о погашении"} hint="необязательно"><input value={resolution} readOnly={debt.status === "resolved"} maxLength={3000} onChange={e => setResolution(e.target.value)} placeholder="Например, тема сдана устно"/></Field><button className="button button-outline" type="button" onClick={resolve}>{debt.status === "open" ? <CheckCheck size={17}/> : <RotateCcw size={17}/>}{debt.status === "open" ? "Отметить погашение" : "Открыть повторно"}</button></div>}<footer className="dialog-actions"><button type="button" className="button button-quiet" onClick={close}>Отмена</button><button className="button button-primary" type="submit">{debt ? "Сохранить" : "Добавить"}<Check size={17}/></button></footer></form></Modal>;
}
function StudentForm({ group, student, store, done, error, close }: {
    group: Group;
    student?: Student;
    store: JournalStore;
    done: () => void;
    error: (e: unknown) => void;
    close: () => void;
}) {
    const [name, setName] = useState(student?.fullName ?? ""), [active, setActive] = useState(student?.active ?? 1);
    return <Modal title={student ? "Карточка студента" : "Добавить студента"} subtitle={group.code} close={close}><form onSubmit={e => { e.preventDefault(); try {
        store.saveStudent({ id: student?.id, groupCode: group.code, fullName: name, active });
        done();
    }
    catch (e) {
        error(e);
    } }}><Field title="Фамилия, имя, отчество"><input required value={name} maxLength={200} onChange={e => setName(e.target.value)}/></Field>{student && <><Field title="Статус в группе"><select value={active} onChange={e => setActive(+e.target.value)}><option value={1}>В составе группы</option><option value={0}>В архиве</option></select></Field><p className="form-help">При переводе в архив история посещаемости, ответы и задолженности сохраняются.</p></>}<footer className="dialog-actions"><button className="button button-quiet" type="button" onClick={close}>Отмена</button><button className="button button-primary" type="submit">Сохранить</button></footer></form></Modal>;
}
function DataDialog({ store, state, exportCsv, close, done, error }: {
    store: JournalStore;
    state: State;
    exportCsv: () => void;
    close: () => void;
    done: (message: string) => void;
    error: (e: unknown) => void;
}) {
    const [imported, setImported] = useState<State | null>(null), [filename, setFilename] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    return <Modal title="Данные журнала" subtitle="Резервная копия и выгрузка" close={close}><p className="dialog-text">Все проведенные занятия и записи хранятся в этом браузере и сохраняются после закрытия страницы. Резервная копия переносит весь журнал, включая ответы и задолженности, на другое устройство.</p><div className="data-saved-status"><CheckCheck size={18}/><span><strong>{state.sessions.filter(l => !l.deletedAt).length} занятий в памяти устройства</strong><small>{state.savedAt ? `Последняя запись: ${new Date(state.savedAt).toLocaleString("ru")}` : "Новые записи сохраняются сразу"}</small></span></div><div className="data-options"><button onClick={() => { saveFile(store.export(), `Журнал_СГЮА_${today()}.json`, "application/json"); done("Резервная копия скачана"); }}><Download size={21}/><span><strong>Скачать копию</strong><small>{state.sessions.filter(l => !l.deletedAt).length} занятий · {state.answers.length} ответов · {state.debts.length} задолженностей</small></span></button><button onClick={exportCsv}><ClipboardList size={21}/><span><strong>Выгрузить ведомость</strong><small>Текущая группа · CSV для Excel</small></span></button><button onClick={() => fileRef.current?.click()}><Upload size={21}/><span><strong>Загрузить копию</strong><small>Принимает и предыдущий формат журнала</small></span></button><input ref={fileRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Файл резервной копии" onChange={async (e) => { const f = e.target.files?.[0]; if (!f)
        return; try {
        if (f.size > 20 * 1024 * 1024)
            throw Error("Файл слишком большой");
        const s = validateState(JSON.parse(await f.text()));
        setImported(s);
        setFilename(f.name);
    }
    catch (e) {
        error(e);
    } e.target.value = ""; }}/></div>{imported && <div className="import-preview"><strong>{filename}</strong><p>{imported.students.length} студентов · {imported.sessions.length} занятий · {imported.marks.length} отметок · {imported.answers.length} ответов</p><p>Загрузка заменит текущий журнал. Перед заменой предыдущие данные сохранятся в браузере для восстановления.</p><div><button className="button button-quiet" onClick={() => setImported(null)}>Отмена</button><button className="button button-primary" onClick={() => { try {
        store.import(imported);
        done("Журнал загружен из копии");
        close();
    }
    catch (e) {
        error(e);
    } }}>Заменить журнал</button></div></div>}{store.storage.getItem(RECOVERY_KEY) && <button className="recovery-link" onClick={() => { try {
        store.recover();
        done("Восстановлена копия перед загрузкой");
        close();
    }
    catch (e) {
        error(e);
    } }}><RotateCcw size={15}/>Восстановить данные перед последней загрузкой</button>}{state.sessions.some(l => l.deletedAt) && <div className="hidden-lessons"><h3>Скрытые занятия</h3>{state.sessions.filter(l => l.deletedAt).map(l => <div key={l.id}><span>{l.groupCode} · {dateText(l.date)} · {l.period}-я пара</span><button onClick={() => { try {
        store.archiveSession(l.id, false);
        done("Занятие восстановлено");
    }
    catch (e) {
        error(e);
    } }}><RotateCcw size={13}/>Вернуть</button></div>)}</div>}<p className="data-footnote"><CircleHelp size={15}/>Очистка данных браузера удаляет локальные записи. Скачивайте копию после работы.</p></Modal>;
}
export default function Journal({ store }: {
    store: JournalStore;
}) {
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const [groupCode, setGroupCode] = useState(() => localStorage.getItem("journal-group") ?? state.groups[0]?.code ?? ""), [sessionId, setSessionId] = useState(""), [view, setView] = useState<View>("journal"), [matrixOpen, setMatrixOpen] = useState(false), [dialog, setDialog] = useState<DialogState>(null), [search, setSearch] = useState(""), [filter, setFilter] = useState("all"), [debtFilter, setDebtFilter] = useState("open"), [toast, setToast] = useState<{
        text: string;
        undo?: () => void;
    } | null>(null);
    const group = state.groups.find(g => g.code === groupCode) ?? state.groups[0];
    const code = group?.code ?? "";
    const students = useMemo(() => state.students.filter(p => p.groupCode === code).sort((a, b) => a.position - b.position), [state, code]);
    const active = students.filter(p => p.active === 1);
    const sessions = useMemo(() => state.sessions.filter(l => l.groupCode === code && !l.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period), [state, code]);
    const selected = sessions.find(l => l.id === sessionId) ?? sessions[0];
    const groupDebts = state.debts.filter(d => d.groupCode === code), openDebts = groupDebts.filter(d => d.status === "open");
    const sessionIds = new Set(sessions.map(l => l.id));
    const groupAnswers = state.answers.filter(a => sessionIds.has(a.sessionId));
    const marks = new Map(state.marks.filter(m => m.sessionId === selected?.id).map(m => [m.studentId, m.status]));
    const lessonAnswers = state.answers.filter(a => a.sessionId === selected?.id);
    const recorded = active.filter(p => marks.has(p.id)).length, present = active.filter(p => ["present", "late"].includes(marks.get(p.id) ?? "")).length;
    const done = (message: string) => { setDialog(null); setToast({ text: message }); };
    const error = (e: unknown) => setToast({ text: e instanceof Error ? e.message : "Не удалось сохранить запись" });
    const action = (fn: () => void, message?: string) => { try {
        fn();
        if (message)
            setToast({ text: message });
    }
    catch (e) {
        error(e);
    } };
    useEffect(() => { if (!toast)
        return; const timer = setTimeout(() => setToast(null), toast.undo ? 9000 : 4500); return () => clearTimeout(timer); }, [toast]);
    useEffect(() => { const sync = (e: StorageEvent) => { if (e.key === "sgua-journal-v1")
        action(store.reload); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, [store]);
    const chooseGroup = (value: string) => { setGroupCode(value); setSessionId(""); setSearch(""); setFilter("all"); try {
        localStorage.setItem("journal-group", value);
    }
    catch { } };
    const chooseView = (v: View) => { setView(v); setSearch(""); setFilter("all"); window.scrollTo({ top: 0, behavior: "instant" }); };
    const exportCsv = () => {
        saveFile(journalCsv(state, code), `Ведомость_${code}_${today()}.csv`, "text/csv;charset=utf-8");
        setToast({ text: "Ведомость выгружена" });
    };
    const visibleStudents = active.filter(p => p.fullName.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")) && (filter !== "unmarked" || !marks.has(p.id)) && (filter !== "debts" || openDebts.some(d => d.studentId === p.id)));
    const visibleDebts = groupDebts.filter(d => (debtFilter === "all" || d.status === debtFilter) && `${d.title} ${state.students.find(p => p.id === d.studentId)?.fullName}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru"))).sort((a, b) => a.status.localeCompare(b.status) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || b.createdAt.localeCompare(a.createdAt));
    const average = (personId: string) => { const grades = groupAnswers.filter(a => a.studentId === personId && a.grade !== "+").map(a => +a.grade); return grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1).replace(".", ",") : "—"; };
    if (!group)
        return <div className="boot-error"><h1>В журнале нет групп</h1><button className="button button-primary" onClick={() => setDialog({ type: "data" })}>Загрузить копию</button>{dialog && <DataDialog store={store} state={state} exportCsv={exportCsv} done={done} error={error} close={() => setDialog(null)}/>}</div>;
    return <><a href="#workspace" className="skip-link">К журналу группы</a><div className={`page-shell view-${view}`}>
      <header className="app-header"><div className="header-inner">
        <a className="brand" href="#" onClick={e=>{e.preventDefault();chooseView("journal");}}><img src="./sgua-95.svg" alt="СГЮА"/><span>Ведомости<span className="brand-period">.</span><small>Кафедра гражданского права</small></span></a>
        <nav className="main-nav" aria-label="Разделы журнала">{tabs.map(({key,title,Icon})=><button key={key} aria-label={title} title={title} className={view===key?"selected":""} aria-current={view===key?"page":undefined} onClick={()=>chooseView(key)}><Icon size={19} strokeWidth={1.65}/><span>{title}</span>{key==="debts"&&openDebts.length>0&&<i>{openDebts.length}</i>}</button>)}</nav>
        <div className="header-tools"><button className="data-button" aria-label="Данные журнала" title="Данные и резервная копия" onClick={()=>setDialog({type:"data"})}><FolderArchive size={19}/><span>Копия журнала</span></button><div className="header-person"><span>Михаил Антонов<small>Преподаватель</small></span><div className="user-badge" title="Михаил Антонов">МА</div></div></div>
      </div></header>
      <div className="main-shell">
      
      <section id="group-overview" className="group-overview" aria-label="Обзор группы">
        <div className="page-heading"><div><h1>{view === "journal" ? "Журнал занятий" : view === "rating" ? "Рейтинг студентов" : view === "debts" ? "Задолженности" : "Состав группы"}</h1><p>{group.institute} <span>·</span> {countWord(active.length, ["студент", "студента", "студентов"])} в группе</p></div><div className="page-heading-action"><span className="heading-date">{dateText(today(),{day:"numeric",month:"long"})}</span>{view === "rating" ? <button className="button button-outline" onClick={() => setDialog({ type: "rating-settings" })}><Settings2 size={16}/>Настроить баллы</button> : view === "debts" ? <button className="button button-primary" onClick={() => setDialog({ type: "debt" })}>Добавить задолженность</button> : view === "students" ? <button className="button button-primary" onClick={() => setDialog({ type: "student" })}>Добавить студента</button> : <button className="button button-primary" onClick={() => setDialog({ type: "session" })}>Новое занятие</button>}</div></div>
        <GroupCarousel groups={state.groups} students={state.students} sessions={state.sessions} selected={code} onSelect={chooseGroup}/>
        {view === "journal" && !matrixOpen && <JournalOverview students={active} groupCode={code} session={selected} sessions={sessions} marks={marks} answerCount={groupAnswers.length} debtCount={openDebts.length} start={() => setDialog({type:"session"})} rating={() => chooseView("rating")} debts={() => {chooseView("debts");setDebtFilter("open");}}/>}
      </section>
      <main id="workspace" className="workspace" tabIndex={-1}>{view === "journal" && (selected || matrixOpen) && <div className="workspace-title"><div><h2>{matrixOpen ? "Сводная ведомость" : "Занятия"}</h2><span className="lesson-count">{countWord(sessions.length, ["занятие", "занятия", "занятий"])}</span></div><div className="workspace-actions"><span className="saved-indicator" title={state.savedAt ? `Последняя запись: ${new Date(state.savedAt).toLocaleString("ru")}` : "Занятия записываются в браузер сразу после сохранения"}><i />{state.savedAt ? "Сохранено" : "Автосохранение"}</span><button className={`matrix-toggle ${matrixOpen ? "selected" : ""}`} onClick={() => setMatrixOpen(v => !v)}><LayoutGrid size={15}/><span>{matrixOpen ? "К занятию" : "Сводная ведомость"}</span></button></div></div>}
      {view === "journal" && !matrixOpen && <div className={`workbench ${selected ? "" : "empty-workbench"}`}><aside className="session-rail"><div className="rail-title"><span>Занятия</span><button className="tiny-button" title="Новое занятие" aria-label="Новое занятие в списке" onClick={() => setDialog({ type: "session" })}><Plus size={17}/></button></div><div className="session-list">{sessions.map(l => <button key={l.id} className={l.id === selected?.id ? "selected" : ""} aria-pressed={l.id === selected?.id} onClick={() => { setSessionId(l.id); setFilter("all"); }}><strong>{dateText(l.date, { day: "2-digit" })}</strong><span><b>{dateText(l.date, { month: "short" }).replace(".", "")}</b><small>{l.period}-я пара</small></span><i>{state.marks.filter(m => m.sessionId === l.id && active.some(p => p.id === m.studentId)).length}/{active.length}</i></button>)}{!sessions.length && <div className="rail-empty">Здесь будут даты<br />ваших занятий.</div>}</div><div className="rail-bottom"><span>{code}</span><small>{active.length} студентов</small></div></aside><section className="lesson-area">{selected ? <><header className="lesson-heading"><div><span className="lesson-format">{selected.kind} · {selected.period}-я пара</span><h3>{dateText(selected.date)}</h3>{selected.topic && <p>{selected.topic}</p>}</div><div className="lesson-options"><button className="circle-button" title="Изменить занятие" aria-label="Изменить занятие" onClick={() => setDialog({ type: "session", session: selected })}><Pencil size={16}/></button><button className="circle-button" title="Скрыть занятие" aria-label="Скрыть занятие" onClick={() => setDialog({ type: "archive", session: selected })}><FolderArchive size={16}/></button></div></header><div className="lesson-toolbar"><div className="filter-tabs" role="group" aria-label="Фильтр студентов">{[{ key: "all", label: "Все", count: active.length }, { key: "unmarked", label: "Не отмечены", count: active.length - recorded }, { key: "debts", label: "С долгами", count: active.filter(p => openDebts.some(d => d.studentId === p.id)).length }].map(f => <button key={f.key} className={filter === f.key ? "selected" : ""} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}<span>{f.count}</span></button>)}</div><label className="search-field"><Search size={16}/><input type="search" aria-label="Найти студента" value={search} placeholder="Найти студента" onChange={e => setSearch(e.target.value)}/></label></div><div className="roster-top"><span>П — присутствует · Н — отсутствует · О — опоздал · У — уважительная</span>{recorded < active.length && <button onClick={() => action(() => store.markRemaining(selected.id), "Остальные отмечены присутствующими")}><CheckCheck size={16}/>Остальным «П»</button>}</div><div className="roster" role="table" aria-label="Ведомость занятия"><div className="roster-head" role="row"><span role="columnheader">Студент</span><span role="columnheader">Посещаемость</span><span role="columnheader">Ответы</span><span role="columnheader">Задолженности</span></div>{visibleStudents.map(p => { const mark = marks.get(p.id), studentAnswers = lessonAnswers.filter(a => a.studentId === p.id), debts = openDebts.filter(d => d.studentId === p.id && d.sessionId === selected.id); return <div className={`roster-row ${mark ? `status-${mark}` : ""}`} role="row" key={p.id}><div className="student-cell" role="cell"><span className="row-number">{String(p.position).padStart(2, "0")}</span><button className="student-name" onClick={() => setDialog({ type: "profile", studentId: p.id })}><strong>{shortName(p.fullName)}</strong><span>{p.fullName.split(" ").slice(1).join(" ")}</span></button></div><div className="attendance-cell" role="cell"><div className="attendance-picker" role="group" aria-label={`Посещаемость: ${p.fullName}`}>{attendanceOrder.map(v => <button key={v} type="button" aria-label={`${p.fullName}: ${statusMeta[v].label}`} aria-pressed={mark === v} title={statusMeta[v].label} className={mark === v ? `selected ${v}` : ""} onClick={() => action(() => store.mark(p.id, selected.id, mark === v ? null : v))}>{statusMeta[v].short}</button>)}</div></div><div className="answer-cell" role="cell"><small className="cell-label">Ответы</small><div className="answer-sequence">{studentAnswers.length > 0 && <button className="answers-recorded" aria-label={`Ответы: ${p.fullName}`} onClick={() => setDialog({type:"records",student:p,session:selected,tab:"answers"})}>{studentAnswers.slice(0,3).map(a => <span key={a.id} className={`response-grade grade-${a.grade}`} title={a.note || a.grade}>{a.grade}</span>)}{studentAnswers.length > 3 && <small>еще {studentAnswers.length-3}</small>}</button>}<button className="record-add" aria-label={`Добавить ответ: ${p.fullName}`} title="Добавить ответ" onClick={() => setDialog({type:"records",student:p,session:selected,tab:"answers"})}><Plus size={16}/></button></div></div><div className="debt-cell" role="cell"><small className="cell-label">Долги</small><button className={`debt-records-button ${debts.length ? "has-debt" : ""}`} aria-label={`Задолженности за занятие: ${p.fullName}`} onClick={() => setDialog({type:"records",student:p,session:selected,tab:"debts"})}>{debts.length > 0 && <span>{debts.length}</span>}<Plus size={15}/></button></div></div>; })}{!visibleStudents.length && <div className="inline-empty"><Search size={25}/><h4>Никого не найдено</h4><p>Измените поиск или фильтр.</p><button className="text-button" onClick={() => { setSearch(""); setFilter("all"); }}>Показать всю группу</button></div>}</div><footer className="roster-footer"><span><i />{recorded} из {active.length} отмечено</span><button onClick={exportCsv}><ArrowDownToLine size={15}/>Выгрузить ведомость</button></footer></> : <EmptyJournal students={active} groupCode={code} start={() => setDialog({ type: "session" })} showStudents={() => chooseView("students")} onStudent={id=>setDialog({type:"profile",studentId:id})}/>}</section></div>}
      {view === "journal" && matrixOpen && <section className="list-surface matrix-surface"><div className="matrix-intro"><p>Посещаемость и ответы за все занятия. Нажмите ячейку, чтобы открыть пару.</p><button className="text-button" onClick={exportCsv}><Download size={15}/>Выгрузить CSV</button></div>{sessions.length ? <div className="matrix-scroll"><table className="matrix-table"><thead><tr><th>Студент</th>{[...sessions].reverse().map(l => <th key={l.id}><button onClick={() => { setSessionId(l.id); setMatrixOpen(false); }}>{dateText(l.date, { day: "numeric", month: "short" })}<small>{l.period}-я пара</small></button></th>)}</tr></thead><tbody>{students.map(p => <tr key={p.id}><th><button onClick={() => setDialog({ type: "profile", studentId: p.id })}>{p.fullName}{!p.active && <small>В архиве</small>}</button></th>{[...sessions].reverse().map(l => { const m = state.marks.find(m => m.studentId === p.id && m.sessionId === l.id), cellAnswers = state.answers.filter(a => a.studentId === p.id && a.sessionId === l.id); return <td key={l.id}><button className={`matrix-entry ${m?.status ?? ""}`} aria-label={`${p.fullName}, ${dateText(l.date)}, ${l.period}-я пара: ${m ? statusMeta[m.status].label : "Не отмечен"}, ответы ${cellAnswers.map(a => a.grade).join(", ") || "не записаны"}`} onClick={() => { setSessionId(l.id); setMatrixOpen(false); setSearch(shortName(p.fullName)); }}><span>{m ? statusMeta[m.status].short : "—"}</span>{cellAnswers.length > 0 && <b>{cellAnswers.map(a => a.grade).join(" / ")}</b>}</button></td>; })}</tr>)}</tbody></table></div> : <div className="feature-empty"><BookOpen size={28}/><h3>Здесь будет сводная ведомость</h3><p>Создайте первое занятие, чтобы начать учет.</p><button className="button button-outline" onClick={() => setDialog({ type: "session" })}>Новое занятие<Plus size={16}/></button></div>}</section>}
      {view === "debts" && <section className="list-surface"><div className="list-toolbar"><div className="filter-tabs" role="group" aria-label="Статус задолженности">{[{ key: "open", label: "Открытые", count: openDebts.length }, { key: "resolved", label: "Погашенные", count: groupDebts.length - openDebts.length }, { key: "all", label: "Все", count: groupDebts.length }].map(f => <button key={f.key} className={debtFilter === f.key ? "selected" : ""} aria-pressed={debtFilter === f.key} onClick={() => setDebtFilter(f.key)}>{f.label}<span>{f.count}</span></button>)}</div><label className="search-field"><Search size={16}/><input aria-label="Найти задолженность" value={search} onChange={e => setSearch(e.target.value)} placeholder="Студент или тема"/></label></div>{visibleDebts.length ? <div className="debt-list">{visibleDebts.map(d => { const p = state.students.find(p => p.id === d.studentId), overdue = d.status === "open" && d.dueDate && d.dueDate < today(); return <button className="debt-list-row" key={d.id} onClick={() => setDialog({ type: "debt", debt: d })}><span className={`debt-list-icon ${d.status}`}>{d.status === "resolved" ? <CheckCheck size={20}/> : <FileCheck2 size={20}/>}</span><span className="debt-list-copy"><small>{p?.fullName}</small><strong>{d.title}</strong><span>{d.kind}{d.note ? ` · ${d.note}` : ""}</span></span><span className={`debt-due ${overdue ? "overdue" : ""}`}>{d.status === "resolved" ? <><Check size={14}/>Погашена {dateText(d.resolvedAt)}</> : d.dueDate ? <><Clock3 size={14}/>{overdue ? "Срок истек · " : "До "}{dateText(d.dueDate)}</> : "Без срока"}</span></button>; })}</div> : <div className="feature-empty"><div className="empty-orbit"><FileCheck2 size={32}/></div><h3>{search ? "Ничего не найдено" : debtFilter === "resolved" ? "Погашенные работы появятся здесь" : "Открытых задолженностей нет"}</h3><p>{search ? "Попробуйте другую тему или фамилию." : "Задолженности добавляются вручную: задание, срок и запись о погашении."}</p>{!search && <button className="button button-outline" onClick={() => setDialog({ type: "debt" })}><Plus size={16}/>Добавить задолженность</button>}</div>}</section>}
      {view === "rating" && <RatingDashboard state={state} groupCode={code} throughDate={today()} onSettings={() => setDialog({ type: "rating-settings" })} onStudent={person => { chooseGroup(person.groupCode); setDialog({ type: "profile", studentId: person.id }); }}/>}
      {view === "students" && <section className="list-surface"><div className="list-toolbar"><span className="list-caption">{active.length} в группе · {students.length - active.length} в архиве</span><label className="search-field"><Search size={16}/><input aria-label="Поиск в составе группы" value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти студента"/></label></div><div className="students-head"><span>Студент</span><span>Ответов</span><span>Средняя оценка</span><span>Открытых долгов</span><span /></div>{students.filter(p => p.fullName.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru"))).map(p => <button className={`person-row ${p.active ? "" : "archived-person"}`} key={p.id} onClick={() => setDialog({ type: "profile", studentId: p.id })}><span className="person-identity"><span className="person-avatar">{initials(p.fullName)}</span><span><strong>{p.fullName}</strong><small>{p.active ? code : "В архиве"}</small></span></span><span className="person-stat"><small>Ответы</small>{groupAnswers.filter(a => a.studentId === p.id).length}</span><span className="person-stat"><small>Средняя</small>{average(p.id)}</span><span className="person-stat"><small>Долги</small>{openDebts.filter(d => d.studentId === p.id).length || "—"}</span></button>)}</section>}
      </main><footer className="app-footer"><span><img src="./sgua-95.svg" alt=""/>СГЮА · Кафедра гражданского права</span><button onClick={() => setDialog({ type: "data" })}>Копия журнала</button><span>Разработчик: Антонов М.А.</span></footer></div></div>
      {dialog?.type === "rating-settings" && <Modal title="Баллы рейтинга" subtitle="Расчет активности студентов" close={() => setDialog(null)}><RatingSettingsForm value={state.ratingSettings ?? DEFAULT_RATING_SETTINGS} onCancel={() => setDialog(null)} onSave={value => { try {
        store.setRatingSettings(value);
        done("Баллы рейтинга сохранены");
    }
    catch (e) {
        error(e);
    } }}/></Modal>}
      {dialog?.type === "session" && <SessionForm group={group} session={dialog.session} store={store} close={() => setDialog(null)} error={error} done={id => { setSessionId(id); setView("journal"); done("Занятие открыто"); }}/>}
      {dialog?.type === "records" && <Modal title={dialog.student.fullName} subtitle={`${dateText(dialog.session.date)} · ${dialog.session.period}-я пара · ${code}`} wide close={() => setDialog(null)}><SessionRecords key={`${dialog.student.id}/${dialog.session.id}`} state={state} student={dialog.student} session={dialog.session} initialTab={dialog.tab} store={store}/></Modal>}
      {dialog?.type === "debt" && <DebtForm state={state} groupCode={dialog.debt?.groupCode ?? code} studentId={dialog.studentId} debt={dialog.debt ? state.debts.find(d => d.id === dialog.debt?.id) : undefined} sessionId={selected?.id ?? ""} store={store} close={() => setDialog(null)} done={() => done("Задолженность обновлена")} error={error}/>}
      {dialog?.type === "student" && <StudentForm group={group} student={dialog.student} store={store} close={() => setDialog(null)} done={() => done("Состав группы сохранен")} error={error}/>}
      {dialog?.type === "data" && <DataDialog store={store} state={state} exportCsv={exportCsv} close={() => setDialog(null)} done={message => setToast({ text: message })} error={error}/>}
      {dialog?.type === "archive" && <Modal title="Скрыть занятие?" subtitle={`${dateText(dialog.session.date)} · ${dialog.session.period}-я пара`} close={() => setDialog(null)}><p className="dialog-text">Занятие исчезнет из рабочего списка. Его отметки и ответы сохранятся. Вернуть занятие можно в разделе «Данные».</p><footer className="dialog-actions"><button className="button button-quiet" onClick={() => setDialog(null)}>Оставить</button><button className="button button-primary" onClick={() => { const id = dialog.session.id; action(() => { store.archiveSession(id); setDialog(null); setSessionId(""); setToast({ text: "Занятие скрыто", undo: () => action(() => store.archiveSession(id, false), "Занятие восстановлено") }); }); }}>Скрыть занятие</button></footer></Modal>}
      {dialog?.type === "profile" && (() => { const p = state.students.find(p => p.id === dialog.studentId); if (!p)
        return null; const personAnswers = groupAnswers.filter(a => a.studentId === p.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), personDebts = groupDebts.filter(d => d.studentId === p.id).sort((a, b) => a.status.localeCompare(b.status)), personMarks = state.marks.filter(m => m.studentId === p.id && sessionIds.has(m.sessionId)); return <Modal title={p.fullName} subtitle={code} wide close={() => setDialog(null)}><div className="profile-summary"><div><strong>{personMarks.filter(m => m.status === "present" || m.status === "late").length}<small>посещений</small></strong></div><div><strong>{personAnswers.length}<small>ответов</small></strong></div><div><strong>{average(p.id)}<small>средняя оценка</small></strong></div><button className="circle-button" title="Изменить студента" aria-label="Изменить студента" onClick={() => setDialog({ type: "student", student: p })}><Pencil size={17}/></button></div><div className="profile-section-heading"><h3>Задолженности</h3><button className="text-button" onClick={() => setDialog({ type: "debt", studentId: p.id })}><Plus size={15}/>Добавить</button></div>{personDebts.length ? personDebts.map(d => <button key={d.id} className="profile-debt" onClick={() => setDialog({ type: "debt", debt: d })}><span className={`debt-status ${d.status}`}>{d.status === "open" ? "Открыта" : "Погашена"}</span><strong>{d.title}</strong><small>{d.dueDate ? `До ${dateText(d.dueDate)}` : d.kind}</small></button>) : <p className="profile-empty">Задолженностей нет.</p>}<div className="profile-section-heading"><h3>Ответы на занятиях</h3><span>{personAnswers.length}</span></div>{personAnswers.length ? personAnswers.map(a => { const l = state.sessions.find(l => l.id === a.sessionId)!; return <button className="profile-answer" key={a.id} onClick={() => setDialog({ type: "records", student: p, session: l, tab:"answers" })}><b>{a.grade}</b><span><strong>{dateText(l.date)} · {l.period}-я пара</strong><small>{a.note || l.topic || l.kind}</small></span><Pencil size={14}/></button>; }) : <p className="profile-empty">Ответы появятся после отметки в журнале занятия.</p>}<div className="profile-section-heading"><h3>Посещаемость</h3></div><div className="profile-attendance">{sessions.map(l => { const m = personMarks.find(m => m.sessionId === l.id); return <span key={l.id} title={`${dateText(l.date)}, ${l.period}-я пара: ${m ? statusMeta[m.status].label : "Не отмечен"}`} className={m?.status ?? ""}><b>{m ? statusMeta[m.status].short : "—"}</b><small>{dateText(l.date, { day: "numeric", month: "numeric" })}</small></span>; })}{!sessions.length && <p className="profile-empty">В группе пока нет занятий.</p>}</div></Modal>; })()}
      {toast && <div className="toast" role="status"><Check size={17}/><span>{toast.text}</span>{toast.undo && <button onClick={toast.undo}>Отменить</button>}<button className="toast-close" aria-label="Закрыть уведомление" onClick={() => setToast(null)}><X size={15}/></button></div>}
    </>;
}
