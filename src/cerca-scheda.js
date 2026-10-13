// «Cerca nella scheda» (13/10/2026, richiesta di Marcello dopo la sessione del 12/10): il giocatore scrive una
// parola e trova dove sta nella sua scheda, con il valore accanto. Niente regole qui: solo l'indice di ciò che la
// scheda già calcola (src/calc.js, src/stampa.js → preparaTab) e la ricerca sul testo.
//
// Ogni voce: { gruppo, nome, valore, tab, cerca, tiro? }
//   gruppo  la famiglia da mostrare («Prova Salvezza», «Abilità», «Talento», «Oggetto»…)
//   valore  quello che si legge accanto al nome («VA 9», «+2 Percezione»…), o null
//   tab     la tab da aprire; `cerca` il testo da evidenziare nella pagina
//   tiro    se il valore si può tirare (prompt 78): { genere, nome, va } per src/tiri-scheda.js

const senzaAccenti = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = (n) => (n === null || n === undefined ? null : `VA ${n}`);

/** Tutte le voci cercabili della scheda, nell'ordine dei gruppi. */
export function vociScheda(scheda, sessione = {}, dati = null) {
  const v = [];
  const agg = (gruppo, nome, valore, tab, extra = {}) => { if (nome) v.push({ gruppo, nome: String(nome), valore: valore ?? null, tab, cerca: String(nome), ...extra }); };

  // Caratteristiche e Prove Salvezza (Identità)
  for (const [sigla, c] of Object.entries(scheda.caratteristiche ?? {})) {
    agg('Caratteristica', c.nome, `${c.valore} (${sigla}, mod ${c.mod >= 0 ? '+' : ''}${c.mod})`, 'identita');
  }
  for (const s of Object.values(scheda.salvezze ?? {})) {
    const va = s.effettivo ?? s.totale;
    agg('Prova Salvezza', s.nome, num(va), 'identita', { tiro: { genere: 'prova', nome: `Prova Salvezza: ${s.nome}`, va, abilita: false } });
  }
  // Abilità (tab Abilità) e Difese (Combattimento)
  for (const a of scheda.abilita ?? []) {
    const va = a.effettivo ?? a.personale ?? a.totale ?? a.calcolato;
    const tab = a.nome === 'Difese' ? 'combattimento' : 'abilita';
    agg('Abilità', a.nome, num(va), tab, { tiro: { genere: 'prova', nome: a.nome, va, abilita: a.nome !== 'Difese' } });
  }
  // valori del tavolo (Combattimento)
  const t = scheda.tavolo;
  if (t) {
    const ini = t.iniziativa?.effettivo ?? t.iniziativa?.daRegole;
    if (ini !== undefined) agg('Valore', 'Iniziativa', `${ini >= 0 ? '+' : ''}${ini}`, 'combattimento', { tiro: { genere: 'iniziativa', nome: 'Iniziativa', va: ini } });
    if (t.movimento) agg('Valore', 'Movimento', `${t.movimento.passo?.effettivo ?? t.movimento.passo?.daRegole ?? ''} · ${t.movimento.corsa?.effettivo ?? t.movimento.corsa?.daRegole ?? ''} · ${t.movimento.scatto?.effettivo ?? t.movimento.scatto?.daRegole ?? ''} ${t.movimento.unita ?? 'Q'}`, 'combattimento');
    if (t.azioni) agg('Valore', 'Azioni', `${t.azioni.principali?.effettivo ?? t.azioni.principali?.daRegole ?? ''} principali`, 'combattimento');
  }
  // Talenti, Talenti Liberi, Specializzazioni (Abilità)
  for (const x of scheda.talenti ?? []) agg('Talento', x.nome, x.grado ? `Grado ${x.grado}` : null, 'abilita', { testo: x.testo });
  for (const x of scheda.talentiLiberi ?? []) agg('Talento libero', x.nome, x.livello ? `livello ${x.livello}` : null, 'abilita', { testo: x.testo });
  for (const x of scheda.specializzazioni ?? []) agg('Specializzazione', x.nome ?? x, x.abilita ?? null, 'abilita', { testo: x.testo });
  // Poteri: Tecniche Interiori e Incantesimi conosciuti
  for (const x of scheda.tecniche ?? []) agg('Tecnica Interiore', x.nome, x.costo ?? null, 'poteri', { testo: x.effetto ?? null });
  for (const x of scheda.incantesimi?.conosciuti ?? []) agg('Incantesimo', x.nome ?? x, x.livello ? `livello ${x.livello}` : null, 'poteri');
  // Equipaggiamento: armi, protezioni, oggetti con bonus, Artefatti con PM
  for (const a of scheda.equipaggiamento?.armi ?? []) agg('Arma', a.nome, a.va !== null && a.va !== undefined ? num(a.vaEffettivo ?? a.va) : null, 'combattimento');
  for (const p of scheda.equipaggiamento?.protezioni ?? []) agg('Protezione', p.nome, p.ar?.totale !== undefined ? `AR ${p.ar.totale}` : null, 'combattimento');
  for (const c of scheda.equipaggiamento?.contenitori ?? []) agg('Artefatto con PM', c.nome, `${sessione.chroma?.[c.uid]?.pmAttuali ?? 0} / ${c.capacita} PM`, 'artefatti');
  const visti = new Set();
  for (const e of scheda.equipaggiamento?.effettiOggetti ?? []) {
    const chiave = `${e.oggetto}|${e.abilita ?? e.beneficio ?? ''}`;
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    const segno = e.valore > 0 ? `+${e.valore}` : String(e.valore ?? '');
    agg('Oggetto con bonus', e.oggetto, [segno, e.abilita].filter(Boolean).join(' '), 'inventario', { testo: e.uso ?? e.condizione ?? null });
  }
  // gli Artefatti con PM hanno già la loro voce: non si ripetono come oggetti
  const conPm = new Set((scheda.equipaggiamento?.contenitori ?? []).map((c) => c.uid));
  for (const o of scheda.equipaggiamento?.oggetti ?? []) {
    if (conPm.has(o.uid)) continue;
    agg('Oggetto', o.nome, o.voce?.quantita > 1 ? `×${o.voce.quantita}` : null, 'inventario');
  }
  // Stati attivi e note di sessione
  const stati = dati?.regole?.stati?.elenco ?? [];
  for (const id of sessione.statiAttivi ?? []) {
    const st = stati.find((x) => x.id === id);
    agg('Stato attivo', st?.nome ?? id, st?.effetto_breve ?? null, 'combattimento');
  }
  if (sessione.note) agg('Note', 'Note del personaggio', String(sessione.note).slice(0, 60), 'identita', { testo: sessione.note });
  return v;
}

/**
 * Le voci che contengono `testo` (senza maiuscole né accenti, anche parziale): prima quelle che cominciano con
 * la parola cercata, poi le altre. Con meno di due lettere non si cerca nulla.
 */
export function cercaVoci(voci, testo, { massimo = 40 } = {}) {
  const q = senzaAccenti(testo).trim();
  if (q.length < 2) return [];
  const punteggio = (x) => {
    const n = senzaAccenti(x.nome);
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    if (senzaAccenti(x.gruppo).includes(q)) return 2;
    if (senzaAccenti(x.valore ?? '').includes(q) || senzaAccenti(x.testo ?? '').includes(q)) return 3;
    return null;
  };
  return voci
    .map((x) => ({ x, p: punteggio(x) }))
    .filter((r) => r.p !== null)
    .sort((a, b) => a.p - b.p || a.x.nome.localeCompare(b.x.nome, 'it'))
    .slice(0, massimo)
    .map((r) => r.x);
}

/** Riga leggibile di un risultato: «Prova Salvezza Tempra — VA 9». */
export const testoVoce = (v) => `${v.gruppo} ${v.nome}${v.valore ? ` — ${v.valore}` : ''}`;
