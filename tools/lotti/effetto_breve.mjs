// Popola «effetto_breve» per sanitario, accessori delle armi, munizioni, corredi e kit con frasi del manuale:
// è la riga sotto il nome dell'oggetto nella scheda digitale. Uso: node tools/lotti/effetto_breve.mjs
// Ogni frase deve comparire alla lettera nei testi del manuale (prosa dei lotti 8, 10 e 11,
// note_manuale, proprieta, esiti, cella del mirino); granate, razzi e riduttori di rumore usano le
// celle della loro tabella (§7.20: danno, AC, RS, proprietà; §7.3: percezione, VA, danno).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const PROSE = ['lotto7-corredi-dispositivi', 'lotto8-accessori-armi', 'lotto10-munizioni', 'lotto11-sanitario'].map((l) => `${REPO}/docs/lotti/${l}/prosa`);
const norm = (t) => String(t).replace(/\s+/g, ' ').replace(/–\s/g, '–').trim();
const prosa = norm(PROSE.flatMap((d) => readdirSync(d).map((f) => readFileSync(`${d}/${f}`, 'utf8'))).join(' '));

const MAPPA = {
  sanitario: {
    'kit-di-pronto-soccorso-improvvisato': 'Sospende il Sanguinamento per 10 Round',
    'kit-di-pronto-soccorso-standard': 'Arresta il Sanguinamento',
    'kit-di-pronto-soccorso-professionale': 'Arresta il Sanguinamento e recupera 1d4 PV',
    'cartuccia-emostatica': 'Sospende il Sanguinamento per 5 Round',
    'cartuccia-coagulante': 'Arresta il Sanguinamento',
    'cartuccia-curativa': 'Recupera 1d6 PV, fino ai PV massimi',
    'umc-passiva': 'Il giocatore sceglie una cartuccia caricata e spende 1 AzP. Occorre una Prova di Medicina oppure Tecnologia–Strumentazione.',
    'umc-attiva': 'Modalità Emergenza: dopo aver subito il Sanguinamento, somministra automaticamente una cartuccia emostatica caricata, senza Prova e senza Azione.',
    'umc-automatica': 'Dopo il Sanguinamento, il protocollo d’emergenza usa automaticamente una cartuccia emostatica oppure coagulante secondo la priorità impostata e la disponibilità delle cartucce.',
    'iniettore-sanitario-manuale': 'Somministrare richiede 1 AzP e una Prova di Medicina oppure Tecnologia–Strumentazione.',
    'pistola-sanitaria': 'Somministrare una delle cartucce caricate richiede 1 AzP, senza Prova.',
    'spray-rimarginante': 'Spendendo 1 AzP e una dose, senza Prova, recupera 1d3 PV fino al massimo.',
    'scanner-diagnostico-portatile': 'Una diagnosi richiede almeno un minuto e una Prova di Medicina con +2 VA degli strumenti, per lesioni e anomalie rilevabili dall’apparecchio.',
    'scanner-diagnostico-cybertronic': 'Mantiene le funzioni e il +2 VA diagnostico del modello portatile; SIN 1 concede un ulteriore +1 alla Prova diagnostica con interfaccia compatibile attiva, per +3 complessivo prima di altri modificatori.',
    'kit-chirurgico-da-campo': 'È una dotazione Professionale: +2 VA a Medicina per interventi chirurgici e procedure pertinenti eseguibili sul campo.',
    'postazione-medica-da-campo': 'Concede +3 VA a Medicina per chirurgia e trattamenti delle Ferite o delle Menomazioni; la diagnostica mantiene il +2 del proprio scanner.',
  },
  accessori_armi: {
    'mirino-reflex': 'Fino a 80 Q; nessuna preparazione aggiuntiva.',
    'mirino-ottico': 'Fino a 500 Q; almeno 2 Azioni Principali complessive.',
    'mirino-di-precisione': 'Entro la gittata massima dell’arma; almeno 2 Azioni Principali complessive.',
    'attenuatore': 'Attenuatore e Smorzatore applicano la penalità indicata alle Prove di Percezione per udirlo',
    'attenuatore-rinforzato': 'Attenuatore e Smorzatore applicano la penalità indicata alle Prove di Percezione per udirlo',
    'smorzatore': 'Attenuatore e Smorzatore applicano la penalità indicata alle Prove di Percezione per udirlo',
    'smorzatore-rinforzato': 'Attenuatore e Smorzatore applicano la penalità indicata alle Prove di Percezione per udirlo',
    'silenziatore': 'il Silenziatore rende lo sparo inudibile e per quel suono non si effettua una Prova.',
    'silenziatore-rinforzato': 'il Silenziatore rende lo sparo inudibile e per quel suono non si effettua una Prova.',
    'bipiede': 'Concede +1 VA per colpire finché il personaggio mantiene posizione e appoggio.',
    'treppiede': 'Il Treppiede concede +2 VA per colpire mentre il tiratore utilizza l’arma dalla postazione e permette di orientarla verso bersagli differenti senza ripetere la preparazione.',
    'torcia-tattica': 'Si monta su un’arma predisposta e illumina nella direzione verso cui viene puntata, entro 20 Q.',
    'modulo-di-visione-notturna': 'Si applica a un mirino compatibile e permette di osservare e sparare attraverso di esso ignorando, entro 80 Q, le penalità dovute alla scarsa illuminazione.',
    'modulo-di-visione-termica': 'Permette di osservare e prendere di mira, entro 40 Q, bersagli con un contrasto termico sufficiente rispetto all’ambiente, anche nel buio naturale completo.',
    'batteria-di-servizio': 'Ogni accessorio impiega la propria batteria e dispone di 24 ore effettive di funzionamento, anche non consecutive.',
  },
};
// Munizioni speciali e dardi: la frase della proprietà che porta il numero (o l'effetto)
const VARIANTI = {
  'Perforante 1': 'Ignora X punti dell’AR non magica applicabile, compreso il contributo ordinario dello Scudo, fino a un minimo di 0 per questa componente.',
  'Perforante 2': 'Ignora X punti dell’AR non magica applicabile, compreso il contributo ordinario dello Scudo, fino a un minimo di 0 per questa componente.',
  Incendiaria: 'Riduce di 1 il danno base di ogni colpo o applicazione, prima di moltiplicatori, Difese e AR, fino a un minimo di 0, e aggiunge Fuoco.',
  Concussiva: 'Il Successo evita l’effetto secondario; il Fallimento impone −2 VA alle sole Prove di Difese per 1+1d3 Round.',
};
const DARDI = {
  'dardo-stordente': 'Con Successo evita l’effetto; con Fallimento diventa Stordito per 1+1d3 Round.',
  'dardo-sedativo': 'Il Successo evita l’effetto; il Fallimento applica Svenuto per 1d3 minuti.',
};

const errori = [];
const conta = {};
function aggiorna(file, calcola) {
  const p = `${REPO}/data/equipaggiamento/${file}.json`;
  const testo = readFileSync(p, 'utf8');
  const j = JSON.parse(testo);
  conta[file] = 0;
  for (const o of j.oggetti) {
    const e = calcola(o);
    if (!e) { delete o.effetto_breve; continue; }
    const fonti = norm([prosa, o.note_manuale, ...(o.proprieta ?? []).map((x) => `${x.nome} ${x.testo ?? ''}`), ...Object.values(o.esiti ?? {}), o.mirino?.testo ?? ''].join(' '));
    if (!e.composto && !fonti.includes(norm(e.verifica ?? e.testo).replace(/[.;]$/, ''))) errori.push(`${file}:${o.id} non verbatim: ${e.testo}`);
    o.effetto_breve = e.testo;
    conta[file]++;
  }
  writeFileSync(p, JSON.stringify(j, null, 2) + (testo.endsWith('\n') ? '\n' : ''));
}
aggiorna('sanitario', (o) => (MAPPA.sanitario[o.id] ? { testo: MAPPA.sanitario[o.id] } : null));
aggiorna('accessori_armi', (o) => {
  // riduzione del rumore: celle della tabella del §7.3 (percezione dello sparo, VA per colpire, danno)
  if (o.percezione) {
    const s = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
    return { testo: `Percezione dello sparo: ${o.percezione}; VA per colpire ${s(o.effetto_arma?.va ?? 0)}; danno ${s(o.effetto_arma?.danno ?? 0)}.`, composto: true };
  }
  return MAPPA.accessori_armi[o.id] ? { testo: MAPPA.accessori_armi[o.id] } : null;
});
// Corredi professionali e Kit trauma (§7.12–7.17): la prima frase di note_manuale con un
// modificatore «±N VA»; se manca, la prima frase che contiene un numero.
const FAMIGLIE_CORREDI = ['Corredi professionali', 'Kit trauma'];
function fraseConNumero(testo) {
  const frasi = String(testo ?? '').replace(/\s+/g, ' ').split(/(?<=\.)\s+(?=[A-ZÀ-Ý+«])/);
  return frasi.find((f) => /[+−-]\s?\d+\s*VA/.test(f)) ?? frasi.find((f) => /\d/.test(f)) ?? null;
}
aggiorna('corredi_dispositivi', (o) => {
  if (!FAMIGLIE_CORREDI.includes(o.famiglia)) return null;
  const f = fraseConNumero(o.note_manuale);
  return f ? { testo: f } : null;
});
aggiorna('munizioni', (o) => {
  if (o.munizione?.variante && VARIANTI[o.munizione.variante]) return { testo: `${o.munizione.variante}: ${VARIANTI[o.munizione.variante]}`, composto: false, verifica: VARIANTI[o.munizione.variante] };
  if (DARDI[o.id]) return { testo: DARDI[o.id] };
  // granate e razzi: celle della tabella del §7.20
  if (o.esplosivo) return { testo: `Danno ${o.esplosivo.danno}, AC ${o.esplosivo.ac}, RS ${o.esplosivo.rs_q} Q${o.esplosivo.proprieta?.length ? `; ${o.esplosivo.proprieta.join(', ')}` : ''}.`, composto: true };
  return null;
});
console.log(conta);
if (errori.length) { console.log(errori.join('\n')); process.exit(1); }
