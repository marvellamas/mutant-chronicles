// Talenti v1.0 (25/10/2026, sera): i testi leggibili di un Talento o di una Specializzazione, per il riquadro «Da scegliere»,
// l'elenco dei Talenti della scheda e la stampa. Tutto viene dal catalogo (data/talenti_liberi.json,
// data/specializzazioni.json), cioè dal manuale; per le voci nuove o cambiate dei Talenti v1.0 il catalogo ha già il testo
// del file del 7/10. Niente testo inventato qui: la riga breve è la sintesi della scheda, se c'è, oppure la prima frase
// che dice che cosa fa (si saltano «Passivo.», «Requisito: …», «Acquisibile …», «Sostituisce …»); `riga` nel dato, se
// presente, vale su tutto. Funzioni pure, sempre stringhe (mai oggetti: era il «[object Object]» del 25/10).

const testo = (x) => (typeof x === 'string' ? x : '');

/** La voce del catalogo (Talento o Specializzazione), o null. */
export function voceTalento(id, dati) {
  return dati?.talenti_liberi?.talenti?.find((t) => t.id === id) ?? dati?.specializzazioni?.specializzazioni?.find((s) => s.id === id) ?? null;
}

const eSpecializzazione = (v) => v?.categoria === 'specializzazione' || (v && 'ambito' in v);

/** Le frasi di un testo, riga per riga (una frase finisce con il punto seguito da spazio o a fine riga). */
function frasi(t) {
  return testo(t).split(/\n+/).flatMap((r) => r.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý«(+−-])/)).map((f) => f.trim()).filter(Boolean);
}

// frasi che non dicono che cosa fa il Talento: il tipo, i requisiti, quante volte, che cosa sostituisce
const DI_SERVIZIO = [
  /^(Passivo|Attivo|Reazione|Azione [^.]*)\.$/i,
  /^Requisit/i, /^Prerequisit/i, /^Nessun prerequisito/i, /^Acquisibile/i,
  /^Si applicano le incompatibilit/i,
  /^(Sostituisce|Riunisce|Diventa una|Passa fra)\b/i,
];
const diServizio = (f) => DI_SERVIZIO.some((r) => r.test(f));

function accorcia(f, max = 220) {
  if (f.length <= max) return f;
  const tagliata = f.slice(0, max - 1);
  return `${tagliata.slice(0, Math.max(tagliata.lastIndexOf(' '), max - 40))}…`;
}

/** La prima frase che dice che cosa fa (salta tipo, requisiti, «Acquisibile…», «Sostituisce…»). */
export function primaFraseUtile(t) {
  const f = frasi(t);
  return accorcia(f.find((x) => !diServizio(x)) ?? f[0] ?? '');
}

/** Il bonus di una Specializzazione in parole: «+2 VA», «+1 VA e +1 danno», «+1 VA e −1 PM». */
function bonusSpecializzazione(v) {
  const e = v.effetto ?? {};
  const pezzi = [];
  if (Number.isFinite(e.va)) pezzi.push(`+${e.va} VA`);
  if (Number.isFinite(e.danno)) pezzi.push(`+${e.danno} danno`);
  if (Number.isFinite(e.pm)) pezzi.push(`${e.pm > 0 ? '+' : '−'}${Math.abs(e.pm)} PM`);
  const abilita = Array.isArray(v.abilita) && v.abilita.length ? ` ${/^[AEIOUÀÈÉÌÒÙ]/i.test(v.abilita[0]) ? 'ad' : 'a'} ${v.abilita.join(', ')}` : '';
  return pezzi.length ? `${pezzi.join(' e ')}${abilita}` : '';
}

/** La riga breve: che cosa fa, in una frase. Sempre una stringa non vuota per una voce del catalogo. */
export function rigaBreve(id, dati) {
  const v = typeof id === 'string' ? voceTalento(id, dati) : id;
  if (!v) return '';
  if (testo(v.riga).trim()) return v.riga.trim();
  if (eSpecializzazione(v)) {
    const ambito = frasi(v.ambito).find((f) => !diServizio(f)) ?? '';
    // l'ambito che dice già il bonus (le sottofamiglie di Potere): si nomina la sottofamiglia invece di ripeterlo
    if (/^[+−-]\d/.test(ambito)) return accorcia(ambito.replace(/della sottofamiglia\b/, `della sottofamiglia ${v.nome}`));
    const bonus = bonusSpecializzazione(v);
    return accorcia([bonus, ambito].filter(Boolean).join(': '));
  }
  const s = typeof v.sintesi === 'string' ? v.sintesi : Array.isArray(v.sintesi) ? testo(v.sintesi[0]?.testo ?? v.sintesi[0]) : testo(v.sintesi?.testo);
  if (s.trim()) return accorcia(s.trim());
  return primaFraseUtile(v.testo);
}

/**
 * La scheda intera di una voce (25/10 notte): { intestazione, paragrafi }. Per un Talento, l'intestazione della scheda del
 * manuale (tipo, requisiti, quante volte si acquisisce: `intestazione` nel dato) e tutti i paragrafi del testo; per una
 * Specializzazione il bonus, l'ambito e la regola del suo gruppo (§8.8, §8.8.1, §8.8.2).
 */
export function schedaTalento(id, dati) {
  const v = typeof id === 'string' ? voceTalento(id, dati) : id;
  if (!v) return { intestazione: '', paragrafi: [] };
  if (eSpecializzazione(v)) {
    const bonus = bonusSpecializzazione(v);
    const regole = (dati?.specializzazioni?.regole ?? []).filter((r) => typeof r === 'string');
    const delGruppo = v.gruppo === 'armi' ? regole.find((r) => r.startsWith('Armi:'))
      : v.gruppo === 'mistiche' ? regole.find((r) => r.startsWith('Mistiche:')) : regole.find((r) => r.startsWith('Le Specializzazioni ordinarie'));
    return { intestazione: 'Specializzazione: si acquisisce una sola volta (§8.8).', paragrafi: [bonus ? `${bonus}.` : '', ...testo(v.ambito).split('\n'), delGruppo ?? ''].map((p) => p.trim()).filter(Boolean) };
  }
  return { intestazione: testo(v.intestazione).trim(), paragrafi: testo(v.testo).split('\n').map((p) => p.trim()).filter(Boolean) };
}

/** Il testo completo della scheda (intestazione e paragrafi separati da «\n»). */
export function testoCompleto(id, dati) {
  const s = schedaTalento(id, dati);
  return [s.intestazione, ...s.paragrafi].filter(Boolean).join('\n');
}

const NOMI_CATEGORIA = { talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione' };
export const nomeCategoria = (cat) => NOMI_CATEGORIA[cat] ?? '';

/** I prerequisiti in parole («Ritualista Minore», «la capacità personale di lanciare Incantesimi»). */
export function testoPrerequisiti(v, dati) {
  const lista = Array.isArray(v?.prerequisiti) ? v.prerequisiti : [];
  return lista.map((p) => {
    if (typeof p !== 'string') return '';
    const non = p.startsWith('non:');
    const base = non ? p.slice(4) : p;
    const nome = base.startsWith('addestramento:') ? `l’Addestramento ${base.slice(14)}`
      : dati?.talenti_liberi?.condizioni_prerequisiti?.[base]?.descrizione ?? voceTalento(base, dati)?.nome ?? base;
    return non ? `non avere ${nome}` : nome;
  }).filter(Boolean);
}

/**
 * Le scelte che un Talento apre dopo averlo preso (oltre alla Caratteristica, alla Salvezza o alla nota che si chiedono
 * prima): gli Incantesimi e le Tecniche Interiori, dai suoi effetti. Testi per l'utente.
 */
export function scelteAperte(v) {
  if (!v) return [];
  const e = v.effetti ?? {};
  const out = [];
  if (typeof e.incantesimi === 'number') out.push(`${e.incantesimi} Incantesimi da scegliere`);
  else if (e.incantesimi && typeof e.incantesimi === 'object') out.push(`${e.incantesimi.formula ?? 'alcuni'} Incantesimi da scegliere`);
  if (typeof e.tecniche === 'number') out.push(`${e.tecniche} Tecniche Interiori da scegliere`);
  else if (e.tecniche && typeof e.tecniche === 'object') out.push(`${String(e.tecniche.formula ?? 'alcune').replace(/,\s*min/, ' (minimo')}${/min/.test(e.tecniche.formula ?? '') ? ')' : ''} Tecniche Interiori da scegliere`);
  if (v.parametro === 'caratteristica') out.push('una Caratteristica da scegliere');
  if (v.parametro === 'salvezza') out.push('una Prova Salvezza da scegliere');
  if (testo(v.annotazione)) out.push(`da annotare: ${v.annotazione}`);
  return out;
}

/** Un incantesimo da scegliere: { riga (la prima frase della descrizione), testo (lancio e descrizione) }. */
export function testiIncantesimo(nome, dati) {
  const i = dati?.incantesimi?.incantesimi?.find((x) => x.nome === nome);
  if (!i) return { riga: '', testo: '' };
  return { riga: primaFraseUtile(i.descrizione), testo: [testo(i.lancio), testo(i.descrizione)].filter(Boolean).join('\n') };
}

/** Una Tecnica Interiore da scegliere: { riga (l'effetto in breve, o la prima frase), testo (costo, azione, durata, testo) }. */
export function testiTecnica(id, dati) {
  const t = dati?.tecniche_interiori?.tecniche?.find((x) => x.id === id);
  if (!t) return { riga: '', testo: '' };
  const breve = testo(t.effetti?.breve).trim();
  const campi = [t.costo, t.azione, t.durata ? `durata ${t.durata}` : ''].map(testo).filter(Boolean).join(' · ');
  return { riga: breve || primaFraseUtile(t.testo), testo: [campi, testo(t.testo)].filter(Boolean).join('\n') };
}

/** Tutto quello che serve per presentare una voce: { nome, categoria, riga, testo, prerequisiti, apre }. */
export function infoTalento(id, dati) {
  const v = voceTalento(id, dati);
  if (!v) return null;
  return {
    nome: testo(v.nome) || id,
    categoria: nomeCategoria(v.categoria),
    riga: rigaBreve(v, dati),
    testo: testoCompleto(v, dati),
    prerequisiti: testoPrerequisiti(v, dati),
    apre: scelteAperte(v),
  };
}
