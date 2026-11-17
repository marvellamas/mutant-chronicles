// A.271 (Davide, E&L 11/11/2026; Armamenti 0.86 §7.25.4), lotto 209: la CyberArma di Dimitri è il modello giusto?
//
// La risposta di Davide dice: «l'attuale CyberArma di Dimitri ha focalizzatore Verde e non ha ancora il SIN installato,
// né CM o NeC». Nel suo file (copia dell'11/11, istantanea del 14 e del 15/11) la voce è `armi:cyberarma-batteria-verde`
// con 5 CM: è la CyberArma **con la riserva interna**, cioè un'arma che non ha. Questo strumento la riporta
// all'originale (`armi:cyberarma`, alimentata con i PM personali, SnT 2 per il Tecnomante) e scrive nell'esemplare che
// il focalizzatore Verde è già installato.
//
// **Di suo legge e basta.** Senza `--scrivi` dice che cosa farebbe, con i numeri, e non tocca nessun file. Con
// `--scrivi`:
//   - agisce sul **file attuale** del personaggio (lotto 200: `tools/personaggi-cartella.mjs`, mai le versioni vecchie);
//   - prima di scrivere salva accanto una copia `<file>.prima-a271` (senza `.json`: la cartella dei personaggi non la
//     vede come un personaggio) con il contenuto esatto di prima;
//   - scrive **una riga nello storico** del personaggio, con ciò che c'era e ciò che c'è;
//   - è **idempotente**: dopo la prima volta la voce è quella giusta e non c'è più niente da fare.
//
// **Che cosa non fa, di proposito.** Non crea il frammento Viola (la risposta non dice dove sia: lo decide il Direttore,
// A.246), non toglie nessuna delle schegge Verdi (una potrebbe essere quella integrata, e non si deduce), non cambia il
// nome in niente che il manuale non dica, non tocca i PM del personaggio e non apre nessun progetto. E non agisce su
// una voce che il Direttore ha consegnato lui (`consegna`) o ricondotto (`esemplare.nome`): quella è una conversione voluta.
//
//   node tools/correggi-cyberarma-dimitri.mjs --cartella=<cartella personaggi>                  che cosa farebbe
//   node tools/correggi-cyberarma-dimitri.mjs --cartella=<cartella personaggi> --scrivi          applica
//   --nome="Dimitri Orlav" è il predefinito; con due personaggi dallo stesso nome si ferma e non sceglie.
//
// Sulla cartella vera lo lancia Davide dal suo PC; qui le prove si fanno su copie (tools/cartella-di-prova.mjs).
import './guardia-subito.mjs';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { rigaStorico } from '../src/storico.js';
import { scriviPersonaggio } from './scrivi-personaggio.mjs';
import { conversioneDellaVoce, alimentazioneDellaVoce, famigliaAlimentazione, consumoAlimentazione } from '../src/cyberarma.js';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { personaggiDellaCartella, trovaPersonaggio, rigaSuCosa } from './personaggi-cartella.mjs';
import { cartellaDati } from './dati-pc.mjs';

export const VOCE_GIUSTA = 'armi:cyberarma';
export const FOCALIZZATORE = 'Verde';
export const NOME_ESEMPLARE = 'CyberArma Dimitri';
export const NOME_ORIGINALE = 'CyberArma Park';

/** Le voci da correggere: una conversione (CM, NeC) che nessuno ha consegnato né ricondotto. Il resto non si tocca. */
export function vociDaCorreggere(equipaggiamento, dati) {
  return (equipaggiamento ?? []).filter((v) => conversioneDellaVoce(v?.rif, dati)
    && !v.consegna && !v.esemplare?.nome && !(Array.isArray(v.esemplare?.storico) && v.esemplare.storico.length));
}

/**
 * L'autonomia dell'arma, con i numeri della A.260 (15/11/2026): 1 attivazione = 1 AzP e il suo costo, **10 Round**
 * indipendentemente da attacchi, colpi o Azioni. Con i PM personali il costo è 2 PM (Tecnomante, profilo ordinario);
 * con una riserva interna 1 CM; con un NeC Rosso 1 carica.
 */
export function autonomia({ pmAttuali, pmMassimi, cm = null }, dati) {
  const uso = dati?.equipaggiamento?.file?.armi?.oggetti?.find((o) => o.id === 'cyberarma')?.uso_per_classe?.classi?.find((c) => c.classe === 'Tecnomante');
  const costoPm = uso?.pm ?? 2;
  const round = uso?.round ?? 10;
  const per = (n, costo) => { const a = Math.floor(n / costo); return { attivazioni: a, round: a * round }; };
  return {
    costoPm, round,
    pmPersonali: { pmAttuali, pmMassimi, ora: per(pmAttuali, costoPm), pieno: per(pmMassimi, costoPm) },
    riservaCm: cm === null ? null : { cm, ...per(cm, consumoAlimentazione('riserva_cm', dati)?.cm ?? 1) },
  };
}

/** Il rapporto sul personaggio: che cosa c'è, che cosa diventerebbe, i numeri. Funzione pura: non scrive niente. */
export function rapporto(personaggio, dati) {
  const c = personaggio.creazione;
  const s = calcolaScheda(personaggio, dati);
  const m = massimiSessione(s, c, dati);
  const da = vociDaCorreggere(c.equipaggiamento, dati);
  const sessione = personaggio.sessione ?? {};
  const eq = c.equipaggiamento ?? [];
  const schegge = eq.filter((v) => /scheggia-instabile.*verde/.test(v.rif ?? ''));
  const pmMassimi = Number.isFinite(m?.pm) ? m.pm : (Number.isFinite(s.pm) ? s.pm : null);
  const out = { voci: [], avvisi: [], daDecidere: [], nome: c.nome };
  for (const v of da) {
    const conv = conversioneDellaVoce(v.rif, dati);
    const cm = sessione.chroma?.[v.uid]?.pmAttuali ?? null;
    out.voci.push({
      uid: v.uid, rifPrima: v.rif, rifDopo: VOCE_GIUSTA, conversione: conv.nome, cmPrima: cm, unita: sessione.chroma?.[v.uid]?.unita ?? null,
      statoVoce: v.stato, mano: v.mano ?? null,
    });
  }
  const pmAttuali = Number.isFinite(sessione.pmAttuali) ? sessione.pmAttuali : null;
  out.pm = { attuali: pmAttuali, massimi: pmMassimi };
  const pmMax = pmMassimi;
  if (pmMax !== null) out.autonomia = autonomia({ pmAttuali: pmAttuali ?? pmMax, pmMassimi: pmMax, cm: da[0] ? (sessione.chroma?.[da[0].uid]?.pmAttuali ?? null) : null }, dati);
  if (schegge.length) out.daDecidere.push(`Nell'inventario ci sono ${schegge.length} schegge instabili Verdi: una potrebbe essere quella già stabilizzata e integrata nell'arma (§7.25.3). Lo strumento non ne toglie nessuna: lo decide il Direttore.`);
  out.daDecidere.push('Il frammento Viola rimosso non è nell\'inventario e la risposta non dice dove sia: lo strumento non lo crea (A.246, decisione del Direttore).');
  if (!da.length) {
    const gia = eq.find((v) => v.rif === VOCE_GIUSTA);
    out.avvisi.push(gia ? `Niente da correggere: la CyberArma è già «${gia.rif}»${gia.esemplare?.focalizzatore ? ` (focalizzatore ${gia.esemplare.focalizzatore})` : ''}.` : 'Niente da correggere: nessuna CyberArma con riserva interna o NeC da correggere.');
  }
  if (da.length > 1) out.avvisi.push(`Ci sono ${da.length} CyberArme con una conversione: non scelgo io quale correggere.`);
  return out;
}

/**
 * Applica la correzione a un personaggio **in memoria**: torna `{ creazione, sessione, righe }` oppure `{ niente }`.
 * La voce diventa l'originale, con il focalizzatore Verde e l'alimentazione con i PM personali dichiarati; la riserva di CM
 * che non esiste esce dalla sessione; lo storico dell'esemplare racconta le due tappe e quello del personaggio ha una riga.
 */
export function correggi(personaggio, dati, adesso = new Date()) {
  const c = personaggio.creazione;
  const da = vociDaCorreggere(c.equipaggiamento, dati);
  if (da.length !== 1) return { niente: da.length ? 'più di una CyberArma con conversione: non scelgo io' : 'niente da correggere' };
  const v = da[0];
  const conv = conversioneDellaVoce(v.rif, dati);
  const quando = adesso.toISOString();
  const f = famigliaAlimentazione('cristallo', dati);
  const sessione0 = personaggio.sessione ?? {};
  const riserva = sessione0.chroma?.[v.uid] ?? null;
  const voce = {
    ...v,
    rif: VOCE_GIUSTA,
    esemplare: {
      ...(typeof v.esemplare === 'object' && v.esemplare ? v.esemplare : {}),
      nome: NOME_ESEMPLARE,
      nome_originale: NOME_ORIGINALE,
      provenienza: 'esemplare recuperato da Park a Paradise',
      focalizzatore: FOCALIZZATORE,
      configurazione: f?.nome ?? 'Cristallo sostituito',
      alimentazione: { id: 'cristallo', pm_personali: true, proprieta_custode: true },
      storico: [
        { quando, nome: NOME_ORIGINALE, cosa: 'profilo originale dell’esemplare recuperato da Park (focalizzatore Viola, Corruzione 1), prima delle modifiche (Armamenti 0.86 §7.25.4)', da: 'tools/correggi-cyberarma-dimitri.mjs' },
        { quando, nome: NOME_ESEMPLARE, esito: 'corretto (A.271)', cosa: `focalizzatore Verde al posto del Viola; nessuna SIN, riserva di CM o NeC; alimentazione con i PM personali. La voce era «${v.rif}»${riserva ? ` con ${riserva.pmAttuali} CM` : ''}: non descriveva l’arma che Dimitri ha (E&L 11/11/2026)`, da: 'tools/correggi-cyberarma-dimitri.mjs' },
      ],
    },
  };
  const { [v.uid]: _tolta, ...chroma } = sessione0.chroma ?? {};
  const testo = `A.271: la CyberArma era «${v.rif}»${riserva ? ` con ${riserva.pmAttuali} ${riserva.unita ?? 'PM'}` : ''}, ma l’arma non ha né SIN né riserva né NeC: ora è «${VOCE_GIUSTA}» con focalizzatore ${FOCALIZZATORE}, alimentata con i PM personali (tools/correggi-cyberarma-dimitri.mjs)`;
  const sessione = rigaStorico({ ...sessione0, chroma }, testo, adesso);
  return {
    creazione: { ...c, equipaggiamento: c.equipaggiamento.map((x) => (x.uid === v.uid ? voce : x)) },
    sessione, riga: testo, uid: v.uid, riserva,
  };
}

const arg = (nome, argv) => argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? null;

async function principale() {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['correggi-cyberarma-dimitri.mjs'], 'correggi-cyberarma-dimitri.mjs');
  const scrivi = argv.includes('--scrivi');
  const cartella = arg('cartella', argv) ?? join(cartellaDati(join(fileURLToPath(import.meta.url), '..', '..')).cartella, 'personaggi');
  const chi = arg('nome', argv) ?? 'Dimitri Orlav';
  const lista = personaggiDellaCartella(cartella);
  console.log(rigaSuCosa(lista, cartella));
  const t = trovaPersonaggio(lista, chi);
  if (!t.ok) { console.error(t.motivo); process.exit(2); }
  const radice = new URL('../', import.meta.url);
  const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
  const testoFile = readFileSync(t.voce.percorso, 'utf8');
  const pg = deserializzaPersonaggio(testoFile);
  const personaggio = { creazione: normalizza(pg.creazione, dati).scelte, livelli: pg.livelli ?? [], sessione: pg.sessione };
  const r = rapporto(personaggio, dati);
  console.log(`\n${t.voce.nome} — file attuale: ${t.voce.file}${t.voce.versioni > 1 ? ` (le altre ${t.voce.versioni - 1} versioni non si toccano)` : ''}`);
  for (const x of r.voci) {
    console.log(`- ${x.rifPrima} (${x.conversione}${x.cmPrima !== null ? `, ${x.cmPrima} ${x.unita ?? ''}` : ''}) → ${x.rifDopo}: focalizzatore ${FOCALIZZATORE}, PM personali, nessuna riserva`);
  }
  for (const a of r.avvisi) console.log(`- ${a}`);
  if (r.autonomia) {
    const a = r.autonomia;
    console.log(`\nAutonomia con la A.260 (1 attivazione = 1 AzP + ${a.costoPm} PM = ${a.round} Round, qualunque cosa si faccia):`);
    console.log(`  PM personali, ora (${a.pmPersonali.pmAttuali}/${a.pmPersonali.pmMassimi} PM): ${a.pmPersonali.ora.attivazioni} attivazioni = ${a.pmPersonali.ora.round} Round; a PM pieni ${a.pmPersonali.pieno.attivazioni} = ${a.pmPersonali.pieno.round} Round (i PM servono anche agli Incantesimi)`);
    if (a.riservaCm) console.log(`  quella che la voce sbagliata prometteva (riserva di ${a.riservaCm.cm} CM): ${a.riservaCm.attivazioni} attivazioni = ${a.riservaCm.round} Round — un'arma che Dimitri non ha`);
  }
  for (const d of r.daDecidere) console.log(`! ${d}`);
  const adesso = new Date();
  const c = correggi(personaggio, dati, adesso);
  if (c.niente) { console.log(`\n${c.niente}.`); return; }
  if (!scrivi) { console.log('\n(nessun file toccato; --scrivi per applicare: copia di sicurezza accanto, una riga nello storico)'); return; }
  const copia = `${t.voce.percorso}.prima-a271`;
  if (!existsSync(copia)) copyFileSync(t.voce.percorso, copia);
  const vecchio = JSON.parse(testoFile);
  const m = massimiSessione(calcolaScheda({ creazione: c.creazione, livelli: personaggio.livelli }, dati), c.creazione, dati);
  const sessione = allineaSessione(c.sessione, m);
  // i metadati di salvataggio (versione, quando, da chi) li scrive l'app a ogni salvataggio e `serializza` non li porta: senza
  // questo passaggio il file perderebbe `versione_salvataggio` e `aggiornato_*`, che il server e il confronto fra versioni leggono
  scriviPersonaggio(t.voce.percorso, JSON.parse(serializza(c.creazione, { versioniDati: vecchio.versioni_dati, livelli: personaggio.livelli, sessione, calendario: pg.calendario, pg: pg.pg })), { chi: 'master', quando: adesso });
  console.log(`\nScritto ${t.voce.file}. Copia di prima: ${t.voce.file}.prima-a271. Riga nello storico: «${c.riga}»`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await principale();
