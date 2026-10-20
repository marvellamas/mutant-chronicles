// «Medita» (20/10/2026): il pannello a passi che calcola il recupero dei PM secondo il manuale e, se si sceglie, lo versa in
// un cristallo con la conversione. Stesso impianto di «Lancia!» e «Attiva» (src/ui/pannello-passi.js): le scelte, poi il
// conto in chiaro con la regola o il Talento che si applica, e «Conferma» che applica tutto in una modifica annullabile e
// lascia una riga nel registro del personaggio. Le regole stanno in src/medita.js.
import { h } from './dom.js';
import { rigaScelte, pannelloPassi } from './pannello-passi.js';
import { modiMedita, pianoMedita, motivoRicarica } from '../medita.js';
import { rapportoConversione } from '../equipaggiamento.js';

/** Scelte iniziali: la Meditazione se il personaggio la ha, altrimenti il Riposo breve; PM personali. */
export const sceltaMeditaIniziale = (ctx) => ({
  modo: ctx.tab.scheda.magia?.meditazione ? 'meditazione' : 'breve', ore: 1, oreGia: 0, destinazione: 'personali', gruppi: null, esito: 'successo', passo: 0,
});

/** Il pulsante «Medita» dei riquadri dei PM. */
export const pulsanteMedita = (ctx) => h('button', {
  type: 'button', class: 'btn btn-piccolo btn-medita', title: 'Calcola il recupero dei PM secondo il manuale e, se vuoi, versalo in un cristallo: vedi il conto prima di confermare',
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
  const passi = [
    {
      titolo: 'Recupero',
      contenuto: [
        rigaScelte('Come recuperi', modi.map((m) => ({ valore: m.id, etichetta: `${m.nome}${m.pmOra !== null ? ` · ${m.pmOra} PM/h` : ''}`, motivo: m.disponibile ? null : m.motivo, titolo: m.dettaglio })), u.modo, (x) => imposta({ modo: x })),
        modo?.dettaglio ? h('p', { class: 'nota' }, modo.dettaglio) : null,
        h('label', { class: 'campo-dado' }, 'Ore complete e continuative ', numero(u.ore, (n) => imposta({ ore: n ?? 0 }), { 'aria-label': 'Ore complete di recupero' })),
        u.modo === 'meditazione' && modo?.disponibile ? h('label', { class: 'campo-dado' }, `Ore di Meditazione già fatte oggi (limite ${modo.oreGiorno}) `, numero(u.oreGia, (n) => imposta({ oreGia: n ?? 0 }), { 'aria-label': 'Ore di Meditazione già fatte oggi' })) : null,
        h('p', { class: 'nota' }, `Un’ora conta solo se è intera e continuativa; un’interruzione fa perdere la frazione. Le ore non si contano da sole: scrivi tu quante sono. Fonte: ${dati.regole.recupero_pm.fonte}.`),
      ],
    },
    {
      titolo: 'Destinazione',
      contenuto: [
        rigaScelte('Dove vanno i PM', [
          { valore: 'personali', etichetta: 'Ai miei PM personali' },
          ...contenitori.map((x) => ({ valore: x.uid, etichetta: `${x.nome} · ${ctx.sessione.chroma?.[x.uid]?.pmAttuali ?? 0}/${x.capacita}`, motivo: motivoRicarica(x, cv) })),
        ], u.destinazione, (x) => imposta({ destinazione: x, gruppi: null, esito: 'successo' })),
        contenitori.length ? null : h('p', { class: 'nota' }, 'Nessun cristallo o riserva di Chroma nell’inventario: il recupero va ai PM personali.'),
        c ? [
          h('p', { class: 'nota' }, `Rapporto ${c.rapporto}:1 — ${c.fonteRapporto}. Ogni gruppo costa ${c.rapporto} PM personali e aggiunge 1 PM al cristallo (non oltre ${c.capacita}).`),
          h('label', { class: 'campo-dado' }, `Gruppi da convertire (vuoto = quanti ne stanno: ${Math.min(Math.floor(piano.pmDopoRecupero / c.rapporto), c.spazio)}) `,
            numero(u.gruppi, (n) => imposta({ gruppi: n }), { 'aria-label': 'Gruppi da convertire', placeholder: 'auto' })),
          c.prova.richiesta ? rigaScelte(`Esito della Prova di Potere (${c.gruppi} gruppi: Potere ${c.prova.penalita}) — l’app non tira`,
            dati.regole.recupero_pm.conversione.esiti.map((e) => ({ valore: e, etichetta: dati.regole.recupero_pm.conversione.nomi_esiti[e] })), u.esito, (x) => imposta({ esito: x })) : null,
        ] : null,
      ],
    },
    {
      titolo: 'Conto',
      contenuto: [
        piano.avvisi.length ? h('div', { class: 'riquadro attenzione', role: 'status' }, piano.avvisi.map((a) => h('p', {}, a))) : null,
        h('div', { class: 'attacco-risultato' },
          h('p', { class: 'costo-lancio' }, h('strong', {}, `${segno(piano.recupero)} PM`), ` · ${piano.modo.nome}, ${piano.oreEffettive} ${piano.oreEffettive === 1 ? 'ora' : 'ore'}`),
          h('dl', { class: 'voci griglia-voci' }, piano.righe.map((r) => h('div', {}, h('dt', {}, r.etichetta), h('dd', {}, h('strong', {}, r.valore), r.nota ? h('small', { class: 'nota' }, ` (${r.nota})`) : null)))),
          h('p', { class: 'nota' }, `Resta nel registro: «${piano.registro}»`),
          h('div', { class: 'attacco-azioni' },
            h('button', {
              type: 'button', class: `btn primario btn-grande${piano.vuoto ? ' con-avviso' : ''}`, title: piano.vuoto ? 'Non cambia nessun valore' : null,
              onclick: () => { ctx.ui.medita = null; ctx.azioni.medita(piano); }, // prima si chiude: l'azione ridisegna la scheda
            }, piano.vuoto ? 'Conferma (nessuna modifica)' : 'Conferma e applica'),
            h('small', { class: 'nota' }, 'Il conto è un promemoria del manuale: se al tavolo si decide altro, il Direttore ha l’ultima parola. «Annulla» nell’intestazione annulla tutto in un colpo.'))),
      ],
    },
  ];
  return pannelloPassi({ etichetta: 'Medita: recupero dei PM', titolo: 'Medita · recupero dei PM', classe: 'lancio-pannello medita-pannello', chiudi, passi, stato: u, ridisegna: ctx.azioni.ridisegna, etichettaNav: 'Passi di Medita' });
}
