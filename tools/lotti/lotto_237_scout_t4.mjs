// Lotto 237 (23/11/2026) — due profili, non uno modificato: lo Scout T4 di serie e il FIAT LUX dei PG.
//
// **Il buco che chiude.** Dal lotto 229 nei dati `asa-scout-mk4` era un profilo solo e faceva due lavori: il
// modello di serie dell'Alleanza e il FIAT LUX dei sette. Il lotto 229 non lo aveva toccato perché cambiargli
// arma e prezzo avrebbe spostato di 6.000 cr il valore di un mezzo dei personaggi, e la separazione era una
// nostra ricostruzione. Dal lotto 236 il manuale la scrive, quindi si può fare su quello che c'è scritto:
//
//   §16.1 — «Il modello corrente dell'Alleanza, precedentemente denominato Scout MK4, assume il nome Scout T4.
//   […] Lo Scout T4 di serie e il FIAT LUX dell'ASA storica mantengono schede distinte.»
//
//   cap. 10 — «Lo Scout T4 descritto nel catalogo è il modello generico dell'Alleanza non personalizzato, con
//   Punisher e prezzo standard completo di 132.510 cr. Il FIAT LUX resta lo Scout MK4 ASA dei PG, un esemplare
//   storico di oltre 600 anni con mitragliatore Capitol M606 e ricambi difficili da reperire. Il suo valore
//   effettivo può essere inferiore al prezzo di catalogo; la valutazione spetta al Direttore, senza sconto
//   percentuale o nuovo importo prestabilito. Denominazione, armamento storico e modifiche di Petra del FIAT LUX
//   restano distinti dal modello di serie.»
//
// **Che cosa fa, e cosa NON fa.**
//  - **aggiunge** il profilo `asa-scout-t4`, col Mitragliatore Leggero Punisher (§7.28 degli Armamenti, già nel
//    catalogo dal lotto 229) e il prezzo completo di 132.510 cr. I campi che il manuale dà nel capitolo 10 e che
//    i due condividono — telaio, PI, AR, MOV/MAN, Qualità, riparazioni, alimentazione, supporto vitale, corredo,
//    sistemi, proprietà — sono gli stessi: è lo stesso scafo;
//  - **non tocca** `asa-scout-mk4`: il FIAT LUX non prende l'arma nuova, non prende il prezzo nuovo, conserva il
//    Capitol M606 col suo arco frontale di 180° (A.280), i copriruote di Petra e i suoi 126.510 cr. Il solo
//    campo che si aggiunge è una **frase del manuale** sulla valutazione (vedi sotto);
//  - **non crea nessun record** e non ricollega niente. Il profilo è il modello, il record è il mezzo che i PG
//    hanno: la distinzione del lotto 185 e della A.295, e la lezione del 201 sui riferimenti rotti. Nel registro
//    dell'istantanea del 21/11 l'unico record su questo profilo è il FIAT LUX (`veimvozx57q0`), e resta dov'è.
//
// **Il valore effettivo del FIAT LUX non lo calcola l'app.** Il manuale dice che la valutazione spetta al
// Direttore «senza sconto percentuale o nuovo importo prestabilito»: quindi nei dati non c'è una percentuale e
// non c'è una cifra, c'è la frase. L'app continua a mostrare le tre righe della A.257 (modello base, dotazione
// extra, totale) e il campo `valore_stimato_cr` dell'esemplare, che scrive solo il Direttore: è il principio di
// CLAUDE.md — propone, non forza — e qui è il manuale a chiederlo.
//
// **Non recepisce i mezzi dei capitoli 16 e 17:** la A.304 (quanti di quei mezzi servono al tavolo?) non ha
// risposta, e modellarne ventuno che il gruppo non userà è il lavoro che non vogliamo fare.
//
// Uso: node tools/lotti/lotto_237_scout_t4.mjs [--scrivi]

import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_237_scout_t4.mjs'], 'lotto_237_scout_t4.mjs');
const scrivi = process.argv.includes('--scrivi');
const F = new URL('../../data/veicoli.json', import.meta.url);
const EDIZIONE = '0.23';

/** I campi che il capitolo 10 dà per lo Scout T4, letti dal testo della 0.23 nel lotto 236. */
const T4 = {
  id: 'asa-scout-t4',
  nome: 'Scout T4',
  paragrafo: '§10; §16.1 (denominazione); scheda del veicolo 0.20',
  descrizione: 'Ricognitore Scout T4 dell’Alleanza, modello generico non personalizzato. Quattro grandi ruote rinforzate, carrozzeria corazzata a pannelli modulari, cabina chiusa con vetri rinforzati e mitragliatore leggero su rotaia presso la botola superiore.',
  prezzo_cr: 132510,
  arma: {
    nome: 'Mitragliatore Leggero Punisher',
    rif: 'armi_distanza_corporative:mitragliatore-leggero-punisher',
    prezzo_cr: 25000,
    operatore: 'artigliere, uno degli occupanti',
    postazione: 'Postazione manuale presso la botola, su supporto',
    abilita: 'Armi pesanti',
    danno: '1d8+3',
    ac: 1,
    va_arma: 1,
    forza: 6,
    gittata_q: 600,
    capacita: 400,
    inc: 6,
    mani: 2,
    modalita: ['Raffica Media', 'Raffica Lunga', 'Fuoco di Soppressione'],
    pi: 8,
    qualita_arma: 'Non comune',
    ps_integrita_arma: 12,
    imbracciata_dal_supporto: true,
    munizioni_iniziali: { caricate: 400, riserva: 400 },
    _nota_va: 'Il +1 VA appartiene al profilo del Punisher (Armamenti §7.28): il supporto mantiene l’arma Imbracciata e non concede bonus autonomi al tiro (Veicoli 0.23 §10).',
    _nota_arco: 'Il manuale non dà un arco di tiro per il Punisher del modello di serie, e non si inventa: l’arco frontale di 180° della A.280 è una risposta sul Capitol M606 del FIAT LUX e resta lì. Qui vale la postazione come la descrive il §10, con i limiti degli ostacoli reali; l’arco lo decide il Direttore finché il manuale non lo scrive (A.310).',
  },
  valore_voci: [
    { voce: 'Telaio e sistemi fissi (comunicatore ponte, navigatore, sensori, impianto di supporto vitale)', cr: 90000 },
    { voce: 'Mitragliatore Leggero Punisher', cr: 25000 },
    { voce: 'Accumulatori installati pieni (MEC Rosso 3.000, CEC Verde 1.000)', cr: 4000 },
    { voce: 'Tre bombole veicolari piene da 8 ore', cr: 3000 },
    { voce: 'Munizioni e contenitori: 400 colpi caricati e 400 di riserva, due contenitori per nastro', cr: 2800 },
    { voce: 'Corredo (attrezzi, cric, ruote, cavo, estintori, pronto soccorso, razioni, acqua, lanterna, pala, teli, cavi)', cr: 7710 },
  ],
  nota_valore: 'Prezzo standard completo del modello generico dell’Alleanza (Veicoli 0.23 §10: «con Punisher e prezzo standard completo di 132.510 cr»): telaio 90.000 + Punisher 25.000 + accumulatori pieni 4.000 + bombole piene 3.000 + munizioni e contenitori 2.800 + corredo 7.710. È il prezzo di catalogo di un mezzo nuovo non personalizzato: non è il valore di un esemplare usato, che segue la A.257.',
};

/** La frase del manuale sulla valutazione del FIAT LUX: una frase, non una percentuale e non una cifra. */
const VALUTAZIONE = {
  testo: 'Il valore effettivo di questo esemplare può essere inferiore al prezzo di catalogo: è un mezzo storico di oltre 600 anni, con ricambi difficili da reperire. La valutazione spetta al Direttore.',
  _fonte: 'Veicoli 0.23 §10: «Il suo valore effettivo può essere inferiore al prezzo di catalogo; la valutazione spetta al Direttore, senza sconto percentuale o nuovo importo prestabilito.»',
  senza_sconto_percentuale: true,
  senza_importo_prestabilito: true,
  _nota: 'Lotto 237: il manuale chiede esattamente quello che l’app fa già con la A.257 — tre righe (modello base, dotazione extra, totale) e il campo `valore_stimato_cr` che scrive solo il Direttore — ma non lo diceva da nessuna parte nella scheda. Qui c’è la frase, e **non** una percentuale né un importo: scriverli sarebbe inventare quello che il manuale vieta di prestabilire. Un test lo tiene fermo (tests/scout-t4-237.test.js).',
};

/** I campi che i due profili condividono, perché è lo stesso scafo: si copiano dal profilo del FIAT LUX. */
const CONDIVISI = ['tipo', 'equipaggio', 'dimensioni', 'carico_kg', 'mov_q', 'man', 'qualita', 'ps_integrita', 'ar',
  'corazzato', 'pi', 'valore_telaio_cr', 'reperibilita', 'ricambi_cr_per_pi', 'officina_cr_per_ora',
  'kit_riparazione', 'alimentazione', 'supporto_vitale', 'proprieta', 'sistemi', 'dotazione', 'ambiente'];

function main() {
  const j = JSON.parse(readFileSync(F, 'utf8'));
  const mk4 = j.profili.find((p) => p.id === 'asa-scout-mk4');
  if (!mk4) throw new Error('data/veicoli.json: non trovo il profilo asa-scout-mk4');

  const fatti = [];

  // 1) il profilo nuovo, se non c'è già
  if (j.profili.some((p) => p.id === T4.id)) fatti.push(`${T4.id}: già presente, non riscritto`);
  else {
    const nuovo = {
      id: T4.id, nome: T4.nome, paragrafo: T4.paragrafo, tipo: mk4.tipo, descrizione: T4.descrizione,
      ...Object.fromEntries(CONDIVISI.filter((k) => mk4[k] !== undefined).map((k) => [k, JSON.parse(JSON.stringify(mk4[k]))])),
      prezzo_cr: T4.prezzo_cr,
      valore_voci: T4.valore_voci,
      nota_valore: T4.nota_valore,
      armi: [T4.arma],
      _nota: 'Lotto 237: il modello di serie dell’Alleanza, distinto dal FIAT LUX dei PG come dicono il §16.1 e il capitolo 10 della 0.23. Lo scafo è lo stesso (PI, AR, MOV/MAN, Qualità, riparazioni, alimentazione, corredo); cambiano il nome, l’arma (Mitragliatore Leggero Punisher al posto del Capitol M606) e il prezzo completo (132.510 contro 126.510 cr). Non ha i copriruote di Petra, che sono una modifica del FIAT LUX, e non ha un `nome_esemplare`: è un modello di catalogo, non un esemplare.',
      _edizione: { corrente: EDIZIONE, campi: {} },
    };
    // la mappa: lo stesso token dello scafo, che è lo stesso mezzo
    if (mk4.mappa) nuovo.mappa = JSON.parse(JSON.stringify(mk4.mappa));
    // A.193 non si applica: di questo profilo non esiste nessun esemplare, quindi non c'è nessuna riserva salvata
    // in Lx da convertire. Lo dichiariamo come la motocicletta e il furgone del lotto 209, invece di copiare le
    // capacità di prima di un altro mezzo — che sarebbe un dato inventato.
    nuovo.senza_energia_precedente = true;
    nuovo._nota_senza_energia = 'Lotto 237: profilo nuovo, nessun esemplare registrato, quindi nessuna riserva salvata col modello in Lx da convertire (A.193). Il giorno in cui un PG comprasse uno Scout T4 nascerebbe già col modello a cariche.';
    // la provenienza per campo: quelli letti adesso dalla 0.23, gli altri da dove vengono nel FIAT LUX
    for (const k of ['prezzo_cr', 'armi', 'valore_voci']) nuovo._edizione.campi[k] = EDIZIONE;
    for (const k of CONDIVISI) if (nuovo[k] !== undefined) nuovo._edizione.campi[k] = mk4._edizione?.campi?.[k] ?? mk4._edizione?.corrente ?? mk4._edizione?.edizione;
    // l'indice: subito dopo il FIAT LUX, perché è lo stesso scafo e si leggono vicini
    j.profili.splice(j.profili.findIndex((p) => p.id === 'asa-scout-mk4') + 1, 0, nuovo);
    fatti.push(`${T4.id}: profilo nuovo («${T4.nome}», ${T4.prezzo_cr} cr, ${T4.arma.nome})`);
  }

  // 2) il FIAT LUX: la sola frase della valutazione, nessun numero
  if (mk4.valutazione_direttore) fatti.push('asa-scout-mk4.valutazione_direttore: già presente');
  else {
    mk4.valutazione_direttore = VALUTAZIONE;
    fatti.push('asa-scout-mk4: aggiunta la frase della valutazione (nessuna percentuale, nessun importo)');
  }
  // e il rimando al modello di serie, perché chi legge la scheda sappia che sono due
  if (!mk4.modello_di_serie) {
    mk4.modello_di_serie = { id: T4.id, nome: T4.nome, fonte: 'Veicoli 0.23 §16.1: «Lo Scout T4 di serie e il FIAT LUX dell’ASA storica mantengono schede distinte.»' };
    fatti.push('asa-scout-mk4: rimando al modello di serie (schede distinte, §16.1)');
  }

  // 3) il conto, che il validatore pretende. **Si misura sui dati, non si scrive a mano**: un conto scritto a mano
  //    è un posto in più in cui restare indietro in silenzio (la lezione del 189).
  const C = j.corpus;
  C.profili = j.profili.length;
  C.mezzi_nel_manuale = j.profili.length + (j.fuori_catalogo?.mezzi?.length ?? 0);
  C.campi_letti = Object.fromEntries(j.profili.filter((p) => p._edizione?.campi).map((p) => [p.id, Object.keys(p._edizione.campi).length]));
  const fuoriEdizione = [];
  for (const p of j.profili) for (const [k, ed] of Object.entries(p._edizione?.campi ?? {})) if (ed !== C.edizione) fuoriEdizione.push({ profilo: p.id, campo: k, edizione: ed });
  C.campi_indietro = fuoriEdizione.length;
  C.motivi_indietro = fuoriEdizione.map((x) => ({
    profilo: x.profilo, campo: x.campo, edizione: x.edizione,
    // Il motivo si LEGGE sulla carta del mezzo, quindi è una frase corta e senza enfasi del Markdown: nel lotto 203
    // gli asterischi dell'enfasi erano finiti sullo schermo, e qui erano tornati. Il perché per esteso sta accanto,
    // in un campo che la scheda non mostra.
    motivo: x.edizione === EDIZIONE
      ? `letto dalla ${EDIZIONE} in questo lotto (capitolo 10): è avanti rispetto al resto del catalogo, non indietro`
      : `il catalogo resta alla ${x.edizione} finché la A.304 non dice quali mezzi dei capitoli 16 e 17 servono al tavolo`,
    _perché: x.edizione === EDIZIONE
      ? `Lotto 237: nome, Mitragliatore Leggero Punisher e prezzo standard completo di 132.510 cr vengono dal capitolo 10 della ${EDIZIONE}. Non è un campo rimasto indietro: è avanti rispetto all’edizione del corpus, che resta la 0.21 perché gli altri profili non sono stati rigenerati. Il validatore chiama «indietro» ogni campo di un’edizione diversa dalla corrente, e il senso della regola — nessuna distanza in silenzio — vale in tutte e due le direzioni.`
      : `I ventuno mezzi dei capitoli 16 e 17 e i due del 18 non sono recepiti: la A.304 chiede a Davide quanti di quei mezzi servono davvero al tavolo, e modellarne ventuno che il gruppo non userà è il lavoro che non vogliamo fare. Fino alla risposta questo profilo resta all’edizione da cui viene.`,
  }));
  fatti.push(`conto: ${C.profili} profili, ${C.mezzi_nel_manuale} mezzi dichiarati, ${Object.values(C.campi_letti).reduce((a, b) => a + b, 0)} campi letti, ${C.campi_indietro} fuori dall’edizione del corpus`);
  if (!C._nota_avanti) C._nota_avanti = 'Lotto 237: da qui in avanti il conto campi_indietro conta i campi di un edizione DIVERSA da quella del corpus, in tutte e due le direzioni. I tre campi dello Scout T4 vengono dalla 0.23 e sono avanti; tutti gli altri profili sono alla 0.21 o alla 0.19 e sono indietro. Il senso della regola non cambia: nessuna distanza resta in silenzio, e ognuna ha il suo motivo scritto.';

  console.log(`lotto 237 — Scout T4 di serie e FIAT LUX, schede distinte (Veicoli ${EDIZIONE} §10 e §16.1)`);
  for (const r of fatti) console.log('  · ' + r);
  console.log(`  profili nel catalogo: ${j.profili.length}`);
  console.log('  il FIAT LUX NON cambia: arma, prezzo, copriruote e PI restano quelli che erano.');

  if (!scrivi) { console.log('\n(sola lettura: --scrivi per applicare)'); return; }
  writeFileSync(F, JSON.stringify(j, null, 1) + '\n');
  console.log('\nscritto data/veicoli.json');
}

main();
