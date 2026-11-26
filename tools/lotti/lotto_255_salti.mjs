// Lotto 255, parte B — **i Salti ordinari a fasce di Atletica** (regola approvata da Davide il 24/11/2026 nell'E&L,
// recepita nel Giocatore 0.69 §5.2.8 con tabella nativa e nel Direttore 0.53 §9.10).
//
// I numeri vengono dalla **tabella del manuale**, letta con `tabelleTesto` dopo `comeTestoSemplice`: sei fasce per
// quattro colonne. Non si scrivono a mano e non si ricavano con una formula: la formula («ogni ulteriore fascia di
// 10 punti aumenta di 1 Q vuoto e 50 cm») è scritta a parte, per i VA oltre 55, e il validatore controlla che le sei
// righe lette siano coerenti con essa — se un giorno Davide cambia una riga, il controllo lo dice invece di coprirlo.
//
// Uso: node tools/lotti/lotto_255_salti.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from '../argomenti.mjs';
import { comeTestoSemplice, tabelleTesto, righeTesto } from '../tabelle-testo.mjs';
import { testoManuale, versioneManuale } from '../manuali.mjs';

fermaSeSconosciuti('lotto_255_salti.mjs', process.argv.slice(2));
const SCRIVI = process.argv.includes('--scrivi');
const RADICE = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const FILE = join(RADICE, 'data', 'regole.json');

/** Il §5.2.8 del Giocatore: dal titolo al §5.3. */
export function sezioneSalti(testo) {
  const r = righeTesto(testo);
  const titolo = (x, n) => new RegExp(`^#*\\s*\\**\\s*5\\.${n}( |\\*|$)`).test(String(x).trim()) && !/\d\s*$/.test(x);
  const da = r.findIndex((x) => titolo(x, '2\\.8'));
  const a = r.findIndex((x, i) => i > da && titolo(x, '3'));
  return da < 0 ? null : r.slice(da, a > da ? a : r.length).join('\n');
}

const cm = (s) => {
  const t = String(s).trim();
  const m = t.match(/^([\d,.]+)\s*(cm|m)$/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return /cm/i.test(m[2]) ? n : Math.round(n * 100);
};
/** «1 Q» → 1 Q vuoto; «Q adiacente» → 0 Q vuoti (non si scavalca niente). */
const qVuoti = (s) => {
  const t = String(s).trim();
  if (/^Q adiacente$/i.test(t)) return 0;
  const m = t.match(/^(\d+)\s*Q$/);
  return m ? Number(m[1]) : null;
};

/** Le sei fasce dalla tabella del §5.2.8. @returns {{ da, a, lungo_fermo_q, lungo_rincorsa_q, alto_fermo_cm, alto_rincorsa_cm }[]} */
export function fasceDalManuale(sez) {
  const t = tabelleTesto(comeTestoSemplice(sez)).tabelle
    .find((x) => x.colonne[0] === 'VA Atletica' && x.colonne.length === 5);
  if (!t) return [];
  return t.righe.map(([va, lf, lr, af, ar]) => {
    const m = String(va).replace(/[–—]/g, '-').match(/^(\d+)\s*-\s*(\d+)$/);
    return {
      da: m ? Number(m[1]) : null, a: m ? Number(m[2]) : null,
      lungo_fermo_q: qVuoti(lf), lungo_rincorsa_q: qVuoti(lr),
      alto_fermo_cm: cm(af), alto_rincorsa_cm: cm(ar),
    };
  });
}

// La parte che segue è il programma: gira solo quando questo file è lanciato, non quando un test importa le
// funzioni pure qui sopra (la guardia di tools/importa-armi.mjs).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const sez = sezioneSalti(testoManuale('giocatore'));
  if (!sez) { console.error('Nel Giocatore corrente non trovo il §5.2.8.'); process.exit(2); }
  const fasce = fasceDalManuale(sez);
  const etichetta = `Giocatore ${versioneManuale('giocatore')}`;
  console.log(`${etichetta} §5.2.8: ${fasce.length} fasce lette`);
  for (const f of fasce) console.log(`  VA ${f.da}–${f.a}: lungo ${f.lungo_fermo_q}/${f.lungo_rincorsa_q} Q vuoti · alto ${f.alto_fermo_cm}/${f.alto_rincorsa_cm} cm`);

  // i controlli di lettura: niente si scrive se una riga non torna
  const guasti = [];
  if (fasce.length !== 6) guasti.push(`le fasce sono ${fasce.length}, il manuale ne dà sei`);
  fasce.forEach((f, i) => {
    for (const k of ['da', 'a', 'lungo_fermo_q', 'lungo_rincorsa_q', 'alto_fermo_cm', 'alto_rincorsa_cm']) {
      if (!Number.isFinite(f[k])) guasti.push(`fascia ${i + 1}: «${k}» non letto`);
    }
    if (i > 0 && f.da !== fasce[i - 1].a + 1) guasti.push(`fascia ${i + 1}: comincia da ${f.da} e la precedente finisce a ${fasce[i - 1].a}`);
    // la rincorsa raddoppia (nella prima fascia non c'è niente da raddoppiare)
    if (f.lungo_rincorsa_q !== f.lungo_fermo_q * 2) guasti.push(`fascia ${i + 1}: il lungo con rincorsa (${f.lungo_rincorsa_q}) non è il doppio di quello da fermo (${f.lungo_fermo_q})`);
    if (f.alto_rincorsa_cm !== f.alto_fermo_cm * 2) guasti.push(`fascia ${i + 1}: l'alto con rincorsa (${f.alto_rincorsa_cm}) non è il doppio di quello da fermo (${f.alto_fermo_cm})`);
  });
  // e il passo fra le fasce è quello della formula, dalla seconda in poi
  for (let i = 2; i < fasce.length; i += 1) {
    if (fasce[i].lungo_fermo_q - fasce[i - 1].lungo_fermo_q !== 1) guasti.push(`fra la fascia ${i} e la ${i + 1} il lungo da fermo non sale di 1 Q`);
    if (fasce[i].alto_fermo_cm - fasce[i - 1].alto_fermo_cm !== 50) guasti.push(`fra la fascia ${i} e la ${i + 1} l'alto da fermo non sale di 50 cm`);
  }
  if (guasti.length) { console.error('\nnon scrivo niente:'); for (const g of guasti) console.error('  ' + g); process.exit(2); }
  console.log('le sei righe sono coerenti con la formula delle fasce ulteriori (+1 Q vuoto, +50 cm).');

  if (!SCRIVI) { console.log('\n(sola lettura: --scrivi per applicare a data/regole.json)'); process.exit(0); }

  const grezzo = readFileSync(FILE, 'utf8');
  const json = JSON.parse(grezzo);
  json.salti = {
    paragrafo: '§5.2.8',
    fonte: `${etichetta} §5.2.8; Direttore 0.53 §9.10; blocco E&L del 24/11/2026`,
    _nota: 'Le sei fasce si leggono sul VA personale di Atletica PRIMA dei modificatori alla Prova: bonus e penalità alla Prova non cambiano la fascia. «1 Q» sono i Q VUOTI che si scavalcano, atterrando nel primo Q utile oltre il vuoto — chiarimento esplicito di Davide — quindi il movimento speso è un Q in più. La tabella non modifica i limiti del VA personale (§8.3).',
    fasce,
    oltre_la_tabella: { ogni_punti: 10, lungo_q: 1, alto_cm: 50, _nota: 'Ogni ulteriore fascia di 10 punti aumenta i valori da fermo di 1 Q vuoto e 50 cm; quelli con rincorsa restano doppi.' },
    rincorsa: {
      q_minimi: 2, metri: 3, raddoppia: true, serve_corsa: false,
      _nota: 'Almeno 2 Q (3 metri) percorsi immediatamente prima dello stacco, compresi nel Movimento della stessa AzM. Raddoppiano i Q vuoti del lungo e l’altezza. Non occorre scegliere l’andatura Corsa. Nella fascia 1–5 non ci sono Q vuoti da raddoppiare.',
    },
    movimento: {
      atterraggio_q: 1,
      _nota: 'Rincorsa e salto sono compresi nel Movimento disponibile della stessa AzM, compreso il raggiungimento del Q di atterraggio: non concedono movimento aggiuntivo. Esempio del manuale con Atletica 18: il lungo massimo con rincorsa richiede 7 Q di movimento, 2 di rincorsa e 5 dallo stacco all’arrivo.',
    },
    al_tavolo: 'Un salto agevole e senza conseguenze significative non richiede una Prova; al limite, sopra un vuoto pericoloso o con appoggi difficili, richiede Atletica con i modificatori pertinenti e l’eventuale Specializzazione Acrobatiche. L’app mostra i quattro valori e non li applica da sé: quando serve una Prova lo decide il Direttore.',
  };
  const ind = (/^\s+/.exec(grezzo.split('\n')[2]) ?? [''])[0].length || 1;
  writeFileSync(FILE, JSON.stringify(json, null, ind) + (grezzo.endsWith('\n') ? '\n' : ''));
  console.log(`\nscritto ${FILE} → regole.salti (indentazione ${ind})`);

}
