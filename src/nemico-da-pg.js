// Tavolo del Master: convertitore «PG → nemico». Prende il file di un personaggio (l'export dell'app) e
// produce un tipo di nemico nel formato di data/formato_nemici.json, con i numeri del motore: nessun
// ricalcolo proprio. PV, PM, AR, Difese, Iniziativa, Movimento, Salvezze e Caratteristiche vengono da
// calcolaScheda con una sessione nuova (PV pieni, nessuno Stato), come la scheda digitale al primo
// apertura; ogni attacco viene dalla stessa voce di scheda.equipaggiamento.armi che usa «Attacca!»
// (VA effettivo, danno con il bonus di Caratteristica, portata o gittata, modalità, AC, proprietà).
// Un'arma non in mano si misura mettendola in mano in una copia del personaggio: il PG d'origine non cambia.
import { deserializzaPersonaggio, normalizza } from './character.js';
import { calcolaScheda } from './calc.js';
import { massimiSessione, inizializzaSessione } from './sessione.js';
import { catalogo, risolvi, aggiungiDanno } from './equipaggiamento.js';
import { idDaNome } from './nemici.js';

const TIPI_ARMA = ['arma_ravvicinata', 'arma_distanza'];
// stati in cui l'arma è addosso (non nello zaino né nel deposito comune)
const ADDOSSO = ['impugnata', 'pronta'];
const RIF = /^[a-z_]+:[a-z0-9-]+$/;
const DADI = /^(\d+d\d+(\+\d+d\d+)*([+-]\d+)?|\d+)$/;

/** Il personaggio dal testo (o dall'oggetto) di un export: { scelte, livelli } normalizzati. */
function leggiPg(file, dati) {
  const p = deserializzaPersonaggio(typeof file === 'string' ? file : JSON.stringify(file));
  return { scelte: normalizza(p.creazione, dati).scelte, livelli: p.livelli ?? [] };
}

/** Scheda con una sessione nuova (PV e PM pieni, nessuno Stato, nessuna Ferita). */
function schedaFresca(scelte, livelli, dati) {
  const riposo = calcolaScheda({ creazione: scelte, livelli }, dati);
  if (!riposo.caratteristiche) return { riposo, scheda: null, massimi: null };
  const massimi = massimiSessione(riposo, scelte, dati);
  const sessione = inizializzaSessione(massimi);
  return { riposo, scheda: calcolaScheda({ creazione: scelte, livelli, sessione }, dati), massimi };
}

/**
 * Le armi addosso, ognuna misurata in mano: per un'arma non impugnata si calcola una copia del personaggio
 * con quell'arma impugnata (e le altre armi impugnate riposte, «pronta»). Con un'arma a due mani lo scudo
 * imbracciato resta pronto (Armamenti §7.1.6).
 */
function armiInMano(scelte, livelli, scheda, dati) {
  const cat = catalogo(dati);
  const voci = scelte.equipaggiamento ?? [];
  const out = [];
  // prima le armi in mano, poi le altre addosso
  for (const v of [...voci.filter((x) => x.stato === 'impugnata'), ...voci.filter((x) => x.stato !== 'impugnata')]) {
    const r = risolvi(v, cat);
    if (!TIPI_ARMA.includes(r.tipo) || !ADDOSSO.includes(v.stato)) continue;
    let a = (scheda.equipaggiamento?.armi ?? []).find((x) => x.uid === v.uid && !x.daScudo);
    if (!a) {
      const dueMani = r.def?.mani === 2;
      const eq = voci.map((x) => {
        if (x.uid === v.uid) return { ...x, stato: 'impugnata' };
        const rx = risolvi(x, cat);
        if (TIPI_ARMA.includes(rx.tipo) && x.stato === 'impugnata') return { ...x, stato: 'pronta' };
        if (dueMani && rx.tipo === 'scudo' && x.stato === 'imbracciato') return { ...x, stato: 'pronta' };
        return x;
      });
      const copia = schedaFresca({ ...scelte, equipaggiamento: eq }, livelli, dati).scheda;
      a = (copia?.equipaggiamento?.armi ?? []).find((x) => x.uid === v.uid && !x.daScudo);
    }
    if (a) out.push(a);
  }
  return out;
}

/** Testo di una proprietà dell'arma: «Perforante 2», «Fuoco». */
const testoProprieta = (p) => (typeof p === 'string' ? p : [p.nome, p.valore ?? p.livello ?? null].filter((x) => x !== null && x !== undefined && x !== '').join(' '));

/**
 * Un'arma di scheda.equipaggiamento.armi come attacco del formato dei nemici, con i numeri della scheda.
 * @returns {{ attacco, avvisi: string[] }}
 */
export function attaccoDaArma(a, dati) {
  const avvisi = [];
  const distanza = a.tipo === 'arma_distanza';
  // il danno come nella scheda digitale: quello dell'arma con il bonus di Caratteristica, o della munizione
  const danno = a.dannoDaMunizione
    ? (a.munizioneRiferimento ? aggiungiDanno(a.munizioneRiferimento.danno, (a.bonusDanno ?? 0) + (a.bonusCaratteristica?.bonus ?? 0)) : null)
    : (a.mani === 2 ? a.danno?.due_mani ?? a.danno?.una_mano : a.danno?.una_mano ?? a.danno?.due_mani) ?? null;
  const nature = dati.formato_nemici.nature_danno;
  const natura = nature.includes(a.naturaDanno) ? a.naturaDanno : 'Naturale';
  const proprieta = (a.proprieta ?? []).map(testoProprieta).filter(Boolean);
  if (a.naturaDanno && !nature.includes(a.naturaDanno)) proprieta.push(String(a.naturaDanno));
  const note = [];
  if (a.manovre?.length) note.push(`Manovre: ${a.manovre.join(', ')}`);
  if (distanza && a.munizioni?.capacita) note.push(`caricatore ${a.munizioni.capacita} ${a.munizioni.unita ?? 'colpi'}`);
  if (distanza && !Number.isInteger(a.gittataQ)) {
    note.push(`gittata ${a.gittataFormula ?? 'da definire'} (qui 1 Q)`);
    avvisi.push(`${a.nome}: gittata non numerica (${a.gittataFormula ?? '—'}), scritta 1 Q`);
  }
  if (!danno || !DADI.test(String(danno).replace(/\s+/g, ''))) avvisi.push(`${a.nome}: danno «${danno ?? '—'}» non nel formato dei dadi`);
  const attacco = {
    nome: a.nome,
    tipo: distanza ? 'distanza' : 'ravvicinato',
    va: a.vaEffettivo ?? a.va,
    danno: String(danno ?? '').replace(/\s+/g, ''),
    natura,
    ...(proprieta.length ? { proprieta } : {}),
    ...(distanza
      ? { gittata_q: Number.isInteger(a.gittataQ) ? a.gittataQ : 1, modalita: a.modalita?.length ? [...a.modalita] : ['S'], ac: Number.isInteger(a.ac) ? a.ac : 1 }
      : { portata_q: Number.isInteger(a.portataQ) ? a.portataQ : 1, ...(Number.isInteger(a.ac) && a.ac > 1 ? { ac: a.ac } : {}) }),
    ...(a.rif && RIF.test(a.rif) ? { rif: a.rif } : {}),
    ...(note.length ? { note: note.join('; ') } : {}),
  };
  return { attacco, avvisi };
}

/**
 * Il nemico costruito dal PG.
 * @param file testo o oggetto dell'export del personaggio
 * @param opzioni { nome, id, nota } facoltativi: nome del tipo (predefinito il nome del PG), id (dal nome),
 *   nota in testa alle note
 * @returns {{ nemico, avvisi: string[] } | { errore: string }}
 */
export function nemicoDaPg(file, dati, { nome = null, id = null, nota = null } = {}) {
  let pg;
  try {
    pg = leggiPg(file, dati);
  } catch (e) {
    return { errore: `file del personaggio non leggibile: ${e.message}` };
  }
  const { scelte, livelli } = pg;
  const { scheda, massimi } = schedaFresca(scelte, livelli, dati);
  if (!scheda) return { errore: 'il personaggio non ha ancora Corporazione, Addestramento e Classe: la scheda non si calcola' };
  const eq = scheda.equipaggiamento ?? {};
  const ar = eq.arEffettiva ?? eq.ar ?? { totale: 0, magica: 0 };
  const difese = scheda.abilita.find((a) => a.nome === (eq.abilitaDifese ?? 'Difese'));
  const t = scheda.tavolo ?? {};
  const mov = (modo) => t.movimento?.[modo]?.effettivo ?? scheda.movimento?.[modo] ?? 0;
  const avvisi = [];
  const attacchi = armiInMano(scelte, livelli, scheda, dati).map((a) => {
    const r = attaccoDaArma(a, dati);
    avvisi.push(...r.avvisi);
    return r.attacco;
  });
  const livello = 1 + livelli.length;
  const classi = (scheda.classi ?? []).map((c) => `${c.nome} ${c.grado}`).join(', ');
  const nomeTipo = String(nome ?? scelte.nome ?? '').trim() || 'Nemico';
  // Talenti di Classe e liberi, come promemoria: gli effetti generali sono già nei valori della scheda; quelli
  // situazionali e le opzioni di «Attacca!» legate ai Talenti si applicano a mano al tavolo
  const talenti = [...(scheda.talenti ?? []), ...(scheda.talentiLiberi ?? [])].map((x) => x.nome ?? x).filter((x) => typeof x === 'string');
  const incantesimi = (scelte.incantesimi ?? []).map((n) => ({ nome: n, note: 'promemoria: si lancia come per i PG (per-davide A.73)' }));
  const note = [
    nota,
    `Costruito come PG: ${scelte.nome?.trim() || 'senza nome'}, ${[scelte.corporazione, scelte.addestramento].filter(Boolean).join(' ')}, ${classi}, ${livello}° livello.`,
    talenti.length ? `Talenti (gli effetti situazionali si applicano a mano): ${talenti.join(', ')}.` : null,
  ].filter(Boolean).join(' ');
  const nemico = {
    formato: dati.formato_nemici.formato,
    versione: dati.formato_nemici.versione,
    id: id ?? (idDaNome(nomeTipo) || 'nemico'),
    nome: nomeTipo,
    fonte: `costruito come PG (${[scelte.corporazione, classi, `${livello}° livello`].filter(Boolean).join(', ')})`,
    caratteristiche: Object.fromEntries(Object.entries(scheda.caratteristiche).map(([k, c]) => [k, c.valore])),
    pv: massimi.pv,
    ...(massimi.pm ? { pm: massimi.pm } : {}),
    ar: { totale: ar.totale ?? 0, magica: ar.magica ?? 0 },
    difese: difese ? (difese.effettivo ?? difese.totale) : 0,
    iniziativa: t.iniziativa?.effettivo ?? scheda.iniziativa ?? 0,
    movimento: { passo: mov('passo'), corsa: mov('corsa'), scatto: mov('scatto') },
    salvezze: Object.fromEntries(dati.caratteristiche.salvezze.map((s) => [s.id, scheda.salvezze[s.id].effettivo ?? scheda.salvezze[s.id].totale])),
    attacchi,
    stati: [],
    ...(incantesimi.length ? { incantesimi } : {}),
    note,
  };
  return { nemico, avvisi };
}
