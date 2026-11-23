// Lotto 238 (23/11/2026) — il trasporto di un veicolo a bordo di una nave, e il recupero dello scudo.
//
// Marcello ha deciso sui tre campi del lotto 237: si modellano tutti e tre — ingombro di trasporto, recupero
// dello scudo, piazzola di parcheggio (che va con l'ingombro, come era l'ipotesi). **Qui si costruisce il
// modello, non il catalogo:** i ventuno mezzi dei capitoli 16 e 17 restano fuori finché la A.304 non dice quali
// servono al tavolo.
//
// **Il vano di carico esisteva già?** No, e conta averlo guardato prima di scriverne un secondo: la Neverlost
// (lotto 158) ha `carico_kg: 50000` — una massa — e la `planimetria` come testo, ma **nessuna misura del vano**;
// `volume_utile_m3` (lotto 209) è il volume del vano merci del furgone, un'altra cosa e un'altra unità. Il dato
// vero sta nel manuale e non era nei dati: Veicoli 0.23 §11, «Ogni stiva laterale ha un portellone anteriore con
// un'apertura utile di 4,5 m di larghezza (3 Q Base) e 3,5 m di altezza. Ogni rampa è larga 4,5 m e ha una
// portata di 10 t». Si scrive **come il manuale lo dà** — un'apertura e una portata, non un volume — così non
// nasce un secondo campo per la stessa cosa: è la classe di guasto di cui parliamo da venti lotti.
//
// **Le misure dello Scout** vengono dalla scheda ASA Scout MK4 0.6, letta col lotto 235 e non applicata allora
// perché la serata era quella sera: «Dimensioni in trasporto (L × l × h) | 6 × 2,6 × 2,7 m» e «Il FIAT LUX pesa
// 4.500 kg a vuoto… A pieno carico il veicolo pesa 6.000 kg». Il manuale dei Veicoli ripete l'altezza nel §11
// («Il FIAT LUX è alto 2,7 m in assetto di trasporto e pesa 4,5 t a vuoto»). Nessun numero è dedotto: 4.500 +
// 1.500 = 6.000 è la somma che il manuale stesso scrive.
//
// **Il recupero dello scudo c'era già** nel profilo della Neverlost dal lotto 158 (`scudo.recupero`: 3 Round
// senza colpi, 20 ScE per Round): questo lotto non aggiunge il dato, aggiunge il **contatore nel record** e la
// regola generale del §16 («Dopo tre rnd consecutivi senza essere colpito, lo scudo recupera gli ScE indicati
// nella propria scheda, fino al massimo»).
//
// Uso: node tools/lotti/lotto_238_trasporto.mjs [--scrivi]

import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_238_trasporto.mjs'], 'lotto_238_trasporto.mjs');
const scrivi = process.argv.includes('--scrivi');
const F = new URL('../../data/veicoli.json', import.meta.url);
const EDIZIONE = '0.23';

/** Le regole del trasporto: la nota del §16, parola per parola, e le due frasi che la scheda scrive. */
const TRASPORTO = {
  paragrafo: '§11 (le stive della Neverlost); §16, nota «Trasporto»',
  versione_manuale: `Veicoli ${EDIZIONE}; scheda ASA Scout MK4 0.6`,
  testo: 'Gli ingombri di trasporto si riferiscono all’assetto specificato nella scheda, con antenne ed eventuali parti mobili ripiegate. Le piazzole consigliate escludono i corridoi comuni. La massa a pieno carico indicata serve al dimensionamento della stiva e delle rampe.',
  confronti: [
    { misura: 'larghezza', contro: 'l’apertura del portellone' },
    { misura: 'altezza', contro: 'l’apertura del portellone' },
    { misura: 'massa a pieno carico', contro: 'la portata della rampa' },
  ],
  _nota_lunghezza: 'La lunghezza non si confronta con l’apertura: una stiva è più lunga del suo portellone, e il manuale non dà la profondità della stiva. Resta scritta nell’ingombro e la giudica il Direttore.',
  segnala: 'È un avviso, non un divieto: decide il Direttore.',
  manca: 'Il dato manca e non si ricava da massa, posti o taglia: lo giudica il Direttore.',
  _nota_manca: 'A.296, lo stesso principio delle capienze: una misura che il manuale non dà **manca**. Dedurla dalla massa, dai posti o dall’ingombro sulla mappa darebbe un numero inventato che sembra un dato.',
  da_mostrare: [
    { campo: 'bagagliaio_litri', nome: 'Bagagliaio complessivo', unita: 'litri', _fonte: 'Veicoli 0.23 §18.1 e §18.3' },
    { campo: 'vano_sicurezza_litri', nome: 'Vano di sicurezza', unita: 'litri', _fonte: 'Veicoli 0.23 §18.1 e §18.3' },
    { campo: 'bagagliaio_libero_litri', nome: 'Bagagliaio libero oltre al vano di sicurezza', unita: 'litri', _fonte: 'Veicoli 0.23 §18.1 e §18.3' },
    { campo: 'passaggio_libero', nome: 'Passaggio libero consigliato', unita: 'm', _fonte: 'Veicoli 0.23 §16 (le rampe pedonali dei Carrier) e la nota «Trasporto»' },
  ],
  _nota_da_mostrare: 'Lotto 238, punto C: questi quattro si LEGGONO e non calcolano niente. Il bagagliaio è un volume in litri che il manuale dà per sé (e il «libero» è una sottrazione che il manuale fa già); il passaggio libero consigliato è una condizione che giudica il Direttore, non un confronto. Oggi nessun profilo del catalogo li ha, perché sono dei mezzi dei capitoli 18 e 16 che aspettano la A.304: l’elenco sta qui così che i loro valori compaiano senza toccare il codice (src/trasporto-veicolo.js → datiDaMostrare).',
  fuori_dal_modello: [
    {
      campo: 'lunghezza con cannone rivolto in avanti',
      esempio: 'Bastion TC: 12 × 6 m di scafo, 13,5 m col cannone in avanti',
      perche: 'È un ingombro che dipende da come è girata la torretta, e sulla mappa l’arma non ha un orientamento proprio: l’arco di tiro è un dato del profilo e la mappa non lo controlla. Modellarlo vuol dire un orientamento della torretta separato da quello dello scafo, una sagoma che cambia col suo valore, ingombri e zone di controllo ricalcolati a ogni rotazione, e la rete geometrica del lotto 182 da rifare.',
      a_che_cosa_servirebbe: 'A un carro con la torretta in avanti che deve passare in un varco misurato: un portellone, un ponte, una galleria. Finché quella scena non si presenta, il valore si legge sulla scheda e lo giudica il Direttore.',
    },
  ],
  _nota_altezze: 'Dove il manuale dà due altezze — il Bastion TC ha «3,3 m allo scafo; 4,5 m alla postazione più alta» — si tengono entrambe e quale conta per il trasporto lo dichiara il manuale, non noi: l’ingombro di trasporto dello stesso mezzo è «12 × 6 × 4,5 m», cioè la più alta. Se un profilo avesse due altezze e nessun ingombro di trasporto, l’app lo direbbe invece di scegliere la più comoda (src/trasporto-veicolo.js → altezzaDiTrasporto).',
};

/** La stiva della Neverlost, come il §11 la scrive: un'apertura utile e una portata, non un volume. */
const STIVA_NEVERLOST = {
  nome: 'Stiva laterale',
  quante: 2,
  apertura: { larghezza_m: 4.5, larghezza_q: 3, altezza_m: 3.5 },
  rampa: { larghezza_m: 4.5, portata_kg: 10000 },
  paragrafo: '§11',
  nota: 'Ogni stiva laterale ha un portellone anteriore con l’apertura utile indicata; ogni rampa è larga 4,5 m e porta 10 t. Il manuale non dà la profondità della stiva, quindi la lunghezza del mezzo non si confronta: la giudica il Direttore.',
};

/** Le misure di trasporto dello Scout: dalla scheda 0.6 e dal §11, non dedotte. */
const SCOUT = {
  altezza: { m: 2.7, _fonte: 'scheda ASA Scout MK4 0.6, «Dimensioni in trasporto (L × l × h) | 6 × 2,6 × 2,7 m»; Veicoli 0.23 §11, «Il FIAT LUX è alto 2,7 m in assetto di trasporto»', assetto: 'di trasporto' },
  ingombro_trasporto: { lunghezza_m: 6, larghezza_m: 2.6, altezza_m: 2.7, _fonte: 'scheda ASA Scout MK4 0.6, «Dimensioni in trasporto (L × l × h)»' },
  massa_kg: 4500,
  _fonte_massa: 'scheda ASA Scout MK4 0.6, «Il FIAT LUX pesa 4.500 kg a vuoto, con le dotazioni fisse di bordo… A pieno carico il veicolo pesa 6.000 kg» (4.500 + 1.500 di carico utile: la somma la scrive il manuale)',
};

function main() {
  const j = JSON.parse(readFileSync(F, 'utf8'));
  const prof = (id) => {
    const p = j.profili.find((x) => x.id === id);
    if (!p) throw new Error(`data/veicoli.json: non trovo il profilo ${id}`);
    return p;
  };
  const fatti = [];

  // 1) le regole del trasporto
  if (j.trasporto) fatti.push('trasporto: già presente, non riscritto');
  else { j.trasporto = TRASPORTO; fatti.push(`trasporto: regole del §16 e confronti (${TRASPORTO.confronti.length})`); }

  // 2) la stiva della Neverlost: il vano di carico non c'era, e si scrive come il manuale lo dà
  const nev = prof('neverlost');
  if (nev.stiva) fatti.push('neverlost.stiva: già presente');
  else {
    nev.stiva = STIVA_NEVERLOST;
    nev._edizione.campi.stiva = EDIZIONE;
    fatti.push('neverlost.stiva: apertura 4,5 × 3,5 m, rampa 4,5 m e 10 t (§11) — nei dati non c’era');
  }
  // lo scudo: il recupero c'era già dal lotto 158, e si dichiara la regola generale del §16
  if (!nev.scudo.recupero) throw new Error('neverlost.scudo.recupero: dovrebbe esserci dal lotto 158');
  if (!nev.scudo.recupero._regola) {
    nev.scudo.recupero._regola = 'Veicoli 0.23 §16, «Scudi dei carri»: «Dopo tre rnd consecutivi senza essere colpito, lo scudo recupera gli ScE indicati nella propria scheda, fino al massimo. Il recupero è compreso nell’ora pagata.» Il profilo dice quanto recupera, il record quanto ha adesso (sessione del mezzo): il contatore sta nel record e si muove solo dentro uno scontro aperto (src/scudo-veicolo.js).';
    fatti.push('neverlost.scudo.recupero: la regola del §16 dichiarata accanto ai numeri del lotto 158 (3 Round, 20 ScE)');
  }

  // 3) le misure di trasporto dello Scout, sui due profili che condividono lo scafo
  for (const id of ['asa-scout-mk4', 'asa-scout-t4']) {
    const p = prof(id);
    if (p.altezza && p.ingombro_trasporto) { fatti.push(`${id}: misure di trasporto già presenti`); continue; }
    p.altezza = JSON.parse(JSON.stringify(SCOUT.altezza));
    p.ingombro_trasporto = JSON.parse(JSON.stringify(SCOUT.ingombro_trasporto));
    p.massa_kg = SCOUT.massa_kg;
    p._fonte_massa = SCOUT._fonte_massa;
    for (const k of ['altezza', 'ingombro_trasporto', 'massa_kg']) p._edizione.campi[k] = EDIZIONE;
    fatti.push(`${id}: altezza 2,7 m, ingombro di trasporto 6 × 2,6 × 2,7 m, massa a vuoto 4.500 kg (scheda 0.6, §11)`);
  }

  // 4) il conto, misurato sui dati e non scritto a mano (lotto 237)
  const C = j.corpus;
  C.profili = j.profili.length;
  C.mezzi_nel_manuale = j.profili.length + (j.fuori_catalogo?.mezzi?.length ?? 0);
  C.campi_letti = Object.fromEntries(j.profili.filter((p) => p._edizione?.campi).map((p) => [p.id, Object.keys(p._edizione.campi).length]));
  const fuoriEdizione = [];
  for (const p of j.profili) for (const [k, ed] of Object.entries(p._edizione?.campi ?? {})) if (ed !== C.edizione) fuoriEdizione.push({ profilo: p.id, campo: k, edizione: ed });
  C.campi_indietro = fuoriEdizione.length;
  const vecchi = new Map((C.motivi_indietro ?? []).map((m) => [`${m.profilo}.${m.campo}`, m]));
  C.motivi_indietro = fuoriEdizione.map((x) => vecchi.get(`${x.profilo}.${x.campo}`) ?? {
    profilo: x.profilo, campo: x.campo, edizione: x.edizione,
    motivo: `letto dalla ${EDIZIONE} nel lotto 238 (trasporto e scudo): è avanti rispetto al resto del catalogo, non indietro`,
    _perché: `Lotto 238: il campo viene dal §11 o dalla nota «Trasporto» del §16 della ${EDIZIONE}, o dalla scheda ASA Scout MK4 0.6. Non è un campo rimasto indietro: è avanti rispetto all’edizione del corpus, che resta la 0.21 perché i ventuno mezzi dei capitoli 16 e 17 non sono recepiti (A.304).`,
  });
  fatti.push(`conto: ${C.profili} profili, ${Object.values(C.campi_letti).reduce((a, b) => a + b, 0)} campi letti, ${C.campi_indietro} fuori dall’edizione del corpus`);

  console.log(`lotto 238 — trasporto e recupero dello scudo (Veicoli ${EDIZIONE} §11 e §16; scheda ASA Scout 0.6)`);
  for (const r of fatti) console.log('  · ' + r);
  console.log('  i ventuno mezzi dei capitoli 16 e 17 restano fuori: qui c’è il modello, non il catalogo (A.304).');

  if (!scrivi) { console.log('\n(sola lettura: --scrivi per applicare)'); return; }
  writeFileSync(F, JSON.stringify(j, null, 1) + '\n');
  console.log('\nscritto data/veicoli.json');
}

main();
