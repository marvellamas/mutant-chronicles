// Lotto 204 (16/11/2026): il Bestiario arriva alla 0.69 **campo per campo**, e ogni campo dice da dove viene.
//
// Uso:  node tools/lotti/lotto_204_provenienza.mjs [--scrivi]
//
// **Che cosa ha lasciato aperto il lotto 203.** Lì il corpus è passato alla 0.69 nei soli PV: scrivere le altre
// letture avrebbe svuotato gli attacchi di 29 schede, perché il lettore era scritto sull'impaginazione della 0.46.
// La decisione era giusta e il risultato era invisibile — una scheda mezza 0.69 e mezza 0.47, e al tavolo nessuno
// poteva accorgersene guardandola. Questo lotto chiude le due metà: il lettore impara l'impaginazione nuova
// (tools/importa-mostri.mjs) e ogni campo porta scritto da quale edizione viene (src/provenienza-bestiario.js).
//
// **La regola, in una riga:** un campo o si legge per intero, e allora si scrive, o si dichiara non letto, e
// allora si tiene quello di prima — con scritto da dove viene. Non si scrive mai una lettura parziale sopra un
// valore buono: un elenco di due attacchi su cinque è plausibile, non è vuoto, ed è sbagliato.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importa, leggiEsistenti, norm, nomeCanonico } from '../importa-mostri.mjs';
import { testoManuale, registro } from '../manuali.mjs';
import { unisciPerCampo, CAMPI, quadroProvenienza } from '../../src/provenienza-bestiario.js';

const RADICE = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** L'edizione corrente del Manuale dei Mostri, dal registro: non si scrive a mano (nona regola, lotto 191). */
export const edizioneMostri = () => `Mostri ${registro().manuali.find((m) => m.id === 'mostri').versione}`;
/** L'edizione da cui viene quello che c'era prima di questo lotto, quando il file non la dichiara per campo. */
export const EDIZIONE_PRIMA = 'Mostri 0.47';
/** Le schede che vengono dal manuale ma da una lettura dichiarata del testo, non dal lettore (lotto 203, §7.12). */
export const DICHIARATE_DAL_TESTO = ['Dragomedusa giovane', 'Dragomedusa adulto'];

/**
 * **Da quale campo parla un «non capito».**
 *
 * La distinzione che regge tutto il lotto, e che va letta prima di aggiungere una riga qui:
 *
 *  - **non letto** — il lettore non ha ottenuto il dato: l'attacco è finito fra le capacità, l'ingombro non c'è,
 *    l'Abilità è rimasta un testo. Il campo **non si scrive**: resta quello di prima, con la sua edizione.
 *  - **riserva dichiarata** — il dato c'è ed è giusto per il formato, ma il manuale dice più di quanto il formato
 *    possa contenere: due Difese dove ce n'è una, due forme dove c'è un movimento. Il campo **si scrive**, e la
 *    riserva resta scritta nelle note. Trattarla come «non letta» vorrebbe dire buttare un dato buono.
 *
 * Un motivo che non è in questo elenco non rende nessun campo non letto, e resta visibile nel rapporto: un elenco
 * che cresce in silenzio è il modo in cui un campo smette di essere controllato.
 */
export const CAMPO_DEL_MOTIVO = [
  [/non importato come attacco|portata non letta|portata non scritta|Tabella degli attacchi assente/i, 'attacchi'],
  [/GS e PX non letti/i, 'gs_px'],
  [/Ingombro non letto/i, 'spazio'],
  [/Abilità con condizione o forma non letta|Abilità fuori elenco/i, 'abilita'],
  [/Azioni \(AzP\/AzM\) non scritte/i, 'azioni'],
];
/** Le riserve: motivi che NON rendono il campo non letto (vedi sopra). */
export const RISERVE = /Due Difese scritte|Due forme con movimento|portata in Q Tattici|modalità di fuoco assunta|AR con varianti|Iniziativa «[^»]*» senza bonus|Terra \d+ o|Solo movimento|AC \d+ degli attacchi presa|Pagine comuni del blocco|Tabella «[^»]*» \(\d+ celle\)|Attacchi letti da una tabella a colonne/i;

/**
 * I numeri che le capacità di prima avevano e che la lettura nuova non ha da nessuna parte. `1d10` non si conta:
 * è il dado dell'Iniziativa, che sta in ogni scheda e non è un dato di questa creatura.
 */
export function numeriPersi(vecchia, letta) {
  if (!vecchia?.capacita?.length) return [];
  const testo = JSON.stringify(letta ?? {});
  const fuori = [];
  // una capacità **con nome** che sparisce del tutto è una lettura incompleta quanto un numero che manca: i tratti
  // comuni del blocco (Melma, Corpo amorfo, Aderenza) nella 0.69 stanno nelle pagine comuni, che il lettore aggancia
  // solo ai blocchi dichiarati in GRUPPI_COMUNI. Finché non li aggancia tutti, quelle schede tengono le loro.
  const nomiNuovi = new Set((letta?.capacita ?? []).map((c) => String(c.nome ?? '').toLowerCase()));
  for (const c of vecchia.capacita) {
    const nome = String(c.nome ?? '').toLowerCase();
    if (nome && !nomiNuovi.has(nome) && ![...nomiNuovi].some((x) => x.includes(nome) || nome.includes(x))) {
      fuori.push(`capacità «${c.nome}» non più letta`);
    }
  }
  for (const c of vecchia.capacita) {
    for (const m of String(c.effetto ?? '').matchAll(/\b\d+(?:d\d+)?(?:\+\d+)?\b/g)) {
      if (m[0] === '1d10' || testo.includes(m[0])) continue;
      if (!fuori.includes(`${c.nome}: ${m[0]}`)) fuori.push(`${c.nome}: ${m[0]}`);
    }
  }
  return fuori;
}

/** I campi che una lettura NON ha letto per intero: `{ campo: motivo }`. */
export function campiNonLetti(nonCapito = []) {
  const out = {};
  for (const m of nonCapito) {
    if (RISERVE.test(m)) continue;
    for (const [re, campo] of CAMPO_DEL_MOTIVO) {
      if (re.test(m) && !out[campo]) { out[campo] = m; break; }
    }
  }
  return out;
}

/** Che cosa cambierebbe, senza scrivere niente. */
export function piano({ testo = null, edizione = edizioneMostri() } = {}) {
  const { risultati } = importa(testo ?? testoManuale('mostri'));
  const perNome = leggiEsistenti();
  const voci = []; const nuove = []; const fuoriManuale = []; const motiviIgnoti = new Map();

  for (const r of risultati) {
    const e = perNome.get(norm(nomeCanonico(r.nome)));
    const letta = r.json ?? r.anteprima ?? null;
    if (!letta) {
      // il lettore non produce niente per questa pagina: se la scheda c'è, resta intatta
      if (e) voci.push({ file: e.file, nome: e.nemico.nome, id: e.nemico.id, esito: null, intatta: r.esclusa ?? 'nessuna lettura' });
      continue;
    }
    const nonLetti = campiNonLetti(r.nonCapito);
    // **Le capacità: un criterio meccanico, non un giudizio sulla prosa.** La 0.69 ha riscritto i testi, e un testo
    // riscritto non è un testo perso. Ma in alcune schede ha **spostato** un dato nelle pagine comuni del blocco
    // (l'Armatura animata non dice più «Scurovisione 12 Q»: lo dice «Oggetti animati regole comuni»), e quelle
    // pagine il lettore non le aggancia a tutti i blocchi. Il segno che un dato è andato perso, e non solo
    // riscritto, è un **numero** che c'era e non si ritrova: i numeri sono quello che al tavolo si usa.
    const vecchiaQui = e ? e.nemico : null;
    // un attacco letto **senza AC** è letto a metà: l'AC dice quante applicazioni costa, e la 0.69 la scrive nelle
    // pagine comuni del blocco, che il lettore aggancia solo ai blocchi dichiarati in GRUPPI_COMUNI.
    if (!nonLetti.attacchi
      && (vecchiaQui?.attacchi ?? []).some((a) => a.ac !== undefined)
      && (letta.attacchi ?? []).some((a) => a.ac === undefined)) {
      nonLetti.attacchi = 'attacchi letti senza AC: la 0.69 la scrive nelle pagine comuni del blocco, che il lettore non aggancia a questo blocco';
    }
    const persi = numeriPersi(vecchiaQui, letta);
    if (persi.length) nonLetti.capacita = `numeri delle capacità che la lettura nuova non ha (${persi.slice(0, 6).join(', ')}${persi.length > 6 ? ', …' : ''}): la 0.69 li ha spostati nelle pagine comuni del blocco, che il lettore non aggancia a questo blocco`;
    for (const m of r.nonCapito ?? []) {
      if (RISERVE.test(m) || CAMPO_DEL_MOTIVO.some(([re]) => re.test(m))) continue;
      const k = m.replace(/«[^»]*»/g, '«…»').replace(/\d+/g, 'N');
      motiviIgnoti.set(k, (motiviIgnoti.get(k) ?? 0) + 1);
    }
    const vecchia = e ? e.nemico : null;
    // **Attenzione a che cosa significa `_bestiario.edizione` scritta dal lotto 203:** vuol dire «questa scheda è
    // passata per il 203», non «ogni suo campo viene dalla 0.69» — lì si erano letti i soli PV. Quindi un campo che
    // non dichiara la propria provenienza viene dalla 0.47, non dall'edizione scritta sulla scheda. Prenderla da lì
    // sarebbe il difetto che questo lotto esiste per chiudere, commesso una seconda volta.
    const esito = unisciPerCampo(vecchia, letta, { edizione, nonLetti, edizionePrima: EDIZIONE_PRIMA });
    const dove = e ? e.file : join(RADICE, 'esempi', 'nemici', 'mostri', `${r.id}.json`);
    const v = { file: dove, nome: r.nome, id: r.id, esito, nuova: !e, nonLetti };
    if (e) voci.push(v); else if (!r.esclusa) { nuove.push(v); voci.push(v); }
  }
  // **Le due Dragomedusa**: vengono dal manuale, ma dalla tabella a due colonne del §7.12 che il lettore non sa
  // dividere. Nel lotto 203 i loro PV sono stati presi da una **lettura dichiarata** del testo (1.170 e 2.080) e
  // restano quelli; tutto il resto viene dalla 0.47. Non sono provvisorie — il manuale le contiene — e tenerle
  // nel mucchio delle provvisorie falserebbe il conto in tutte e due le direzioni.
  const dichiarate = [];
  for (const nome of DICHIARATE_DAL_TESTO) {
    const e = perNome.get(norm(nomeCanonico(nome)));
    if (!e) continue;
    const campi = { ...(e.nemico._bestiario?.campi ?? {}) };
    for (const k of CAMPI) if (e.nemico[k] !== undefined && e.nemico[k] !== null && !campi[k]) campi[k] = k === 'pv' ? edizione : EDIZIONE_PRIMA;
    dichiarate.push({ file: e.file, nome: e.nemico.nome, id: e.nemico.id, campi });
  }
  const nomiDichiarati = new Set(DICHIARATE_DAL_TESTO.map((n) => norm(nomeCanonico(n))));

  // le creature del corpus che il manuale non contiene: restano provvisorie (A.258) e non si toccano
  const nelManuale = new Set(risultati.map((r) => norm(nomeCanonico(r.nome))));
  for (const [k, e] of perNome) if (!nelManuale.has(k) && !nomiDichiarati.has(k)) fuoriManuale.push({ nome: e.nemico.nome, file: e.file, fonte: e.nemico.fonte ?? null });

  return { voci, nuove, dichiarate, fuoriManuale, motiviIgnoti, edizione, lette: risultati.length };
}

/** Scrive: ogni scheda con i campi letti aggiornati, quelli non letti tenuti, e la provenienza di ciascuno. */
export function applica(p) {
  const scritti = [];
  // le due Dragomedusa: non si tocca nessun valore, si scrive soltanto da dove viene ciascuno
  for (const d of p.dichiarate ?? []) {
    const o = JSON.parse(readFileSync(d.file, 'utf8'));
    // la riga della fonte dichiara l'edizione da cui la scheda viene adesso: i PV sono quelli della 0.69, letti
    // dal §7.12. Il resto dei campi dice la propria provenienza uno per uno, qui sotto.
    if (typeof o.fonte === 'string') o.fonte = o.fonte.replace(/v0\.\d+(\s*\(Word[^)]*\))?/, `v${registro().manuali.find((m) => m.id === 'mostri').versione}`);
    o._bestiario = { ...(o._bestiario ?? {}), campi: d.campi };
    const testo = `${JSON.stringify(o, null, 2)}\n`;
    writeFileSync(d.file, testo);
    scritti.push({ nome: d.nome, file: d.file, nuova: false, invariato: false, scritti: [], ereditati: [] });
  }
  for (const v of p.voci) {
    if (!v.esito) continue;
    const prima = v.nuova ? null : JSON.parse(readFileSync(v.file, 'utf8'));
    const json = { ...v.esito.json };
    // **L'identità non si rilegge dal manuale.** `id` e `nome` di una scheda che esiste già sono ciò con cui la
    // citano gli scontri salvati, le scene e i file dei PG: cambiarli vorrebbe dire far sparire un record sotto i
    // piedi di chi lo cita, che è il difetto dei lotti 201 e 202. Il Corazzato della Covata è `covata-corazzato`
    // nel Bestiario e «Corazzato» nel manuale: resta `covata-corazzato`.
    if (prima) { if (prima.id) json.id = prima.id; if (prima.nome) json.nome = prima.nome; }
    // il sistema di salute del lotto 203 non si perde per strada
    json._bestiario = { ...(json._bestiario ?? {}), edizione: p.edizione, sistema_salute: json._bestiario?.sistema_salute ?? 'solo_PV', campi: v.esito.campi };
    const testo = `${JSON.stringify(json, null, 2)}\n`;
    const invariato = prima && testo === `${JSON.stringify(prima, null, 2)}\n`;
    if (!invariato) writeFileSync(v.file, testo);
    scritti.push({ nome: v.nome, file: v.file, nuova: !!v.nuova, invariato: !!invariato, scritti: v.esito.scritti, ereditati: v.esito.ereditati });
  }
  return { scritti };
}

/** Il conto, scheda per scheda e campo per campo: si legge prima di scrivere. */
export function righe(p) {
  const out = [];
  const campiScritti = p.voci.reduce((a, v) => a + (v.esito?.scritti.length ?? 0), 0);
  const campiEreditati = p.voci.reduce((a, v) => a + (v.esito?.ereditati.length ?? 0), 0);
  const nonLeggibili = p.voci.reduce((a, v) => a + (v.esito?.nonLeggibili.length ?? 0), 0);
  out.push(`Manuale: ${p.edizione}. Schede lette: ${p.lette}. Schede toccate: ${p.voci.filter((v) => v.esito).length}, di cui nuove ${p.nuove.length}.`);
  out.push(`Campi letti da ${p.edizione}: ${campiScritti}. Campi ereditati da un'edizione precedente: ${campiEreditati}. Campi non leggibili e non presenti: ${nonLeggibili}.`);
  out.push(`Schede dal manuale lette in modo dichiarato (non dal lettore): ${(p.dichiarate ?? []).length} — ${(p.dichiarate ?? []).map((d) => d.nome).join(", ")}.`);
  out.push(`Creature del corpus fuori dal manuale (restano provvisorie, A.258): ${p.fuoriManuale.length}.`);
  const miste = p.voci.filter((v) => v.esito?.ereditati.length);
  out.push('');
  out.push(`Schede che restano miste: ${miste.length}`);
  for (const m of miste) out.push(`  ${m.nome}: ${m.esito.ereditati.map((x) => `${x.campo} da ${x.edizione ?? '(non dichiarata)'}`).join(', ')}`);
  if (p.motiviIgnoti.size) {
    out.push('');
    out.push('Motivi di «non capito» che non sono assegnati a nessun campo (non rendono nulla «non letto»):');
    for (const [k, n] of [...p.motiviIgnoti].sort((a, b) => b[1] - a[1]).slice(0, 12)) out.push(`  ${n}× ${k.slice(0, 110)}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const p = piano();
  console.log(righe(p).join('\n'));
  if (process.argv.includes('--scrivi')) {
    const { scritti } = applica(p);
    console.log(`\nScritti ${scritti.filter((s) => !s.invariato).length} file (${scritti.filter((s) => s.nuova).length} nuovi, ${scritti.filter((s) => s.invariato).length} invariati).`);
  } else console.log('\n(Nessun file scritto: usa --scrivi.)');
}
