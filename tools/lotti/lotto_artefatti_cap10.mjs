// Lotto 4 della ricognizione del 02/10 sera (docs/diff-manuali-2026-10-02-sera.md): catalogo del capitolo 10
// dell'Equipaggiamento 0.5 e §26 della Magia 1.3 (Google Doc del 02/10/2026).
// Legge le tabelle dal testo dei Doc salvato in docs/manuali-txt/, controlla i valori con il catalogo
// attuale e scrive data/equipaggiamento/artefatti.json e la sigla di reperibilità Epica in index.json:
// - §10.1 e §10.2: le 23 Batterie Mistiche con il supporto base (0,2 kg, Comune, PS 10, 3 PI), prezzo di
//   creazione; i TODO(Davide) di A.75 si chiudono;
// - §10.3 e Magia §26.4: le Batterie Matrice di Grado I–VI come oggetti (contenitore «matrice»: Matrice
//   d'origine da registrare sulla voce, ricarica automatica); le 4 configurazioni di Grado VII* (ricetta
//   speciale, nessuna fascia di potenza) solo nella tabella «fuori_scala»;
// - §10.4 e Magia §26.5: le 23 Schegge instabili (SnT 0, nessun Grado; contenitore «scheggia»);
// - §10.5–10.6 (Magia §26.6, Armamenti §7.24): Pietra della Vigilanza e Guanti da Combattimento Mistico.
// I 69 profili energetici del cap. 10 sono quindi oggetti del catalogo (65) più 4 profili fuori scala.
//   node tools/lotti/lotto_artefatti_cap10.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_artefatti_cap10.mjs --scrivi  → scrive i JSON
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const pulisci = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').trim();
const righe = readFileSync(new URL('docs/manuali-txt/equipaggiamento.md', R), 'utf8').split('\n');
const testoEq = righe.map(pulisci).join(' ').replace(/\s+/g, ' ');
const testoMag = pulisci(readFileSync(new URL('docs/manuali-txt/magia.md', R), 'utf8')).replace(/\s+/g, ' ');
const testoArm = pulisci(readFileSync(new URL('docs/manuali-txt/armamenti.md', R), 'utf8')).replace(/\s+/g, ' ');
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };
const frase = (testo, f, dove) => { verifica(testo.includes(f), `${dove}: «${f.slice(0, 50)}…»`); return f; };

/** Righe della prima tabella dopo il titolo «## **N …**»: [[celle]]. */
function tabella(titolo) {
  const i = righe.findIndex((r) => pulisci(r).replace(/^#+\s*/, '').startsWith(titolo));
  verifica(i >= 0, `titolo «${titolo}»`);
  const j = righe.findIndex((r, k) => k > i && r.startsWith('|'));
  const out = [];
  for (let k = j + 2; righe[k]?.startsWith('|'); k++) out.push(righe[k].split('|').slice(1, -1).map(pulisci));
  return out;
}
const numero = (s) => Number(String(s).replace(/\./g, ''));
const GRADI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const POTENZA = { 1: 'Comune', 2: 'Non Comune', 3: 'Rara', 4: 'Molto Rara', 5: 'Epica', 6: 'Leggendaria' };
const REP = { 'Molto Rara': 'MR', Leggendaria: 'LE', Epica: 'EP', Eccezionale: 'LE', Rara: 'RA' };
const ENERGIA = { Rosso: 'Rosso', Blu: 'Blu', Verde: 'Verde', Bianco: 'Bianco' };
const minuscolo = (s) => s.toLowerCase();

const p = new URL('data/equipaggiamento/artefatti.json', R);
const art = JSON.parse(readFileSync(p, 'utf8'));
const FONTE = 'Equipaggiamento 0.5 (Google Doc del 02/10/2026, 09:12 UTC)';
const SUPPORTO = frase(testoEq, 'Tutte le Batterie del campionario usano un contenitore base da 100 cr: peso 0,2 kg, Qualità Comune, PS Integrità 10 e 3 PI.', '§10.1');

// --- §10.2 Batterie Mistiche -------------------------------------------------------------------------
const t102 = tabella('10.2 Batterie Mistiche');
verifica(t102.length === 23, '§10.2: 23 profili');
for (const [colore, pm, gs, prezzo, creazione, rep] of t102) {
  const [g, snt] = gs.split('/').map((x) => x.trim());
  const id = `batteria-da-${pm}-pm-chroma-${minuscolo(colore)}`;
  const o = art.oggetti.find((x) => x.id === id);
  verifica(o, `${id}: nel catalogo`);
  verifica(o.costo === numero(prezzo), `${id}: prezzo ${prezzo}`);
  verifica(o.artefatto.sintonizzazione === Number(snt) && GRADI[g] === Number(snt), `${id}: Grado/SnT ${gs}`);
  verifica(o.artefatto.potenza === POTENZA[GRADI[g]], `${id}: potenza del Grado ${g}`);
  verifica(o.reperibilita === REP[rep], `${id}: REP ${rep}`);
  verifica(o.peso === 0.2 && o.qualita === 'Comune' && o.ps_int === 10 && o.pi === 3, `${id}: supporto base`);
  // A.75 (E&L del 02/10, decisione 16; Equipaggiamento §10.1): il supporto base vale per tutte
  delete o['TODO(Davide)'];
  o.creazione_cr = numero(creazione);
  o.paragrafo = 'Equipaggiamento §10.2; Magia §24.7';
  o.versione_manuale = FONTE;
}

// --- §10.3 Batterie Matrice -----------------------------------------------------------------------------
const t103 = tabella('10.3 Batterie Matrice');
verifica(t103.length === 23, '§10.3: 23 profili');
const NOTA_MATRICE = [
  frase(testoEq, 'Ogni voce richiede di registrare la Matrice d’origine.', '§10.3'),
  frase(testoEq, 'Entro la sua influenza recupera 2 PM/ora; presso un’altra Matrice dello stesso colore recupera 1 PM/ora.', '§10.3'),
  frase(testoEq, 'Nessuna ricarica automatica da colori diversi e nessun cumulo fra Matrici.', '§10.3'),
  frase(testoEq, 'Il recupero non richiede sintonizzazione, mentre l’uso della Batteria la richiede.', '§10.3'),
  SUPPORTO,
].join(' ');
const fuoriScala = [];
art.oggetti = art.oggetti.filter((o) => !o.id.startsWith('batteria-matrice-') && !o.id.startsWith('scheggia-instabile-'));
for (const [colore, pm, gs, prezzo, creazione, rep] of t103) {
  const [g, snt] = gs.split('/').map((x) => x.trim());
  const ordinaria = art.oggetti.find((x) => x.id === `batteria-da-${pm}-pm-chroma-${minuscolo(colore)}`);
  if (g === 'VII*') {
    verifica(creazione === 'Ricetta speciale' && rep === 'Eccezionale', `Matrice ${colore} ${pm}: ricetta speciale`);
    fuoriScala.push({ profilo: 'Batteria Matrice', energia: ENERGIA[colore], capacita_pm: Number(pm), grado: 'VII*', snt: Number(snt), prezzo_cr: numero(prezzo), creazione: creazione, reperibilita: rep });
    continue;
  }
  // Magia §26.4: Grado e SnT +1 rispetto alla Batteria Mistica ordinaria; la potenza segue il nuovo Grado
  verifica(ordinaria && ordinaria.artefatto.sintonizzazione + 1 === Number(snt), `Matrice ${colore} ${pm}: +1 Grado`);
  verifica(GRADI[g] === Number(snt), `Matrice ${colore} ${pm}: Grado = SnT`);
  art.oggetti.push({
    id: `batteria-matrice-da-${pm}-pm-chroma-${minuscolo(colore)}`,
    nome: `Batteria Matrice da ${pm} PM (Chroma ${colore})`,
    tipo: 'artefatto', catalogo: 'Commerciale', famiglia: 'Batterie e contenitori', nomi_alternativi: [],
    note_manuale: NOTA_MATRICE, paragrafo: 'Equipaggiamento §10.3; Magia §26.4', versione_manuale: FONTE,
    costo: numero(prezzo), creazione_cr: numero(creazione),
    artefatto: { tipologia: 'Batterie e contenitori', potenza: POTENZA[GRADI[g]], sintonizzazione: Number(snt), sintonizzabile: true, proprieta_attive: true, contenitore: { energia: ENERGIA[colore], capacita_pm: Number(pm), matrice: true } },
    proprieta: [], reperibilita: REP[rep], ...(rep === 'Eccezionale' ? { disponibilita_eccezionale: true } : {}),
    qualita: 'Comune', ps_int: 10, pi: 3, peso: 0.2,
  });
}
verifica(fuoriScala.length === 4, '§10.3: 4 configurazioni oltre il Grado VI');

// --- §10.4 Schegge instabili ------------------------------------------------------------------------------
const t104 = tabella('10.4 Schegge instabili');
verifica(t104.length === 23, '§10.4: 23 profili');
const NOTA_SCHEGGIA = [
  frase(testoEq, 'Le Schegge non hanno un Grado di Artefatto e non richiedono sintonizzazione: SnT 0 per tutte.', '§10.4'),
  frase(testoEq, 'Non si possono sommare più Schegge nello stesso lancio.', '§10.4'),
  frase(testoEq, 'Estrarre PM richiede Potere −2 VA per ogni gruppo di 3 PM o frazione.', '§10.4'),
  frase(testoEq, 'Tutte le Schegge instabili sono presentate con Qualità fisica Comune, PS Integrità 10, 1 PI e peso indicativo 0,05 kg per scheggia; questi dati fisici e la loro REP sono parametri iniziali di playtest.', '§10.1'),
].join(' ');
for (const [colore, pm, snt, prezzo, rep] of t104) {
  verifica(snt === '0', `Scheggia ${colore} ${pm}: SnT 0`);
  art.oggetti.push({
    id: `scheggia-instabile-da-${pm}-pm-chroma-${minuscolo(colore)}`,
    nome: `Scheggia instabile da ${pm} PM (Chroma ${colore})`,
    tipo: 'artefatto', catalogo: 'Commerciale', famiglia: 'Batterie e contenitori', nomi_alternativi: [],
    note_manuale: NOTA_SCHEGGIA, paragrafo: 'Equipaggiamento §10.4; Magia §26.5', versione_manuale: FONTE,
    costo: numero(prezzo),
    artefatto: { tipologia: 'Batterie e contenitori', sintonizzazione: 0, sintonizzabile: false, proprieta_attive: true, scheggia: true, contenitore: { energia: ENERGIA[colore], capacita_pm: Number(pm) } },
    proprieta: [], reperibilita: REP[rep], qualita: 'Comune', ps_int: 10, pi: 1, peso: 0.05,
  });
}

// --- §10.5 Pietra della Vigilanza (Magia §26.6.1) ---------------------------------------------------------
const PIETRA = 'La Pietra della Vigilanza è un Artefatto Mistico e una Batteria Mistica Verde da 10 PM. Possiede due proprietà attive Universali: Individuare 6 ed Esorcizzare Corruzione 6. Entrambe richiedono la sintonizzazione alla Pietra, ma non la conoscenza degli Incantesimi né una Prova di Potere per attivarle.';
frase(testoEq, PIETRA, '§10.5'); frase(testoMag, PIETRA, 'Magia §26.6.1');
frase(testoEq, 'Potenza Rara, Grado III, SnT 3 complessivi.', '§10.5');
frase(testoEq, 'Qualità fisica Non Comune, PS Integrità 12, 4 PI, peso 0,2 kg. Prezzo indicativo 4.000 cr; REP Molto Rara.', '§10.5');
art.oggetti = art.oggetti.filter((o) => !['pietra-della-vigilanza', 'guanti-da-combattimento-mistico'].includes(o.id));
art.oggetti.push({
  id: 'pietra-della-vigilanza', nome: 'Pietra della Vigilanza', tipo: 'artefatto', catalogo: 'Artefatti di campagna', famiglia: 'Artefatti', nomi_alternativi: [],
  note_manuale: [PIETRA,
    frase(testoEq, 'Riserva e alimentazione. I 10 PM sono condivisi fra le due proprietà e gli altri impieghi della Batteria.', '§10.5'),
    frase(testoEq, 'Può avere effetto una sola volta ogni 24 ore sul medesimo destinatario, considerando insieme tutti gli utilizzatori e le fonti.', '§10.5'),
    frase(testoEq, 'Prezzo e profilo fisico sono parametri di catalogo da verificare in playtest.', '§10.5')].join(' '),
  paragrafo: 'Equipaggiamento §10.5; Magia §26.6.1', versione_manuale: FONTE, costo: 4000,
  artefatto: {
    tipologia: 'Accessori', potenza: 'Rara', sintonizzazione: 3, sintonizzabile: true, proprieta_attive: true,
    contenitore: { energia: 'Verde', capacita_pm: 10, integrato: true, riserva: 'batteria', alimentazione: 'universale' },
    infusi: [{ incantesimo: 'Individuare', livello: 6 }, { incantesimo: 'Esorcizzare Corruzione', livello: 6 }],
  },
  proprieta: [], reperibilita: 'MR', qualita: 'Non comune', ps_int: 12, pi: 4, peso: 0.2,
});

// --- §10.6 Guanti da Combattimento Mistico (Armamenti §7.24, Magia §26.6.2) -----------------------------------
const PASSIVA = 'Conferiscono +1 VA alle Prove per colpire con i pugni e alle Prove per colpire in corpo a corpo richieste dagli Incantesimi.';
const ATTIVA = 'Spendendo 3 PM dalla riserva interna e 1 AzP, per 5 RND i danni dei pugni diventano Magici e ottengono +1 al danno.';
for (const [t, d] of [[testoEq, '§10.6'], [testoArm, 'Armamenti §7.24'], [testoMag, 'Magia §26.6.2']]) { frase(t, PASSIVA, d); frase(t, ATTIVA, d); }
frase(testoEq, 'Potenza Non Comune, Grado II, SnT 2 complessivi. Qualità fisica Non Comune, PS Integrità 12, 4 PI, peso complessivo 0,5 kg. Prezzo indicativo 3.000 cr; REP Molto Rara.', '§10.6');
art.oggetti.push({
  id: 'guanti-da-combattimento-mistico', nome: 'Guanti da Combattimento Mistico', tipo: 'artefatto', catalogo: 'Artefatti di campagna', famiglia: 'Artefatti', nomi_alternativi: [],
  note_manuale: [
    frase(testoEq, 'I Guanti da Combattimento Mistico sono una coppia di guanti e costituiscono un unico Artefatto Mistico da indossare sulle mani.', '§10.6'),
    PASSIVA, frase(testoEq, 'Il beneficio passivo funziona anche senza sintonizzazione.', '§10.6'),
    frase(testoEq, 'Riserva. Cariche Verdi da 10 PM, utilizzabili soltanto per alimentare i Guanti.', '§10.6'),
    ATTIVA, frase(testoEq, 'L’effetto non potenzia il danno degli Incantesimi e non si cumula con ulteriori attivazioni della stessa proprietà; una nuova attivazione rinnova la durata.', '§10.6'),
    frase(testoEq, 'Prezzo e profilo fisico sono parametri di catalogo da verificare in playtest.', '§10.6')].join(' '),
  paragrafo: 'Equipaggiamento §10.6; Armamenti §7.24; Magia §26.6.2', versione_manuale: FONTE, costo: 3000,
  // si indossano sulle mani: il beneficio passivo vale con i Guanti indossati, anche senza sintonizzazione
  indossabile: true,
  artefatto: {
    tipologia: 'Armi', potenza: 'Non Comune', sintonizzazione: 2, sintonizzabile: true, proprieta_attive: true,
    contenitore: { energia: 'Verde', capacita_pm: 10, integrato: true, riserva: 'cariche', alimentazione: 'esclusiva' },
  },
  effetti: [
    { tipo: 'attacco', attacchi: 'senz_armi', valore: 1, ambito: 'generale', condizione: PASSIVA, fonte: 'Armamenti §7.24' },
    { tipo: 'attacco', attacchi: 'contatto_incantesimi', valore: 1, ambito: 'generale', condizione: PASSIVA, fonte: 'Armamenti §7.24' },
  ],
  // attivazione Esclusiva: 3 PM dalle Cariche, 1 AzP, 5 RND; pugni Magici e +1 al danno (src/condizioni.js)
  attivazione_artefatto: { pm: 3, azione: '1 AzP', durata: '5 RND', attacchi: 'senz_armi', danno: 1, natura: 'Magico', condizione: ATTIVA, fonte: 'Armamenti §7.24' },
  proprieta: [], reperibilita: 'MR', qualita: 'Non comune', ps_int: 12, pi: 4, peso: 0.5,
});

art.fuori_scala = {
  _nota: 'Equipaggiamento §10.3: configurazioni oltre il Grado VI (VII*), «Ricetta speciale» e disponibilità eccezionale: non sono oggetti acquistabili né sintonizzabili con le fasce di potenza del §7.10; tabella di consultazione.',
  profili: fuoriScala,
};
art.versione_manuale = FONTE;
art.fonte = `${art.fonte}; capitolo 10 dell'Equipaggiamento 0.5 e Magia §26 (Doc del 02/10/2026; tools/lotti/lotto_artefatti_cap10.mjs)`;

// sigla di reperibilità Epica (§10.3: le Batterie Matrice colorate passano da Molto Rara a Epica)
const pi = new URL('data/equipaggiamento/index.json', R);
const ind = JSON.parse(readFileSync(pi, 'utf8'));
const EPICA = frase(testoMag, 'Le Batterie colorate passano da REP Molto Rara a Epica.', 'Magia §26.4');
const nuovaRep = {};
for (const [k, v] of Object.entries(ind.reperibilita)) {
  if (k === 'EP') continue;
  // E&L A.83 (03/10/2026): se la scala ha già EP con la decisione di Davide, si conserva (rieseguire il lotto non
  // rimette il TODO)
  if (k === 'LE') nuovaRep.EP = ind.reperibilita.EP ?? { nome: 'Epica', ricerca: 'Disponibilità stabilita dal Direttore di Gioco.', fonte: EPICA, 'TODO(Davide)': 'per-davide A.83: la REP Epica (Batterie Matrice colorate, Magia §26.4) ha una Prova di ricerca (Oratoria con quale penalità) o è come Leggendaria? Nel frattempo la disponibilità la stabilisce il Direttore, senza Prova.' };
  nuovaRep[k] = v;
}
ind.reperibilita = nuovaRep;

const conta = (f) => art.oggetti.filter(f).length;
console.log(`${controlli} controlli superati; Batterie Mistiche ${conta((o) => o.id.startsWith('batteria-da-'))}, Batterie Matrice ${conta((o) => o.id.startsWith('batteria-matrice-'))} (+${fuoriScala.length} fuori scala), Schegge ${conta((o) => o.id.startsWith('scheggia-instabile-'))}, Pietra e Guanti`);
if (process.argv.includes('--scrivi')) {
  writeFileSync(p, `${JSON.stringify(art, null, 2)}\n`);
  writeFileSync(pi, `${JSON.stringify(ind, null, 2)}\n`);
  console.log('scritti artefatti.json e index.json');
}
