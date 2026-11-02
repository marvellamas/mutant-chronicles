// Lotto 164 (02/11/2026): risposte di Davide del 02/11/2026 alla A.235 (raccordo fra Armamenti 0.74, A.158 e A.166) e
// alla A.231 (CyberArma recuperata e progetto di Dimitri), con l'Armamenti 0.74 §7.25 ritoccato il 02/11 (esemplare di
// Park, famiglie per forma, procedura del Custode, nomi e storico). Lavora sui dati già scritti dal lotto 157
// (tools/lotti/lotto_cyberarma_074.mjs, che non scrive più) e cambia soltanto:
//  - manifestazioni (A.235 a): famiglia e Specializzazione seguono la forma, una sola pertinente; la forma cambia solo mani e
//    portata; la frusta NON dà da sola Immobilizzare a distanza (correzione della A.166);
//  - peso e Integrità (A.235 b): per esemplare; 0,5 kg, Non Comune, PS 12, 4 PI sono quelli dell'esemplare di Park;
//  - costruzione (A.235 c): soltanto i Custodi; il Tecnomante studia e modifica (superata la A.158); procedura base del
//    Custode con Maestro d'Arma;
//  - il progetto di Paradise (A.231): parte dalla CyberArma originale di Park (frammento Viola, Corruzione 1) già
//    nell'inventario; programma degli appunti v1.2; «Consegna l'arma» aggiorna lo stesso esemplare (src/progetti.js);
//    il Viola estratto è un oggetto a parte; nomi «CyberArma Park» → «CyberArma Dimitri» nello storico.
// La riserva della batteria interna (10 PM → 5 Cariche Mistiche, revisione del 02/11) NON è qui: lotto a parte.
//
// Uso: node tools/lotti/lotto_cyberarma_a231_a235.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = join(R, 'data/equipaggiamento/armi.json');
const armi = JSON.parse(fs.readFileSync(F, 'utf8'));
const voce = (id) => {
  const o = armi.oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`voce ${id} non trovata in armi.json`);
  return o;
};
const FONTE = 'Armamenti 0.74 §7.25 (ritoccato il 02/11/2026); A.231 e A.235 (Davide, 02/11/2026)';

const NOTA_FRUSTA = 'Famiglia Armi flessibili. La forma a frusta non concede da sola Immobilizzare a distanza: le Manovre seguono la compatibilità della forma e i requisiti ordinari, senza le proprietà della frusta commerciale (A.235, che corregge la A.166).';
const A235_FORME = 'A.235 (Davide, 02/11/2026): famiglia e Specializzazione seguono la forma manifestata — Spade per una lama, Asce per un’ascia, Armi Inastate per una lancia, Armi Flessibili per una frusta — e si applica una sola Specializzazione pertinente. Restano fissi il profilo dell’utilizzatore e l’Abilità Armi da mischia (Tecnomante: 1d8 Magico, FOR 3, 1 AzP e 2 PM per 10 Round): la forma cambia mani e portata, senza importare danno, requisiti o proprietà dell’arma commerciale. Le Manovre seguono compatibilità della forma e requisiti ordinari.';

for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
  const o = voce(id);
  const m = o.manifestazioni;
  m.fonte = `${FONTE}; A.166 del 16/10/2026 per le forme`;
  delete m._a235;
  m._a235 = A235_FORME;
  m.elenco = m.elenco.map((f) => (f.id === 'frusta' ? { ...f, nota: NOTA_FRUSTA } : f));
  o.versione_manuale = 'Armamenti 0.74 (02/11/2026) / A.231, A.235';
}

const orig = voce('cyberarma');
orig._nota_peso = 'A.235 (Davide, 02/11/2026): peso e Integrità si registrano per esemplare. 0,5 kg, Qualità Non Comune, PS Integrità 12 e 4 PI sono i valori del supporto originale recuperato da Park (fissati con la A.158) e restano quelli di questa voce; non diventano obbligatori per ogni CyberArma originale. Le modifiche fisiche si annotano sul singolo esemplare (`esemplare.fisico`); la manifestazione energetica non aggiunge peso.';
orig.costruzione = {
  fonte: FONTE,
  chi: 'Soltanto i Custodi costruiscono le CyberArmi originali. Il Tecnomante può studiare e modificare un originale esistente, senza costruirne di nuovi: è superata l’autorizzazione alla costruzione della A.158.',
  procedura_base: {
    chi: 'Custode con Maestro d’Arma',
    passi: [
      { fase: 'Assemblaggio', prova: { abilita: 'Tecnologia', modificatore: -4 }, ore: 16, cr: 1000 },
      { fase: 'Infusione', prova: { abilita: 'Rituali', modificatore: 0 }, ore: 1, cr: 250, pm: 3 },
    ],
    totale: { ore: 17, cr: 1250, pm: 3, nota: 'con il progetto disponibile' },
    progetto: { fase: 'Sviluppo del progetto', prova: { abilita: 'Artefatti', modificatore: 0 }, ore: 4, cr: 100, nota: 'solo se il progetto va sviluppato' },
    nota: 'Costi di realizzazione della configurazione base, non un prezzo universale di vendita. Restano gli esiti delle Prove e le particolarità dell’esemplare.',
  },
  nomi: 'Ogni CyberArma originale ha un nome univoco derivato dal Custode che l’ha creata. Il profilo originario resta nello storico; dopo le modifiche confermate dal Direttore il profilo attuale prende il nome di chi la personalizza (Armamenti 0.74 §7.25, «Denominazione e storico»). I due nomi sono lo stesso esemplare: una sola voce fisica.',
};

const p = orig.progetti.find((x) => x.id === 'paradise-dimitri');
if (!p) throw new Error('progetto paradise-dimitri non trovato');
p.fonte = `${FONTE}; appunti di Dimitri v1.2; scheda «CyberArma Opzioni per Dimitri» 1.0`;
p.descrizione = 'Sulla CyberArma originale di Park, già nell’inventario: preparare la scheggia Verde instabile già posseduta e metterla al posto del frammento Viola, recuperare e integrare il modulo SIN della spada Cybertronic, personalizzare la forma e collaudare. Configurazione a PM personali: 1 AzP e 2 PM per 10 Round, SnT 2, SIN 1 al tiro per colpire con il modulo collegato. Batteria interna e conversione a NeC restano sviluppi successivi.';
p.esemplare_di_partenza = {
  rif: 'armi:cyberarma',
  nome: 'CyberArma Park',
  provenienza: 'CyberArma originale di Park, recuperata',
  focalizzatore: 'Viola',
  corruzione: 'Corruzione 1',
  manifestazione_precedente: 'frusta',
  nota: 'A.231: la frusta era la manifestazione usata da Park; Dimitri non acquisisce le statistiche personali di Park né le capacità del Custode. La voce già presente nell’inventario va verificata e ricondotta a questo esemplare: la sua presenza non certifica che le modifiche siano già state eseguite.',
};
p.giorni = p.giorni.map((g) => ({
  ...g,
  lavoro: { 1: 'Studio e progetto', 2: 'Preparazione della scheggia Verde, sostituzione del Viola e collaudo', 3: 'Recupero e integrazione del modulo SIN dalla spada Cybertronic, personalizzazione della forma e collaudo finale' }[g.n] ?? g.lavoro,
}));
p.componenti = p.componenti.map((c) => (c.id === 'scheggia'
  ? { ...c, nota: 'Prende il posto del frammento Viola come focalizzatore. Si lavora scarica; gli eventuali PM si possono usare prima. Con successo diventa un componente integrato: colore Verde, nessuna riserva di PM, nessuna SnT in più; esce dall’inventario. Un semplice fallimento non la distrugge.' }
  : c.id === 'modulo'
    ? { ...c, nota: 'Il modulo trasferito viene rimosso dalla spada donatrice: la spada perde il proprio SIN; con il circuito elettrico intatto conserva danno ordinario e scariche. Il modulo non trasferisce Elettricità alla CyberArma.' }
    : c));
if (!p.componenti.some((c) => c.id === 'viola')) {
  p.componenti.push({ id: 'viola', nome: 'Frammento Viola estratto', rif: 'artefatti:chroma-viola-frammento', esce: true, nota: 'Estratto dall’esemplare di Park, resta un oggetto separato nell’inventario, con le proprie conseguenze (Corruzione) e la necessità di contenimento: le decide il Direttore (A.231).' });
}
p.regole = [
  'Gli eventuali nuovi tentativi devono rientrare nel tempo e nelle risorse disponibili; un semplice fallimento non distrugge automaticamente la scheggia.',
  'Le risorse indicate sono materiali e consumabili. I componenti già posseduti e il lavoro svolto personalmente non vengono acquistati di nuovo; la tariffa del servizio completo non si somma automaticamente.',
  'Il programma non registra come già eseguiti gli interventi: li conferma soltanto il Direttore, che rende disponibile il profilo modificato con «Consegna l’arma».',
  '«Consegna l’arma» aggiorna lo stesso esemplare, conservandone provenienza e storico: nessuna seconda CyberArma (A.231).',
  'Il profilo del Custode di Park rimane distinto: danni e Talenti personali di Park non passano all’utilizzatore.',
  'La forma la sceglie il giocatore e si registra nel progetto. Batteria interna e conversione a NeC restano sviluppi successivi, non compresi in questi tre giorni.',
];
p.risultato = { ...p.risultato, nome: 'CyberArma Dimitri', aggiorna_esemplare: true };

console.log('CyberArma: A.235 (forme, frusta, peso per esemplare, costruzione solo Custodi) e A.231 (progetto sull’esemplare di Park).');
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(F, `${JSON.stringify(armi, null, 2)}\n`);
  console.log('scritto data/equipaggiamento/armi.json');
}
