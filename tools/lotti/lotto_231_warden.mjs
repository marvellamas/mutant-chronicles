// Lotto 231 (20/11/2026) — Magia 1.20 §28.6 «Dotazioni rimovibili del Warden TC»: le tre ricette entrano nel catalogo degli Artefatti (idempotente).
//  - Modulo Individuare 6 (Grado II, Non Comune, SnT 2) e Modulo Esorcizzare Corruzione 12 (Grado IV, Molto Rara, SnT 4): ciascuno con una
//    riserva **propria, integrata, a Cariche, Esclusiva, di 6 CM Verdi** (`contenitore.capacita_cm`: il validatore la vuole intera);
//    1 CM per scansione, 3 CM per trattamento: costi interi (`attivazione_artefatto.cm`);
//  - Cofanetto del Silenzio corazzato (Grado IV, Molto Rara, **SnT 0, nessuna CM**): è un artefatto a **sole proprietà passive** (Isolamento corruttivo),
//    quindi la SnT 0 è la regola del §7.10 per i soli passivi — nessuna eccezione alla catena Grado → potenza → rarità → SnT (la catena
//    del Grado non si applica ai soli passivi: validate.js, `proprieta_attive: false`). Non è il Cofanetto del Silenzio ordinario del §10.13.3
//    (legno, 20 × 14 × 8 cm, Corruzione 1 per alloggiamento): id e nome distinti;
//  - prezzi: **la cifra scritta nel manuale** (2.200/9.900, 4.200/37.800, 3.000/27.000), che qui coincide con costo × 3 × coefficiente (A.256);
//  - quello che il manuale non dice resta `da_definire`, mai un numero: peso, Qualità, PS Integrità, PI e Reperibilità dei due moduli
//    (il §28.6 dà massa, Qualità, PS, PI e AR solo del Cofanetto); Reperibilità anche del Cofanetto;
//  - i due «Verdi» dei dati sono due cose diverse e questa è la terza: qui «Verde» è il colore della **riserva** (come l'Anello con Rigenerazione 9),
//    non un potere sempre attivo (focalizzatore della CyberArma) né un potere da 5 Round (Armonia della Spada dei Tre Riflessi);
//  - la scheda del mezzo (Veicoli §17.10) non è leggibile (Doc da 63 MB): il veicolo Warden TC non entra, i tre oggetti sì, perché il §28.6 li descrive «autonomi».
// Uso: node tools/lotti/lotto_231_warden.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'data/equipaggiamento/artefatti.json';
const E = 'Magia 1.20';
const comune = { tipo: 'artefatto', catalogo: 'Artefatti di campagna', famiglia: 'Artefatti', nomi_alternativi: [], paragrafo: 'Magia §28.6', versione_manuale: E, indossabile: false, proprieta: [] };
const NOTA_MODULO = 'Modulo tecnomistico rimovibile e autonomo della dotazione dell’Alleanza (Warden TC, Veicoli §17.10): non rende tecnomistico il veicolo ospitante; sintonia e riserva riguardano il singolo modulo; smontato richiede un’installazione compatibile. Riserva autonoma di 6 CM Verdi, Esclusiva: le CM non sono PM prelevabili, non alimentano l’altro modulo e restano separate dalle riserve tecnologiche. Un operatore sintonizzato a entrambi i moduli impegna SnT 6; due operatori possono gestirli separatamente. ';
const RICARICA = ' Ricarica: un modulo vuoto richiede 36 PM personali per ripristinare 6 CM al rapporto ordinario 3:1 (6 PM per CM); 4 PM per CM con rapporto 2:1, 2 PM per CM con 1:1; restano requisiti, Azioni e Prove della ricarica mistica (Magia §28.6). La ricetta è specifica, calibrata sui Guanti da Combattimento Mistico: non introduce una conversione generale tra PM degli Incantesimi e CM.';
const ds = (voce) => ({ ...voce });
const voci = [
  ds({
    id: 'modulo-individuare-6-warden-tc', nome: 'Modulo Individuare 6 (Warden TC)', ...comune,
    note_manuale: NOTA_MODULO + 'Localizzazione tecnomistica — Individuare 6: Grado II, Non Comune, SnT 2; 1 CM per scansione, sei utilizzi a piena riserva; 1 AzP automatica dopo la sintonia; Concentrazione fino a dieci minuti oppure cinque rnd fissi; portata 10 Q Base (15 m), analisi di un’area totale di 1 Q. Collegato alla console dei sensori: percezione di presenza e direzione oppure analisi di una fonte e categoria per rnd. Riconosce l’impronta OS, ma non diagnostica la Corruzione personale; visualizzazione e registrazione non estendono la portata mistica. Restano informazioni e limiti della versione completa di Individuare 6.' + RICARICA,
    artefatto: { tipologia: 'Accessori', potenza: 'Non Comune', sintonizzazione: 2, sintonizzabile: true, proprieta_attive: true, grado: 'II', contenitore: { energia: 'Verde', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 6 } },
    attivazione_artefatto: { nome: 'Localizzazione tecnomistica', azione: '1 AzP (automatica dopo la sintonia)', durata: 'Concentrazione fino a dieci minuti, oppure cinque rnd fissi', cm: 1, condizione: 'Portata 10 Q Base (15 m); analisi di un’area totale di 1 Q. Percezione di presenza e direzione, oppure analisi di una fonte e categoria per rnd. Riconosce l’impronta OS, non diagnostica la Corruzione personale. 1 CM intera per scansione.', fonte: 'Magia 1.20 §28.6' },
    costo: 9900, creazione_cr: 2200, peso: null,
    da_definire: ['peso', 'qualita', 'ps_int', 'pi', 'reperibilita'],
    _nota_prezzo: 'A.256: creazione 2.200 cr (supporto 500 + nucleo da 6 CM 1.200 + reagenti 500) × 3 × coefficiente 1,5 (Non Comune) = 9.900 cr: la cifra del manuale («Vendita indicativa»).',
  }),
  ds({
    id: 'modulo-esorcizzare-corruzione-12-warden-tc', nome: 'Modulo Esorcizzare Corruzione 12 (Warden TC)', ...comune,
    note_manuale: NOTA_MODULO + 'Decontaminazione mistica — Esorcizzare Corruzione 12: Grado IV, Molto Rara, SnT 4; 3 CM per trattamento, due trattamenti a piena riserva. Procedura: dieci minuti fuori dal combattimento, con Concentrazione dell’operatore; le CM si spendono all’inizio. Beneficiari: fino a due creature viventi consenzienti oppure incoscienti soccorse, entro 6 Q Base (9 m), visibili e concatenati entro 2 Q. Effetto: riduce due Stati CROS per beneficiario, con massimo Stato iniziale Caotico (Caotico diventa Corrotto; Corrotto diventa Contagiato). Una sola applicazione efficace ogni 24 ore per beneficiario, considerando insieme tutte le fonti. Non cura Oscuro, non rimuove mutazioni permanenti o possessioni. Un’interruzione impedisce l’effetto e consuma le CM impegnate. Ciclo combinato: dieci minuti, una carica MEC Blu, una dose di consumabili e 3 CM; la Concentrazione resta a carico dell’operatore. Le altre condizioni seguono la versione completa dell’Incantesimo. Ricarica di un trattamento: 18 PM personali a 3:1.' + RICARICA,
    artefatto: { tipologia: 'Accessori', potenza: 'Molto Rara', sintonizzazione: 4, sintonizzabile: true, proprieta_attive: true, grado: 'IV', contenitore: { energia: 'Verde', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 6 } },
    attivazione_artefatto: { nome: 'Decontaminazione mistica', azione: '10 minuti fuori dal combattimento, con Concentrazione dell’operatore', durata: 'Dieci minuti (procedura); l’effetto è istantaneo a fine procedura', cm: 3, condizione: 'Fino a due creature viventi consenzienti oppure incoscienti soccorse, entro 6 Q Base (9 m). Riduce due Stati CROS per beneficiario (massimo Stato iniziale Caotico). Una sola applicazione efficace ogni 24 ore per beneficiario. Un’interruzione impedisce l’effetto e consuma le 3 CM. 3 CM intere per trattamento.', fonte: 'Magia 1.20 §28.6' },
    costo: 37800, creazione_cr: 4200, peso: null,
    da_definire: ['peso', 'qualita', 'ps_int', 'pi', 'reperibilita'],
    _nota_prezzo: 'A.256: creazione 4.200 cr (supporto/adattamento 1.000 + nucleo da 6 CM 1.200 + reagenti 2.000) × 3 × coefficiente 3 (Molto Rara) = 37.800 cr: la cifra del manuale («Vendita indicativa»).',
  }),
  ds({
    id: 'cofanetto-del-silenzio-corazzato-warden-tc', nome: 'Cofanetto del Silenzio corazzato (Warden TC)', ...comune,
    note_manuale: 'Terzo contenitore della dotazione del Warden TC, aggiuntivo ai due moduli tecnici, in alloggiamento sganciabile; non è il Cofanetto del Silenzio ordinario del §10.13.3. Dimensioni esterne 50 × 50 × 50 cm, utili 40 × 40 × 40 cm; massa a vuoto 50 kg, carico del contenuto massimo 100 kg; Qualità Rara, PS 14, 10 PI, AR 4. Grado IV, Molto Rara, SnT 0, nessuna CM (solo proprietà passiva: Isolamento corruttivo). Capacità mistica: tre punti complessivi di Corruzione degli oggetti (un oggetto con Corruzione 3 oppure tre con Corruzione 1). Contiene le emanazioni oscure e corruttive del contenuto, anche a veicolo spento e senza operatore, a contenuto interamente riposto, cofanetto chiuso e integro; aprire o compromettere chiusura o rivestimento interrompe l’isolamento, richiuderlo integro lo ripristina. Non purifica gli oggetti e non rimuove conseguenze già applicate; fonti oltre la capacità richiedono un contenimento superiore. Costruzione: supporto 1.000 cr + infusione passiva 2.000 cr.',
    artefatto: { tipologia: 'Accessori', potenza: 'Molto Rara', sintonizzazione: 0, sintonizzabile: false, proprieta_attive: false, grado: 'IV' },
    schermatura: { corruzione: 3, capacita: 'complessiva', snt: 0, fonte: 'Magia 1.20 §28.6', testo: 'Chiuso e integro, con il contenuto interamente riposto, contiene le emanazioni oscure e corruttive fino a tre punti complessivi di Corruzione degli oggetti (un oggetto con Corruzione 3, oppure tre con Corruzione 1), anche a veicolo spento e senza operatore. Aprirlo o compromettere chiusura o rivestimento la fa cessare; richiuderlo integro la ripristina. Non purifica e non rimuove conseguenze già applicate.' },
    costo: 27000, creazione_cr: 3000, peso: 50, qualita: 'Rara', ps_int: 14, pi: 10, ar: 4,
    da_definire: ['reperibilita'],
    _nota_prezzo: 'A.256: creazione 3.000 cr (supporto 1.000 + infusione passiva 2.000) × 3 × coefficiente 3 (Molto Rara) = 27.000 cr: la cifra del manuale («Vendita indicativa»). Dotazione mistica complessiva del Warden TC 74.700 cr (9.900 + 37.800 + 27.000), compresa nel prezzo arrotondato del veicolo.',
  }),
];
const t = readFileSync(F, 'utf8');
const nuove = voci.filter((v) => !t.includes(`"id": "${v.id}"`));
if (!nuove.length) { console.log('già presenti: niente da fare'); process.exit(0); }
const ancora = '\n  ],\n  "fuori_scala": {';
if (!t.includes(ancora)) throw new Error('ancora non trovata');
const blocco = nuove.map((v) => '    ' + JSON.stringify(v, null, 2).split('\n').join('\n    ')).join(',\n');
if (process.argv.includes('--scrivi')) { writeFileSync(F, t.replace(ancora, ',\n' + blocco + ancora)); console.log(`scritte ${nuove.length} voci`); }
else console.log(`a secco (${nuove.length} voci): --scrivi per scrivere`);
