import React from "react";
import { createRoot } from "react-dom/client";
import Journal from "./journal";
import { JournalStore, STORAGE_KEY, validateState } from "./storage";
import { rosters } from "./rosters";
import "./journal.css";
import "./light.css";
import "./experiences.css";
const root = createRoot(document.getElementById("root")!);
try {
  const store = new JournalStore(localStorage, rosters);
  root.render(<Journal store={store} />);
} catch (cause) {
  root.render(<div className="boot-error"><img src="./sgua-95.svg" alt="СГЮА" /><h1>Журнал не удалось открыть</h1><p>Данные в браузере не изменены. Проверьте доступ к хранилищу или загрузите сохраненную копию.</p><p>{cause instanceof Error ? cause.message : "Ошибка чтения данных"}</p><label className="button button-primary">Загрузить копию<input type="file" accept=".json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const value = validateState(JSON.parse(await file.text())); localStorage.setItem("sgua-journal-unreadable", localStorage.getItem(STORAGE_KEY) ?? ""); localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); location.reload(); } catch (error) { alert(error instanceof Error ? error.message : "Неверный файл"); } }} /></label></div>);
}
