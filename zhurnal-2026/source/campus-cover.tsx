import React, { useState } from 'react';

type CampusId = '1' | '5';
const preferenceKey = 'journal-campus';
const campuses = {
  '1': { src: './academy-sgua-k1.webp', address: 'Чернышевского, 104', license: './academy-sgua-k1-LICENSE.txt' },
  '5': { src: './academy-sgua-k5.webp', address: 'Вольская, 1', license: './academy-sgua-k5-LICENSE.txt' },
} satisfies Record<CampusId, { src: string; address: string; license: string }>;

function readPreference(): CampusId {
  try { return localStorage.getItem(preferenceKey) === '1' ? '1' : '5'; }
  catch { return '5'; }
}

export default function CampusCover({ recorded, children }: { recorded: boolean; children: React.ReactNode }) {
  const [selected, setSelected] = useState<CampusId>(readPreference);
  const campus = campuses[selected];
  const select = (id: CampusId) => {
    setSelected(id);
    try { localStorage.setItem(preferenceKey, id); } catch { /* A visual preference must not block the journal. */ }
  };
  return <div className="academy-cover">
    <section className={`academy-stage campus-${selected} ${recorded ? 'stage-recorded' : 'stage-first'}`} aria-label="Обзор учебной группы">
      <div className="campus-selector" role="group" aria-label="Корпус на обложке">
        {(['1', '5'] as const).map(id => <button key={id} type="button" className={id === selected ? 'selected' : ''} aria-pressed={id === selected} onClick={() => select(id)}>Корпус {id}</button>)}
      </div>
      <img key={selected} className="campus-scene" src={campus.src} alt="" width="1536" height="1024" fetchPriority="high"/>
      <div className="stage-wash"/>
      {children}
      <a className="campus-caption" href={campus.license} target="_blank" rel="noreferrer">Корпус {selected} · СГЮА<span>{campus.address}</span></a>
    </section>
  </div>;
}
