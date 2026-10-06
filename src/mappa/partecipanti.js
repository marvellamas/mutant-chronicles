// Pezzi della mappa di battaglia (lotto 3 di docs/battlemap/piano.md; §7 della specifica): tutto ciò che può avere un
// token, ricavato a ogni lettura dalle fonti e mai copiato nella scena:
//   - lo scontro collegato (src/scontro.js): PG, nemici e partecipanti scritti a mano, con lato, PV e Stati dei
//     nemici e il turno secondo l'Iniziativa della plancia;
//   - oppure una bozza di «Prepara scontro» (src/preparazione.js): i partecipanti che «Inizia» creerà, con gli
//     stessi id (pg:<chiave>, nem:<tipo>:<numero>), così i token preparati restano validi quando lo scontro parte;
//   - le schede dei PG (src/tavolo.js → vistaPlancia): ritratto, PV e Stati;
//   - il registro dei veicoli (A.91, A.105): i mezzi del gruppo e quelli di proprietà o guidati da un PG presente.
// Funzioni pure.
import { diTurno } from '../scontro.js';
import { stessaChiave, partecipanteConducente } from '../veicoli-registro.js';
import { profiloVeicolo } from '../veicoli.js';
import { ingombroDaTaglia, ingombroVeicolo, iniziali, chiaveRif } from './token.js';

/** Immagine del nemico sul token (A.131): la copia ridotta in mappe/, se c'è; altrimenti le iniziali. */
export const urlImmagineNemico = (immagine) => (immagine?.file ? `api/mappe/${encodeURIComponent(immagine.ridotta ?? immagine.file)}` : null);

const nomeStato = (dati) => {
  const elenco = dati?.regole?.stati?.elenco ?? [];
  return (id) => ({ id, nome: elenco.find((s) => s.id === id)?.nome ?? id });
};

/** Vista della scheda di un PG dalla sua chiave (le chiavi dei file si confrontano come fa la plancia). */
const vistaDi = (viste, chiave) => {
  for (const [k, v] of viste ?? []) if (stessaChiave(k, chiave)) return v;
  return null;
};

function pezzoPg(id, chiave, nomeScontro, lato, viste) {
  const v = vistaDi(viste, chiave);
  const pv = v?.completa ? v.pv : null;
  return {
    chiave: chiaveRif({ tipo: 'partecipante', id }), rif: { tipo: 'partecipante', id }, tipo: 'pg', pg: chiave,
    nome: v?.nome ?? nomeScontro ?? chiave, lato: lato === 'avversario' ? 'avversario' : 'pg', ingombro: 1,
    iniziali: iniziali(v?.nome ?? nomeScontro ?? chiave), ritratto: v?.ritratto ?? null, pv,
    aZero: pv ? pv.attuali <= 0 : false, stati: v?.completa ? v.stati : [], ferite: v?.completa ? v.ferite?.nome ?? null : null,
  };
}

function pezzoNemico(p, dati) {
  const stato = nomeStato(dati);
  return {
    chiave: chiaveRif({ tipo: 'partecipante', id: p.id }), rif: { tipo: 'partecipante', id: p.id }, tipo: 'nemico', nemico: p.nemico ?? null,
    nome: p.nome, lato: p.lato === 'alleato' ? 'alleato' : 'avversario', ingombro: ingombroDaTaglia(p.scheda?.taglia, dati),
    iniziali: iniziali(p.scheda?.nome ?? p.nome, p.numero ?? null), ritratto: urlImmagineNemico(p.scheda?.immagine), pv: p.pv ?? null,
    aZero: (p.pv?.attuali ?? 1) <= 0, stati: (p.stati ?? []).map(stato), ferite: null,
  };
}

function pezzoManuale(p) {
  return {
    chiave: chiaveRif({ tipo: 'partecipante', id: p.id }), rif: { tipo: 'partecipante', id: p.id }, tipo: 'manuale',
    nome: p.nome, lato: p.lato === 'alleato' ? 'alleato' : 'avversario', ingombro: 1, iniziali: iniziali(p.nome),
    ritratto: null, pv: null, aZero: false, stati: [], ferite: null,
  };
}

/**
 * Partecipanti che «Inizia» creerà dalla bozza (src/preparazione.js → iniziaBozza): i PG della bozza (o quelli al
 * tavolo se la bozza non li sceglie) e le copie numerate dei nemici, da 1 per ogni tipo, nell'ordine delle voci.
 */
export function partecipantiDaBozza(bozza, alTavolo = []) {
  const pg = (bozza?.pg?.length ? bozza.pg : alTavolo).map((chiave) => ({ id: `pg:${chiave}`, tipo: 'pg', chiave, nome: chiave.replace(/-/g, ' '), lato: 'alleato' }));
  const numeri = new Map();
  const nemici = [];
  for (const v of bozza?.nemici ?? []) {
    for (let i = 0; i < v.quanti; i++) {
      const n = (numeri.get(v.nemico.id) ?? 0) + 1;
      numeri.set(v.nemico.id, n);
      nemici.push({ id: `nem:${v.nemico.id}:${n}`, tipo: 'nemico', nemico: v.nemico.id, numero: n, nome: `${v.nemico.nome} ${n}`, lato: v.lato,
        pv: { attuali: v.nemico.pv, massimo: v.nemico.pv }, stati: [...(v.nemico.stati ?? [])], scheda: v.nemico });
    }
  }
  return [...pg, ...nemici];
}

/** Il veicolo è «dello scontro»: del gruppo, oppure di proprietà o guidato da un PG presente. */
const veicoloPresente = (rec, chiaviPg) => rec.proprietario?.tipo === 'gruppo'
  || [rec.proprietario?.chiave, rec.conducente?.chiave].some((k) => k && chiaviPg.some((c) => stessaChiave(c, k)));

/**
 * I pezzi della scena, nell'ordine: PG, nemici e altri partecipanti, veicoli.
 * @param fonte { scontro?, bozza?, alTavolo?: [chiavi], viste: Map(chiave del file → vistaPlancia), veicoli: [record] }
 * @returns [{ chiave, rif, tipo, nome, lato: 'pg'|'alleato'|'avversario', ingombro, iniziali, ritratto, pv, aZero,
 *   stati: [{ id, nome }], ferite, diTurno, conducente? }]
 */
export function pezziDellaScena({ scontro = null, bozza = null, alTavolo = [], viste = new Map(), veicoli = [] }, dati) {
  const partecipanti = scontro ? scontro.partecipanti : bozza ? partecipantiDaBozza(bozza, alTavolo) : [];
  const turno = scontro ? diTurno(scontro)?.id ?? null : null;
  const pezzi = partecipanti.map((p) => {
    const pezzo = p.tipo === 'pg' ? pezzoPg(p.id, p.chiave, p.nome, p.lato, viste)
      : p.tipo === 'nemico' ? pezzoNemico(p, dati) : pezzoManuale(p);
    return { ...pezzo, diTurno: turno === p.id };
  });
  const chiaviPg = partecipanti.filter((p) => p.tipo === 'pg').map((p) => p.chiave);
  for (const rec of veicoli ?? []) {
    if (!veicoloPresente(rec, chiaviPg)) continue;
    const profilo = profiloVeicolo(rec.mezzo?.profilo, dati) ?? rec.mezzo?.scheda ?? null;
    const nome = rec.mezzo?.nome ?? profilo?.nome ?? 'Veicolo';
    const guida = scontro ? partecipanteConducente(rec, scontro) : null;
    pezzi.push({
      chiave: chiaveRif({ tipo: 'veicolo', id: rec.id }), rif: { tipo: 'veicolo', id: rec.id }, tipo: 'veicolo', nome,
      lato: 'pg', ingombro: ingombroVeicolo(profilo, dati), iniziali: iniziali(nome), ritratto: null, pv: null, aZero: false,
      stati: [], ferite: null, conducente: rec.conducente?.nome ?? null,
      // A.105: il mezzo si muove all'Iniziativa del conducente
      diTurno: Boolean(guida && turno === guida.id),
    });
  }
  return pezzi;
}

/** Token della scena il cui pezzo non c'è più (uscito dallo scontro, veicolo non più presente). Segnaposto esclusi. */
export function tokenOrfani(scena, pezzi) {
  const ci = new Set(pezzi.map((p) => p.chiave));
  return (scena?.token ?? []).filter((t) => t.rif?.tipo !== 'segnaposto' && !ci.has(chiaveRif(t.rif)));
}

/** Pezzi che non hanno ancora un token sulla mappa. */
export function pezziSenzaToken(scena, pezzi) {
  const sulla = new Set((scena?.token ?? []).map((t) => chiaveRif(t.rif)));
  return pezzi.filter((p) => !sulla.has(p.chiave));
}

/** Nuovo token per un pezzo, in q: id stabile dal riferimento. */
export function tokenPerPezzo(pezzo, q) {
  const id = `t-${pezzo.chiave.replace(/[^A-Za-z0-9_.-]+/g, '-')}`.slice(0, 120);
  return { id, rif: { ...pezzo.rif }, q, ingombro: Array.isArray(pezzo.ingombro) ? [...pezzo.ingombro] : pezzo.ingombro, nascosto: false };
}
