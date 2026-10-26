// Talenti v1.0, controllo voce per voce (27/10/2026, docs/talenti-effetti-2026-10-27.md): per ognuna delle 39 + 72 + 86
// voci del catalogo, un personaggio con regimeTalenti = 2 la sceglie, e si guarda che cosa cambia nei valori calcolati
// rispetto allo stesso personaggio senza la voce. Lo usano tests/talenti-effetti-voci.test.js e, con --scrivi, la
// tabella di docs/talenti-effetti-2026-10-27.md.
//   node tools/talenti-effetti-voci.mjs            stampa il riepilogo
//   node tools/talenti-effetti-voci.mjs --scrivi   riscrive docs/talenti-effetti-2026-10-27.md
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { talentiAttacco } from '../src/attacco.js';
import { calcolaLancio, dichiarazioneLancio } from '../src/lancio.js';
import { notaDaApplicare } from '../src/talenti.js';

const RADICE = new URL('../', import.meta.url);
export const datiDelRepo = () => caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, RADICE), 'utf8'));

const PARAMETRI = { caratteristica: 'FOR', salvezza: 'tempra' };
const CHIAVI_VALORE = ['pv', 'pm', 'iniziativa', 'movimento', 'azioni', 'salvezze', 'magia', 'tecnicheAmmesse', 'incantesimi'];
// quale parte della scheda deve cambiare per ogni chiave di effetti
const CAMPI_PER_CHIAVE = {
  pv: ['pv'], pm: ['pm'], iniziativa: ['iniziativa', 'vociIniziativa'], movimento: ['movimento'], salvezza: ['salvezze'],
  tecniche: ['tecnicheAmmesse'], incantesimi: ['incantesimi'], accessoMagia: ['incantesimi', 'magia'], livelloMax: ['incantesimi'],
  livelloMaxIncantesimi: ['incantesimi'], magia: ['magia'], meditazione: ['magia'],
};
const forma = (x) => JSON.stringify(x ?? null);

/** Personaggio di base (Lucas, Invocatore, 6° livello) senza Talenti, nel regime nuovo. */
function base(dati, file = 'Lucas_liv6_2026-09-28 (2).json') {
  const p = deserializzaPersonaggio(readFileSync(new URL(`tests/collaudo/${file}`, RADICE), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: null };
  const livelli = p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; });
  return { creazione, livelli };
}

/** Scheda al tavolo del personaggio, con la voce scelta nel suo posto (def: la voce del catalogo; null: senza). */
function schedaCon(dati, b, def, { vecchio = false, extra = [] } = {}) {
  const creazione = { ...b.creazione, ...(vecchio ? { regimeTalenti: undefined } : {}) };
  const livelli = b.livelli.map((v) => ({ ...v }));
  // prerequisiti messi a monte (Talenti Liberi negli altri posti), uguali con e senza la voce
  extra.forEach((id, i) => { livelli[2 + i].talentoLibero = { id }; });
  if (def) {
    const scelta = { id: def.id, ...(def.parametro ? { parametro: PARAMETRI[def.parametro] ?? 'tempra' } : {}), ...(/^(sport|specializzazione-sport)$/.test(def.id) ? { annotazione: 'Prova' } : {}) };
    if (def.categoria === 'specializzazione') creazione.specializzazioneIniziale = scelta;
    else if (def.categoria === 'maestria') livelli[0].maestria = scelta;
    else livelli[1].talentoLibero = scelta;
  }
  const riposo = calcolaScheda({ creazione, livelli }, dati);
  const sessione = inizializzaSessione(massimiSessione(riposo, creazione, dati));
  return calcolaScheda({ creazione, livelli, sessione }, dati);
}

/** Riferimento («file:id») della prima arma del catalogo che usa questa Specializzazione. */
function rifArma(dati, id) {
  for (const [nome, f] of Object.entries(dati.equipaggiamento.file)) for (const o of f?.oggetti ?? []) if (o.specializzazione === id && o.abilita) return `${nome}:${o.id}`;
  return null;
}
const trovaArma = (dati, rif) => { const [f, id] = rif.split(':'); return dati.equipaggiamento.file[f].oggetti.find((o) => o.id === id); };

/** Il personaggio con l'arma impugnata e, se `def`, la Specializzazione (senza il resto). */
function armaCon(dati, b, def, rif) {
  const creazione = { ...b.creazione, equipaggiamento: [{ uid: 'a', rif, stato: 'impugnata', quantita: 1, note: '' }] };
  if (def) creazione.specializzazioneIniziale = { id: def.id };
  return calcolaScheda({ creazione, livelli: b.livelli }, dati);
}

const impronta = (s) => ({
  ...Object.fromEntries(CHIAVI_VALORE.map((k) => [k, s[k]])),
  abilita: (s.abilita ?? []).map((a) => [a.nome, a.effettivo ?? a.totale, (a.usiSpecifici ?? []).map((u) => [u.uso, u.valore])]),
  effettiTalenti: s.effettiTalenti ?? [],
});

// calcolate da regole.json e dal motore, non da effetti (docs/talenti-effetti-2026-10-27.md)
const ALTROVE = {
  'visione-perfetta': 'Percezione: penalità di distanza e luce ridotte di 3 (src/condizioni.js, regole.json → luce)',
  'recupero-mistico': 'Meditazione e recupero orario dei PM (src/medita.js, regole.json → recupero_pm)',
  'ritualista-minore': 'accesso ai Rituali di Grado I–III (regole.json → rituali, «Lancia!»)',
  'ritualista-maggiore': 'accesso ai Rituali di Grado IV–VI (regole.json → rituali, «Lancia!»)',
};

// voci il cui effetto si vede solo con un prerequisito o su un personaggio diverso da Lucas
const SONDE = {
  'contromagia-universale': { extra: ['contromagia'] }, 'contromagia-migliorata': { extra: ['contromagia'] },
  'potenziale-mistico-migliorato': { extra: ['usufruitore-di-magia'], file: 'c_freelance_tecnico_l5.json' },
  'recupero-meditativo': { file: 'c_freelance_tecnico_l5.json' },
};

/** Una riga per voce: dichiarato nel testo, calcolato dall'app, nota «da applicare al tavolo», esito. */
export function analizzaVoci(dati) {
  const b0 = base(dati);
  const senza0 = schedaCon(dati, b0, null);
  const righe = [];
  const voci = [
    ...dati.talenti_liberi.talenti.filter((t) => t.categoria === 'talento_libero' || t.categoria === 'maestria'),
    ...dati.specializzazioni.specializzazioni,
  ];
  for (const def of voci) {
    const sonda = SONDE[def.id] ?? {};
    const b = sonda.file ? base(dati, sonda.file) : b0;
    const senza = sonda.file || sonda.extra ? schedaCon(dati, b, null, { extra: sonda.extra }) : senza0;
    const s = schedaCon(dati, b, def, { extra: sonda.extra });
    const scelta = [...(s.talentiLiberi ?? []), ...(s.specializzazioni ?? [])].some((t) => t.id === def.id);
    const calcolati = [];
    const dichiarati = [];
    const problemi = [];
    if (!scelta) problemi.push('la scheda non registra la scelta');
    if (def.categoria === 'specializzazione') {
      const e = def.effetto ?? {};
      dichiarati.push(...Object.entries(e).filter(([k]) => ['va', 'danno', 'pm'].includes(k)).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`));
      if (def.gruppo === 'armi') {
        const rif = rifArma(dati, def.id);
        if (!rif) { if (!notaDaApplicare(def)) problemi.push('nessuna arma del catalogo la usa e nessuna nota «da applicare al tavolo»'); }
        else {
          const arma = (sc) => sc.equipaggiamento?.armi?.[0];
          const con = armaCon(dati, b, def, rif); const sen = armaCon(dati, b, null, rif);
          const dVa = (arma(con)?.va ?? 0) - (arma(sen)?.va ?? 0); const dDanno = (arma(con)?.bonusDanno ?? 0) - (arma(sen)?.bonusDanno ?? 0);
          const dannoAtteso = dati.equipaggiamento.file && trovaArma(dati, rif).specializzazione_danno === false ? 0 : e.danno;
          if (dVa === e.va && dDanno === dannoAtteso) calcolati.push(`armi della categoria (${rif}): +${dVa} VA, +${dDanno} danno nella scheda dell'arma`);
          else problemi.push(`arma ${rif}: VA ${dVa} (atteso ${e.va}), danno ${dDanno} (atteso ${dannoAtteso})`);
        }
      } else if (e.sottofamiglia) {
        const inc = dati.incantesimi.incantesimi.find((i) => i.specializzazione === e.sottofamiglia && i.livello_base >= 2 && i.meccanica);
        const l = (sc) => calcolaLancio({ scheda: sc, sessione: {} }, inc, dichiarazioneLancio({}), dati);
        const dopo = l(s); const prima = l(senza);
        const dPm = dopo.pm_costo - prima.pm_costo; const dVa = dopo.va_potere_finale - prima.va_potere_finale;
        if (dPm <= e.pm && dVa === e.va || (dPm === 0 && prima.pm_costo === 1)) calcolati.push(`Incantesimi ${e.sottofamiglia}: ${e.va > 0 ? '+' : ''}${e.va} VA di Potere, ${e.pm} PM al costo (minimo ${e.pm_minimo}) in «Lancia!»`);
        else problemi.push(`«Lancia!» (${inc?.nome}): PM ${dPm}, VA ${dVa}, attesi ${e.pm} e ${e.va}`);
      } else {
        const miei = (s.effettiTalenti ?? []).filter((x) => x.chiave.startsWith(`specializzazione:${def.id}:`));
        const ab = def.abilita ?? [];
        for (const nome of ab) {
          const a = s.abilita.find((x) => x.nome === nome);
          const uso = (a?.usiSpecifici ?? []).find((u) => u.uso.startsWith(`Specializzazione in ${def.nome}`));
          if (uso && uso.modificatore === e.va) calcolati.push(`${nome}: +${e.va} solo nell'uso descritto (VA ${uso.valore})`);
          else problemi.push(`${nome}: nessun uso specifico di +${e.va} (trovati ${miei.length})`);
        }
      }
    } else {
      const E = def.effetti ?? {};
      for (const [k, v] of Object.entries(E)) {
        if (k === 'valori') {
          for (const x of v) {
            dichiarati.push(`${x.tipo ?? 'va'}${x.abilita ? ' ' + x.abilita : ''}${x.salvezza ? ' ' + x.salvezza : ''} ${x.valore ?? ''} (${x.ambito})`.trim());
            const trovato = (s.effettiTalenti ?? []).some((y) => y.chiave.startsWith(`libero:${def.id}:`) && y.ambito === x.ambito && y.valore === x.valore);
            if (trovato) calcolati.push(`${x.tipo ?? 'va'}${x.abilita ? ' ' + x.abilita : ''}${x.salvezza ? ' ' + x.salvezza : ''} ${x.valore > 0 ? '+' : ''}${x.valore ?? ''} — ${x.ambito}${x.uso ? ` (${x.uso})` : ''}`);
            else problemi.push(`effetto «${x.tipo ?? 'va'} ${x.valore}» non presente negli effetti dei Talenti`);
          }
        } else if (['attacco_ravvicinato', 'attacco_distanza', 'lancio'].includes(k)) {
          dichiarati.push(k);
          if (talentiAttacco(s, dati, k).some((t) => t.nome.startsWith(def.nome))) calcolati.push(`${k.replace('_', ' ')}: in «${k === 'lancio' ? 'Lancia!' : 'Attacca!'}»`);
          else problemi.push(`${k}: «${k === 'lancio' ? 'Lancia!' : 'Attacca!'}» non lo vede`);
        } else {
          dichiarati.push(k);
          const campi = CAMPI_PER_CHIAVE[k] ?? CHIAVI_VALORE;
          const diverso = campi.some((c) => forma(s[c]) !== forma(senza[c]));
          if (diverso) calcolati.push(`${k}: cambia nella scheda (${campi.join(', ')})`);
          else problemi.push(`${k}: nessun valore della scheda cambia`);
        }
      }
    }
    // confronto con la vecchia maniera: stessa voce come Talento Libero dei Talenti di prima
    let confronto = "nuova";
    if (def.categoria !== 'specializzazione' && !def.solo_regime_nuovo) {
      try {
        const v = schedaCon(dati, b, { ...def, categoria: "talento_libero" }, { vecchio: true, extra: sonda.extra });
        if ((v.talentiLiberi ?? []).some((t) => t.id === def.id)) confronto = forma(impronta(v)) === forma(impronta(s)) ? 'uguale' : 'DIVERSO';
      } catch { confronto = 'n/d'; }
    }
    // voci calcolate fuori da `effetti` (tavolo: ''): si dice dove
    if (def.tavolo === '') calcolati.push(ALTROVE[def.id] ?? 'applicato altrove nel motore');
    const tavolo = notaDaApplicare(def);
    if (!dichiarati.length && !tavolo && !calcolati.length) problemi.push('senza effetti e senza nota «da applicare al tavolo»');
    righe.push({ id: def.id, nome: def.nome, categoria: def.categoria, testo: def.testo ?? def.ambito ?? '', dichiarati, calcolati, tavolo, confronto, problemi, esito: problemi.length ? 'DIFETTO' : confronto === 'DIVERSO' ? 'DIFETTO' : 'ok' });
  }
  return righe;
}

const cella = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
export function tabella(righe) {
  const nome = { talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione' };
  const out = [
    '# Talenti v1.0 — effetti voce per voce (27/10/2026)', '',
    'Generato da `node tools/talenti-effetti-voci.mjs --scrivi`; il test `tests/talenti-effetti-voci.test.js` lo ripete a ogni `npm test`.',
    'Per ogni voce un personaggio (Lucas, 6° livello) con `regimeTalenti = 2` la sceglie; si confronta con lo stesso personaggio senza la voce.', '',
    `Voci: ${righe.length} (${righe.filter((r) => r.categoria === 'talento_libero').length} Talenti Liberi, ${righe.filter((r) => r.categoria === 'maestria').length} Maestrie, ${righe.filter((r) => r.categoria === 'specializzazione').length} Specializzazioni). Esito ok: ${righe.filter((r) => r.esito === 'ok').length}.`,
    '«Vecchia maniera»: la stessa voce presa come Talento Libero dei Talenti di prima; «uguale» = stessi valori, «nuova» = la voce non esisteva.', '',
    '| Voce | Categoria | Effetti nel testo | Calcolati dall\'app | Da applicare al tavolo | Vecchia maniera | Esito |', '|---|---|---|---|---|---|---|',
    ...righes(righe),
  ];
  function righes(rs) { return rs.map((r) => `| ${cella(r.nome)} | ${nome[r.categoria]} | ${cella(r.dichiarati.join('; ') || '—')} | ${cella(r.calcolati.join('; ') || '—')} | ${cella(r.tavolo ?? '—')} | ${r.confronto} | ${r.esito}${r.problemi.length ? `: ${cella(r.problemi.join('; '))}` : ''} |`); }
  return `${out.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dati = (await datiDelRepo()).dati;
  const righe = analizzaVoci(dati);
  if (process.argv.includes('--scrivi')) writeFileSync(new URL('docs/talenti-effetti-2026-10-27.md', RADICE), tabella(righe));
  const per = (f) => righe.filter(f).length;
  console.log(`voci ${righe.length}; ok ${per((r) => r.esito === 'ok')}; difetti ${per((r) => r.esito !== 'ok')}; con nota «da applicare al tavolo» ${per((r) => r.tavolo)}`);
  for (const r of righe.filter((x) => x.esito !== 'ok')) console.log(`  ${r.categoria} ${r.id}: ${r.problemi.join(' | ') || r.confronto}`);
}
