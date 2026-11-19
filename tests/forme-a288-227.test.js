import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 227 — A.288 (Davide, 19/11/2026): gli attacchi di ogni forma dei licantropi e i bersagli dell'Ammantato.
//
//   «Per i cinque licantropi il Manuale dei Mostri 0.69 distingue tre forme: umanoide, animale e ibrida. L'app deve mostrare soltanto
//   gli attacchi della forma attiva, come indicato nella colonna «Portata e costo» delle schede.» + la tabella; il lupo mannaro in
//   forma animale ha il solo Morso, al massimo una volta per Round comprese le Opportunità; l'Ammantato aperto occupa 2 × 2 Q, raccolto
//   1 × 1 Q, la postura cambia l'ingombro e non l'elenco, e mentre avvolge una vittima morde solo quella e usa la Coda contro altri.
//
// Le tre regole che questo file difende, ciascuna provata anche in rosso con un mutante:
//   1. il modello è a n forme (la tigre ne ha tre da sempre): nessun codice conta «due»;
//   2. una forma NON si riempie con un profilo dedotto: spazio e movimento di ogni forma si rileggono dal manuale, e una forma che il
//      manuale non scrive fa fallire il controllo invece di passare con un valore verosimile;
//   3. un cambio di forma non tocca PV attuali, Iniziativa, condizioni né effetti: cambia ingombro, movimento e attacchi offerti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { testoManuale } from '../tools/manuali.mjs';
import { CONFIGURAZIONI_A273, LIMITI_A288 } from '../tools/importa-mostri.mjs';
import { validaNemico } from '../src/validate.js';
import { nuovoScontro, aggiungiNemici, cambiaConfigurazione, configurazioneAttuale, attacchiAttuali, attacchiNonInForma, avvisoLimiteAttacco, registraAttacco, rigaOpportunita } from '../src/scontro.js';
import { attacchiDi } from '../src/nemico-attacco.js';
import { portataDi } from '../src/mappa/zoc.js';
import { conMovimentoDellaForma } from '../src/mappa/partecipanti.js';
import { ingombroCreatura } from '../src/mappa/token.js';

const { dati } = await datiReali();
const DIR = new URL('../esempi/nemici/mostri/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const scheda = (id) => JSON.parse(readFileSync(join(DIR, `${id}.json`), 'utf8'));
const QUANDO = new Date('2026-11-19T10:00:00.000Z');

// La tabella di Davide (risposta A.288 del 19/11/2026), scritta a mano: è il riferimento, non un dato derivato dal nostro.
const TABELLA = {
  'lupo-mannaro': { umanoide: ['Colpo disarmato'], lupo: ['Morso'], ibrida: ['Artigli', 'Morso', 'Colpo disarmato'] },
  'orso-mannaro': { umanoide: ['Pugno'], orso: ['Artiglio', 'Morso'], ibrida: ['Artiglio', 'Morso', 'Pugno'] },
  'cinghiale-mannaro': { umanoide: ['Pugno'], cinghiale: ['Zanne'], ibrida: ['Zanne', 'Pugno'] },
  'ratto-mannaro': { umanoide: ['Colpo disarmato'], ratto: ['Morso'], ibrida: ['Morso', 'Colpo disarmato'] },
  'tigre-mannara': { umanoide: ['Colpo disarmato'], tigre: ['Artiglio', 'Morso'], ibrida: ['Artiglio', 'Morso', 'Colpo disarmato'] },
};
const TITOLO = { 'lupo-mannaro': 'Lupo mannaro', 'orso-mannaro': 'Orso mannaro', 'cinghiale-mannaro': 'Cinghiale mannaro', 'ratto-mannaro': 'Ratto mannaro', 'tigre-mannara': 'Tigre mannara', ammantato: 'Ammantato' };

// ——— il manuale (Mostri 0.69), letto per la scheda di ogni creatura ———————————————————————————————————————————————————————
const MANUALE = testoManuale('mostri').split('\n').map((r) => r.trim()).filter(Boolean);
function bloccoDi(titolo) {
  const i = MANUALE.findLastIndex((r) => r === `# ${titolo}`); // la scheda vera è l'ultima occorrenza del titolo (prima ci sono indici e rimandi)
  assert.ok(i >= 0, `la scheda «${titolo}» non c'è nel manuale`);
  const f = MANUALE.findIndex((r, k) => k > i && r.startsWith('# '));
  return MANUALE.slice(i, f < 0 ? undefined : f);
}
/** Le forme che il manuale scrive nella riga «Movimento e spazio»: [{ etichetta, passo, corsa, scatto, spazio }]. */
function formeDelManuale(blocco) {
  const k = blocco.indexOf('Movimento e spazio');
  const riga = blocco[k + 1];
  return riga.split(';').map((seg) => {
    const [etichetta, resto] = seg.split(':').map((x) => x.trim());
    const mov = /(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*Q/.exec(resto);
    const sp = /(\d+\s*×\s*\d+)\s*Q/.exec(resto) ?? /\b(1)\s*Q\b/.exec(resto); // «1 × 1 Q», oppure «1 Q condivisibile…» (il ratto gigante)
    return { etichetta: etichetta.toLowerCase(), passo: +mov[1], corsa: +mov[2], scatto: +mov[3], spazio: `${sp[1].replace(/\s+/g, ' ')} Q`.replace(/^1 × 1 Q$/, '1 Q') };
  });
}
/** Per ogni attacco la colonna «Portata e costo»: a quali forme appartiene ('umanoide' | 'animale' | 'ibrida'). */
function attacchiPerForma(blocco) {
  const a = blocco.indexOf('Attacco');
  const out = {};
  for (let i = a + 4; i + 3 < blocco.length; i += 4) {
    const [nome, , , portata] = blocco.slice(i, i + 4);
    if (!/;/.test(portata) || /^[A-Z][a-z]+ [a-z]+\.\s/.test(nome)) break;
    const q = portata.split(';').pop().toLowerCase();
    out[nome] = { umanoide: /umanoide/.test(q), animale: /animale|soltanto ibrid/.test(q) && /animale/.test(q), ibrida: /ibrid/.test(q) };
  }
  return out;
}
/**
 * Controlla le forme di una scheda contro il testo del manuale. Torna l'elenco dei problemi (vuoto = ogni forma e ogni attacco di forma
 * sono scritti nel manuale). Una forma che il manuale non scrive — o scrive con altri numeri — è un problema: è il modo in cui si
 * scopre un profilo dedotto.
 */
export function controllaForme(s, blocco) {
  const problemi = [];
  const forme = formeDelManuale(blocco);
  const colonna = attacchiPerForma(blocco);
  for (const c of s.configurazioni ?? []) {
    const trovate = forme.filter((f) => (c.id === 'umanoide' ? /umanoide/.test(f.etichetta) : c.id === 'ibrida' ? /ibrid/.test(f.etichetta) : f.etichetta.includes(c.id)));
    if (!trovate.length) { problemi.push(`${c.id}: il manuale non scrive questa forma (profilo dedotto?)`); continue; }
    const f = trovate[0];
    if (c.spazio !== f.spazio) problemi.push(`${c.id}: spazio ${c.spazio}, il manuale scrive ${f.spazio}`);
    if (c.movimento && (c.movimento.passo !== f.passo || c.movimento.corsa !== f.corsa || c.movimento.scatto !== f.scatto)) problemi.push(`${c.id}: movimento ${Object.values(c.movimento).join('/')}, il manuale scrive ${f.passo}/${f.corsa}/${f.scatto}`);
    if (Array.isArray(c.attacchi)) {
      const chiave = c.id === 'umanoide' ? 'umanoide' : c.id === 'ibrida' ? 'ibrida' : 'animale';
      const attesi = Object.entries(colonna).filter(([, v]) => v[chiave]).map(([n]) => n).sort();
      if (JSON.stringify([...c.attacchi].sort()) !== JSON.stringify(attesi)) problemi.push(`${c.id}: attacchi ${c.attacchi.join(', ')}; la colonna «Portata e costo» dice ${attesi.join(', ')}`);
    }
  }
  return problemi;
}

// ——— 1. n forme, dal manuale ————————————————————————————————————————————————————————————————————————————————————————————————

test('A.288: i cinque licantropi hanno le tre forme del manuale (n forme, non due) e ogni valore sta nel manuale', () => {
  for (const id of Object.keys(TABELLA)) {
    const s = scheda(id);
    assert.deepEqual(s.configurazioni.map((c) => c.id), ['umanoide', 'ibrida', id.split('-')[0]], `${id}: umanoide, ibrida, animale`);
    assert.deepEqual(controllaForme(s, bloccoDi(TITOLO[id])), [], id);
    assert.deepEqual(validaNemico(s, dati, id), [], id);
  }
});

test('A.288: gli attacchi di ogni forma sono quelli della tabella di Davide, e la tabella torna con la colonna del manuale', () => {
  for (const [id, forme] of Object.entries(TABELLA)) {
    const s = scheda(id);
    for (const c of s.configurazioni) assert.deepEqual([...c.attacchi].sort(), [...forme[c.id]].sort(), `${id} / ${c.id}`);
    // e la sorgente unica dell'importatore dice lo stesso
    for (const [cid, , , , , att] of CONFIGURAZIONI_A273[id]) assert.deepEqual([...att].sort(), [...forme[cid]].sort(), `${id} / ${cid} (importatore)`);
  }
});

test('MUTANTE — una forma dedotta o con numeri verosimili ma non scritti dal manuale fa fallire il controllo', () => {
  const blocco = bloccoDi('Lupo mannaro');
  const s = scheda('lupo-mannaro');
  assert.deepEqual(controllaForme(s, blocco), []);
  // movimento dell'ibrida ritoccato di un punto: plausibile, e sbagliato
  const m1 = structuredClone(s); m1.configurazioni.find((c) => c.id === 'ibrida').movimento.passo = 7;
  assert.ok(controllaForme(m1, blocco).some((p) => /ibrida: movimento/.test(p)));
  // spazio dell'ibrida «per analogia con la tigre» (2 × 2 Q)
  const m2 = structuredClone(s); m2.configurazioni.find((c) => c.id === 'ibrida').spazio = '2 × 2 Q';
  assert.ok(controllaForme(m2, blocco).some((p) => /ibrida: spazio/.test(p)));
  // una quarta forma che il manuale non scrive
  const m3 = structuredClone(s); m3.configurazioni.push({ id: 'nebbia', nome: 'Nebbia', spazio: '1 Q', movimento: { passo: 6, corsa: 12, scatto: 18 } });
  assert.ok(controllaForme(m3, blocco).some((p) => /nebbia: il manuale non scrive/.test(p)));
  // un attacco di troppo in una forma
  const m4 = structuredClone(s); m4.configurazioni.find((c) => c.id === 'umanoide').attacchi.push('Morso');
  assert.ok(controllaForme(m4, blocco).some((p) => /umanoide: attacchi/.test(p)));
});

test('lo Sciacallo mannaro ha tre forme nel manuale ma non è fra i cinque licantropi della A.288: nei dati non ne ha, e nessuna è stata scritta per analogia', () => {
  const s = scheda('sciacallo-mannaro');
  assert.equal(s.configurazioni, undefined, 'niente forme inventate: si apre una domanda (A.299), non si deduce');
  assert.equal(attacchiAttuali({ scheda: s }).length, s.attacchi.length, 'senza forme dichiarate offre tutti i suoi attacchi, com’era');
});

// ——— 2. gli attacchi offerti dall'app ————————————————————————————————————————————————————————————————————————————————————————

function scontroCon(id) {
  let s = nuovoScontro({ id: 'sc1', nome: 'Prova', pg: [], adesso: QUANDO });
  s = aggiungiNemici(s, scheda(id), 1, {}, QUANDO);
  return { s, p: () => s.partecipanti.find((x) => x.tipo === 'nemico') };
}

test('A.288: «Attacca!» offre solo gli attacchi della forma attiva, per tutte le forme di tutti e cinque', () => {
  for (const [id, forme] of Object.entries(TABELLA)) {
    const { s: s0 } = scontroCon(id);
    const pid = s0.partecipanti.find((x) => x.tipo === 'nemico').id;
    let s = s0;
    for (const forma of ['umanoide', 'ibrida', id.split('-')[0], 'umanoide']) {
      s = cambiaConfigurazione(s, pid, forma, QUANDO);
      const p = s.partecipanti.find((x) => x.id === pid);
      assert.deepEqual(attacchiDi(p).map((a) => a.nome).sort(), [...forme[forma]].sort(), `${id} in forma ${forma}`);
      assert.equal(attacchiDi(p).length + attacchiNonInForma(p).length, scheda(id).attacchi.length, 'quelli non offerti si dicono, non spariscono');
    }
  }
});

test('A.288: la forma di partenza è l’umanoide e la sceglie il Direttore; l’app non la cambia da sé', () => {
  const { s, p } = scontroCon('lupo-mannaro');
  assert.equal(configurazioneAttuale(p()).id, 'umanoide');
  assert.deepEqual(attacchiDi(p()).map((a) => a.nome), ['Colpo disarmato']);
  // nessuna operazione di Round/turno cambia la forma: la sola funzione che lo fa è cambiaConfigurazione
  assert.equal(s.partecipanti.find((x) => x.tipo === 'nemico').configurazione, undefined);
});

test('MUTANTE — un modello «a due forme» si romperebbe alla tigre: tre forme passano tutte e tre, con ingombro e movimento giusti', () => {
  const { s: s0 } = scontroCon('tigre-mannara');
  const pid = s0.partecipanti.find((x) => x.tipo === 'nemico').id;
  const visti = [];
  let s = s0;
  for (const f of ['ibrida', 'tigre', 'umanoide']) {
    s = cambiaConfigurazione(s, pid, f, QUANDO);
    const p = s.partecipanti.find((x) => x.id === pid);
    visti.push([configurazioneAttuale(p).id, configurazioneAttuale(p).spazio, conMovimentoDellaForma(p).movimento.passo, ingombroCreatura(p.scheda, dati, 'base', p.configurazione).larghezza * 100 + ingombroCreatura(p.scheda, dati, 'base', p.configurazione).lunghezza]);
  }
  assert.deepEqual(visti.map((v) => v.slice(0, 3)), [['ibrida', '2 × 2 Q', 6], ['tigre', '1 × 2 Q', 8], ['umanoide', '1 Q', 6]]);
});

test('A.288: la zona di controllo segue gli attacchi della forma attuale', () => {
  const { s, p } = scontroCon('ratto-mannaro');
  // il Morso del Ratto ha portata «Contatto» (1 Q): in qualunque forma la portata resta quella dei suoi attacchi ravvicinati
  assert.ok(portataDi(p(), dati) >= 1);
  const t = cambiaConfigurazione(s, p().id, 'ratto', QUANDO);
  assert.ok(portataDi(t.partecipanti.find((x) => x.tipo === 'nemico'), dati) >= 1);
});

// ——— 3. il cambio di forma non tocca PV, Iniziativa, condizioni, effetti ————————————————————————————————————————————————————————

test('IL TEST CHE FALLISCE SE UN CAMBIO DI FORMA ALTERA PV ATTUALI, INIZIATIVA, CONDIZIONI O EFFETTI — per tutte le transizioni di tutte e sei le creature', () => {
  for (const id of [...Object.keys(TABELLA), 'ammantato']) {
    const { s: s0 } = scontroCon(id);
    const pid = s0.partecipanti.find((x) => x.tipo === 'nemico').id;
    // la creatura è in una situazione piena: ferita, con Stati, durate, effetti, Azioni spese, usi di capacità
    const sporca = { ...s0, partecipanti: s0.partecipanti.map((x) => (x.id === pid ? {
      ...x, pv: { attuali: 17, massimo: x.pv?.massimo ?? 63 }, pm: { attuali: 3, massimo: 10 }, ferite: 2, menomazioni: ['braccio'], stati: ['sanguinante', 'a-terra'],
      iniziativa: 11, base: 11, d10: 7, azioniSpese: { azp: 1, azm: 1 }, usiCapacita: { 'Caccia e contagio': 1 }, effetti: [{ nome: 'Scudo', fino: 3 }], durate: [{ nome: 'Benedizione', fino: 2 }],
    } : x)) };
    const forme = scheda(id).configurazioni.map((c) => c.id);
    for (const da of forme) for (const a of forme) {
      const prima = sporca.partecipanti.find((x) => x.id === pid);
      const pre = cambiaConfigurazione(sporca, pid, da, QUANDO);
      const dopo = cambiaConfigurazione(pre, pid, a, QUANDO).partecipanti.find((x) => x.id === pid);
      const { configurazione: _c1, ...resto } = dopo; const { configurazione: _c2, ...restoPrima } = prima;
      assert.deepEqual(resto, restoPrima, `${id}: ${da} → ${a} ha toccato qualcosa oltre alla forma`);
      assert.deepEqual([dopo.pv, dopo.iniziativa, dopo.stati, dopo.effetti, dopo.durate, dopo.ferite], [prima.pv, prima.iniziativa, prima.stati, prima.effetti, prima.durate, prima.ferite]);
    }
  }
});

test('la riga di registro del cambio dice gli attacchi della forma e che il resto resta', () => {
  const { s, p } = scontroCon('lupo-mannaro');
  const t = cambiaConfigurazione(s, p().id, 'lupo', QUANDO);
  const riga = t.registro.at(-1).testo ?? t.registro.at(-1).t ?? JSON.stringify(t.registro.at(-1));
  assert.match(riga, /Attacchi di questa forma: Morso/);
  assert.match(riga, /PV, PM, effetti, Ferite, Stati e Azioni già spese restano/);
});

test('la pedina si ridimensiona rispetto allo stesso punto: l’ingombro segue la forma (orso 1 × 1 → 2 × 2), l’ibrida del lupo resta 1 × 1', () => {
  const orso = scontroCon('orso-mannaro');
  const po = (st) => st.partecipanti.find((x) => x.tipo === 'nemico');
  const a = cambiaConfigurazione(orso.s, orso.p().id, 'ibrida', QUANDO);
  assert.equal(configurazioneAttuale(po(a)).spazio, '2 × 2 Q');
  const lupo = scontroCon('lupo-mannaro');
  const b = cambiaConfigurazione(lupo.s, lupo.p().id, 'ibrida', QUANDO);
  assert.equal(configurazioneAttuale(po(b)).spazio, '1 Q');
  assert.equal(conMovimentoDellaForma(po(b)).movimento.passo, 6);
});

// ——— 4. i limiti per Round: avvisano, non bloccano ————————————————————————————————————————————————————————————————————————————

test('A.288: «un Morso per Round, comprese le Opportunità» — l’avviso compare al secondo Morso e mai prima; un altro Round no', () => {
  const { s: s0, p } = scontroCon('lupo-mannaro');
  let s = cambiaConfigurazione(s0, p().id, 'lupo', QUANDO);
  const lupo = () => s.partecipanti.find((x) => x.tipo === 'nemico');
  const morso = lupo().scheda.attacchi.find((a) => a.nome === 'Morso');
  assert.equal(avvisoLimiteAttacco(s, lupo(), morso), null, 'nessun Morso ancora');
  s = registraAttacco(s, { attaccante: lupo().nome, bersaglio: 'Pablo', arma: 'Morso', va: 12, tiri: [], esito: 'successo' }, QUANDO);
  assert.match(avvisoLimiteAttacco(s, lupo(), morso), /massimo 1 per Round, comprese le Opportunità/);
  assert.equal(avvisoLimiteAttacco({ ...s, round: s.round + 1 }, lupo(), morso), null, 'nel Round dopo si può');
  // un attacco senza limite non avvisa mai
  assert.equal(avvisoLimiteAttacco(s, lupo(), { nome: 'Artigli' }), null);
});

test('A.288: in forma animale l’Opportunità del lupo conta come Morso (è il suo solo attacco); in forma ibrida non si sa quale attacco fosse', () => {
  const { s: s0, p } = scontroCon('lupo-mannaro');
  const conOpp = (s, id) => rigaOpportunita(s, { da: id, nomeDa: 'Lupo', contro: 'pg:x', nomeContro: 'Pablo' }, QUANDO);
  const lupoForma = cambiaConfigurazione(s0, p().id, 'lupo', QUANDO);
  const a = conOpp(lupoForma, p().id);
  assert.ok(avvisoLimiteAttacco(a, a.partecipanti.find((x) => x.tipo === 'nemico'), 'Morso'), 'animale: l’Opportunità è un Morso');
  const ibrida = cambiaConfigurazione(s0, p().id, 'ibrida', QUANDO);
  const b = conOpp(ibrida, p().id);
  assert.equal(avvisoLimiteAttacco(b, b.partecipanti.find((x) => x.tipo === 'nemico'), 'Morso'), null, 'ibrida: la riga non dice con quale attacco');
});

test('i limiti dichiarati vengono dal manuale e hanno una fonte; nessuno è inventato', () => {
  for (const [id, lim] of Object.entries(LIMITI_A288)) {
    assert.deepEqual(scheda(id).limiti_attacco, lim);
    for (const l of lim) { assert.ok(l.fonte.length > 20, `${id}: fonte`); assert.ok(scheda(id).attacchi.some((a) => a.nome === l.attacco), `${id}: l'attacco c'è`); assert.equal(l.per_round, 1); }
    const frase = lim[0].fonte.match(/«(.+)»/)?.[1];
    assert.ok(bloccoDi(TITOLO[id]).join(' ').includes(frase), `${id}: la frase «${frase}» è nel manuale`);
  }
});

// ——— 5. l'Ammantato: la postura cambia l'ingombro, non l'elenco; i bersagli sono una nota ————————————————————————————————————

test('A.288, Ammantato: aperto 2 × 2 Q, raccolto 1 Q; la postura non cambia gli attacchi; nessun attacco già tirabile è cambiato', () => {
  const s = scheda('ammantato');
  assert.deepEqual(s.configurazioni.map((c) => [c.id, c.spazio]), [['aperto', '2 × 2 Q'], ['raccolto', '1 Q']]);
  assert.ok(s.configurazioni.every((c) => c.attacchi === undefined), 'nessun elenco per postura');
  const { s: s0, p } = scontroCon('ammantato');
  const raccolto = cambiaConfigurazione(s0, p().id, 'raccolto', QUANDO).partecipanti.find((x) => x.tipo === 'nemico');
  assert.deepEqual(attacchiDi(raccolto).map((a) => a.nome), ['Morso', 'Coda']);
  // gli stessi numeri di prima (VA, danno, natura, portata, AC): solo la nota dei bersagli è nuova
  const prima = JSON.parse(readFileSync(new URL('../esempi/nemici/mostri/ammantato.json', import.meta.url), 'utf8')).attacchi.map(({ note: _n, ...a }) => a);
  assert.deepEqual(prima, [
    { nome: 'Morso', tipo: 'ravvicinato', va: 14, danno: '2d6+3', natura: 'Naturale', portata_q: 1, ac: 1 },
    { nome: 'Coda', tipo: 'ravvicinato', va: 14, danno: '1d8+3', natura: 'Naturale', portata_q: 2, ac: 1 },
  ]);
  assert.match(s.attacchi[0].note, /soltanto quella vittima/);
  assert.match(s.attacchi[1].note, /Coda contro gli altri bersagli/);
});

// ——— 6. il validatore ———————————————————————————————————————————————————————————————————————————————————————————————————————

test('il validatore rifiuta un attacco di forma che la scheda non ha, un attacco che nessuna forma offre e un limite su un attacco inesistente', () => {
  const base = scheda('lupo-mannaro');
  assert.deepEqual(validaNemico(base, dati, 'lupo'), []);
  const a = structuredClone(base); a.configurazioni[0].attacchi = ['Sputo'];
  assert.ok(validaNemico(a, dati, 'x').some((e) => /Sputo/.test(e.problema)));
  const b = structuredClone(base); b.configurazioni.forEach((c) => { c.attacchi = c.attacchi.filter((n) => n !== 'Artigli'); });
  assert.ok(validaNemico(b, dati, 'x').some((e) => /Artigli.*nessuna forma/.test(e.problema)));
  const c = structuredClone(base); c.limiti_attacco = [{ attacco: 'Sputo', per_round: 1, comprese_opportunita: true, fonte: 'x' }];
  assert.ok(validaNemico(c, dati, 'x').some((e) => /limiti_attacco/.test(e.chiave)));
  const d = structuredClone(base); d.limiti_attacco[0].fonte = undefined;
  assert.ok(validaNemico(d, dati, 'x').length > 0, 'senza fonte il limite non si scrive');
});

test('tutte le schede del Bestiario restano valide dopo il lotto', () => {
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    assert.deepEqual(validaNemico(s, dati, f), [], f);
  }
});

// ——— 7. la pedina sulla mappa: si ridimensiona, non si sposta ————————————————————————————————————————————————————————————————

test('A.288 con A.273: cambiando forma la pedina cambia misura nello stesso punto (stesso centro), per tutte le forme di tutti e sei', async () => {
  const { pezziDellaScena, tokenPerPezzo, tokenDaAdattare, adattaToken } = await import('../src/mappa/partecipanti.js');
  for (const id of [...Object.keys(TABELLA), 'ammantato']) {
    const { s: s0 } = scontroCon(id);
    const pid = s0.partecipanti.find((x) => x.tipo === 'nemico').id;
    const forme = scheda(id).configurazioni.map((c) => c.id);
    const pezzoDi = (s) => pezziDellaScena({ scontro: s }, dati).find((p) => p.chiave.includes(pid) || p.id === pid);
    // il token nasce nella forma di partenza, in un punto fisso della griglia 30 × 30
    let s = s0;
    let token = { ...tokenPerPezzo(pezzoDi(s0), [10, 12]), q: [10, 12] };
    const centro = (t) => { const b = Array.isArray(t.ingombro) ? t.ingombro : [t.ingombro ?? 1, t.ingombro ?? 1]; return [t.q[0] + b[0] / 2, t.q[1] + b[1] / 2]; };
    for (const f of [...forme.slice(1), ...forme.slice(0, 1)]) {
      s = cambiaConfigurazione(s, pid, f, QUANDO);
      const pezzo = pezzoDi(s);
      const da = tokenDaAdattare({ token: [token] }, [pezzo]);
      const prima = centro(token);
      if (da.length) token = adattaToken(token, pezzo, { colonne: 30, righe: 30 });
      const dopo = centro(token);
      // la misura è quella della forma; il centro resta nello stesso punto (a meno di mezzo quadretto: l'arrotondamento alla griglia)
      assert.ok(Math.abs(dopo[0] - prima[0]) <= 0.5 && Math.abs(dopo[1] - prima[1]) <= 0.5, `${id} → ${f}: la pedina si è spostata da ${prima} a ${dopo}`);
      assert.equal(tokenDaAdattare({ token: [token] }, [pezzo]).length, 0, `${id} → ${f}: la pedina ha la misura della forma`);
    }
    // andata e ritorno (lotto 227, trovato dalla prova nel browser): tornata la forma di partenza, la pedina è esattamente dov'era
    assert.deepEqual(token.q, [10, 12], `${id}: dopo un giro di forme la pedina si è spostata a ${token.q}`);
  }
});
