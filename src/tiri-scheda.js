// Dadi nell'app: si tocca il valore e si tira (13/10/2026, S9, S15, S18: richiesta di Davide e Mingo, nella forma
// decisa da Marcello). Il dado dal vivo resta il modo di base: l'app tira solo se il giocatore lo chiede, toccando il
// numero. Nessun pulsante nuovo nella scheda, nessuna regola cambiata.
//
// Qui le funzioni pure: che dado si tira per ogni valore (dai dati, mai inventato), l'esito con lo scarto
// (src/prova.js → esitoProva, Giocatore §1.6, §1.7, A.78), il danno delle armi e il registro degli ultimi tiri.
// La finestrella è in src/ui/tiro.js.
import { specTiro, tira } from './tiri.js';
import { esitoProva, tiroObbligatorio } from './prova.js';

const NOMI_ESITO = { magistrale: 'Successo Magistrale', successo: 'Successo', fallimento: 'Fallimento', maldestro: 'Fallimento Maldestro', automatico: 'Successo automatico', impossibile: 'Impossibile' };
const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Il dado delle Prove con il d20 (Giocatore §1.6): sempre dai dati, mai scritto nel codice. */
export function dadoProva(dati) {
  const f = dati?.regole?.prova?.dado ?? 'd20';
  const m = /^(\d*)d(\d+)$/.exec(String(f).trim());
  return specTiro({ dadi: Number(m?.[1] || 1), facce: Number(m?.[2] || 20) });
}

/** Il dado dell'Iniziativa in combattimento (§2.14, regole.json → iniziativa.dado_in_combattimento). */
export function dadoIniziativaScheda(dati) {
  const m = /^(\d+)d(\d+)$/.exec(String(dati?.regole?.iniziativa?.dado_in_combattimento ?? ''));
  if (!m) return null;
  return specTiro({ dadi: Number(m[1]), facce: Number(m[2]) });
}

/** Una formula di danno o di dado («1d8+2», «2d6», «3») in spec di src/tiri.js, o null se non si legge. */
export function specDaFormula(testo) {
  const t = String(testo ?? '').replace(/\s+/g, '');
  if (!t) return null;
  const m = /^(\d*)d(\d+)([+−-]\d+)?$/.exec(t);
  if (m) return specTiro({ dadi: Number(m[1] || 1), facce: Number(m[2]), fisso: m[3] ? Number(m[3].replace('−', '-')) : 0 });
  const fisso = /^[+−-]?\d+$/.test(t) ? Number(t.replace('−', '-')) : null;
  return fisso === null ? null : specTiro({ dadi: 0, facce: 1, fisso });
}

/**
 * Che cosa si tira toccando un valore della scheda.
 * @param v { genere: 'prova' | 'iniziativa' | 'danno', nome, va?, formula?, tipo?: 'attacco'|'difesa', abilita?,
 *   magistraleMigliorato? }
 * @returns {{ genere, nome, spec, va, titolo, modo: 'prova' | 'somma' }} modo: 'prova' si confronta con il VA,
 *   'somma' si somma al valore (Iniziativa, danno).
 */
export function tiroDelValore(v, dati) {
  if (v.genere === 'iniziativa') {
    const spec = dadoIniziativaScheda(dati);
    return { genere: 'iniziativa', nome: v.nome ?? 'Iniziativa', spec, va: v.va ?? 0, modo: 'somma', titolo: `Tira ${v.nome ?? 'Iniziativa'} — ${segno(v.va ?? 0)} + ${spec?.formula ?? '—'}` };
  }
  if (v.genere === 'danno') {
    const spec = specDaFormula(v.formula);
    // A.199: con un moltiplicatore (creature «8d10×5», Carica…) si tirano i dadi, si sommano e si moltiplica: Difese e Armatura dopo
    const moltiplicatore = Number.isInteger(v.moltiplicatore) && v.moltiplicatore > 1 ? v.moltiplicatore : 1;
    return { genere: 'danno', nome: v.nome ?? 'Danno', spec, va: null, modo: 'somma', moltiplicatore, titolo: `Tira il danno — ${v.formula ?? '—'}${moltiplicatore > 1 ? ` ×${moltiplicatore}` : ''}` };
  }
  const spec = dadoProva(dati);
  return { genere: 'prova', nome: v.nome, spec, va: v.va, modo: 'prova', tipo: v.tipo ?? null, abilita: v.abilita !== false, magistraleMigliorato: !!v.magistraleMigliorato,
    titolo: `Tira ${v.nome} — VA ${v.va}` };
}

/**
 * L'esito di un tiro su un valore: usa esitoProva (§1.6, §1.7, A.78) e aggiunge lo scarto (quanto si è riusciti o
 * mancati: VA − dado, positivo se riesce).
 * @returns {{ naturale, esito, riuscita, nome, scarto, testo, riga }}
 */
export function esitoTiro(t, naturale, dati, risultati = null) {
  if (t.modo === 'somma') {
    const molt = t.genere === 'danno' && t.moltiplicatore > 1 ? t.moltiplicatore : 1;
    const totale = molt > 1 ? naturale * molt : naturale + (t.genere === 'iniziativa' ? t.va : 0);
    // il danno con moltiplicatore mostra i dadi, la somma e il prodotto («12d10: 5+7+… = 63 → ×5 = 315»)
    const dadi = molt > 1 && Array.isArray(risultati) && risultati.length > 1 ? `${risultati.join('+')} = ` : '';
    return { naturale, totale, risultati: risultati ?? undefined, moltiplicatore: molt > 1 ? molt : undefined, esito: null, riuscita: null, nome: null, scarto: null,
      testo: t.genere === 'iniziativa' ? `${segno(t.va)} + ${naturale} = ${totale}` : molt > 1 ? `${t.spec?.formula ?? ''}: ${dadi}${naturale} → ×${molt} = ${totale}` : `${t.spec?.formula ?? ''} = ${naturale}`,
      riga: `${t.nome}: ${totale}${molt > 1 ? ` (${naturale} ×${molt})` : ''}` };
  }
  const e = esitoProva(t.va, naturale, dati, { abilita: t.abilita, tipo: t.tipo, magistraleMigliorato: t.magistraleMigliorato });
  const scarto = t.va - naturale;
  return {
    naturale, totale: naturale, esito: e.esito, riuscita: e.riuscita, nome: NOMI_ESITO[e.esito] ?? e.esito, scarto,
    testo: e.testo,
    riga: `${t.nome}: ${naturale} → ${NOMI_ESITO[e.esito] ?? e.esito}, scarto ${segno(scarto)}`,
  };
}

/** Tira davvero: `casuale(facce)` è iniettabile per i test. */
export function tiraValore(t, casuale) {
  if (!t.spec) return null;
  const { tiro, risultati } = tira(t.spec, casuale ?? undefined);
  // nelle Prove conta il naturale del d20, non la somma con i fissi (che nelle Prove non ci sono)
  return { naturale: t.modo === 'prova' ? risultati[0] : tiro.valore, risultati, valore: tiro.valore };
}

/** Il tiro si può fare? Con VA da successo automatico in su non si tira, salvo attacchi e Difese (A.78). */
export function siTira(t, dati) {
  if (t.modo === 'somma') return { si: !!t.spec, motivo: t.spec ? null : 'dado non indicato nei dati' };
  const P = dati.regole.prova;
  if (t.va <= P.impossibile_fino_a) return { si: false, motivo: `VA ${t.va}: Prova impossibile nelle condizioni attuali, non si tira (§1.7).` };
  if (t.va >= P.successo_automatico_da && !tiroObbligatorio(t.tipo, dati)) {
    return { si: false, motivo: `VA ${t.va}: successo automatico, senza tiro; non è un Successo Magistrale (§1.7).` };
  }
  return { si: true, motivo: null };
}

// ---------------------------------------------------------------------------
// Registro degli ultimi tiri (sessione.tiri)

export const TIRI_MAX = 20;

/** Una riga del registro: { quando, testo, naturale, esito?, scarto?, totale? }. */
export function rigaTiro(t, e, adesso = new Date()) {
  return {
    quando: adesso.toISOString(), cosa: t.nome, naturale: e.naturale, totale: e.totale,
    ...(e.esito ? { esito: e.esito, nomeEsito: e.nome, scarto: e.scarto } : {}),
    testo: e.riga,
  };
}

/** Aggiunge il tiro alla sessione, tenendo gli ultimi TIRI_MAX. */
export function aggiungiTiro(sessione, riga, max = TIRI_MAX) {
  const prima = Array.isArray(sessione?.tiri) ? sessione.tiri : [];
  return { ...(sessione ?? {}), tiri: [...prima, riga].slice(-max) };
}

/** Gli ultimi tiri, dal più recente. */
export const tiriRecenti = (sessione) => [...(Array.isArray(sessione?.tiri) ? sessione.tiri : [])].reverse();

/** La riga per il registro dello scontro, con il nome del PG: «Akira tira Percezione: 14 → Successo, scarto +3». */
export const rigaRegistroScontro = (nome, e, t) => `${nome} tira ${t.nome}: ${e.esito ? `${e.naturale} → ${e.nome}, scarto ${segno(e.scarto)}` : e.totale}`;

/** Le righe del registro dei tiri, pulite: solo quelle ben formate, le ultime TIRI_MAX (src/sessione.js). */
export function allineaTiri(lista, max = TIRI_MAX) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((x) => x && typeof x === 'object' && typeof x.quando === 'string' && typeof x.testo === 'string' && Number.isFinite(x.naturale))
    .slice(-max);
}
