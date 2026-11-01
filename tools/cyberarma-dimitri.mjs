// CyberArma di Dimitri (Armamenti 0.74 §7.25.4, scheda «CyberArma Opzioni per Dimitri» 1.0): che cosa c'è nel file di un
// personaggio per il progetto a Paradise e che cosa cambierà quando il Direttore consegnerà l'arma. SOLA LETTURA: non scrive
// niente, nemmeno sul file che legge, e non apre il progetto (lo apre il Direttore dalla scheda, tab Artefatti → Progetti).
//
// Uso: node tools/cyberarma-dimitri.mjs <file del personaggio>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { modelliProgetto, apriProgetto, consegnaArma } from '../src/progetti.js';

const MODELLO = 'paradise-dimitri';

/** Il rapporto su un personaggio: { voci: [{ cosa, oggi, dopo }], avvisi, daDireGiocatore, daDireDirettore } */
export function rapportoCyberArma(personaggio, dati) {
  const m = modelliProgetto(dati).find((x) => x.id === MODELLO);
  const c = personaggio.creazione;
  const eq = c.equipaggiamento ?? [];
  const s = calcolaScheda(personaggio, dati);
  const classi = (s.classi ?? []).map((x) => x.nome);
  const comp = (id) => m.componenti.find((x) => x.id === id);
  const schegge = eq.filter((v) => v.rif === comp('scheggia').rif);
  const spade = eq.filter((v) => v.rif === comp('modulo').rif);
  const interfaccia = (s.equipaggiamento?.oggetti ?? []).some((o) => o.attivo && o.def?.innesto === 'interfaccia_neurale');
  const giaCyber = eq.filter((v) => String(v.rif ?? '').startsWith('armi:cyberarma'));
  const st = s.equipaggiamento?.sintonizzazione ?? { usata: 0, capacita: 0 };
  const spada = (s.equipaggiamento?.armi ?? []).find((a) => spade[0] && String(a.uid).split(':')[0] === spade[0].uid);
  // simulazione su una copia in memoria: progetto aperto, forma del progetto base, consegna del Direttore
  const a = apriProgetto(c.progettiMaster ?? [], MODELLO, dati, { quando: 'simulazione' });
  const dopoC = consegnaArma({ ...c, progettiMaster: a.lista }, a.progetto.id, dati, { quando: 'simulazione', master: true, donatore: spade[0]?.uid ?? null, scheggia: schegge[0]?.uid ?? null, uid: 'simulata' });
  const s2 = calcolaScheda({ ...personaggio, creazione: { ...dopoC.creazione, equipaggiamento: dopoC.creazione.equipaggiamento.map((v) => (v.uid === 'simulata' ? { ...v, sintonizzato: true, stato: 'impugnata' } : v)) } }, dati);
  const cyber = (s2.equipaggiamento?.armi ?? []).find((x) => String(x.uid).split(':')[0] === 'simulata');
  const spada2 = (s2.equipaggiamento?.armi ?? []).find((x) => spade[0] && String(x.uid).split(':')[0] === spade[0].uid);
  const st2 = s2.equipaggiamento?.sintonizzazione ?? st;
  const voci = [
    { cosa: 'CyberArma nell’inventario', oggi: giaCyber.length ? giaCyber.map((v) => v.rif).join(', ') : 'nessuna', dopo: 'una, solo quando il Direttore la consegna' },
    { cosa: 'Classe (il progetto è per il Tecnomante)', oggi: classi.join(', ') || '—', dopo: 'invariata' },
    { cosa: 'Interfaccia neurale installata (serve per il SIN)', oggi: interfaccia ? 'sì' : 'no', dopo: 'invariata' },
    { cosa: 'Schegge instabili Verdi', oggi: String(schegge.length), dopo: `${Math.max(0, schegge.length - 1)} (una diventa il focalizzatore)` },
    { cosa: 'Spada Cybertronic CSA 404', oggi: spade.length ? `VA per colpire ${spada?.vaEffettivo ?? spada?.va ?? '—'}${spada?.scomposizione?.some((x) => /SIN/.test(x.etichetta)) ? ', con SIN' : ''}` : 'non c’è', dopo: spade.length ? `VA per colpire ${spada2?.vaEffettivo ?? spada2?.va ?? '—'}, senza SIN; danno e scariche restano` : '—' },
    { cosa: 'CyberArma consegnata (forma del progetto base, sintonizzata)', oggi: '—', dopo: cyber ? `VA ${cyber.vaEffettivo ?? cyber.va}${cyber.scomposizione?.some((x) => /modulatore/.test(x.etichetta)) ? ' (con SIN 1 del modulatore)' : ''}, danno ${cyber.danno?.una_mano ?? '—'} Magico, ${cyber.mani} mano/i, portata ${cyber.portataQ ?? '—'} Q` : '—' },
    { cosa: 'Sintonizzazione usata / capacità', oggi: `${st.usata} / ${st.capacita}`, dopo: `${st2.usata} / ${st2.capacita} (CyberArma SnT 2 per il Tecnomante)` },
    { cosa: 'Attivazione', oggi: '—', dopo: '1 AzP e 2 PM personali, 10 Round, senza Concentrazione' },
  ];
  const avvisi = [];
  if (!classi.includes('Tecnomante')) avvisi.push('Il personaggio non è Tecnomante: il progetto è scritto per il Tecnomante.');
  if (!interfaccia) avvisi.push('Senza interfaccia neurale installata il modulatore non dà il SIN.');
  if (!schegge.length) avvisi.push('Nessuna scheggia instabile Verde nell’inventario: il progetto la richiede.');
  if (!spade.length) avvisi.push('Nessuna spada CSA 404 nell’inventario: il modulo viene da lì.');
  if (st2.usata > st2.capacita) avvisi.push(`Con la CyberArma sintonizzata la Sintonizzazione arriva a ${st2.usata} su ${st2.capacita}: la scheda avvisa, non toglie niente.`);
  return {
    voci, avvisi,
    daDireGiocatore: [
      'Scegli la forma della CyberArma (mani e portata) prima che cominci la lavorazione: dalla scheda, tab Artefatti → Progetti, appena il Direttore apre il progetto.',
      'L’arma non è ancora tua: entra nell’inventario quando il Direttore la consegna, dopo i tre giorni a Paradise.',
      'Con la CyberArma: 1 AzP e 2 PM personali per 10 Round, 1d8 Magico con Armi da mischia (DES), SIN 1 con l’interfaccia collegata. La spada CSA 404 perde il suo SIN.',
    ],
    daDireDirettore: [
      'Apri il progetto dalla scheda di Dimitri in «Modifica master» (tab Artefatti → Progetti → «Apri un progetto»).',
      'Segna gli esiti dei tre giorni (Artefatti −2, Tecnologia −2, Tecnologia −2): anche Fallimento e Maldestro; la scheda dice quanto tempo e quante risorse costa un nuovo tentativo (Magia §24).',
      'Chiudi il progetto (riuscito, riuscito in parte, fallito) e, se vuoi, consegna l’arma: è l’unico modo in cui entra nell’inventario, con chi e quando.',
      'A.231: scrivi tu nella consegna se l’originale è quello di Park (frammento Viola, Corruzione 1).',
    ],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) { console.error('Uso: node tools/cyberarma-dimitri.mjs <file del personaggio>'); process.exit(1); }
  const radice = new URL('../', import.meta.url);
  const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
  const p = deserializzaPersonaggio(readFileSync(file, 'utf8'));
  const personaggio = { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli, sessione: p.sessione };
  const r = rapportoCyberArma(personaggio, dati);
  console.log(`${personaggio.creazione.nome}: CyberArma, progetto a Paradise (sola lettura, nessun file scritto)\n`);
  for (const x of r.voci) console.log(`- ${x.cosa}: ${x.oggi} → ${x.dopo}`);
  if (r.avvisi.length) console.log(`\nAvvisi:\n${r.avvisi.map((a) => `- ${a}`).join('\n')}`);
  console.log(`\nDa dire al giocatore:\n${r.daDireGiocatore.map((a) => `- ${a}`).join('\n')}`);
  console.log(`\nDa dire al Direttore:\n${r.daDireDirettore.map((a) => `- ${a}`).join('\n')}`);
}
