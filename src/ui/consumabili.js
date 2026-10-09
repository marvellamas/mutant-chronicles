// Artefatti consumabili al tavolo (Manuale della Magia §27, src/consumabili-mistici.js): una scheda per voce, nella tab
// Artefatti (sottocategoria «Consumabili»), con un richiamo compatto nell'Inventario e, per le attivazioni in AzP, nella
// tab Combattimento. «Usa» apre una finestrella con l'effetto e l'atto della scheda: «Attivazione completata» toglie un
// esemplare (§27.4) e registra l'effetto a durata fra gli «Incantesimi in corso»; «Interrotta» non consuma (§27.1).
import { h } from './dom.js';
import { chiedi } from './finestrella.js';
import { info } from './tooltip.js';
import { consumabiliMistici, motivoNonUsabile, incantesimoDi, regoleConsumabili, costiCreazione, versioniCreabili, pianoCreazione, ESITI, ESITI_INFUSIONE, NOMI_ESITI } from '../consumabili-mistici.js';
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
      h('h3', {}, x.def ? info('oggetto', x.def.rif, x.nome) : x.nome, h('small', { class: 'sigla' }, ` · Consumabile${x.creato ? ' creato' : ''} · Grado ${c.grado}`)),
      h('strong', { class: 'quantita-consumabile', title: 'Esemplari posseduti: «Usa» ne toglie uno al completamento (Magia §27.4)' }, `× ${x.quantita}`)),
    h('p', { class: 'nota' }, `${c.incantesimo} ${c.livello} · ${c.pm_sigillati} PM sigillati (Cariche Esclusive${c.energia ? ` di Chroma ${c.energia}` : ''}: non sono una riserva del personaggio) · SnT 0, non si sintonizza · attivazione ${c.attivazione.testo}, senza Prove di Potere; chiunque può usarla.`),
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

// ---------------------------------------------------------------------------
// «Crea consumabile» (Magia §27.2, §24.3–24.6): modulo nella tab Artefatti. Il giocatore sceglie Incantesimo, versione e
// supporto e indica l'esito di ogni Prova (l'app non tira i dadi); il riepilogo dice VA, tempi, crediti e PM. «Registra la
// creazione» scala crediti e PM personali e, se l'infusione riesce, aggiunge il Consumabile all'Inventario.

const segno = (n) => (n < 0 ? `−${-n}` : `+${n}`);
const NOMI_FASI = { progetto: 'Progetto', costruzione: 'Supporto', infusione: 'Infusione' };
const TENTATIVI = { primo: 'primo tentativo', fallimento: 'dopo un Fallimento', maldestro: 'dopo un Maldestro' };

const sceltaIniziale = () => ({
  incantesimo: null, livello: null, conosciutaDaAltri: false,
  supporto: { id: 'pergamena', nome: '', costo: null, complessita: 'Semplice' },
  progetto: { disponibile: true, magistrale: false, esito: 'successo', tentativo: 'primo' },
  costruzione: { esito: 'successo', tentativo: 'primo' },
  infusione: { esito: 'successo', pmCanali: 0, aiutoCanali: 0 },
});

/** Riga di una fase nel riepilogo: Prova con VA e modificatori, tempo, crediti e PM, esito. */
function rigaFase(f) {
  const mod = f.modificatori.map((m) => ` ${segno(m.valore)} (${m.nome})`).join('');
  const tempo = f.giorni && f.giorni > 1 ? `${f.ore} ore (${f.giorni} giornate da 8 ore)` : `${f.ore} or${f.ore === 1 ? 'a' : 'e'}`;
  return h('li', {}, h('strong', {}, `${NOMI_FASI[f.fase]}: `), `Prova di ${f.abilita} VA ${f.va}${mod} = ${f.totale} · ${tempo}`,
    f.crediti ? ` · ${f.crediti.toLocaleString('it-IT')} cr` : '', f.pm ? ` · ${f.pm} PM (${f.pmLavoro} di lavoro + ${f.pmSigillati} sigillati)` : '',
    ' · ', h('em', {}, NOMI_ESITI[f.esito]), f.supporto && f.esito !== 'successo' && f.esito !== 'magistrale' ? ` · supporto: ${f.supporto}` : '');
}

export function pannelloCreaConsumabile(ctx) {
  const R = regoleConsumabili(ctx.dati);
  if (!R?.creazione) return null;
  const scelta = sceltaIniziale();
  const corpo = h('div', { class: 'crea-consumabile-corpo' });
  const contesto = () => ({ scheda: ctx.tab.scheda, crediti: ctx.sessione.crediti ?? 0, pmAttuali: ctx.sessione.pmAttuali ?? 0 });
  const select = (etichetta, valore, opzioni, cambia, attr = {}) => h('label', { class: 'campo-inline' }, `${etichetta} `,
    h('select', { ...attr, onchange: (e) => { cambia(e.target.value); disegna(); } }, opzioni.map((o) => h('option', { value: o.valore, selected: String(o.valore) === String(valore), disabled: !!o.disabilitata, title: o.titolo ?? null }, o.testo))));
  const numero = (etichetta, valore, cambia, attr = {}) => h('label', { class: 'campo-inline' }, `${etichetta} `,
    h('input', { type: 'number', min: 0, step: 1, value: valore ?? '', ...attr, onchange: (e) => { const n = Math.round(Number(e.target.value)); cambia(e.target.value === '' || !Number.isFinite(n) ? null : Math.max(0, n)); disegna(); } }));
  const casella = (etichetta, valore, cambia, titolo = null) => h('label', { class: 'campo-inline', title: titolo }, h('input', { type: 'checkbox', checked: valore, onchange: (e) => { cambia(e.target.checked); disegna(); } }), ` ${etichetta}`);
  const esiti = (lista) => lista.map((e) => ({ valore: e, testo: NOMI_ESITI[e] }));
  const tentativi = Object.entries(TENTATIVI).map(([valore, testo]) => ({ valore, testo }));

  function disegna() {
    const elenco = versioniCreabili(ctx.tab.scheda, ctx.dati, { conosciutaDaAltri: scelta.conosciutaDaAltri });
    if (!elenco.some((x) => x.incantesimo === scelta.incantesimo)) { scelta.incantesimo = elenco[0]?.incantesimo ?? null; scelta.livello = null; }
    const inc = elenco.find((x) => x.incantesimo === scelta.incantesimo);
    if (inc && !inc.versioni.some((v) => v.livello === scelta.livello)) scelta.livello = (inc.versioni.find((v) => !v.motivo) ?? inc.versioni[0])?.livello ?? null;
    const piano = pianoCreazione(scelta, contesto(), ctx.dati);
    const altro = scelta.supporto.id !== 'pergamena';
    const pergamena = R.supporti.find((x) => x.id === 'pergamena');
    corpo.replaceChildren(
      h('p', { class: 'nota' }, 'Tre fasi, anche con persone diverse (Magia §24, §27.2): progetto con Artefatti, supporto con Tecnologia, infusione con Rituali. L’Officiante sei tu: serve Ritualista Minore per i Gradi I–III, Maggiore per i IV–VI. L’app non tira i dadi: indica l’esito di ogni Prova.'),
      casella('La versione la conosce un altro partecipante presente', scelta.conosciutaDaAltri, (v) => { scelta.conosciutaDaAltri = v; }, 'Magia §24.1: all’infusione deve essere presente chi conosce e può usare la versione; può essere diverso dall’Officiante'),
      elenco.length ? h('div', { class: 'riga-campi' },
        select('Incantesimo', scelta.incantesimo, elenco.map((x) => ({ valore: x.incantesimo, testo: `${x.incantesimo}${x.ritualeNonConsentito ? ' (Rituale: non consentito)' : ''}` })), (v) => { scelta.incantesimo = v; scelta.livello = null; }),
        inc ? select('Versione', scelta.livello, inc.versioni.map((v) => ({ valore: v.livello, testo: `${v.livello} · Grado ${v.grado} · ${v.pm} PM`, disabilitata: !!v.motivo, titolo: v.motivo })), (v) => { scelta.livello = Number(v); }) : null)
        : h('p', { class: 'nota motivo' }, 'Nessun Incantesimo conosciuto: spunta la casella se la versione la conosce un altro partecipante.'),
      h('fieldset', { class: 'fase-crea' }, h('legend', {}, 'Supporto'),
        select('Tipo', scelta.supporto.id, R.supporti.map((x) => ({ valore: x.id, testo: x.id === 'pergamena' ? `${x.nome} (${x.costo} cr, ${x.complessita})` : x.nome })), (v) => { scelta.supporto.id = v; }),
        altro ? [
          h('label', { class: 'campo-inline' }, 'Nome ', h('input', { type: 'text', value: scelta.supporto.nome, maxlength: 40, onchange: (e) => { scelta.supporto.nome = e.target.value; disegna(); } })),
          numero('Costo cr', scelta.supporto.costo, (v) => { scelta.supporto.costo = v; }),
          select('Complessità', scelta.supporto.complessita, R.creazione.costruzione.complessita.map((k) => ({ valore: k.nome, testo: `${k.nome} (${segno(k.va)} VA, ${k.ore} ore)` })), (v) => { scelta.supporto.complessita = v; }),
          h('p', { class: 'nota' }, R.supporti.find((x) => x.id === 'altro')?.nota ?? ''),
        ] : h('p', { class: 'nota' }, `Pergamena standard: ${pergamena.costo} cr, costruzione ${pergamena.complessita} (Tecnologia senza penalità, 4 ore).`)),
      h('fieldset', { class: 'fase-crea' }, h('legend', {}, 'Progetto (Artefatti, §24.3)'),
        casella('Progetto già disponibile', scelta.progetto.disponibile, (v) => { scelta.progetto.disponibile = v; }, 'Un progetto riuscito è permanente, riutilizzabile, copiabile e vendibile (§24.3)'),
        scelta.progetto.disponibile ? casella('Progetto magistrale (+2 alla Tecnologia)', scelta.progetto.magistrale, (v) => { scelta.progetto.magistrale = v; })
          : [select('Esito', scelta.progetto.esito, esiti(ESITI), (v) => { scelta.progetto.esito = v; }), select('Tentativo', scelta.progetto.tentativo, tentativi, (v) => { scelta.progetto.tentativo = v; })]),
      h('fieldset', { class: 'fase-crea' }, h('legend', {}, 'Supporto (Tecnologia, §24.4)'),
        select('Esito', scelta.costruzione.esito, esiti(ESITI), (v) => { scelta.costruzione.esito = v; }),
        select('Tentativo', scelta.costruzione.tentativo, tentativi, (v) => { scelta.costruzione.tentativo = v; })),
      h('fieldset', { class: 'fase-crea' }, h('legend', {}, 'Infusione (Rituali, §24.5)'),
        select('Esito', scelta.infusione.esito, esiti(ESITI_INFUSIONE), (v) => { scelta.infusione.esito = v; }),
        numero('PM dei Canali', scelta.infusione.pmCanali, (v) => { scelta.infusione.pmCanali = v ?? 0; }),
        numero('Aiuto dei Canali al VA', scelta.infusione.aiutoCanali, (v) => { scelta.infusione.aiutoCanali = v ?? 0; }, { max: 5 })),
      h('div', { class: 'riepilogo-crea', role: 'status' },
        piano.fasi.length ? [
          h('ul', {}, piano.fasi.map(rigaFase)),
          h('p', {}, h('strong', {}, 'Totale: '), `${piano.ore} ore di lavoro · ${piano.crediti.toLocaleString('it-IT')} cr · ${piano.pm} PM personali${piano.pmCanali ? ` (+ ${piano.pmCanali} dai Canali)` : ''}.`,
            piano.creato ? ` Risultato: ${piano.voce.personalizzato.nome}, Grado ${piano.grado}, con ${piano.pmSigillati} PM sigillati.` : ' Risultato: nessun Consumabile.'),
        ] : null,
        piano.avvisi.map((a) => h('p', { class: 'nota' }, a)),
        piano.errori.map((e) => h('p', { class: 'nota motivo' }, `Non si può: ${e}.`)),
        h('button', { type: 'button', class: 'btn primario', disabled: !!piano.errori.length,
          onclick: async () => {
            const ok = await chiedi({ titolo: 'Registra la creazione', testo: `Si scalano ${piano.crediti.toLocaleString('it-IT')} cr e ${piano.pm} PM personali.${piano.creato ? ` Nell’Inventario entra «${piano.voce.personalizzato.nome}».` : ' Nessun Consumabile creato.'}`, si: 'Registra' });
            if (ok) ctx.azioni.creaConsumabile(pianoCreazione(scelta, contesto(), ctx.dati));
          } }, 'Registra la creazione')));
  }
  disegna();
  return h('details', { class: 'crea-consumabile' }, h('summary', {}, 'Crea consumabile (Magia §27.2)'), corpo);
}
