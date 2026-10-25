import assert from 'node:assert/strict';
import { JournalStore, STORAGE_KEY, DEFAULT_RATING_SETTINGS, isVisibleDebt, validateState } from './storage.ts';
import { buildRanking } from './rating.ts';
import { journalCsv } from './journal-export.ts';

const seed = [{ code: 'А', institute: 'Институт', students: ['Первый Студент', 'Второй Студент'] }];
class Memory {
  values = new Map(); fail = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail && key === STORAGE_KEY) throw Error('Quota exceeded'); this.values.set(key, value); }
}
const memory = new Memory();
const store = new JournalStore(memory, seed);
const details = { groupCode: 'А', date: '2026-10-25', period: 1, kind: 'Семинар', topic: 'Первоначальная тема' };
const sessionId = store.saveSession(details);
assert.equal(store.getSnapshot().sessions[0].completedAt, undefined);
store.mark('А-1', sessionId, 'present');
store.answer('А-1', sessionId, '5', 'Первый самостоятельный ответ');
store.answer('А-1', sessionId, '+', 'Дополнение к ответу');
const debtId = store.saveDebt({ studentId: 'А-1', groupCode: 'А', sessionId, title: 'Связанное задание', kind: 'Задание', dueDate: '', note: 'Запись к тестовой паре' });

store.completeSession(sessionId);
const completedAt = store.getSnapshot().sessions[0].completedAt;
assert(completedAt && Number.isFinite(Date.parse(completedAt)));
store.completeSession(sessionId);
assert.equal(store.getSnapshot().sessions[0].completedAt, completedAt);
store.saveSession({ ...details, id: sessionId, topic: 'Уточненная тема' });
assert.equal(store.getSnapshot().sessions[0].completedAt, completedAt);
assert.equal(store.getSnapshot().sessions[0].topic, 'Уточненная тема');
const reloaded = new JournalStore(memory, seed);
assert.deepEqual(reloaded.getSnapshot(), store.getSnapshot());
const imported = new JournalStore(new Memory(), seed);
imported.import(JSON.parse(store.export()));
assert.deepEqual(imported.getSnapshot(), store.getSnapshot());
store.completeSession(sessionId, false);
assert.equal(store.getSnapshot().sessions[0].completedAt, undefined);
assert.equal(store.getSnapshot().marks.length, 1);
assert.equal(store.getSnapshot().answers.length, 2);
assert.equal(store.getSnapshot().debts.length, 1);
console.log('PASS: завершение и повторное открытие сохраняются; редактирование, JSON и перезагрузка не теряют статус и записи');

const legacy = JSON.parse(store.export());
legacy.schemaVersion = 2;
delete legacy.sessions[0].completedAt;
const legacyStore = new JournalStore(new Memory(), seed);
legacyStore.import(legacy);
assert.equal(legacyStore.getSnapshot().schemaVersion, 3);
assert.equal(legacyStore.getSnapshot().sessions[0].completedAt, undefined);
assert.deepEqual(legacyStore.getSnapshot().answers, legacy.answers);
assert.throws(() => validateState({ ...legacy, sessions: [{ ...legacy.sessions[0], completedAt: 'broken' }] }));
assert.throws(() => store.completeSession('missing'));
console.log('PASS: прежние занятия остаются открытыми; поврежденная дата завершения и отсутствующее занятие отклоняются');

store.completeSession(sessionId);
const beforeDelete = store.getSnapshot();
const counts = [beforeDelete.marks.length, beforeDelete.answers.length, beforeDelete.debts.length];
const rankedBefore = buildRanking(beforeDelete, ['А'], DEFAULT_RATING_SETTINGS, '2026-10-25');
assert.equal(rankedBefore.find(r => r.student.id === 'А-1').score, 4);
store.archiveSession(sessionId);
const deleted = store.getSnapshot();
assert.deepEqual([deleted.marks.length, deleted.answers.length, deleted.debts.length], counts);
assert.equal(isVisibleDebt(deleted, deleted.debts[0]), false);
const hidden = buildRanking(deleted, ['А'], DEFAULT_RATING_SETTINGS, '2026-10-25').find(r => r.student.id === 'А-1');
assert.equal(hidden.score, null);
assert.equal(hidden.recorded, 0); assert.equal(hidden.answers, 0); assert.equal(hidden.openDebts, 0);
const deletedCsv = journalCsv(deleted, 'А');
for (const removed of ['2026-10-25', 'Первый самостоятельный ответ', 'Дополнение к ответу', 'Связанное задание']) assert(!deletedCsv.includes(removed), removed);
assert.throws(() => store.completeSession(sessionId));
store.archiveSession(sessionId, false);
assert.deepEqual(buildRanking(store.getSnapshot(), ['А'], DEFAULT_RATING_SETTINGS, '2026-10-25'), rankedBefore);
assert.equal(store.getSnapshot().sessions[0].completedAt, beforeDelete.sessions[0].completedAt);
assert(journalCsv(store.getSnapshot(), 'А').includes('Связанное задание'));
assert.equal(store.getSnapshot().debts[0].id, debtId);
console.log('PASS: удаленная пара и все связанные записи исключены из рейтинга и CSV; восстановление возвращает их и статус');

// General assignments and legacy links keep their previous visibility.
const unlinked = { ...store.getSnapshot().debts[0], sessionId: '' };
const orphan = { ...unlinked, sessionId: 'legacy-missing-session' };
assert.equal(isVisibleDebt(store.getSnapshot(), unlinked), true);
assert.equal(isVisibleDebt(store.getSnapshot(), orphan), true);
store.archiveSession(sessionId);
const replacementId = store.saveSession({ ...details, topic: 'Новая пара на то же время' });
assert.notEqual(replacementId, sessionId);
const beforeConflict = store.export();
const persistedBeforeConflict = memory.getItem(STORAGE_KEY);
assert.throws(() => store.archiveSession(sessionId, false), /уже есть занятие/);
assert.equal(store.export(), beforeConflict);
assert.equal(memory.getItem(STORAGE_KEY), persistedBeforeConflict);
store.archiveSession(replacementId);
store.archiveSession(sessionId, false);
assert(!store.getSnapshot().sessions.find(s => s.id === sessionId).deletedAt);
console.log('PASS: восстановление не создает дубль пары; ошибка не меняет журнал, общие и прежние задания остаются доступны');

for (const operation of [() => store.completeSession(sessionId, false), () => store.archiveSession(sessionId)]) {
  const snapshot = store.export();
  const saved = memory.getItem(STORAGE_KEY);
  memory.fail = true;
  assert.throws(operation, /Quota exceeded/);
  assert.equal(store.export(), snapshot);
  assert.equal(memory.getItem(STORAGE_KEY), saved);
  memory.fail = false;
}
console.log('PASS: отказ хранилища при изменении статуса или удалении оставляет прежнее состояние целым');
