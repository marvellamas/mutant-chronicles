// Lotto «Armi» del 09/10/2026 (docs/diff-davide-2026-10-08.md): A.135, risposta di Davide dell'08/10 (decisione 139 di
// docs/risposte-master.md; E&L e sezione 7 di «per-davide.md», «Aggiornamento cumulativo — risposte tecniche approvate»).
//   - armi caricate direttamente (tamburo o serbatoio interno, anche revolver e doppiette): fino a 2 cartucce per AzP,
//     fino a 4 con Ricarica Migliorata, entro la capacità; supera il tamburo pieno in 1 AzP e le 3 cartucce;
//   - carichini rapidi: Ricarica per Tamburo (6 colpi, 100 cr a vuoto) e Ricarica per Serbatoio (6 colpi, 150 cr a
//     vuoto); un carichino preparato trasferisce fino a 6 colpi in 1 AzP entro gli spazi liberi, i colpi non trasferiti
//     restano nel carichino; preparare costa 1 minuto ogni 50 colpi o frazione; peso, Qualità, Integrità e Reperibilità
//     non definiti (A.151: null con il TODO(Davide));
//   - Ricarica Rapida: una sola operazione gratuita per Round, alla propria Iniziativa.
// Idempotente: rieseguito non cambia nulla.  node tools/lotti/lotto_ricarica_a135.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const D = fileURLToPath(new URL('../../data/equipaggiamento/', import.meta.url));
const leggi = (f) => JSON.parse(readFileSync(D + f, 'utf8'));
const scrivi = (f, j) => writeFileSync(D + f, `${JSON.stringify(j, null, 2)}\n`);
const DECISIONE = 'A.135 (risposta di Davide dell’08/10/2026, decisione 139 di docs/risposte-master.md)';

// ── munizioni.json → ricarica ──
const mun = leggi('munizioni.json');
const r = mun.ricarica;
const ins = r.inserimento_singolo;
ins._nota = `${DECISIONE}: «Qualunque arma caricata direttamente, con tamburo o serbatoio interno, inserisce fino a 2 cartucce in 1 AzP; con Ricarica Migliorata fino a 4 cartucce in 1 AzP. La regola comprende revolver e doppiette e non permette di superare la capacità dell’arma.» Supera il tamburo pieno in 1 AzP (E&L 19) e le 3 cartucce di Ricarica Migliorata (§8.6.4). Doppiette (canne), revolver (tamburo), fucili a pompa e fucili a pallini a serbatoio interno (HD14M compreso), archi e balestre. «caricatore_amovibile»: modelli delle stesse famiglie con caricatore amovibile (M310 da 20, SA SG2001 da 10): si sostituisce il caricatore, 1 AzP; Mandible e Airbrush stanno fra le armi a caricatore delle loro tabelle.`;
delete ins['TODO(Davide)'];
ins.decisione = `${DECISIONE}: modelli confermati: HD14M con serbatoio interno; SA SG2001, Airbrush e Mandible con caricatore amovibile.`;
for (const f of ['Revolver']) if (!ins.famiglie.includes(f)) ins.famiglie.unshift(f);
for (const a of ['armi_distanza:revolver']) if (!ins.armi.includes(a)) ins.armi.unshift(a);
ins.per_operazione = 2;
ins.migliorata = { ...ins.migliorata, per_operazione: 4 };
ins.testo = 'fino a 2 cartucce per operazione (1 AzP), 4 con Ricarica Migliorata, senza superare la capacità (A.135)';
delete r.tamburo;
r.carichini = {
  _nota: `${DECISIONE}: «Sono disponibili carichini rapidi riutilizzabili, compatibili con il modello d’arma: Ricarica per Tamburo, 6 colpi, 100 crediti a vuoto; Ricarica per Serbatoio, 6 colpi, 150 crediti a vuoto. Le munizioni si acquistano separatamente. Un carichino già preparato e accessibile trasferisce fino a 6 colpi in 1 AzP, entro gli spazi liberi dell’arma. I colpi non trasferiti restano nel carichino e vanno registrati. Ricarica Migliorata non aumenta questo limite. Preparare i dispositivi richiede 1 minuto ogni 50 colpi o frazione.» Nella scheda: un carichino si usa con le armi della sua famiglia (tamburo: revolver; serbatoio: fucili a pompa e a pallini a serbatoio interno); che sia del modello giusto lo verifica il master.`,
  colpi: 6,
  per_operazione: 6,
  preparazione: '1 minuto ogni 50 colpi o frazione, fuori dal combattimento',
  tipi: {
    tamburo: { nome: 'Ricarica per Tamburo', rif: 'accessori_armi:ricarica-per-tamburo', famiglie: ['Revolver'], armi: ['armi_distanza:revolver'] },
    serbatoio: { nome: 'Ricarica per Serbatoio', rif: 'accessori_armi:ricarica-per-serbatoio', famiglie: ['Fucili a pompa', 'Fucili a pallini', 'Fucili a pallini e doppiette'], armi: ['armi_distanza:fucile-a-pompa'] },
  },
};
r.ricarica_rapida = {
  ...r.ricarica_rapida,
  promemoria: 'Ricarica Rapida (A.135): una sola operazione di ricarica gratuita per Round, alla tua Iniziativa: 2 cartucce (4 con Ricarica Migliorata), fino a 6 con un carichino preparato, oppure il cambio di un caricatore o di una cella; servono mani disponibili e accessibilità.',
  decisione: `${DECISIONE}: una sola operazione gratuita per Round, alla propria Iniziativa.`,
};
scrivi('munizioni.json', mun);

// ── accessori_armi.json: i due carichini (dati non definiti: A.151) ──
const acc = leggi('accessori_armi.json');
const carichino = (id, nome, costo, tipo) => ({
  id, nome, tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Ricarica rapida', nomi_alternativi: ['Carichino'],
  note_manuale: `Carichino rapido riutilizzabile, compatibile con il modello d’arma: ${nome}, 6 colpi, ${costo} crediti a vuoto; le munizioni si acquistano separatamente. Un carichino già preparato e accessibile trasferisce fino a 6 colpi in 1 AzP, entro gli spazi liberi dell’arma; i colpi non trasferiti restano nel carichino. Ricarica Migliorata non aumenta questo limite. Preparare i dispositivi richiede 1 minuto ogni 50 colpi o frazione.`,
  paragrafo: 'E&L A.135',
  versione_manuale: 'E&L 08/10',
  pi: null, qualita: null, ps_int: null, reperibilita: null, peso: null,
  costo,
  carichino: { tipo, colpi: 6 },
  'TODO(Davide)': 'A.151: peso, Qualità, Integrità e Reperibilità dei carichini non sono definiti dalla A.135. Intanto restano vuoti: non pesano sul carico e non hanno PI.',
  proprieta: [],
  effetto_breve: `6 colpi in 1 AzP entro gli spazi liberi; si prepara fuori combattimento (1 minuto ogni 50 colpi).`,
});
for (const c of [carichino('ricarica-per-tamburo', 'Ricarica per Tamburo', 100, 'tamburo'), carichino('ricarica-per-serbatoio', 'Ricarica per Serbatoio', 150, 'serbatoio')]) {
  const i = acc.oggetti.findIndex((o) => o.id === c.id);
  if (i >= 0) acc.oggetti[i] = c; else acc.oggetti.push(c);
}
scrivi('accessori_armi.json', acc);
console.log('lotto A.135: ricarica e carichini scritti');
