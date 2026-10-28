// «Medita» (20/10/2026) e «Ricarica e medita» (A.174, 28/10/2026): il pannello a passi che, se si sceglie un cristallo, lo
// ricarica prima con i PM che il personaggio ha adesso e poi calcola il recupero della Meditazione con il suo esito. Stesso impianto di «Lancia!» e «Attiva» (src/ui/pannello-passi.js): le scelte, poi il
// conto in chiaro con la regola o il Talento che si applica, e «Conferma» che applica tutto in una modifica annullabile e
// lascia una riga nel registro del personaggio. Le regole stanno in src/medita.js.
import { h } from './dom.js';
import { conAvviso } from './procedi.js';
import { rigaScelte, pannelloPassi } from './pannello-passi.js';
import { modiMedita, pianoMedita, motivoRicarica } from '../medita.js';
import { rapportoConversione } from '../equipaggiamento.js';

/** Scelte iniziali: la Meditazione se il personaggio la ha, altrimenti il Riposo breve; PM personali. */
export const sceltaMeditaIniziale = (ctx) => ({
  modo: ctx.tab.scheda.magia?.meditazione ? 'meditazione' : 'breve', ore: 1, oreGia: 0, destinazione: 'personali', gruppi: null, esito: 'successo', meditazione: 'completata', oreCompletate: 0, passo: 0,
});

/** Il pulsante «Medita» dei riquadri dei PM. */
export const pulsanteMedita = (ctx) => h('button', {
  type: 'button', class: 'btn btn-piccolo btn-medita', title: 'Calcola il recupero dei PM secondo il manuale; con un cristallo è «Ricarica e medita»: prima ricarichi con i PM che hai, poi mediti (A.174). Vedi il conto prima di confermare',
  onclick: () => { ctx.ui.medita = sceltaMeditaIniziale(ctx); ctx.azioni.ridisegna(); },
}, 'Medita');

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function pannelloMedita(ctx) {
  const u = ctx.ui.medita;
  const chiudi = () => { ctx.ui.medita = null; ctx.azioni.ridisegna(); };
  const imposta = (x) => { Object.assign(u, x); ctx.azioni.ridisegna(); };
  const scheda = ctx.tab.scheda;
  const dati = ctx.dati;
  const modi = modiMedita(scheda, dati);
  const piano = pianoMedita({ scheda, sessione: ctx.sessione, massimi: ctx.massimi }, u, dati);
  const modo = modi.find((m) => m.id === piano.modo.id);
  const cv = rapportoConversione(scheda, dati);
  const contenitori = scheda.equipaggiamento?.contenitori ?? [];
  const numero = (valore, cambia, attr = {}) => h('input', {
    type: 'number', class: 'input-d10', min: 0, step: 1, inputmode: 'numeric', value: valore ?? '', ...attr,
    onchange: (e) => cambia(e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value) || 0))),
  });
  const c = piano.conversione;
  const ricarica = !!c && u.destinazione !== 'personali';
  const passi = [
    {
      // A.174: prima la ricarica, con i PM che il personaggio ha adesso; poi la Meditazione
      titolo: 'Ricarica',
      contenuto: [
        rigaScelte('Cosa fai', [
          { valore: 'personali', etichetta: 'Solo Medita (nessuna ricarica)' },
          ...contenitori.map((x) => ({ valore: x.uid, etichetta: `Ricarica ${x.nome} · ${ctx.sessione.chroma?.[x.uid]?.pmAttuali ?? 0}/${x.capacita}, poi medita`, motivo: motivoRicarica(x, cv) })),
        ], u.destinazione, (x) => imposta({ destinazione: x, gruppi: null, esito: null })),
        contenitori.length ? null : h('p', { class: 'nota' }, 'Nessun cristallo o riserva di Chroma nell’inventario: c’è solo il recupero dei PM personali.'),
        c ? [
          h('p', { class: 'nota' }, `Rapporto ${c.rapporto}:1 — ${c.fonteRapporto}. Ogni gruppo costa ${c.rapporto} PM personali e aggiunge 1 PM al cristallo (non oltre ${c.capacita}). Si spendono solo i ${piano.pmPrima} PM che hai adesso: quelli che recupererai meditando non si spendono in anticipo (A.174).`),
          h('label', { class: 'campo-dado' }, `Gruppi da convertire (vuoto = quanti ne stanno: ${Math.min(c.gruppiPossibili, c.spazio)}) `,
            numero(u.gruppi, (n) => imposta({ gruppi: n }), { 'aria-label': 'Gruppi da convertire', placeholder: 'auto' })),
          c.prova.richiesta ? rigaScelte(`Esito della Prova di Potere (${c.gruppi} gruppi: Potere ${c.prova.penalita}${c.prova.totale !== null ? `, VA ${c.prova.va} ${c.prova.penalita} = ${c.prova.totale}` : ''}) — l’app non tira, indica come è andata`,
            dati.regole.recupero_pm.conversione.esiti.map((e) => ({ valore: e, etichetta: dati.regole.recupero_pm.conversione.nomi_esiti[e] })), u.esito ?? null, (x) => imposta({ esito: x })) : null,
        ] : null,
      ],
    },
    {
      titolo: 'Meditazione',
      contenuto: [
        rigaScelte('Come recuperi', modi.map((m) => ({ valore: m.id, etichetta: `${m.nome}${m.pmOra !== null ? ` · ${m.pmOra} PM/h` : ''}`, motivo: m.disponibile ? null : m.motivo, titolo: m.dettaglio })), u.modo, (x) => imposta({ modo: x })),
        modo?.dettaglio ? h('p', { class: 'nota' }, modo.dettaglio) : null,
        h('label', { class: 'campo-dado' }, 'Ore complete e continuative ', numero(u.ore, (n) => imposta({ ore: n ?? 0 }), { 'aria-label': 'Ore complete di recupero' })),
        u.modo === 'meditazione' && modo?.disponibile ? h('label', { class: 'campo-dado' }, `Ore di Meditazione già fatte oggi (limite ${modo.oreGiorno}) `, numero(u.oreGia, (n) => imposta({ oreGia: n ?? 0 }), { 'aria-label': 'Ore di Meditazione già fatte oggi' })) : null,
        // A.174: il recupero dipende dall'esito effettivo; un'interruzione non annulla la ricarica già fatta
        rigaScelte('Com’è andata', [{ valore: 'completata', etichetta: 'Completata' }, { valore: 'interrotta', etichetta: 'Interrotta' }], u.meditazione ?? 'completata', (x) => imposta({ meditazione: x })),
        u.meditazione === 'interrotta' ? h('label', { class: 'campo-dado' }, 'Ore complete prima dell’interruzione ', numero(u.oreCompletate, (n) => imposta({ oreCompletate: n ?? 0 }), { 'aria-label': 'Ore complete prima dell’interruzione' })) : null,
        h('p', { class: 'nota' }, `Un’ora conta solo se è intera e continuativa; un’interruzione fa perdere la frazione${ricarica ? ', ma non annulla la ricarica già fatta' : ''}. Le ore non si contano da sole: scrivi tu quante sono. Fonte: ${dati.regole.recupero_pm.fonte}.`),
      ],
    },
    {
      titolo: 'Conto',
      contenuto: [
        piano.avvisi.length ? h('div', { class: 'riquadro attenzione', role: 'status' }, piano.avvisi.map((a) => h('p', {}, a))) : null,
        h('div', { class: 'attacco-risultato' },
          h('p', { class: 'costo-lancio riepilogo-medita' }, h('strong', {}, piano.riepilogo)),
          h('dl', { class: 'voci griglia-voci' }, piano.righe.map((r) => h('div', {}, h('dt', {}, r.etichetta), h('dd', {}, h('strong', {}, r.valore), r.nota ? h('small', { class: 'nota' }, ` (${r.nota})`) : null)))),
          h('p', { class: 'nota' }, `Resta nel registro: «${piano.registro}»`),
          h('div', { class: 'attacco-azioni' },
            h('button', {
              type: 'button', class: `btn primario btn-grande${piano.vuoto || c?.motivo ? ' con-avviso' : ''}`, disabled: !!c?.inAttesa,
              title: c?.inAttesa ? 'Indica prima l’esito della Prova di Potere (Magia sez. 6)' : c?.motivo ?? (piano.vuoto ? 'Non cambia nessun valore' : null),
              // un requisito della ricarica che manca (Addestramento Taumaturgo, contatto, sintonizzazione) avvisa e si può superare
              // con «Procedi comunque», con la riga nel registro: la scorciatoia non è più permissiva dei due passaggi separati
              onclick: () => { const fai = () => { ctx.ui.medita = null; ctx.azioni.medita(piano); }; // prima si chiude: l'azione ridisegna la scheda
                if (c?.motivo && c.gruppi > 0) conAvviso(ctx.azioni.storico, { azione: `ricaricare ${c.nome} con «${piano.nome}»`, motivo: c.motivo, fai }); else fai(); },
            }, piano.vuoto ? 'Conferma (nessuna modifica)' : c?.motivo && c.gruppi > 0 ? 'Conferma comunque…' : `Conferma: ${piano.nome}`),
            h('small', { class: 'nota' }, 'Il conto è un promemoria del manuale: se al tavolo si decide altro, il Direttore ha l’ultima parola. «Annulla» nell’intestazione annulla tutto in un colpo.'))),
      ],
    },
  ];
  return pannelloPassi({ etichetta: `${piano.nome}: recupero dei PM`, titolo: ricarica ? `${piano.nome} · prima la ricarica, poi il recupero` : 'Medita · recupero dei PM', classe: 'lancio-pannello medita-pannello', chiudi, passi, stato: u, ridisegna: ctx.azioni.ridisegna, etichettaNav: 'Passi di Medita' });
}
