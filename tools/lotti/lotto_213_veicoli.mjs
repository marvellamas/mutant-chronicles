// Lotto 213 (17/11/2026) — **il Manuale dei Veicoli 0.19: i profili del catalogo alla loro edizione, campo per campo, e le astronavi dichiarate.**
//
// Il registro era alla 0.10 con la 0.19 «in attesa» (209: moto e furgone presi, il resto no). Qui il manuale si recepisce: i numeri di scheda dei cinque
// profili (autovettura, Scout, Neverlost, moto, furgone) si leggono dalla 0.19 (`tools/importa-veicoli.mjs`), si confrontano, e ognuno porta la sua
// provenienza in `_edizione.campi`. **Una lettura parziale non si scrive mai sopra un valore buono** (`unisciProfilo`). I capitoli 14 e 15 (quattro
// astronavi) non hanno un profilo e **sono dichiarati** in `fuori_catalogo`, con il motivo e ciò che servirebbe: un mezzo senza profilo non resta fuori in silenzio.
//
// IL PROFILO NON È IL RECORD. Questo generatore scrive soltanto `data/veicoli.json`: i record del registro (`veicoli/`: PI attuali, munizioni, riserve,
// storico) non li legge e non li può toccare. `tests/veicoli-record-213.test.js` prova che il profilo di prima e quello di dopo danno, su record veri, la stessa vista.
//
//   node tools/lotti/lotto_213_veicoli.mjs            — che cosa scriverebbe
//   node tools/lotti/lotto_213_veicoli.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';
import { testoManuale, versioneManuale } from '../manuali.mjs';
import { leggiSchede, CAPITOLO_PROFILO, CAPITOLI_FUORI_CATALOGO, confronta } from '../importa-veicoli.mjs';

const FILE = 'data/veicoli.json';

/** campo letto dal manuale → come si chiama nel profilo del catalogo. */
export const CAMPO_DATO = { mov: 'mov_q', man: 'man', pi: 'pi', ar: 'ar', corazzato: 'corazzato', qualita: 'qualita', ps_integrita: 'ps_integrita', carico_kg: 'carico_kg', prezzo_cr: 'prezzo_cr', ricambi: 'ricambi_cr_per_pi' };

export const FUORI_CATALOGO = {
  capitoli: CAPITOLI_FUORI_CATALOGO,
  mezzi: [
    { id: 'nave-mineraria', nome: 'Nave mineraria Commerciale', paragrafo: '§14.1' },
    { id: 'rimorchiatore', nome: 'Rimorchiatore Commerciale', paragrafo: '§14.2' },
    { id: 'nave-passeggeri-lusso', nome: 'Nave passeggeri Commerciale, allestimento Lusso', paragrafo: '§15 (§15.5)' },
    { id: 'nave-passeggeri-sonno', nome: 'Nave passeggeri Commerciale, allestimento Sonno', paragrafo: '§15 (§15.6)' },
  ],
  motivo: 'Sono astronavi civili della categoria Spaziali con un modello che l’app non ha, e il gruppo non ne possiede nessuna: non vale un lotto adesso. Non mancano un campo o due: manca un modello. La Neverlost ne ha una versione scritta a mano per l’esemplare unico (src/neverlost.js); le quattro schede non entrano finché nessuno non la generalizza.',
  servirebbe: [
    'Tre riserve di cariche per colore (Rosso, Blu, Verde) con il consumo per attività — volo per regime, stazionamento, estrazione, Traiettoria, ingresso e uscita — invece della sola CEC Rossa dei mezzi terrestri (la Neverlost le ha, in `src/neverlost.js`, non in forma generale).',
    'Movimento per regime in km/h atmosferici e spaziali e in Q Tattici per Round (3/6/9), invece del MOV in Q Base: la mappa ha già la conversione di scala (A.225), non i regimi.',
    'Traiettoria in giorni con ingresso e uscita da 1 carica Blu, e il sostentamento in giornate-persona (50 cr a persona al giorno): per la Neverlost è codice dedicato.',
    'Equipaggio e postazioni (estrazione a 20 t/h con 4 cariche Rosse all’ora; rimorchio con regimi ridotti e MAN −2), cabine e occupanti, stiva in m³ e carico in tonnellate.',
    'Per le navi passeggeri: allestimenti (48 passeggeri svegli o 144 in capsule), tariffe al giorno per passeggero (250 e 30 cr) e la traversata di riferimento di 20 giorni.',
    'Un record del registro con riserve per colore, giorni di Traiettoria e scorte: oggi il record ha le sole strutture, una CEC e le munizioni.',
  ],
};

/**
 * Il profilo con i campi letti dal manuale. Regola del 204: **un campo non letto per intero (undefined/null, o con un numero che non è un numero)
 * non sovrascrive mai un valore buono**; un campo letto per intero e diverso si scrive, con la sua provenienza; uno uguale prende solo la provenienza.
 * Torna { profilo, scritti: [campo], tenuti: [{campo, motivo}], provenienza }.
 */
export function unisciProfilo(profilo, campiLetti, edizione) {
  const nuovo = structuredClone(profilo);
  const scritti = []; const tenuti = []; const prov = { ...(profilo._edizione?.campi ?? {}) };
  const sano = (k, v) => v !== undefined && v !== null && !(typeof v === 'number' && !Number.isFinite(v)) && !(k === 'pi' && !(v && ['corpo', 'propulsione', 'motore'].every((s) => Number.isFinite(v[s]))));
  for (const [k, dato] of Object.entries(CAMPO_DATO)) {
    const letto = k === 'ar' ? campiLetti.ar : campiLetti[k];
    if (!sano(k, letto)) { if (k in campiLetti) tenuti.push({ campo: dato, motivo: 'letto in modo incompleto' }); continue; }
    const attuale = k === 'ar' ? profilo.ar?.totale : profilo[dato];
    if (JSON.stringify(letto) !== JSON.stringify(attuale)) {
      if (k === 'ar') nuovo.ar = { ...(nuovo.ar ?? {}), totale: letto }; else nuovo[dato] = letto;
      scritti.push(dato);
    }
    prov[dato] = edizione;
  }
  nuovo._edizione = { corrente: edizione, campi: prov };
  return { profilo: nuovo, scritti, tenuti };
}

export function piano(radice = '.', testo = testoManuale('veicoli'), edizione = versioneManuale('veicoli')) {
  const dati = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const schede = leggiSchede(testo);
  const conf = confronta(schede, dati.profili);
  const nuovi = structuredClone(dati);
  const scritti = []; const tenuti = [];
  nuovi.profili = dati.profili.map((p) => {
    const cap = Object.entries(CAPITOLO_PROFILO).find(([, id]) => id === p.id)?.[0];
    if (!cap || !schede[cap]) return p;
    const r = unisciProfilo(p, schede[cap].campi, edizione);
    for (const c of r.scritti) scritti.push(`${p.id}.${c}`);
    for (const t of r.tenuti) tenuti.push({ profilo: p.id, ...t });
    return r.profilo;
  });
  const letti = Object.fromEntries(nuovi.profili.filter((p) => p._edizione).map((p) => [p.id, Object.keys(p._edizione.campi).length]));
  const indietro = nuovi.profili.reduce((n, p) => n + Object.values(p._edizione?.campi ?? {}).filter((e) => e !== edizione).length, 0);
  nuovi.versione_manuale = dati.versione_manuale.replace(/^Veicoli 0\.\d+ \(Google Doc del 02\/10\/2026, 13:31 UTC\)/, `Veicoli ${edizione} (Google Doc del 12/11/2026, 19:49 UTC)`);
  // le citazioni «Veicoli 0.10» dei profili passano alla 0.19: i numeri che citano sono gli stessi (rete del lettore sulla 0.10 e sulla 0.19)
  for (const p of nuovi.profili) {
    if (typeof p.versione_manuale === 'string') p.versione_manuale = p.versione_manuale.replace('Veicoli 0.10', `Veicoli ${edizione}`);
    if (typeof p.paragrafo === 'string') p.paragrafo = p.paragrafo.replace('Veicoli 0.10, «Neverlost scheda del veicolo»', `Veicoli ${edizione} §11 «Neverlost e combattimento navale»`);
  }
  nuovi.fuori_catalogo = FUORI_CATALOGO;
  nuovi.corpus = {
    edizione, mezzi_nel_manuale: nuovi.profili.length + FUORI_CATALOGO.mezzi.length, profili: nuovi.profili.length, fuori_catalogo: FUORI_CATALOGO.mezzi.length,
    campi_letti: letti, campi_indietro: indietro, motivi_indietro: tenuti,
    non_letti: 'Equipaggio, posti, dimensioni, massa, autonomia, armi e dotazioni, scudo, riserve e tabelle di regole (capitoli 1–8) non vengono dal lettore delle schede: si confrontano con le tabelle identiche della 0.10 (lotto 209: tutte le tabelle dei capitoli 1–11 sono uguali fra le due edizioni). Il lettore le dichiara «non lette» per capitolo.',
    confronto_lotto_213: dati.corpus?.confronto_lotto_213 ?? { base: 'Veicoli 0.10 (l’edizione da cui i profili venivano)', scarti_sulla_010: 0, scarti_sulla_019: conf.scarti.length, scritti, nuovi_campi_con_provenienza: Object.values(letti).reduce((a, b) => a + b, 0) },
  };
  return { dati, nuovi, conf, scritti, tenuti, indietro };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_213_veicoli.mjs'], 'lotto_213_veicoli.mjs');
  const p = piano();
  console.log(`Veicoli ${versioneManuale('veicoli')}: scarti sui campi letti ${p.conf.scarti.length}; scritti ${JSON.stringify(p.scritti)}; tenuti ${JSON.stringify(p.tenuti)}; indietro ${p.indietro}`);
  console.log(JSON.stringify(p.nuovi.corpus.campo_letti ?? p.nuovi.corpus.campi_letti));
  if (argv.includes('--scrivi')) {
    const nuovo = `${JSON.stringify(p.nuovi, null, 2)}\n`;
    if (nuovo === readFileSync(FILE, 'utf8')) console.log('già scritto: niente da fare');
    else { writeFileSync(FILE, nuovo); console.log(`scritto ${FILE}`); }
  } else console.log('(prova: niente scritto; --scrivi per applicare)');
}
