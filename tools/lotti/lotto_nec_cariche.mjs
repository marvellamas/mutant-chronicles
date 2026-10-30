// Lotto 2 dei manuali del 27–28/10/2026 (lotto 146): celle d'arma, pacchi e trasformatori, sulle edizioni nuove
// (Equipaggiamento 0.22 §5.4, Armamenti 0.68 §7.20.5–7.20.6, registro «Revisione NEC» 2.7; docs/diff-manuali-2026-10-30.md).
// Le edizioni sono cambiate dopo il lotto 1 (0.13, 0.65, registro 1.6): ora i formati sono NEC da 1/3/5/10 cariche, pacchi
// da 20 e 30, CEC, MEC e BEC; le UE non si contano più al tavolo, si contano le cariche.
//
// Che cosa scrive:
//  - nec.json: i formati del §5.4.4 (NEC 1/3/5/10, pacchi 20 e 30, CEC, MEC, BEC, per Rosso, Blu e Verde) con peso, prezzi
//    (vuoto / carico / ricarica), Integrità e REP; i tre trasformatori del §5.4.7. Tolti Moduli, Banchi, contenitori,
//    stazioni (index.json → rif_sostituiti li manda a CEC e trasformatori: una riserva salvata resta «da convertire»);
//  - munizioni.json: le celle d'arma e i pacchi dei lanciafiamme in cariche (Rossi i lanciafiamme), senza Lx; il pacco del
//    Gehemmapuker; il caricatore da campo non c'è più (§7.20.5: trasformatori);
//  - corredi_dispositivi.json: i cinque moduli IAS (20 cariche, 10 cr per carica);
//  - esplorazione, strumenti_professionali, sanitario, dotazioni_personali: il NEC (o la CEC) di ogni dispositivo, dalle
//    nuove schede; scudi.json: lo Scudo Punisher Wächter (A.195, ora nel manuale);
//  - regole.json → nec: formati, tariffe, trasformatori, frasi del §5.4 nuovo; tolto il blocco lotto_2.
// Ogni numero è copiato dalle tabelle del manuale; ogni frase di nota è presa dal testo salvato (`dal`), e si ferma se non
// la trova. Un valore che il manuale non dà resta «da definire» (campo da_definire) ed è elencato dal lotto.
//
//   node tools/lotti/lotto_nec_cariche.mjs            prova a vuoto: dice che cosa cambierebbe
//   node tools/lotti/lotto_nec_cariche.mjs --scrivi   scrive
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const R = fileURLToPath(new URL('../../', import.meta.url));
const SCRIVI = process.argv.includes('--scrivi');
const EQ = `${R}data/equipaggiamento/`;
const leggi = (p) => JSON.parse(readFileSync(p, 'utf8'));
const scriviJson = (p, x) => { if (SCRIVI) writeFileSync(p, `${JSON.stringify(x, null, 2)}\n`); };
const VERS_EQ = 'Equipaggiamento 0.22';
const VERS_AR = 'Armamenti 0.68';
const da_definire_elenco = [];

// --- testi dei manuali ------------------------------------------------------------------------------------------
const pulisci = (s) => s.replace(/\s+/g, ' ').trim();
const manuale = Object.fromEntries(['equipaggiamento', 'armamenti', 'revisione-nec'].map((m) => [m, readFileSync(`${R}docs/manuali-txt/${m}.md`, 'utf8').split('\n').map(pulisci).filter(Boolean)]));
const frasiDi = (riga) => riga.split(/(?<=\.)\s+(?=[A-ZÀ-Ý«(0-9])/);
/** La frase del manuale che contiene `frase` (esattamente una, anche se ripetuta uguale): errore se manca. */
function dal(m, frase) {
  const trovate = [...new Set(manuale[m].flatMap((x) => (x.includes(frase) ? frasiDi(x).filter((f) => f.includes(frase)) : [])))];
  if (trovate.length !== 1) throw new Error(`${m}: «${frase}» trovata ${trovate.length} volte`);
  return trovate[0];
}
const eq = (f) => dal('equipaggiamento', f);
const ar = (f) => dal('armamenti', f);

// --- 1. i formati degli accumulatori (Equipaggiamento 0.22, §5.4.4 e §5.4.5) --------------------------------------
const COLORI = ['Rosso', 'Blu', 'Verde'];
const TARIFFE = { nec: 10, cec: 10, mec: 30, bec: 50 }; // cr per carica (§5.4.4)
// id esistenti riusati per i formati che c'erano già con un altro nome (i file salvati li citano)
const ID_ESISTENTI = { 'nec1:Verde': 'verde-compatto', 'nec3:Verde': 'verde-standard', 'nec5:Rosso': 'rosso-standard', 'nec5:Blu': 'blu-standard' };
// i nomi di prima dei quattro id riusati (le schede e i cataloghi li citano)
const ALTERNATIVI = { 'verde-compatto': ['Cella Verde compatta'], 'rosso-standard': ['Cella Rossa standard', 'Cartuccia di combustibile'], 'blu-standard': ['Cella Blu standard'], 'verde-standard': ['Cella Verde standard'] };
const FORMATI = [
  { f: 'nec1', nome: 'NEC # 1', classe: 'nec', cariche: 1, peso: 0.1, vuoto: 30, pieno: 40, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 0.1 },
  { f: 'nec3', nome: 'NEC # 3', classe: 'nec', cariche: 3, peso: 0.1, vuoto: 90, pieno: 120, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 0.3 },
  { f: 'nec5', nome: 'NEC # 5', classe: 'nec', cariche: 5, peso: 0.1, vuoto: 150, pieno: 200, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 0.5 },
  { f: 'nec10', nome: 'NEC # 10', classe: 'nec', cariche: 10, peso: 0.15, vuoto: 300, pieno: 400, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 1 },
  { f: 'pacco20', nome: 'Pacco # 20 cariche (2 NEC 10)', classe: 'nec', cariche: 20, peso: 0.3, vuoto: 600, pieno: 800, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 2 },
  { f: 'pacco30', nome: 'Pacco # 30 cariche (3 NEC 10)', classe: 'nec', cariche: 30, peso: 0.45, vuoto: 900, pieno: 1200, rep: 'CO', pi: 2, q: 'Comune', ps: 10, ue: 3 },
  { f: 'cec', nome: 'CEC #', classe: 'cec', cariche: 10, peso: 5, vuoto: 900, pieno: 1000, rep: 'CO', pi: 6, q: 'Comune', ps: 10, ue_carica: 10 },
  { f: 'mec', nome: 'MEC #', classe: 'mec', cariche: 10, peso: 100, vuoto: 2700, pieno: 3000, rep: 'NC', pi: 12, q: 'Non comune', ps: 12, ue_carica: 100 },
  { f: 'bec', nome: 'BEC #', classe: 'bec', cariche: 10, peso: 500, vuoto: 4500, pieno: 5000, rep: 'RA', pi: 20, q: 'Rara', ps: 14, ue_carica: 1000 },
];
const nota42 = [
  eq('Prezzi uguali per Rosso, Blu e Verde.'),
  eq('Pesi comprensivi di contenitore e connettori'),
  eq('NEC e pacco personale completo: Qualità Comune, PS Integrità 10, 2 PI'),
];
function accumulatori() {
  const out = [];
  for (const F of FORMATI) {
    for (const c of COLORI) {
      const idE = ID_ESISTENTI[`${F.f}:${c}`];
      const nome = F.nome.replace('#', c);
      const id = idE ?? `${F.f.startsWith('pacco') ? 'pacco-' : F.f === 'nec10' || F.f.startsWith('nec') ? 'nec-' : ''}${F.f.replace(/^nec|^pacco/, (x) => (x === 'nec' ? '' : ''))}`;
      const idNuovo = idE ?? (F.classe === 'nec' ? (F.f.startsWith('pacco') ? `pacco-${F.cariche}-${c.toLowerCase()}` : `nec-${c.toLowerCase()}-${F.cariche}`) : `${F.f}-${c.toLowerCase()}`);
      void id;
      const ordinaria = (F.f === 'nec1' || F.f === 'nec3') && c === 'Verde';
      out.push({
        id: idNuovo, nome, tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Accumulatori cromatici', nomi_alternativi: ALTERNATIVI[idNuovo] ?? [],
        note_manuale: [
          ordinaria ? eq('Per l’elettronica ordinaria, «Verde compatto» diventa NEC Verde 1 e «Verde standard» NEC Verde 3.') : null,
          F.classe === 'nec' ? nota42.join(' ') : [nota42[0], nota42[1], eq('CEC: Comune, PS 10, 6 PI')].join(' '),
        ].filter(Boolean).join(' '),
        paragrafo: '§5.4.4', versione_manuale: VERS_EQ, peso: F.peso, reperibilita: F.rep, costo: F.pieno, costo_vuoto: F.vuoto,
        pi: F.pi, qualita: F.q, ps_int: F.ps,
        nec: { colore: c, formato: F.f, capacita_cariche: F.cariche, ...(ordinaria ? { uso: 'elettronica_ordinaria' } : {}) },
        ricarica_costo: F.cariche * TARIFFE[F.classe], proprieta: [],
      });
    }
  }
  return out;
}

// --- 2. i trasformatori (§5.4.6, §5.4.7; Armamenti §7.20.5) ----------------------------------------------------------
const TRASF = [
  { id: 'trasformatore-portatile-monocromatico', nome: 'Trasformatore portatile monocromatico', cr: 3000, comp: 1800, kg: 2, pi: 4, q: 'Non comune', ps: 12, rep: 'NC', colori: 1, min: 60, tipo: 'portatile', con: 'con una CEC 7 kg' },
  { id: 'trasformatore-portatile-multicromatico', nome: 'Trasformatore portatile multicromatico', cr: 6000, comp: 3600, kg: 4, pi: 6, q: 'Non comune', ps: 12, rep: 'RA', colori: 3, min: 60, tipo: 'portatile', con: 'con tre CEC 19 kg' },
  { id: 'stazione-industriale-multicromatica', nome: 'Stazione industriale multicromatica', cr: 20000, comp: 12000, kg: 40, pi: 12, q: 'Rara', ps: 14, rep: 'RA', colori: 3, min: 10, tipo: 'industriale', con: null },
];
function trasformatori() {
  const frasi = [
    eq('Il trasformatore personale è alimentato da una CEC dello stesso colore.'),
    eq('Il prelievo è consentito soltanto se nel tampone entra l’intera carica sorgente.'),
    eq('Il trasformatore portatile ripristina una carica all’ora.'),
  ].join(' ');
  return TRASF.map((t) => ({
    id: t.id, nome: t.nome, tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Trasformatori', nomi_alternativi: [],
    note_manuale: `${frasi} ${eq('Un Tecnico o un Tecnomante può costruire il trasformatore')}`,
    paragrafo: '§5.4.7', versione_manuale: VERS_EQ, peso: t.kg, reperibilita: t.rep, costo: t.cr, componenti_cr: t.comp,
    pi: t.pi, qualita: t.q, ps_int: t.ps,
    trasformatore: { tampone: 100, colori: t.colori, minuti_per_carica: t.min, impianto: t.tipo, prelievo_ue: 10 },
    proprieta: [],
  }));
}

// --- 3. celle d'arma e pacchi dei lanciafiamme (Armamenti 0.68 §7.20.5–7.20.6) --------------------------------------------
const CELLE = {
  'cella-ravvicinata-comune': { nome: 'Cella ravvicinata comune', capacita: 5, unita: 'cariche', pieno: 200, ric: 50, peso: 0.1, rep: 'CO', formato: 'NEC 5', colore: 'Rosso (Plasma, Fuoco) o Blu (Elettricità, Concussivo)', colori: ['Rosso', 'Blu'] },
  'cella-del-fucile-al-plasma-commerciale': { nome: 'Cella del fucile al plasma commerciale', capacita: 20, unita: 'colpi', pieno: 800, ric: 200, peso: 0.3, rep: 'RA', formato: '2 NEC 10 (pacco da 20)', colore: 'Rosso', colori: ['Rosso'] },
  'cella-hellblazer': { nome: 'Cella Hellblazer', capacita: 30, unita: 'colpi', pieno: 1200, ric: 300, peso: 0.45, rep: 'RA', formato: '3 NEC 10 (pacco da 30)', colore: 'Rosso', colori: ['Rosso'] },
  'cella-kep-808': { nome: 'Cella KEP 808', capacita: 10, unita: 'colpi', pieno: 400, ric: 100, peso: 0.15, rep: 'RA', formato: '1 NEC 10', colore: 'Rosso', colori: ['Rosso'] },
  'cella-intruder': { nome: 'Cella Intruder', capacita: 30, unita: 'colpi', pieno: 1200, ric: 300, peso: 0.45, rep: 'RA', formato: '3 NEC 10 (pacco da 30)', colore: 'Rosso', colori: ['Rosso'] },
};
const PACCHI = {
  'pacco-nec-nemesis-214': { nome: 'Pacco NEC Rosso Nemesis 214', capacita: 5, pieno: 200, ric: 50, peso: 0.1, formato: 'NEC 5' },
  'pacco-nec-lanciafiamme-commerciale': { nome: 'Pacco NEC Rosso del lanciafiamme commerciale', capacita: 10, pieno: 400, ric: 100, peso: 0.15, formato: 'NEC 10' },
  'pacco-nec-eruptor': { nome: 'Pacco NEC Rosso Eruptor', capacita: 10, pieno: 400, ric: 100, peso: 0.15, formato: 'NEC 10' },
  'pacco-nec-purifier': { nome: 'Pacco NEC Rosso Purifier', capacita: 15, pieno: 600, ric: 150, peso: null, formato: null },
  'pacco-nec-gehemmapuker': { nome: 'Pacco NEC Rosso Gehemmapuker', capacita: 50, pieno: 2100, ric: 500, peso: null, formato: null, nuovo: true },
};
function munizioni(mu) {
  const frCella = [
    ar('La cella ravvicinata contiene cinque cariche, pesa 100 g ed è Rossa per Plasma o Fuoco, Blu per Elettricità o Concussivo.'),
    ar('I pacchi riuniscono accumulatori dello stesso colore utilizzati in successione e hanno un solo contatore e un solo valore di Integrità: Comune, PS 10, 2 PI.'),
    ar('Il prezzo dell’arma completa è invariato e comprende il primo accumulatore o pacco pieno.'),
    ar('Per le armi a energia a distanza ogni colpo sparato consuma una carica anche se manca il bersaglio.'),
    ar('Sostituire una cella compatibile già pronta richiede 1 AzP, senza Prova, disponendo delle mani necessarie.'),
    ar('Ricaricare richiede un trasformatore dedicato e una fonte dello stesso colore oppure una stazione industriale'),
  ].join(' ');
  const frPacco = [
    ar('I lanciafiamme sono emettitori termici alimentati da NEC Rossi: non impiegano combustibile liquido.'),
    ar('Un getto consuma una carica.'),
    ar('Ogni attacco consuma una carica anche se manca il bersaglio.'),
    ar('AC 1d3 non moltiplica il consumo.'),
    ar('Sostituire un pacco compatibile pronto richiede 1 AzP, entrambe le mani e nessuna Prova.'),
  ].join(' ');
  const per = new Map(mu.oggetti.map((o) => [o.id, o]));
  for (const [id, c] of Object.entries(CELLE)) {
    const o = per.get(id);
    if (!o) throw new Error(`manca ${id}`);
    Object.assign(o, {
      nome: c.nome, note_manuale: `${frCella} Accumulatore: ${c.formato}, ${c.colore}.`, versione_manuale: VERS_AR, costo: c.pieno, peso: c.peso, reperibilita: c.rep,
      pi: 2, qualita: 'Comune', ps_int: 10, cella: { capacita: c.capacita, unita: c.unita, ricarica_costo: c.ric }, accumulatore: { formato: c.formato, colore: c.colore, colori: c.colori, ricarica_costo: c.ric },
    });
  }
  for (const [id, p] of Object.entries(PACCHI)) {
    let o = per.get(id);
    if (!o && p.nuovo) {
      o = { id, nome: p.nome, tipo: 'munizioni', catalogo: 'Alleanza', famiglia: 'Celle energetiche', nomi_alternativi: [], paragrafo: '§7.20.6', compatibile_con: ['armi_distanza_corporative:gehemmapuker'], proprieta: [] };
      mu.oggetti.push(o);
    }
    if (!o) throw new Error(`manca ${id}`);
    const mancanti = [];
    if (p.peso === null) mancanti.push('peso');
    if (p.formato === null) mancanti.push('formato standard: il raccordo dei pacchi da 15 e 50 getti ai formati standard resta da completare (Armamenti 0.68, §7.20.5)');
    Object.assign(o, {
      nome: p.nome, note_manuale: `${frPacco}${id === 'pacco-nec-gehemmapuker' ? ` ${ar('Il pacco dedicato del Gehemmapuker contiene cinquanta cariche; non è un Modulo generico da dieci UE.')}` : ''}`,
      versione_manuale: VERS_AR, paragrafo: '§7.20.6', costo: p.pieno, cella: { capacita: p.capacita, unita: 'getti', ricarica_costo: p.ric },
      accumulatore: { formato: p.formato ?? 'da definire', colore: 'Rosso', colori: ['Rosso'], ricarica_costo: p.ric },
    });
    if (p.peso !== null) o.peso = p.peso; else delete o.peso;
    if (p.formato !== null) { Object.assign(o, { pi: 2, qualita: 'Comune', ps_int: 10 }); } else { delete o.pi; delete o.qualita; delete o.ps_int; }
    if (mancanti.length) o.da_definire = mancanti; else delete o.da_definire;
    if (mancanti.length) da_definire_elenco.push(`${p.nome}: ${mancanti.join('; ')}`);
  }
  mu.oggetti = mu.oggetti.filter((o) => o.id !== 'caricatore-da-campo');
  // la ricarica: il blocco `ricarica` resta (munizioni): niente Lx nelle note di regola
  mu.versione_manuale = VERS_AR;
  return mu;
}

// --- 4. IAS (Armamenti 0.68 §7.15.4) ------------------------------------------------------------------------------------
function ias(cd) {
  const testo = `${ar('Il NEC Blu nel formato specialistico IAS contiene 20 cariche tecnologiche.')} ${ar('Una cella di ricambio carica costa 1.000 cr; il servizio di ricarica costa 10 cr per carica, 200 cr da vuota.')} ${ar('Occorrono venti ore con trasformatore portatile o tre ore e venti minuti con stazione industriale.')} Raccordo ai formati standard: da completare.`;
  let n = 0;
  for (const o of cd.oggetti) {
    if (!/^(ias\d+|smorzatore-acustico-silent)/.test(o.id) || !o.alimentazione) continue;
    const a = o.alimentazione;
    a.descrizione = testo;
    delete a.lx_per_uso;
    a.usi = 20;
    a.da_definire = ['raccordo ai formati standard (Armamenti 0.68: «resta da completare»)'];
    n += 1;
  }
  if (n !== 5) throw new Error(`IAS: ${n} voci invece di 5`);
  da_definire_elenco.push('Moduli IAS (5): raccordo dell’accumulatore specialistico ai formati standard');
  return cd;
}

// --- 5. dispositivi che usano un NEC o una CEC (Equipaggiamento 0.22 §3.2, §3.8, §5.4.8, §6.8) -------------------------------
function dispositivi(file) {
  const per = (f) => new Map(file[f].oggetti.map((o) => [o.id, o]));
  const es = per('esplorazione'); const sp = per('strumenti_professionali'); const sa = per('sanitario'); const dp = per('dotazioni_personali');
  const set = (o, a) => { if (!o) throw new Error('voce mancante'); o.alimentazione = a; };
  set(es.get('corredo-da-cucina-da-campo'), { nec: 'nec:nec-rosso-10', usi: 10, unita_usi: 'cariche (preparazioni)', paragrafo: '§3.2' });
  set(es.get('verricello-portatile-chroma'), { nec: 'nec:rosso-standard', usi: 5, unita_usi: 'cariche (sessioni da un’ora)', unita_precedente: 'ore', paragrafo: '§5.4.8' });
  set(sp.get('utensile-laser-da-taglio-e-saldatura'), { nec: 'nec:rosso-standard', usi: 5, unita_usi: 'cariche (sessioni da un’ora)', unita_precedente: 'ore', paragrafo: '§5.4.8' });
  set(es.get('tuta-extraveicolare') ?? dp.get('tuta-extraveicolare'), { nec: 'nec:nec-verde-10', usi: 10, unita_usi: 'cariche (impieghi da 4 ore)', unita_precedente: 'ore', paragrafo: '§5.4.8' });
  set(es.get('riparo-pressurizzato') ?? dp.get('riparo-pressurizzato'), { nec: 'nec:nec-verde-10', usi: 10, unita_usi: 'cariche (impieghi da 2 ore)', unita_precedente: 'ore', paragrafo: '§5.4.8' });
  for (const id of ['postazione-di-lavoro-specializzata', 'laboratorio-da-campo-specializzato']) set(sp.get(id), { nec: 'nec:cec-rosso', usi: 10, unita_usi: 'cariche (sessioni da 5 ore)', esterna: true, paragrafo: '§5.4.8' });
  set(sa.get('postazione-medica-da-campo'), { nec: 'nec:cec-rosso', usi: 10, unita_usi: 'cariche (sessioni da 5 ore)', esterna: true, paragrafo: '§5.4.8' });
  for (const o of file.sanitario.oggetti) {
    if (!Array.isArray(o.alimentazione) || !/^postazione-(semiautomatica|automatica)/.test(o.id)) continue;
    // §6.8.3: le operazioni sono cariche Rosse; §6.8.5: i giorni di degenza o stasi sono cariche Verdi
    o.alimentazione = o.alimentazione.map((a) => (a.paragrafo === '§6.8.3'
      ? { ...a, nec: 'nec:cec-rosso', unita_usi: 'cariche Rosse (operazioni)' }
      : { ...a, nec: 'nec:cec-verde', unita_usi: 'cariche Verdi (giorni di degenza o stasi)' }));
  }
}

// --- 6. Wächter (Armamenti 0.68 §7.4.1, registro 2.7) -------------------------------------------------------------------
function wachter(scudi) {
  const base = scudi.oggetti.find((o) => o.id === 'scudo-punisher');
  if (!base) throw new Error('manca lo Scudo Punisher');
  const testo = [
    ar('Variante tecnologica del Punisher dell’Alleanza, dotata di un generatore energetico portatile.'),
    ar('Lo scudo non possiede proprietà magiche, non usa PM e non richiede Sintonizzazione.'),
    ar('Nessuna penalità propria al MOV.'),
    'Barriera personale: 1 AzP, senza Prova, 1 carica, 15 ScE, frontale e mobile, durata massima 3 Round. Cupola protettiva: 1 AzP, senza Prova, 3 cariche contemporaneamente, 30 ScE condivisi, semisfera a 360° di raggio 1 Q, portatore fermo, durata massima 3 Round (Armamenti 0.68, §7.4.1).',
    ar('Gli ScE non si rigenerano durante l’utilizzo e non si sommano fra attivazioni.'),
    ar('Le cariche sono consumate all’attivazione: spegnimento anticipato, ScE avanzati o interruzione non le restituiscono.'),
    ar('Il generatore contiene un accumulatore NEC Blu da tre cariche complessive.'),
    ar('Wächter completo: 12.000 cr, Reperibilità Molto rara.'),
    ar('Conversione di un Punisher compatibile già posseduto: 6.000 cr, compresi montaggio in officina e primo NEC Blu da tre cariche pieno.'),
  ].join(' ');
  const w = {
    ...structuredClone(base), id: 'scudo-punisher-wachter', nome: 'Scudo Punisher Wächter', note_manuale: testo, versione_manuale: VERS_AR, paragrafo: '§7.4.1',
    qualita: 'Rara', ps_int: 14, pi: 8, reperibilita: 'MR', costo: 12000, costo_conversione: 6000,
    alimentazione: { nec: 'nec:nec-blu-3', usi: 3, unita_usi: 'cariche Blu (barriera 1, cupola 3)', paragrafo: '§7.4.1' },
  };
  const ia = scudi.oggetti.findIndex((o) => o.id === w.id);
  if (ia >= 0) scudi.oggetti[ia] = w; else scudi.oggetti.push(w);
  return scudi;
}

// --- 7. regole.json → nec e index.json → rif_sostituiti -----------------------------------------------------------------
function regole(rg) {
  const N = rg.nec;
  N.paragrafo = 'Equipaggiamento §5.4';
  N.unita = 'carica';
  N.formati = {
    nec: { cariche: [1, 3, 5, 10], ue: [0.1, 0.3, 0.5, 1], tariffa_cr_per_carica: 10 },
    cec: { cariche: 10, ue_per_carica: 10, tariffa_cr_per_carica: 10 },
    mec: { cariche: 10, ue_per_carica: 100, tariffa_cr_per_carica: 30 },
    bec: { cariche: 10, ue_per_carica: 1000, tariffa_cr_per_carica: 50 },
  };
  N.tariffe_cr_per_carica = TARIFFE;
  N.trasformatori = {
    tampone: 100, prelievo_formato: 'cec', prelievo_cariche: 1, prelievo_ue: 10, minuti_per_carica: { portatile: 60, industriale: 10 },
    regola: eq('Il prelievo è consentito soltanto se nel tampone entra l’intera carica sorgente.'),
    esempio: 'Prelievo di una carica CEC Blu, poi ricarica di 3 + 5 cariche NEC: tampone 92, otto ore con il portatile o ottanta minuti con la stazione industriale (Equipaggiamento §5.4.6).',
    senza_trasformatore: 'Senza un trasformatore o una stazione industriale non si travasa energia fra accumulatori (A.67, decisione 76): un caricatore generico, i PM personali e la sola vicinanza a una Matrice non bastano (§5.4.6).',
  };
  N.passi_tavolo = { ore: N.passi_tavolo.ore, usi: N.passi_tavolo.usi, cariche: [1] };
  N.da_convertire = {
    domanda: 'A.193', testo: 'riserva da convertire (A.193)',
    spiegazione: 'La riserva salvata è in Lx, in UE o in ore e il manuale ora la conta in cariche; l’equivalenza non è definita. Il valore resta nel file e si converte dopo la risposta di Davide (A.193). Una riserva salvata piena si ritrova piena.',
  };
  N.frasi = [
    dal('equipaggiamento', 'NEC, CEC, MEC e BEC sono accumulatori cromatici.'),
    dal('equipaggiamento', '1 UE ripristina 10 cariche NEC.'),
    dal('equipaggiamento', 'Torce, comunicatori personali, mirini, visori, sensori, elettronica degli elmetti e diagnostica portatile ordinaria non richiedono conteggi energetici.'),
    dal('equipaggiamento', 'Il trasformatore personale è alimentato da una CEC dello stesso colore.'),
    dal('equipaggiamento', 'Il prelievo è consentito soltanto se nel tampone entra l’intera carica sorgente.'),
    dal('equipaggiamento', 'I NEC tecnologici non richiedono Sintonizzazione.'),
  ];
  delete N.formati_ue; delete N.tariffa_cr_per_ue; delete N.cariche_per_ue; delete N.lotto_2;
  N._nota = 'Equipaggiamento 0.22, §5.4 (30/10/2026, lotto 146; registro Revisione NEC 2.7): accumulatori NEC, CEC, MEC e BEC, cariche e non UE al tavolo; trasformatori con tampone da 100 cariche NEC; l’elettronica personale ordinaria non si conta («alimentazione.ordinaria»). Le UE restano in `ue`/`ue_per_carica` come dimensionamento. Il lotto 2 (celle e pacchi d’arma, IAS, trasformatori) è chiuso: restano «da definire» i valori elencati nei dati (campo da_definire).';
  return rg;
}
function indice(ix) {
  const m = ix.rif_sostituiti;
  for (const c of COLORI) {
    const k = c.toLowerCase();
    m[`nec:modulo-${k}`] = { rif: `nec:cec-${k}` };
    m[`nec:banco-${k}`] = { rif: `nec:cec-${k}` };
  }
  m['nec:modulo-blu'] = { rif: 'munizioni:pacco-nec-gehemmapuker' };
  // il pacco del Gehemmapuker ora è una voce del catalogo (non più il Modulo Blu): il serbatoio vuoto di prima vi rimanda
  delete m['munizioni:pacco-nec-gehemmapuker'];
  m['munizioni:serbatoio-vuoto-gehemmapuker'] = { rif: 'munizioni:pacco-nec-gehemmapuker' };
  m['munizioni:caricatore-da-campo'] = { rif: 'nec:trasformatore-portatile-monocromatico' };
  m['nec:stazione-per-moduli'] = { rif: 'nec:stazione-industriale-multicromatica' };
  m['nec:stazione-per-banchi'] = { rif: 'nec:stazione-industriale-multicromatica' };
  return ix;
}


// --- 8. le note dei dispositivi, con le frasi del manuale nuovo (Equipaggiamento 0.22 §3.2, §3.6, §3.8, §5.9, §6.8) ----------
/** Sostituisce nella nota di una voce un pezzo vecchio con testo del manuale; non fa nulla se è già stato fatto. */
function nota(file, fileId, id, vecchio, nuovo) {
  const o = file[fileId].oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`manca ${fileId}:${id}`);
  if (o.note_manuale.includes(nuovo)) return;
  if (!o.note_manuale.includes(vecchio)) throw new Error(`${fileId}:${id}: manca «${vecchio.slice(0, 60)}»`);
  o.note_manuale = o.note_manuale.replace(vecchio, () => nuovo);
}
function ritocchi(file) {
  nota(file, 'esplorazione', 'corredo-da-cucina-da-campo', 'Primo NEC Rosso standard compreso; dieci preparazioni da 30 minuti. Il fornello dispone di dieci preparazioni ordinarie, ciascuna di 30 minuti e fino a quattro persone. Si segnano soltanto le preparazioni rimaste.',
    [eq('Il fornello usa un NEC Rosso 10.'), eq('Ogni preparazione consuma all’avvio una carica'), eq('Oltre trenta minuti serve un’altra carica.'), eq('Dieci cariche offrono dieci preparazioni ordinarie')].join(' '));
  nota(file, 'esplorazione', 'verricello-portatile-chroma', 'Il freno mantiene il carico senza energia. Sostituzione della cella: 1 AzP. La riserva offre cinque ore effettive di movimento; mantenere fermo il carico non consuma autonomia.',
    [eq('Una carica copre una sessione fino a un’ora; cinque cariche offrono fino a cinque ore complessive'), eq('Più sollevamenti nella stessa operazione entro un’ora condividono la carica.'), eq('Il freno mantiene il carico fermo senza energia, anche dopo la sessione.')].join(' '));
  nota(file, 'esplorazione', 'tuta-extraveicolare', 'Il NEC Verde dedicato offre 40 ore di funzionamento complessivo, senza ricalcolare il consumo spegnendo una singola funzione.', eq('Il NEC Verde 10 incluso carico offre dieci cariche'));
  nota(file, 'esplorazione', 'riparo-pressurizzato', 'un NEC Verde standard carico', 'un NEC Verde 10 carico');
  nota(file, 'esplorazione', 'riparo-pressurizzato', 'Il NEC Verde dedicato alimenta il riparo per 20 ore, indipendentemente dal numero degli occupanti.', eq('Il NEC Verde 10 offre dieci cariche'));
  nota(file, 'strumenti_professionali', 'utensile-laser-da-taglio-e-saldatura', 'Ricambio carico 50 cr; sostituzione con ricambio accessibile 1 AzP; ricarica completa un’ora e 5 cr con fonte adeguata (§5.4).', eq('Ricambio carico 200 cr, 100 g; sostituzione con ricambio accessibile 1 AzP.'));
  nota(file, 'strumenti_professionali', 'utensile-laser-da-taglio-e-saldatura', 'Comprende NEC Rosso standard carico, cavo e alimentatore: 5 ore effettive di lavoro anche non consecutive, registrate come unico contatore energetico.',
    [eq('Comprende NEC Rosso 5 carico, cavo e alimentatore.'), eq('Una carica copre una sessione di lavoro fino a un’ora'), eq('Tagliare tre componenti e poi saldarli nello stesso lavoro entro un’ora consuma una sola carica.')].join(' '));
  const campo = eq('Usa una rete adeguata oppure una CEC Rossa esterna');
  nota(file, 'strumenti_professionali', 'postazione-di-lavoro-specializzata', 'Una rete adeguata o un Modulo Rosso esterno da 10 UER la alimentano: il Modulo offre cinque ore di lavoro e si acquista separatamente. Si annota l’autonomia; 2 UER ripristinano un’ora.', `${campo} ${eq('La postazione costa 6.000 cr e pesa 40 kg')}`);
  nota(file, 'strumenti_professionali', 'laboratorio-da-campo-specializzato', 'Un Modulo Rosso esterno da 10 UER offre cinque ore di lavoro e si acquista separatamente. Si annota l’autonomia; 2 UER ripristinano un’ora.', `${campo} ${eq('Il laboratorio costa 12.000 cr e pesa 60 kg')}`);
  nota(file, 'sanitario', 'postazione-medica-da-campo', 'oppure Modulo Rosso separato: cinque ore di lavoro con un Modulo da 10 UER. Si annota l’autonomia; 2 UER ripristinano un’ora.',
    `oppure CEC Rossa esterna, facoltativa e acquistata separatamente. ${eq('Una carica copre una sessione fino a cinque ore; dieci cariche offrono fino a cinquanta ore complessive (§5.4.8).')} ${eq('La postazione costa 28.000 cr; con una CEC carica, 29.000 cr.')} ${eq('La CEC aggiunge 5 kg al peso dell’apparecchiatura.')}`);
  nota(file, 'armi_corporative', 'katana-ryujin', 'Il prezzo comprende una cella ravvicinata comune NEC Blu da 250 Lx, carica: 5 attivazioni da 50 Lx.', ar('Il prezzo dell’arma completa è invariato e comprende il primo accumulatore o pacco pieno.'));
  // i lanciafiamme usano pacchi NEC Rossi (§7.20.6)
  for (const f of ['armi_distanza', 'armi_distanza_corporative']) for (const o of file[f].oggetti) if (o.note_manuale) o.note_manuale = o.note_manuale.replace(/pacco NEC Blu/g, 'pacco NEC Rosso').replace(/Pacco NEC Blu/g, 'Pacco NEC Rosso');
  // «Verde compatto» e «Verde standard» sono NEC Verde 1 e NEC Verde 3 (§5.4.3)
  for (const f of ['accessori_armi', 'comunicazione', 'corredi_dispositivi', 'esplorazione', 'rinforzi', 'sanitario', 'strumenti_professionali']) {
    for (const o of file[f].oggetti) {
      if (!o.note_manuale) continue;
      o.note_manuale = o.note_manuale.replace(/NEC Verde compatto/g, 'NEC Verde 1').replace(/NEC Verde standard/g, 'NEC Verde 3').replace(/(un|solo un|un solo) Verde compatto/g, '$1 NEC Verde 1').replace(/(un|solo un|un solo) Verde standard/g, '$1 NEC Verde 3');
    }
  }
}

// --- esecuzione ------------------------------------------------------------------------------------------------------------
const file = {};
for (const f of ['nec', 'munizioni', 'corredi_dispositivi', 'esplorazione', 'strumenti_professionali', 'sanitario', 'dotazioni_personali', 'scudi', 'index', 'accessori_armi', 'comunicazione', 'rinforzi', 'armi_corporative', 'armi_distanza', 'armi_distanza_corporative']) file[f] = leggi(`${EQ}${f}.json`);
const rg = leggi(`${R}data/regole.json`);

const nuovi = [...accumulatori(), ...trasformatori()];
file.nec.oggetti = nuovi;
file.nec.versione_manuale = VERS_EQ;
file.nec.fonte = 'Manuale dell’Equipaggiamento 0.22, §5.4 Accumulatori cromatici (Google Doc del 29/10/2026); registro «Revisione NEC» 2.7';
file.nec._nota = 'Formati del §5.4.4 e trasformatori del §5.4.7 dell’Equipaggiamento 0.22 (tools/lotti/lotto_nec_cariche.mjs, 30/10/2026). «nec»: colore, formato (nec1, nec3, nec5, nec10, pacco20, pacco30, cec, mec, bec), capacita_cariche e, per l’elettronica ordinaria, uso «elettronica_ordinaria» (ricambio senza conteggio, §5.4.3); «ricarica_costo»: ricarica completa a 10 cr per carica NEC e CEC, 30 MEC, 50 BEC; «costo»: carico; «costo_vuoto». «trasformatore»: tampone da 100 cariche NEC, minuti per carica. Moduli, Banchi, contenitori e stazioni non ci sono più (index.json → rif_sostituiti).';
munizioni(file.munizioni);
ias(file.corredi_dispositivi);
dispositivi(file);
wachter(file.scudi);
ritocchi(file);
regole(rg);
indice(file.index);

for (const [f, x] of Object.entries(file)) scriviJson(`${EQ}${f}.json`, x);
scriviJson(`${R}data/regole.json`, rg);
console.log(SCRIVI ? 'scritto.' : 'prova a vuoto (nessun file toccato).');
console.log(`Voci in nec.json: ${nuovi.length} (${nuovi.filter((o) => o.trasformatore).length} trasformatori).`);
console.log('Da definire:');
for (const x of da_definire_elenco) console.log(`  - ${x}`);
