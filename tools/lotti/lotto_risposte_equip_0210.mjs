// Lotto 5 della ricognizione del 02/10 sera (docs/diff-manuali-2026-10-02-sera.md): risposte di Davide
// sull'equipaggiamento (E&L del 02/10/2026, «Risposte approvate ai 52 riferimenti dell'app», decisioni 10, 11,
// 14, 15, 17–21; docs/risposte-master.md, decisioni 73–80). Applica le risposte ai dati del catalogo e della
// dotazione, toglie i TODO(Davide) e registra le voci uscite in index.json → rif_sostituiti (migrazione dei
// salvataggi: chi aveva la voce tolta riceve quella rimasta).
// - A.62 Katana Ryūjin: natura Naturale, proprietà Plasma all'attivazione;
// - A.63 esoscheletri e armature servoassistite: NEC Rosso di formato dedicato, autonomia in ore;
// - A.64 moduli IAS: NEC Blu IAS da 1.000 Lx = 20 cariche da 50 Lx;
// - A.65 Corredo agricolo Standard — Allevamento (nuova scheda) e strumento musicale a scelta;
// - A.66 Corredo da cucina da campo: 30 minuti, NEC Rosso, 50 Lx a preparazione;
// - A.67 un solo Modulo Blu (nec:modulo-blu) anche per il Gehemmapuker; niente travaso fra NEC;
// - A.68 Interfaccia neurale standard: 3.500 cr + installazione, 2 UMN, acquistabile;
// - A.71 Cartuccia chirurgica — set sterile monouso: una voce sola, 500 cr o 2.500 per cinque.
//   node tools/lotti/lotto_risposte_equip_0210.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_risposte_equip_0210.mjs --scrivi  → scrive i JSON
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const leggi = (p) => JSON.parse(readFileSync(new URL(p, R), 'utf8'));
const scritti = new Map();
const tieni = (p, j) => scritti.set(p, j);
const EL = 'E&L del 02/10/2026';
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };
const trova = (file, id) => { const o = file.oggetti.find((x) => x.id === id); verifica(o, `${id}: nel catalogo`); return o; };

// --- A.62 Katana Ryūjin (decisione 15) --------------------------------------------------------------------
const arc = leggi('data/equipaggiamento/armi_corporative.json');
const ryu = trova(arc, 'katana-ryujin');
ryu.attivazione = { testo: '+1d6, natura Naturale, con la proprietà Plasma; 5 cariche a cella', danno_extra: '1d6', natura: 'Naturale', anche: 'la proprietà Plasma' };
ryu.decisione = `A.62 (${EL}, decisione 15): la Natura resta Naturale; attiva infligge 1d8 + 1 + 1d6 con la proprietà Plasma, un solo colpo (Difese e AR una volta); «Plasma» non è una Natura.`;
delete ryu['TODO(Davide)'];
tieni('data/equipaggiamento/armi_corporative.json', arc);

// --- A.63 esoscheletri (decisione 18) ---------------------------------------------------------------------
const ESO = {
  'armature_corporative:juggernaut-xo-102-steel-strider': [8, 1500],
  'armature_corporative:vulkan': [8, 3000],
  'corredi_dispositivi:ape-capitol': [6, 2000],
  'armature_corporative:mk-iv-felis-pattern-dei-golden-lions': [8, 2000],
  'armature_corporative:powersuit': [8, 2000],
  'armature_corporative:shoa-ace-custom': [6, 2500],
  'armature_corporative:demonhunter': [6, 2500],
};
const file = { armature_corporative: leggi('data/equipaggiamento/armature_corporative.json'), corredi_dispositivi: leggi('data/equipaggiamento/corredi_dispositivi.json') };
for (const [rif, [ore, ricambio]] of Object.entries(ESO)) {
  const [f, id] = rif.split(':');
  const o = trova(file[f], id);
  verifica(/A\.63/.test(o['TODO(Davide)'] ?? '') || o.alimentazione?.descrizione?.startsWith('NEC Rosso di formato dedicato'), `${id}: TODO A.63 o già applicato`);
  o.alimentazione = {
    nec: null, descrizione: `NEC Rosso di formato dedicato (${o.nome}): ricarica ${ore} ore, ricambio ${ricambio.toLocaleString('it-IT')} cr, sostituzione 1 minuto`,
    autonomia_ore: ore, paragrafo: `${o.paragrafo}; ${EL}, decisione 18`,
  };
  delete o['TODO(Davide)'];
}
tieni('data/equipaggiamento/armature_corporative.json', file.armature_corporative);

// --- A.64 moduli IAS (decisione 20) -----------------------------------------------------------------------
const IAS = {
  'ias3100-generatore-blink': [20, 'cariche (Blink 1, Power Blink 2)'],
  'ias3200-imbracatura-antigravita': [20, 'Round di volo'],
  'ias3300-mirrorshard': [20, 'minuti'],
  'ias3400-disturbatore-metafisico': [20, 'Round'],
  'smorzatore-acustico-silent': [20, 'minuti'],
};
for (const [id, [usi, unita]] of Object.entries(IAS)) {
  const o = trova(file.corredi_dispositivi, id);
  o.alimentazione = {
    nec: null, descrizione: 'NEC Blu specialistico IAS: 1.000 Lx = 20 cariche IAS da 50 Lx; ricambio carico 1.000 cr, ricarica 50 cr in 1 ora, sostituzione 1 minuto a sistema spento',
    usi, unita_usi: unita, lx_per_uso: 50, paragrafo: `§7.15.4; ${EL}, decisione 20`,
  };
  delete o['TODO(Davide)'];
}
tieni('data/equipaggiamento/corredi_dispositivi.json', file.corredi_dispositivi);

// --- A.65 dotazioni (decisioni 10 e 11) --------------------------------------------------------------------
const str = leggi('data/equipaggiamento/strumenti_professionali.json');
const base = trova(str, 'attrezzi-agricoli-di-base');
str.oggetti = str.oggetti.filter((o) => o.id !== 'corredo-agricolo-standard-allevamento');
str.oggetti.splice(str.oggetti.indexOf(base) + 1, 0, {
  id: 'corredo-agricolo-standard-allevamento', nome: 'Corredo agricolo Standard — Allevamento', tipo: 'altro', catalogo: 'Commerciale',
  famiglia: base.famiglia, nomi_alternativi: [],
  note_manuale: 'Comprende longhina, cavezza regolabile, spazzole, striglia, cesoie e piccoli attrezzi per la cura ordinaria di animali di taglia compatibile. Mangimi e medicinali si acquistano separatamente; non sostituisce gli strumenti veterinari. Strumento Standard: nessun modificatore al VA.',
  paragrafo: `§5.3; ${EL}, decisione 10`, versione_manuale: 'Equipaggiamento 0.5', peso: 2, reperibilita: 'CO', costo: 200, proprieta: [],
});
trova(str, 'strumento-musicale-portatile-acustico'); trova(str, 'strumento-musicale-portatile-elettronico');
tieni('data/equipaggiamento/strumenti_professionali.json', str);
const dot = leggi('data/dotazioni.json');
const agr = dot.oggetti_dotazione['corredo-agricolo'];
verifica(agr?.sotto === 'corredo_agricolo' && JSON.stringify(dot.sotto_scelte.corredo_agricolo.valori) === '["Coltivazione","Allevamento"]', 'corredo agricolo: sotto-scelta Coltivazione/Allevamento');
agr.rif_per_sotto = { Coltivazione: 'strumenti_professionali:attrezzi-agricoli-di-base', Allevamento: 'strumenti_professionali:corredo-agricolo-standard-allevamento' };
delete agr['TODO(Davide)'];
const mus = dot.oggetti_dotazione['strumento-musicale-portatile'];
verifica(mus, 'strumento musicale nella dotazione');
dot.sotto_scelte.strumento_musicale = { etichetta: 'Tipo di strumento musicale', valori: ['Acustico', 'Elettronico'], fonte: `${EL}, decisione 11: scelta libera, senza sovrapprezzo` };
mus.sotto = 'strumento_musicale';
mus.rif_per_sotto = { Acustico: 'strumenti_professionali:strumento-musicale-portatile-acustico', Elettronico: 'strumenti_professionali:strumento-musicale-portatile-elettronico' };
delete mus['TODO(Davide)'];
tieni('data/dotazioni.json', dot);

// --- A.66 Corredo da cucina da campo (decisione 19) -----------------------------------------------------------
const esp = leggi('data/equipaggiamento/esplorazione.json');
const cuc = trova(esp, 'corredo-da-cucina-da-campo');
verifica(cuc.alimentazione?.nec === 'nec:rosso-standard' && cuc.alimentazione.lx_per_uso === 50 && cuc.alimentazione.usi === 10, 'cucina: NEC Rosso, 10 preparazioni da 50 Lx');
cuc.decisione = `A.66 (${EL}, decisione 19): un pasto semplice per fino a quattro persone in 30 minuti, senza Prova; 50 Lx a preparazione (10 con un NEC Rosso standard pieno); cambio del NEC 1 AzP; ricarica 1 ora, 5 cr. La sostituzione del filtro del depuratore resta un’operazione distinta da 1 minuto.`;
delete cuc['TODO(Davide)'];
tieni('data/equipaggiamento/esplorazione.json', esp);

// --- A.67 Modulo Blu (decisione 14) -------------------------------------------------------------------------
const nec = leggi('data/equipaggiamento/nec.json');
const mb = trova(nec, 'modulo-blu');
const mun = leggi('data/equipaggiamento/munizioni.json');
const pacco = mun.oggetti.find((o) => o.id === 'pacco-nec-gehemmapuker');
verifica(!pacco || (pacco.costo === mb.costo && pacco.cella?.riserva_lx === mb.nec.capacita_lx), 'Gehemmapuker: stessi valori del Modulo Blu');
// una sola voce, richiamata anche dalle munizioni: è la cella del Gehemmapuker (50 Lx per getto, 50 getti)
mb.cella = { capacita: 50, unita: 'getti', lx_per_colpo: 50, riserva_lx: mb.nec.capacita_lx, ricarica_costo: mb.ricarica_costo };
mb.compatibile_con = ['armi_distanza_corporative:gehemmapuker'];
mb.decisione = `A.67 (${EL}, decisione 14): il Gehemmapuker usa lo stesso Modulo NEC Blu del catalogo, intercambiabile fra i dispositivi che accettano quel formato; 50 Lx per attacco (50 getti), AC 1d3 non moltiplica il consumo; sostituzione 1 AzP, entrambe le mani, nessuna Prova. I getti disponibili sono la parte intera dei Lx residui / 50.`;
tieni('data/equipaggiamento/nec.json', nec);
mun.oggetti = mun.oggetti.filter((o) => o.id !== 'pacco-nec-gehemmapuker');
tieni('data/equipaggiamento/munizioni.json', mun);

// --- A.68 Interfaccia neurale standard (decisione 21) -----------------------------------------------------------
const imp = leggi('data/equipaggiamento/impianti.json');
const intf = trova(imp, 'interfaccia-neurale');
intf.costo = 3500;
verifica(intf.installazione_costo === 2000 && intf.umn === 2, 'interfaccia standard: installazione 2.000, 2 UMN');
intf.decisione = `A.68 (${EL}, decisione 21): impianto 3.500 cr, installazione 2.000 cr (5.500), 2 UMN; Non Comune, PS Integrità 12, 4 PI, REP Rara; bioenergetica, senza NEC. L’associazione a equipaggiamento CYBERTRONIC richiede 1 minuto e una Prova di Tecnologia, poi resta memorizzata.`;
delete intf['TODO(Davide)'];
tieni('data/equipaggiamento/impianti.json', imp);

// --- A.71 Cartuccia chirurgica (decisione 17) -----------------------------------------------------------------
const san = leggi('data/equipaggiamento/sanitario.json');
const car = trova(san, 'cartuccia-chirurgica');
car.nome = 'Cartuccia chirurgica — set sterile monouso';
car.nomi_alternativi = ['Set chirurgico di ricambio', 'Cartuccia chirurgica'];
car.costo = 500;
car.confezione = { quantita: 5, costo: 2500 };
car.paragrafo = `§6.5, §6.8.7; ${EL}, decisione 17`;
car.effetto_breve = 'Una procedura del Kit chirurgico, della Postazione medica da campo o di una postazione medicochirurgica: si consuma all’inizio, anche se la procedura fallisce. 500 cr, o 2.500 cr per cinque.';
delete car['TODO(Davide)'];
san.oggetti = san.oggetti.filter((o) => !['set-chirurgico-di-ricambio', 'confezione-da-cinque-set-chirurgici'].includes(o.id));
tieni('data/equipaggiamento/sanitario.json', san);

// --- migrazione dei salvataggi: voci uscite → voce rimasta ---------------------------------------------------------
const ind = leggi('data/equipaggiamento/index.json');
Object.assign(ind.rif_sostituiti, {
  'munizioni:pacco-nec-gehemmapuker': { rif: 'nec:modulo-blu' },
  'munizioni:serbatoio-vuoto-gehemmapuker': { rif: 'nec:modulo-blu' },
  'sanitario:set-chirurgico-di-ricambio': { rif: 'sanitario:cartuccia-chirurgica' },
  'sanitario:confezione-da-cinque-set-chirurgici': { rif: 'sanitario:cartuccia-chirurgica', quantita_per: 5 },
});
tieni('data/equipaggiamento/index.json', ind);

console.log(`${controlli} controlli superati; ${scritti.size} file da scrivere`);
if (process.argv.includes('--scrivi')) {
  for (const [p, j] of scritti) writeFileSync(new URL(p, R), `${JSON.stringify(j, null, 2)}\n`);
  console.log([...scritti.keys()].join('\n'));
}
