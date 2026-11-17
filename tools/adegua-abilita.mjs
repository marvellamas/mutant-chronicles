// Adeguamento straordinario delle Abilità (lotto 194, 13/11/2026), sul PC del Direttore: il passaggio dei
// personaggi al profilo 4/7/9/4 del Giocatore 0.62 (§8.3.1) e la redistribuzione dei Punti Abilità Liberi.
//
//   node tools/adegua-abilita.mjs                      rapporto, PG per PG; non tocca niente
//   node tools/adegua-abilita.mjs --applica            copia zip di personaggi\, poi la nota e il contrassegno
//   node tools/adegua-abilita.mjs --annulla NOME       riporta quel solo personaggio com'era
//   node tools/adegua-abilita.mjs --stato              a che punto è ciascuno (anche durante la serata)
//   opzioni: --cartella DIR (personaggi), --salvataggi DIR (dove va lo zip)
//
// **La nota di prima su tutti, prima di qualunque modifica.** È la lezione del 26 ottobre: ai Talenti la nota
// arrivò dopo e solo su alcuni, e al tavolo i giocatori non riuscivano a ritrovare i propri Talenti vecchi.
// `--applica` lavora in **due passate**: nella prima calcola la nota di tutti e sette e, se anche uno solo non la
// produce, **non scrive niente per nessuno**; solo nella seconda scrive. Così non esiste uno stato in cui qualcuno
// è stato toccato senza avere la sua nota.
//
// Quello che questo programma fa è il minimo: nota, contrassegno e punti azzerati. I 21 (o quanti sono) punti li
// assegna **il giocatore dal suo tablet**, nella scheda, una scelta alla volta; il Direttore guarda la plancia.
import { readFileSync, writeFileSync, mkdirSync, accessSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { creaZip } from './salva-sessione.mjs';
import { cartellaDati } from './dati-pc.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
// lotto 200: la scelta del file attuale sta in un posto solo, e di là viene anche il rifiuto sui nomi ambigui
import { personaggiDellaCartella, trovaPersonaggio, tuttiIFileDiPersonaggio, rigaSuCosa } from './personaggi-cartella.mjs';
import { PROFILO_NUOVO } from '../src/competenze.js';
import { scriviPersonaggio } from './scrivi-personaggio.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
export const PREFISSO = 'prima-dell-adeguamento-abilita_';
const due = (n) => String(n).padStart(2, '0');
export const nomeZip = (d) => `${PREFISSO}${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}${due(d.getSeconds())}.zip`;

async function dati() {
  const { caricaDati } = await import(pathToFileURL(join(RADICE, 'src', 'rules.js')));
  const leggi = (nome) => readFileSync(join(RADICE, 'data', `${nome}.json`), 'utf8');
  return (await caricaDati(async (n) => leggi(n))).dati;
}

/**
 * I personaggi della cartella: **uno per personaggio**, col suo file attuale.
 *
 * **Lotto 200 (15/11/2026): prima era uno per file, e sulla cartella vera non è la stessa cosa.** L'istantanea del
 * 14/11 porta 37 file per sette personaggi — cinque versioni datate ciascuno, perché l'app salva un file nuovo a
 * ogni serata e non sovrascrive. Con un personaggio per file il rapporto diceva 37 righe, `--applica` scriveva
 * anche nelle versioni vecchie, e soprattutto `--annulla NOME` prendeva il **primo** file con quel nome — la
 * versione del 26 ottobre — la riportava indietro e lasciava **adeguato il file attuale**, dicendo di aver
 * annullato. Alla serata dell'adeguamento quello è l'unico attrezzo di sicurezza, e mentiva. La scelta è una sola
 * e sta in `tools/personaggi-cartella.mjs` (`src/cartella.js → fileAttuale`, la stessa dell'app, del server e del
 * menu).
 *
 * @returns [{ file, json, percorso, nome, versioni, altri }]
 */
export function personaggi(cartella) {
  return personaggiDellaCartella(cartella).filter((v) => v.json?.scelte);
}

/**
 * Il rapporto: che cosa succederebbe a ciascuno. Non tocca niente.
 * @returns {{ piani, pronti, bloccati, giaFatti }}
 */
export async function rapporto({ cartella, d = null, quando = new Date() }) {
  const D = d ?? await dati();
  const { pianoAdeguamento } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  const voci = personaggi(cartella);
  const piani = voci.map(({ file, json, versioni }) => ({ file, versioni, ...pianoAdeguamento(json, D, { quando }) }));
  return {
    piani,
    // su che cosa si e' basato il rapporto: senza questa riga non si sa che cosa si e' guardato
    suCosa: rigaSuCosa(voci, cartella),
    pronti: piani.filter((p) => p.nuovo),
    bloccati: piani.filter((p) => p.bloccato),
    giaFatti: piani.filter((p) => p.giaFatto),
  };
}

/** Le righe da stampare per il rapporto. */
export function righeRapporto({ piani }) {
  const out = [];
  for (const p of piani) {
    const stato = p.giaFatto ? 'già adeguato' : p.bloccato ? 'NON SI PARTE' : `pronto · monte ${p.monte?.monte} punti`;
    out.push(`${p.nome.padEnd(20)} liv ${String(p.livello).padEnd(2)} · ${stato}`);
    if (p.motivo) out.push(`    ${p.motivo}`);
    // lotto 207: il conto del solo profilo, quello che si deve sapere prima di convocare la serata
    if (p.cambi) {
      out.push(`    profilo nuovo: ${p.cambi.cambiano.length} Abilità cambiano categoria · ${p.cambi.salgono.length} salgono di VA · ${p.cambi.scendono.length} scendono`);
    }
    for (const c of p.casi) out.push(`    da guardare: ${c}`);
    if (p.nota) out.push(`    nota di prima: ${p.nota.abilita.length} Abilità, ${p.nota.eventi.length} eventi, ${p.nota.monteDiPrima} punti liberi di adesso`);
  }
  // lotto 215, dalla prova generale: con un personaggio ancora al livello 7 `--applica` gli dà il monte di adesso (14) e non quello della destinazione (21).
  // Si dice in fondo al rapporto, dove si guarda prima di decidere, e non solo dentro la sua riga.
  const indietro = piani.filter((p) => p.nuovo && Number.isInteger(p.monte?.monte) && Number.isInteger(p.monte?.atteso8) && p.monte.monte < p.monte.atteso8);
  if (indietro.length) {
    out.push('', `ATTENZIONE: ${indietro.length} su ${piani.length} non sono ancora al livello di destinazione (${indietro.map((p) => `${p.nome}: ${p.monte.monte} punti invece di ${p.monte.atteso8}`).join('; ')}).`,
      '    Con --applica prenderebbero quel monte: falli salire prima («Sali al livello» dalla scheda, dopo la concessione), poi riguarda questo rapporto.');
  }
  return out;
}

/** La copia zip della cartella dei personaggi, prima di toccare qualunque cosa. */
export function copiaZip({ cartella, salvataggi, quando = new Date() }) {
  mkdirSync(salvataggi, { recursive: true });
  // qui si prendono TUTTI i file, storico compreso, e di proposito: e' la copia a cui si torna indietro, e una
  // copia che contenesse solo i file attuali non riporterebbe la cartella com'era (lotto 200)
  const dentro = tuttiIFileDiPersonaggio(cartella).map((f) => ({ nome: `personaggi/${f.nome}`, dati: readFileSync(f.file), mtime: quando }));
  const percorso = join(salvataggi, nomeZip(quando));
  writeFileSync(percorso, creaZip(dentro));
  return { percorso, quanti: dentro.length };
}

/**
 * Applica: **due passate**. Prima si calcola il piano di tutti; se anche uno solo è bloccato non si scrive niente
 * per nessuno. Poi si scrive.
 * @returns {{ fatto, zip, scritti, bloccati, motivo }}
 */
export async function applica({ cartella, salvataggi, d = null, quando = new Date(), scrivi = scriviPersonaggio }) {
  const D = d ?? await dati();
  const r = await rapporto({ cartella, d: D, quando });
  if (r.bloccati.length) {
    return { fatto: false, zip: null, scritti: [], bloccati: r.bloccati, motivo: `${r.bloccati.length} personaggi non hanno la nota di prima: non tocco nessuno (è la regola del 26 ottobre).` };
  }
  if (!r.pronti.length) return { fatto: false, zip: null, scritti: [], bloccati: [], motivo: 'nessun personaggio da adeguare.' };
  // lotto 212: **prima di scrivere a chiunque**, ogni file deve essere scrivibile. La prova sulla copia dell'istantanea del 15/11 ha
  // mostrato che con un solo file di sola lettura (Lucas) gli altri cinque erano già stati scritti e la procedura moriva a metà con
  // un errore di sistema: il rifiuto «non tocco nessuno» valeva solo per la nota mancante, non per un file che non si scrive.
  const nonScrivibili = r.pronti.filter((p) => { try { accessSync(join(cartella, p.file), constants.W_OK); return false; } catch { return true; } });
  if (nonScrivibili.length) {
    return { fatto: false, zip: null, scritti: [], bloccati: [], motivo: `${nonScrivibili.length} file non si possono scrivere (${nonScrivibili.map((p) => p.nome).join(', ')}): non tocco nessuno.` };
  }
  const zip = copiaZip({ cartella, salvataggi, quando });
  const scritti = [];
  const prima = new Map(r.pronti.map((p) => [p.file, readFileSync(join(cartella, p.file), 'utf8')]));
  // si scrive **sul file attuale** di ciascuno: le versioni vecchie non si toccano (lotto 200)
  for (const p of r.pronti) {
    // lotto 210: la versione di salvataggio sale e `aggiornato_*` si aggiornano, come per l'app (`scriviPersonaggio`)
    try {
      scrivi(join(cartella, p.file), p.nuovo, { chi: 'master', quando });
    } catch (e) {
      // lotto 212: se una scrittura fallisce a metà, quelle già fatte si rimettono com'erano (byte per byte): mai a metà
      for (const s of scritti) writeFileSync(join(cartella, s.file), prima.get(s.file));
      return { fatto: false, zip, scritti: [], bloccati: [], motivo: `la scrittura di ${p.nome} è fallita (${e.code ?? e.message}): rimesse a posto le ${scritti.length} già scritte, nessuno è adeguato.` };
    }
    scritti.push({ nome: p.nome, file: p.file, monte: p.monte.monte, versioniNonToccate: Math.max(0, (p.versioni ?? 1) - 1) });
  }
  return { fatto: true, zip, scritti, bloccati: [], motivo: null };
}

/**
 * Annulla l'adeguamento di **un** personaggio, sul suo **file attuale**. Gli altri non si toccano.
 *
 * **Tre cose che il lotto 200 ha cambiato, e nessuna è un dettaglio.** Agisce sul file attuale, non sul primo che
 * porta quel nome. Con un nome che non c'è o che è di più di un personaggio **si rifiuta e lo dice**, invece di
 * scegliere: toccare il personaggio sbagliato è peggio che non fare niente. E dopo aver scritto **rilegge il file
 * e controlla** che l'adeguamento sia davvero sparito, invece di dichiararlo: è l'unico attrezzo di sicurezza
 * della serata, e un «fatto» che non corrisponde è il guasto peggiore che possa avere.
 */
export async function annulla({ cartella, chi, d = null }) {
  const D = d ?? await dati();
  const { annullaAdeguamento } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  const trovato = trovaPersonaggio(personaggi(cartella), chi);
  if (!trovato.ok) return { ok: false, motivo: trovato.motivo, nome: null };
  const voce = trovato.voce;
  const esito = annullaAdeguamento(voce.json);
  if (!esito.ok) return { ok: false, motivo: esito.motivo, nome: voce.nome, file: voce.file };
  scriviPersonaggio(voce.percorso, esito.file, { chi: 'master', quando: new Date() });
  // si controlla, non si dichiara: si rilegge il file attuale e si guarda se il contrassegno è andato via
  const riletto = personaggiDellaCartella(cartella).find((v) => v.id === voce.id);
  if (!riletto || riletto.file !== voce.file || riletto.json?.scelte?.regimeAbilita === PROFILO_NUOVO) {
    return {
      ok: false,
      nome: voce.nome,
      file: voce.file,
      motivo: `ho scritto ${voce.file} ma rileggendolo l’adeguamento è ancora là: non dico «fatto». Guarda il file prima di continuare.`,
    };
  }
  return { ok: true, motivo: null, nome: voce.nome, file: voce.file, versioniNonToccate: voce.altri.length };
}

/** A che punto è ciascuno: lo guarda il Direttore durante la serata. */
export async function stato({ cartella, d = null }) {
  const D = d ?? await dati();
  const { statoPerPlancia } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  const voci = personaggi(cartella);
  return voci.map(({ file, json, versioni }) => ({ file, versioni, ...statoPerPlancia(json, D) }));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['adegua-abilita.mjs'], 'adegua-abilita.mjs');
  const valore = (nome) => { const i = argv.indexOf(`--${nome}`); return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? null; };
  const base = cartellaDati(RADICE).cartella;
  const cartella = valore('cartella') ?? join(base, 'personaggi');
  const salvataggi = valore('salvataggi') ?? join(base, 'salvataggi');
  const D = await dati();

  if (argv.includes('--stato')) {
    const righe = await stato({ cartella, d: D });
    console.log(rigaSuCosa(personaggi(cartella), cartella));
    // il file su cui si e' guardato, accanto a ogni riga: nella cartella vera ce ne sono cinque per personaggio
    for (const s of righe) console.log(`${s.nome.padEnd(20)} ${s.testo}${s.versioni > 1 ? `  [${s.file}]` : ''}`);
    process.exit(0);
  }
  if (argv.includes('--annulla')) {
    const chi = valore('annulla');
    if (!chi) { console.error('Serve il nome del personaggio: --annulla "NOME"'); process.exit(2); }
    const e = await annulla({ cartella, chi, d: D });
    console.log(e.ok
      ? `${e.nome}: adeguamento annullato e ricontrollato sul file, che è tornato com'era (${e.file})${e.versioniNonToccate ? `; le ${e.versioniNonToccate} versioni precedenti non sono state toccate` : ''}.`
      : `Non fatto: ${e.motivo}`);
    process.exit(e.ok ? 0 : 1);
  }
  const r = await rapporto({ cartella, d: D });
  console.log(`${r.suCosa}\n`);
  for (const riga of righeRapporto(r)) console.log(riga);
  console.log(`\n${r.pronti.length} pronti, ${r.bloccati.length} bloccati, ${r.giaFatti.length} già adeguati.`);
  if (!argv.includes('--applica')) { console.log('\nNiente scritto. Con --applica si fa (prima una copia zip).'); process.exit(0); }
  const e = await applica({ cartella, salvataggi, d: D });
  if (!e.fatto) { console.error(`\nNon fatto: ${e.motivo}`); process.exit(1); }
  console.log(`\nCopia di sicurezza: ${e.zip.percorso} (${e.zip.quanti} file).`);
  for (const s of e.scritti) console.log(`  ${s.nome}: nota scritta, contrassegno messo, ${s.monte} punti da assegnare dal tablet.`);
}
