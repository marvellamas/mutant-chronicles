// Guanti da Combattimento Mistico, scheda «Guanti mistici di Lucas» 1.0 (31/10/2026): che cosa cambia nel file di un
// personaggio che li ha. SOLA LETTURA: non scrive niente, nemmeno sul file che legge.
//
// Nel file del PG non c'è niente da riscrivere: SnT, colore della riserva, proprietà e assenza del bonus passivo vengono
// dal catalogo (data/equipaggiamento/artefatti.json, tools/lotti/lotto_guanti_lucas.mjs), e i PM attuali della riserva
// (sessione.chroma[uid].pmAttuali) restano quelli salvati: «l'energia presente si registra secondo lo stato effettivo di
// campagna, senza presumere una ricarica automatica» (scheda 1.0). Questo strumento lo verifica su un file e scrive il
// rapporto per il Direttore e per il giocatore. Se il kit non entra nella capacità, lo dice: non toglie niente.
//
// Uso: node tools/guanti-lucas.mjs <file del personaggio>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { profiloSenzArmi } from '../src/attacco.js';
import { numeroRiserva } from '../src/cariche-mistiche.js';

const RIF = 'artefatti:guanti-da-combattimento-mistico';
// la voce di prima (Armamenti 0.61 / Magia 1.4, 12/10/2026), per il confronto: valori fissi, il catalogo non li ha più
export const PRIMA = { potenza: 'Non Comune', grado: 'II', sintonizzazione: 2, energia: 'Verde', vaPassivo: 1, contattoIncantesimi: 1, attivazione: { pm: 3, va: 0, danno: 1 } };

/** Il rapporto su un personaggio: { haGuanti, voci: [{ cosa, prima, dopo }], kit, riserva, avvisi, daDire } */
export function rapportoGuanti(personaggio, dati) {
  const v = (personaggio.creazione.equipaggiamento ?? []).find((x) => x.rif === RIF);
  if (!v) return { haGuanti: false, voci: [], avvisi: [], daDire: [] };
  const g = dati.equipaggiamento.file.artefatti.oggetti.find((o) => `artefatti:${o.id}` === RIF);
  const riposo = calcolaScheda(personaggio, dati);
  const m = massimiSessione(riposo, personaggio.creazione, dati);
  const sessione = allineaSessione(personaggio.sessione ?? {}, m);
  const s = calcolaScheda({ ...personaggio, sessione }, dati);
  const st = s.equipaggiamento.sintonizzazione;
  // lotto 171: la riserva è in Cariche Mistiche; il valore in PM di prima resta in sessione.chroma[uid].prima (A.193)
  const pm = sessione.chroma?.[v.uid]?.pmAttuali ?? null;
  const primaPm = sessione.chroma?.[v.uid]?.prima?.pmAttuali ?? (sessione.chroma?.[v.uid]?.unita === 'CM' ? null : pm);
  const cm = (x) => numeroRiserva(x);
  const pugni = profiloSenzArmi(s, dati);
  const conPugno = calcolaScheda({ ...personaggio, sessione: { ...sessione, condizioniOggetti: [...new Set([...(sessione.condizioniOggetti ?? []), `attivazione:${v.uid}`])] } }, dati);
  const pugniAccesi = profiloSenzArmi(conPugno, dati);
  const a = g.artefatto;
  const at = g.attivazione_artefatto;
  const kitPrima = st.usata - (v.sintonizzato ? a.sintonizzazione - PRIMA.sintonizzazione : 0);
  const voci = [
    { cosa: 'Potenza e Grado', prima: `${PRIMA.potenza}, Grado ${PRIMA.grado}`, dopo: `${a.potenza}, Grado ${a.grado}` },
    { cosa: 'Sintonizzazione (SnT)', prima: String(PRIMA.sintonizzazione), dopo: String(a.sintonizzazione) },
    { cosa: 'Kit sintonizzato / capacità', prima: `${kitPrima} / ${st.capacita}`, dopo: `${st.usata} / ${st.capacita}` },
    { cosa: 'Riserva', prima: `${a.contenitore.precedente?.capacita_pm ?? 10} PM ${a.contenitore.energia}${primaPm !== null ? `; nel file ${primaPm} PM` : ''}`, dopo: `${a.contenitore.capacita_cm} Cariche Mistiche (CM) ${a.contenitore.energia}; ${pm === null ? 'nel file: —' : `${cm(pm)} CM`}${primaPm !== null ? ' (la stessa frazione, A.193; il valore di prima resta nel file)' : ''}` },
    { cosa: 'Bonus sempre attivo ai pugni', prima: `+${PRIMA.vaPassivo} VA`, dopo: 'nessuno' },
    { cosa: 'Bonus ai contatti degli Incantesimi', prima: `+${PRIMA.contattoIncantesimi} VA`, dopo: 'nessuno' },
    { cosa: 'VA dei pugni, Guanti solo indossati', prima: pugni.vaEffettivo === null ? '—' : String(pugni.vaEffettivo + PRIMA.vaPassivo), dopo: pugni.vaEffettivo === null ? '—' : String(pugni.vaEffettivo) },
    { cosa: at.nome, prima: `${PRIMA.attivazione.pm} PM: danno Magico, +${PRIMA.attivazione.danno} danno`, dopo: `${at.cm ?? at.pm} ${at.cm ? 'CM' : 'PM'}: +${at.va} VA, danno Magico, +${at.danno} danno (VA dei pugni ${pugniAccesi.vaEffettivo ?? '—'})` },
    ...(g.getti_artefatto ?? []).map((x) => ({ cosa: x.nome, prima: 'non c’era', dopo: `${x.cm ?? x.pm} ${x.cm ? 'CM' : 'PM'}, ${x.danno} ${x.natura}${x.prova_potere ? `, Prova di ${x.prova_potere.abilita} ${x.prova_potere.modificatore}` : ''}` })),
  ];
  const avvisi = [];
  if (st.usata > st.capacita) avvisi.push(`Il kit sintonizzato occupa ${st.usata} su ${st.capacita}: la scheda lo segnala, non toglie niente. Sceglie il personaggio cosa interrompere (§7.10).`);
  if (!v.sintonizzato) avvisi.push('I Guanti non sono sintonizzati: Pugno mistico e getti richiedono la sintonizzazione (la scheda avvisa).');
  if (v.stato !== 'indossata') avvisi.push('I Guanti non sono indossati.');
  const daDire = [
    'Non devi scegliere niente.',
    `Perdi il +1 VA che i Guanti davano sempre ai pugni e il +1 VA agli attacchi a contatto degli Incantesimi: adesso indossati non danno bonus.`,
    `La riserva dei Guanti ora si conta in Cariche Mistiche (CM): 6 in tutto, solo per i Guanti; non sono PM e non pagano Incantesimi.`,
    `Il Pugno mistico costa ${at.cm ?? at.pm} CM e dà +1 VA ai pugni, danno Magico e +1, per 5 Round; il Getto di fuoco 3 CM, il Doppio getto 6 CM (Prova di Potere −2, le CM si spendono anche se fallisce).`,
    `Adesso hai ${pm === null ? '—' : cm(pm)} CM${primaPm !== null ? ` (avevi ${primaPm} PM su ${a.contenitore.precedente?.capacita_pm ?? 10}: stessa frazione)` : ''}: non si ricaricano da sole. Ricarica: CM mancanti × 2 × rapporto (a 3:1, 6 PM per CM; da vuoti 36 PM).`,
  ];
  return { haGuanti: true, uid: v.uid, voci, kit: { usata: st.usata, capacita: st.capacita }, riserva: pm, avvisi, daDire };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) { console.error('Uso: node tools/guanti-lucas.mjs <file del personaggio>'); process.exit(1); }
  const radice = new URL('../', import.meta.url);
  const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
  const p = deserializzaPersonaggio(readFileSync(file, 'utf8'));
  const personaggio = { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli, sessione: p.sessione };
  const r = rapportoGuanti(personaggio, dati);
  if (!r.haGuanti) { console.log('Il personaggio non ha i Guanti da Combattimento Mistico: niente da cambiare.'); process.exit(0); }
  console.log(`${personaggio.creazione.nome}: Guanti da Combattimento Mistico (sola lettura, nessun file scritto)\n`);
  for (const x of r.voci) console.log(`- ${x.cosa}: ${x.prima} → ${x.dopo}`);
  if (r.avvisi.length) console.log(`\nAvvisi:\n${r.avvisi.map((a) => `- ${a}`).join('\n')}`);
  console.log(`\nDa dire al giocatore:\n${r.daDire.map((a) => `- ${a}`).join('\n')}`);
}
