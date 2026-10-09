// Artefatti consumabili al tavolo (Manuale della Magia §27, src/consumabili-mistici.js): una scheda per voce, nella tab
// Artefatti (sottocategoria «Consumabili»), con un richiamo compatto nell'Inventario e, per le attivazioni in AzP, nella
// tab Combattimento. «Usa» apre una finestrella con l'effetto e l'atto della scheda: «Attivazione completata» toglie un
// esemplare (§27.4) e registra l'effetto a durata fra gli «Incantesimi in corso»; «Interrotta» non consuma (§27.1).
import { h } from './dom.js';
import { chiedi } from './finestrella.js';
import { info } from './tooltip.js';
import { consumabiliMistici, motivoNonUsabile, incantesimoDi, regoleConsumabili, costiCreazione } from '../consumabili-mistici.js';
import { durataLancio, opzioniDurata } from '../durate-incantesimi.js';

/** Consumabili della scheda (Inventario del personaggio). */
export const consumabiliScheda = (ctx) => consumabiliMistici(ctx.scelte.equipaggiamento ?? [], ctx.dati);

/** Registrazione dell'effetto a durata (§27.1: «Un effetto a durata prosegue dopo la dissoluzione del supporto»), o null. */
function registrazione(x, inc, concentrazione) {
  const d = durataLancio(inc, x.consumabile.livello, { concentrazione });
  return ['round', 'tempo'].includes(d.tipo) ? { nome: `${x.consumabile.incantesimo} (${x.nome})`, livello: x.consumabile.livello, durata: d, bersagli: [] } : null;
}

async function usa(ctx, x, { concentrazione = false } = {}) {
  const R = regoleConsumabili(ctx.dati);
  const inc = incantesimoDi(x.consumabile, ctx.dati);
  const reg = inc ? registrazione(x, inc, concentrazione) : null;
  const ok = await chiedi({
    titolo: `Usa: ${x.nome}`,
    testo: `${x.attivazione.testo}${x.attivazione.inRound ? ' (Azione Principale)' : ''}. ${x.consumabile.effetto} ${R?.frasi?.consumo ?? ''} Se l’attivazione si interrompe prima del completamento, l’effetto non si produce e l’oggetto resta disponibile (Magia §27.1).${reg ? ` Durata: ${reg.durata.testo}${reg.durata.concentrazione ? ', con Concentrazione' : ''}; l’effetto va fra gli «Incantesimi in corso».` : ''}`,
    si: 'Attivazione completata', no: 'Interrotta / annulla',
  });
  if (ok) ctx.azioni.usaConsumabile(x.uid, reg);
}

/** Pulsanti «Usa» (due per le versioni con la Concentrazione a scelta, come Individuare). */
function pulsantiUsa(ctx, x, motivo) {
  const inc = incantesimoDi(x.consumabile, ctx.dati);
  const scelta = inc && opzioniDurata(inc).concentrazioneAScelta;
  const b = (testo, opz, titolo) => h('button', { type: 'button', class: 'btn primario btn-piccolo', disabled: !!motivo, title: motivo ?? titolo, onclick: () => usa(ctx, x, opz) }, testo);
  return scelta
    ? [b(`Usa, durata fissa (${x.attivazione.testo})`, { concentrazione: false }, 'Durata fissa, senza Concentrazione'), ' ', b(`Usa, Concentrazione (${x.attivazione.testo})`, { concentrazione: true }, 'Con Concentrazione')]
    : b(`Usa (${x.attivazione.testo})`, {}, 'Si consuma al completamento dell’attivazione (Magia §27.1)');
}

/** Scheda completa (tab Artefatti). */
export function schedaConsumabile(ctx, x) {
  const c = x.consumabile;
  const motivo = motivoNonUsabile(x, { inScontro: !!ctx.roundScontro });
  const costi = costiCreazione({ grado: c.grado, pmSigillati: c.pm_sigillati }, ctx.dati);
  return h('article', { class: `arma-tab artefatto-scheda consumabile-scheda${x.deposito ? ' in-deposito' : ''}` },
    h('div', { class: 'arma-testa' },
      h('h3', {}, info('oggetto', x.def.rif, x.nome), h('small', { class: 'sigla' }, ` · Consumabile · Grado ${c.grado}`)),
      h('strong', { class: 'quantita-consumabile', title: 'Esemplari posseduti: «Usa» ne toglie uno al completamento (Magia §27.4)' }, `× ${x.quantita}`)),
    h('p', { class: 'nota' }, `${c.incantesimo} ${c.livello} · ${c.pm_sigillati} PM sigillati (Cariche Esclusive di Chroma ${c.energia}: non sono una riserva del personaggio) · SnT 0, non si sintonizza · attivazione ${c.attivazione.testo}, senza Prove di Potere; chiunque può usarla.`),
    h('p', {}, c.effetto),
    h('p', { class: 'riga-azioni' }, pulsantiUsa(ctx, x, motivo)),
    motivo ? h('p', { class: 'nota motivo' }, `Non utilizzabile ora: ${motivo}.`) : null,
    costi ? h('p', { class: 'nota' }, `Creazione (§27.2): ${costi.creazione} cr con il progetto, ${costi.ore} ore di costruzione e ${costi.pmTotali} PM (${costi.pmLavoro} di lavoro + ${costi.pmSigillati} sigillati); vendita indicativa ${costi.vendita.toLocaleString('it-IT')} cr.`) : null);
}

/** Richiamo compatto (riga dell'Inventario, tab Combattimento): quantità e «Usa». */
export function rigaConsumabile(ctx, x) {
  const motivo = motivoNonUsabile(x, { inScontro: !!ctx.roundScontro });
  return h('div', { class: 'pi-voce riga-consumabile' },
    h('span', {}, 'Esemplari ', h('strong', {}, String(x.quantita)), ' '),
    pulsantiUsa(ctx, x, motivo));
}
