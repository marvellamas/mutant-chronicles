// Contenuto dei tooltip e della scheda completa degli incantesimi, ricavato solo dai dati.
// Funzioni pure: la UI (src/ui/tooltip.js) trasforma il risultato in DOM.

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const eTodo = (v) => typeof v === 'string' && v.startsWith('TODO(');

/** Riga della tabella delle versioni al livello indicato (prima colonna = Livello). */
export function rigaAlLivello(incantesimo, livello) {
  const righe = Array.isArray(incantesimo.versioni) ? incantesimo.versioni : [];
  return righe.find((r) => String(Object.values(r)[0]).trim() === String(livello)) ?? null;
}

/**
 * Contenuto del tooltip.
 * @param {'abilita'|'caratteristica'|'incantesimo'|'talento'|'tecnica'} tipo
 * @param {string} id nome dell'Abilità, sigla della Caratteristica, nome dell'incantesimo,
 *   id del Talento Libero o della Specializzazione, id della Tecnica Interiore
 * @returns {{tipo, titolo, sottotitolo, sezioni: {etichetta: string|null, testo: string}[],
 *   tabella: {colonne: string[], righe: object[]}|null, apriScheda: boolean}|null}
 */
export function contenutoTooltip(tipo, id, dati) {
  if (tipo === 'abilita') return tooltipAbilita(id, dati);
  if (tipo === 'caratteristica') return tooltipCaratteristica(id, dati);
  if (tipo === 'incantesimo') return tooltipIncantesimo(id, dati);
  if (tipo === 'talento') return tooltipTalento(id, dati);
  if (tipo === 'tecnica') return tooltipTecnica(id, dati);
  return null;
}

const MOLTEPLICITA = {
  una: 'Acquisibile una sola volta',
  per_caratteristica: 'Acquisibile una volta per ciascuna Caratteristica',
  per_salvezza_max2: 'Acquisibile fino a due volte per ciascuna Salvezza',
  illimitata: 'Acquisibile più volte',
};

/** Talento Libero (§8.6), Talento di magia (provvisorio) o Specializzazione (§8.8), per id. */
function tooltipTalento(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) {
    const sezione = dati.talenti_liberi.sezioni[t.sezione]?.titolo ?? t.sezione;
    const prerequisiti = Array.isArray(t.prerequisiti)
      ? (t.prerequisiti.length ? t.prerequisiti.map((p) => nomeTalento(p, dati)).join(', ') : 'nessuno')
      : 'da definire con il master';
    const molt = t.molteplicita === 'limitata' ? `Acquisibile fino a ${t.max_acquisizioni} volte` : MOLTEPLICITA[t.molteplicita] ?? t.molteplicita;
    const sezioni = [];
    if (t.provvisorio) sezioni.push({ etichetta: 'Provvisorio', testo: 'ricavato dalle citazioni del Manuale della Magia: tipo e prerequisiti da definire con il master.' });
    sezioni.push({ etichetta: 'Prerequisiti', testo: prerequisiti });
    sezioni.push({ etichetta: null, testo: t.testo });
    return {
      tipo: 'talento', titolo: t.nome,
      sottotitolo: [t.sezione.startsWith('8.') ? `§${t.sezione} ${sezione}` : sezione, eTodo(t.tipo) ? null : t.tipo === 'attivo' ? 'Attivo' : 'Passivo', molt].filter(Boolean).join(' · '),
      sezioni, tabella: null, apriScheda: false,
    };
  }
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  if (!s) return null;
  return {
    tipo: 'talento', titolo: `Specializzazione in ${s.nome}`,
    sottotitolo: `§8.8 · ${s.abilita.length ? s.abilita.join(', ') : 'Abilità indicata dalla scheda dell’arma'} · Acquisibile una sola volta`,
    sezioni: [
      { etichetta: 'Effetto', testo: [s.effetto.va ? `+${s.effetto.va} VA` : null, s.effetto.danno ? `+${s.effetto.danno} danno` : null,
        s.effetto.pm ? `${s.effetto.pm} PM al costo (minimo ${s.effetto.pm_minimo})` : null].filter(Boolean).join(', ') + ' negli impieghi descritti' },
      { etichetta: null, testo: s.ambito },
    ],
    tabella: null, apriScheda: false,
  };
}

function nomeTalento(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) return t.nome;
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  return s ? `Specializzazione in ${s.nome}` : id;
}

/** Tecnica Interiore (§8.9). */
function tooltipTecnica(id, dati) {
  const t = dati.tecniche_interiori.tecniche.find((x) => x.id === id);
  if (!t) return null;
  const gruppo = t.gruppo === 'generica' ? 'Tecnica generica' : t.gruppo === 'lottatore' ? 'Tecnica del Lottatore' : `Scuola Mishima ${t.gruppo.slice(7)}`;
  const campo = (v) => (eTodo(v) ? 'non indicato' : v);
  return {
    tipo: 'tecnica', titolo: t.nome, sottotitolo: `§8.9 · ${gruppo}`,
    sezioni: [
      { etichetta: 'Costo', testo: campo(t.costo) },
      { etichetta: 'Azione', testo: campo(t.azione) },
      { etichetta: 'Bersaglio', testo: campo(t.bersaglio) },
      { etichetta: 'Durata', testo: campo(t.durata) },
      { etichetta: null, testo: t.testo },
    ],
    tabella: null, apriScheda: false,
  };
}

function nomeCaratteristica(sigla, dati) {
  return dati.caratteristiche.caratteristiche.find((c) => c.sigla === sigla)?.nome ?? sigla;
}

function tooltipAbilita(nome, dati) {
  const a = trova(dati.abilita.abilita, nome);
  if (!a) return null;
  return {
    tipo: 'abilita',
    titolo: a.nome,
    sottotitolo: `${nomeCaratteristica(a.caratteristica, dati)} (${a.caratteristica}) · ${a.categoria}`,
    sezioni: [
      { etichetta: 'Ambito', testo: a.ambito },
      { etichetta: null, testo: descrizioneOAvviso(a.descrizione) },
    ],
    tabella: null,
    apriScheda: false,
  };
}

function tooltipCaratteristica(sigla, dati) {
  const c = dati.caratteristiche.caratteristiche.find((x) => x.sigla === sigla);
  if (!c) return null;
  const abilita = dati.abilita.abilita.filter((a) => a.caratteristica === sigla).map((a) => a.nome);
  const salvezze = dati.caratteristiche.salvezze.filter((s) => s.caratteristica === sigla).map((s) => s.nome);
  const sezioni = [
    { etichetta: null, testo: descrizioneOAvviso(c.descrizione) },
    { etichetta: 'Abilità', testo: abilita.length ? abilita.join(', ') : 'Nessuna Abilità usa questa Caratteristica.' },
  ];
  if (salvezze.length) sezioni.push({ etichetta: salvezze.length > 1 ? 'Salvezze' : 'Salvezza', testo: salvezze.join(', ') });
  return { tipo: 'caratteristica', titolo: `${c.nome} (${c.sigla})`, sottotitolo: null, sezioni, tabella: null, apriScheda: false };
}

function tooltipIncantesimo(nome, dati) {
  const i = trova(dati.incantesimi.incantesimi, nome);
  if (!i) return null;
  const riga = rigaAlLivello(i, i.livello_base);
  return {
    tipo: 'incantesimo',
    titolo: i.nome,
    sottotitolo: i.intestazione ?? `Scheda ${i.scheda} • ${i.macrofamiglia} • ${i.specializzazione}`,
    sezioni: [
      { etichetta: null, testo: descrizioneOAvviso(i.lancio) },
      { etichetta: null, testo: descrizioneOAvviso(i.descrizione) },
    ],
    tabella: riga ? { titolo: `Livello base ${i.livello_base}`, colonne: Object.keys(riga), righe: [riga] } : null,
    apriScheda: true,
  };
}

function descrizioneOAvviso(testo) {
  if (!testo || eTodo(testo)) return 'Descrizione non ancora disponibile (da completare nei dati: TODO).';
  return testo;
}

/** Scheda completa di un incantesimo per il pannello modale. */
export function schedaIncantesimo(nome, dati) {
  const i = trova(dati.incantesimi.incantesimi, nome);
  if (!i) return null;
  const tabelle = [];
  if (Array.isArray(i.versioni) && i.versioni.length) {
    tabelle.push({ titolo: null, colonne: Object.keys(i.versioni[0]), righe: i.versioni, evidenzia: String(i.livello_base) });
  }
  for (const t of i.altre_tabelle ?? []) {
    if (Array.isArray(t.righe) && t.righe.length) tabelle.push({ titolo: t.titolo ?? null, colonne: Object.keys(t.righe[0]), righe: t.righe });
  }
  return {
    titolo: i.nome,
    intestazione: i.intestazione ?? '',
    lancio: descrizioneOAvviso(i.lancio),
    descrizione: descrizioneOAvviso(i.descrizione),
    livelloBase: i.livello_base,
    tabelle,
    tabellaMancante: !tabelle.length || eTodo(i.versioni),
    regole: i.regole && !eTodo(i.regole) ? i.regole : '',
    riferimento: `Manuale della Magia, scheda ${i.scheda}, p. ${i.pagina}`,
  };
}

/** Il contenuto del tooltip come testo semplice (per test e lettori di schermo). */
export function testoTooltip(tipo, id, dati) {
  const c = contenutoTooltip(tipo, id, dati);
  if (!c) return '';
  const parti = [c.titolo];
  if (c.sottotitolo) parti.push(c.sottotitolo);
  for (const s of c.sezioni) parti.push(s.etichetta ? `${s.etichetta}: ${s.testo}` : s.testo);
  if (c.tabella) {
    parti.push(c.tabella.titolo);
    for (const r of c.tabella.righe) parti.push(c.tabella.colonne.map((k) => `${k}: ${r[k]}`).join(' · '));
  }
  if (c.apriScheda) parti.push('Apri scheda completa');
  return parti.join('\n');
}
