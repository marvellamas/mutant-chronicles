// Lotto «Armamenti 0.59» e «Giocatore 0.46» (Google Doc del 06/10/2026, 18:32 e 18:20 UTC; controllo del
// 07/10, docs/diff-manuali-2026-10-07.md). Solo le differenze piccole e chiare:
// - requisiti di Forza abbassati (Armamenti §7.1.1, §7.8): Ascia bipenne e Arma inastata pesante 7 → 6, KEP 808 6 → 5,
//   Lanciagranate Deathlock Drum 8 → 7, Deathlock Drum 8 → 7, Nimrod Autocannon 9 → 8, HG14 6 → 5, Colt Hammershot
//   7 → 5, Improved M89 8 → 7, Charger 9 → 8, Lanciarazzi Southpaw 8 → 7;
// - famiglia «Fucili a pallini e doppiette» (§7.7, §7.8; Giocatore §4.3, §5.10 Tiro Rapido, §8.8): Mandible e
//   Airbrush passano dalle Carabine ai fucili a pallini (AC 2, Sbilanciante, cartucce a pallini, Specializzazione
//   Fucili a Pallini e Doppiette; Mandible automatico con Raffica Breve, Airbrush semiautomatico); le tabelle
//   «Fucili a pompa» dei cataloghi Bauhaus e Cybertronic si chiamano «Fucili a pallini», quella Capitol «Fucili a
//   pallini e doppiette»; le note di HD14M, HG14 e SA SG2001 dicono il funzionamento; la Specializzazione cambia
//   nome (l'id resta, così i personaggi salvati non cambiano).
// I modelli di base del §7.22 (HD10, SA SG1000…) restano «Fucili a pompa»: il §7.22 non è cambiato.
// La ricarica non cambia: le famiglie rinominate restano fra quelle a inserimento (munizioni.json → ricarica).
//   node tools/lotti/lotto_armamenti_059.mjs            prova a vuoto
//   node tools/lotti/lotto_armamenti_059.mjs --scrivi   scrive i JSON (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Armamenti 0.59';
const GIOCATORE = 'Giocatore 0.46 (Google Doc del 06/10/2026, 18:20 UTC)';
const leggi = (p) => JSON.parse(readFileSync(new URL(`data/${p}.json`, RADICE), 'utf8'));
const salva = (p, d) => writeFileSync(new URL(`data/${p}.json`, RADICE), `${JSON.stringify(d, null, 2)}\n`);
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nei manuali: ${t}`); return t; };

const file = {
  armi: leggi('equipaggiamento/armi'),
  corp: leggi('equipaggiamento/armi_distanza_corporative'),
  dist: leggi('equipaggiamento/armi_distanza'),
  mun: leggi('equipaggiamento/munizioni'),
  spec: leggi('specializzazioni'),
  abil: leggi('abilita'),
  regole: leggi('regole'),
};
const voce = (f, id) => {
  const o = file[f].oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`${f}: manca ${id}`);
  return o;
};
const cambi = [];
const imposta = (o, campo, valore) => {
  if (JSON.stringify(o[campo]) === JSON.stringify(valore)) return;
  cambi.push(`${o.id ?? o.nome}.${campo}: ${JSON.stringify(o[campo])} → ${JSON.stringify(valore)}`);
  o[campo] = valore;
  if ('versione_manuale' in o && o.versione_manuale !== VERSIONE && o.tipo) o.versione_manuale = VERSIONE;
};

// 1. Requisiti di Forza (tabelle del §7.1.1 e del §7.8 della 0.59)
const FOR = {
  armi: { 'ascia-bipenne': 6, 'arma-inastata-pesante': 6 },
  corp: {
    'kep-808': 5, 'lanciagranate-deathlock-drum': 7, 'deathlock-drum': 7, 'nimrod-autocannon': 8, hg14: 5,
    'colt-hammershot': 5, 'improved-m89': 7, charger: 8, 'lanciarazzi-southpaw': 7,
  },
};
for (const [f, voci] of Object.entries(FOR)) for (const [id, v] of Object.entries(voci)) imposta(voce(f, id), 'for_richiesta', v);

// 2. Fucili a pallini: nomi delle tabelle e note dei modelli
for (const o of file.corp.oggetti) {
  if (['hd14m', 'hg14', 'sa-sg2001'].includes(o.id)) imposta(o, 'famiglia', 'Fucili a pallini');
  if (o.famiglia === 'Fucili a pompa e doppiette') imposta(o, 'famiglia', 'Fucili a pallini e doppiette');
}
imposta(voce('corp', 'hd14m'), 'note_manuale', frase('HD14M. Fucile a pallini semiautomatico. Proprietà: Sbilanciante. Modalità: Colpo Singolo e Tiro Rapido.'));
imposta(voce('corp', 'hg14'), 'note_manuale', frase('HG14. Fucile a pallini a pompa. Proprietà: Sbilanciante. Modalità: Colpo Singolo.'));
imposta(voce('corp', 'sa-sg2001'), 'note_manuale', frase('SA SG2001. Fucile a pallini semiautomatico. Proprietà: Sbilanciante. Modalità: Colpo Singolo e Tiro Rapido.'));
const pompa = voce('dist', 'fucile-a-pompa');
imposta(pompa, 'note_manuale', `Fucile a pompa. Proprietà: Sbilanciante. Modalità: Colpo Singolo (§7.7: «${frase('a pompa, solo Colpo Singolo')}»).`);

// 3. Mandible e Airbrush: fucili a pallini (§7.7, §7.8 Imperial e Mishima, §7.20.9)
const sbilanciante = voce('corp', 'hd14m').proprieta.find((p) => p.nome === 'Sbilanciante');
const PALLINI = 'specializzazione-fucili-a-pompa-e-doppiette';
const mandible = voce('corp', 'mandible');
imposta(mandible, 'ac', 2);
imposta(mandible, 'modalita', ['S', 'RB', 'TR']);
imposta(mandible, 'specializzazione', PALLINI);
imposta(mandible, 'proprieta', [sbilanciante]);
imposta(mandible, 'note_manuale', frase('Mandible. Fucile a pallini automatico: AC 2, Sbilanciante, Colpo Singolo, Tiro Rapido e Raffica Breve. Usa cartucce a pallini e la Specializzazione Fucili a Pallini e Doppiette.'));
const airbrush = voce('corp', 'airbrush');
imposta(airbrush, 'ac', 2);
imposta(airbrush, 'specializzazione', PALLINI);
imposta(airbrush, 'proprieta', [sbilanciante]);
imposta(airbrush, 'note_manuale', frase('Airbrush è un fucile a pallini semiautomatico: AC 2, Sbilanciante, Colpo Singolo e Tiro Rapido. Usa cartucce a pallini e la Specializzazione Fucili a Pallini e Doppiette.'));
for (const id of ['mandible', 'airbrush']) {
  const m = file.mun.munizioni_armi.find((x) => x.rif === `armi_distanza_corporative:${id}`);
  if (m.famiglia !== 'pallini') { cambi.push(`munizioni ${id}: ${m.famiglia} → pallini (§7.20.9)`); m.famiglia = 'pallini'; }
}
const ins = file.mun.ricarica.inserimento_singolo;
const famiglie = ['Fucili a pompa', 'Fucili a pallini', 'Fucili a pallini e doppiette', 'Archi e balestre'];
if (JSON.stringify(ins.famiglie) !== JSON.stringify(famiglie)) { cambi.push(`ricarica.inserimento_singolo.famiglie → ${famiglie.join(', ')}`); ins.famiglie = famiglie; }

// 4. Giocatore 0.46: nome della Specializzazione, Abilità Armi medie, nota del Tiro Rapido
const sp = file.spec.specializzazioni?.find((s) => s.id === PALLINI) ?? file.spec.armi?.find((s) => s.id === PALLINI)
  ?? Object.values(file.spec).flat().find((s) => s?.id === PALLINI);
if (!sp) throw new Error('specializzazioni.json: manca la Specializzazione dei fucili a pallini');
imposta(sp, 'nome', frase('Fucili a Pallini e Doppiette'));
imposta(sp, 'ambito', 'Armi della categoria Fucili a Pallini e Doppiette (comprese Mandible e Airbrush). Si usa l’Abilità indicata dalla scheda dell’arma (Manuale degli Armamenti).');
const medie = file.abil.abilita?.find((a) => a.nome === 'Armi medie') ?? Object.values(file.abil).flat().find((a) => a?.nome === 'Armi medie');
imposta(medie, 'descrizione', frase('Comprende fucili, carabine, fucili d\'assalto, fucili a pallini e doppiette, mitra, fucili di precisione e armi individuali a energia. Intelligenza rappresenta mira controllata, valutazione della distanza e gestione delle modalità di fuoco.'));
const trovaTr = (o) => {
  if (!o || typeof o !== 'object') return null;
  if (typeof o.note === 'string' && o.note.startsWith('La disponibilità di Tiro Rapido')) return o;
  for (const v of Object.values(o)) { const r = trovaTr(v); if (r) return r; }
  return null;
};
const notaTr = trovaTr(file.regole);
const notaTrPrima = notaTr.note;
imposta(notaTr, 'note', frase('La disponibilità di Tiro Rapido dipende dalla scheda. Nella famiglia Fucili a Pallini e Doppiette, i modelli a pompa dispongono del solo Colpo Singolo; i semiautomatici di Colpo Singolo e Tiro Rapido; gli automatici anche di Raffica Breve. HD14M, SA SG2001 e Airbrush sono semiautomatici; Mandible è automatico. I modelli automatici del catalogo non dispongono di Raffica Media o Lunga. Con una doppietta i due Tiri Rapidi devono essere diretti contro bersagli differenti; contro lo stesso bersaglio si usa Doppio Colpo.'));
for (const f of ['spec', 'abil']) if (file[f].versione_manuale !== GIOCATORE) { cambi.push(`${f}.versione_manuale → ${GIOCATORE}`); file[f].versione_manuale = GIOCATORE; }

console.log(cambi.length ? cambi.join('\n') : 'nessun cambiamento: dati già alla 0.59');
if (scrivi) {
  salva('equipaggiamento/armi', file.armi); salva('equipaggiamento/armi_distanza_corporative', file.corp);
  salva('equipaggiamento/armi_distanza', file.dist); salva('equipaggiamento/munizioni', file.mun);
  salva('specializzazioni', file.spec); salva('abilita', file.abil);
  // regole.json ha una formattazione a mano: si sostituisce solo la stringa della nota
  const url = new URL('data/regole.json', RADICE);
  writeFileSync(url, readFileSync(url, 'utf8').replace(JSON.stringify(notaTrPrima), JSON.stringify(notaTr.note)));
  console.log('scritto');
}
