// Tavolo del Master, pezzo 5 (docs/tavolo-direttore.md): «Attacca» di un nemico (o di un partecipante scritto
// a mano con un attacco). Prima si sceglie l'attacco e il bersaglio; poi si apre il pannello «Attacca!» dell'app
// (src/ui/attacco.js) con un contesto che presenta il nemico come attaccante (src/nemico-attacco.js). La riga
// finale del pannello diventa il tiro per colpire (dal vivo o con l'app), l'esito (src/prova.js, §1.6–1.7) e,
// se colpisce, «Applica danno», che registra l'attacco e apre «Colpito» (pezzo 4) già compilata.
// Il pannello sta fuori dalla plancia (che si ridisegna ogni pochi secondi), come «Colpito».
import { h } from './dom.js';
import { pannelloAttacco, pillola } from './attacco.js';
import { attacchiDi, armaDaAttacco, attaccanteDa, conLuceNemico, propostaColpo } from '../nemico-attacco.js';
import { esitoProva } from '../prova.js';
import { specTiro, tira } from '../tiri.js';

const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const D20 = specTiro({ dadi: 1, facce: 20, fisso: 0 });

/** Riga di un attacco del formato, come nella carta del nemico. */
export function descriviAttacco(a) {
  return `${a.nome}: VA ${numero(a.va)}, danno ${a.danno} ${a.natura}${a.tipo === 'distanza' ? `, gittata ${a.gittata_q} Q${a.modalita?.length ? `, ${a.modalita.join(' ')}` : ''}` : `, portata ${a.portata_q ?? 1} Q`}${a.ac > 1 ? `, AC ${a.ac}` : ''}${a.proprieta?.length ? `, ${a.proprieta.join(', ')}` : ''}`;
}

/**
 * Tiri per colpire richiesti dal risultato di «Attacca!»: uno per tiro delle raffiche a distanza, uno per
 * attacco delle Manovre con più attacchi in mischia; ciascuno con il suo VA.
 */
export function tiriRichiesti(arma, r) {
  if (r.impossibile || r.va_finale === null || r.va_finale === undefined) return [];
  if (arma.tipo === 'arma_distanza') return Array.from({ length: Math.max(1, r.tiri ?? 1) }, (_, i) => ({ etichetta: r.tiri > 1 ? `Tiro ${i + 1}` : 'Tiro per colpire', va: r.va_finale }));
  if (r.attacchi?.length > 1) return r.attacchi.map((x) => ({ etichetta: x.etichetta, va: x.va }));
  // §1.6: nelle Prove contrapposte si tira anche con valore 20 o più (nessun successo automatico)
  return r.prova?.tipo === 'contrapposta' ? [{ etichetta: 'Prova contrapposta', va: r.va_finale, obbligatoria: true }] : [{ etichetta: 'Tiro per colpire', va: r.va_finale }];
}

/**
 * Esito complessivo dei tiri: ogni tiro con esitoProva; colpisce se almeno uno riesce; Magistrale se il primo
 * tiro riuscito è Magistrale (il moltiplicatore vale per la sola prima applicazione, §1.6).
 * @param valori d20 naturali (null se non ancora tirato), uno per tiro
 */
export function esitoAttacco(tiri, valori, dati) {
  // A.78 (E&L del 02/10, decisione 3): gli attacchi si tirano anche con VA finale 20 o più
  const esiti = tiri.map((t, i) => esitoProva(t.va, valori[i] ?? null, dati, { obbligatoria: !!t.obbligatoria, tipo: 'attacco' }));
  const completo = esiti.length > 0 && esiti.every((e) => e.esito !== 'da_tirare');
  const riusciti = esiti.filter((e) => e.riuscita);
  const esito = !completo ? 'da_tirare'
    : riusciti.length ? (riusciti[0].esito === 'magistrale' ? 'magistrale' : riusciti[0].esito === 'automatico' ? 'automatico' : 'successo')
      : esiti.some((e) => e.esito === 'maldestro') ? 'maldestro' : esiti.every((e) => e.esito === 'impossibile') ? 'impossibile' : 'fallimento';
  return { esiti, completo, colpisce: completo && riusciti.length > 0, riusciti: riusciti.length, magistrale: riusciti[0]?.esito === 'magistrale', esito };
}

/**
 * Tiri per colpire (d20 dal vivo o con l'app, uno per tiro richiesto) ed esito: comuni ad «Attacca» dei nemici e, dai
 * ritocchi del 07/10, al bersaglio nemico del pannello «Attacca!» di un PG (src/ui/attacco-pg.js).
 * @param st { tiri: [{ valore, origine }], errore } stato del pannello; disegna: ridisegno dopo un tiro
 * @returns {{ tiri, e: esitoAttacco, nodi }}
 */
export function righeTiri(ctx, arma, r, st, disegna) {
  const tiri = tiriRichiesti(arma, r);
  const e = esitoAttacco(tiri, st.tiri.map((t) => t?.valore ?? null), ctx.dati);
  const nodi = [
    tiri.map((t, i) => {
      const x = e.esiti[i];
      const input = h('input', { type: 'number', min: 1, max: 20, step: 1, class: 'input-d10', value: st.tiri[i]?.origine === 'vivo' ? st.tiri[i].valore : '', 'aria-label': `${t.etichetta}: d20 dal vivo` });
      const senzaTiro = x.esito === 'automatico' || x.esito === 'impossibile';
      return h('div', { class: 'tiro-colpire' },
        h('span', {}, `${t.etichetta}: VA `, pillola(arma.nome, t.va, r.provenienza), ' '),
        senzaTiro ? null : [
          input,
          h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => {
            const v = Number(input.value);
            if (!Number.isInteger(v) || v < 1 || v > 20) { st.errore = 'Il d20 dal vivo va da 1 a 20.'; disegna(); return; }
            st.errore = null; st.tiri[i] = { valore: v, origine: 'vivo' }; disegna();
          } }, 'Inserisci'),
          h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { st.tiri[i] = { valore: tira(D20).tiro.valore, origine: 'app' }; disegna(); } }, 'Tira 1d20 con l’app'),
        ],
        h('span', { class: `esito-tiro esito-${x.esito}` }, ' ', st.tiri[i] ? `${st.tiri[i].valore} (${st.tiri[i].origine === 'app' ? 'app' : 'dal vivo'}) → ` : '', x.testo));
    }),
    e.completo ? h('p', { class: `esito-attacco esito-${e.esito}`, role: 'status' }, h('strong', {}, {
      magistrale: 'Colpito: Successo Magistrale.', successo: `Colpito${e.riusciti > 1 ? ` (${e.riusciti} tiri riusciti)` : ''}.`, automatico: 'Colpito (successo automatico).',
      fallimento: 'Mancato.', maldestro: 'Mancato: Fallimento Maldestro.', impossibile: 'Attacco impossibile.',
    }[e.esito])) : null,
  ];
  return { tiri, e, nodi };
}

/** I tiri per la riga del registro (src/scontro.js → registraAttacco). */
export const tiriPerRegistro = (tiri, st, e) => tiri.map((t, i) => ({ valore: st.tiri[i]?.valore ?? '—', origine: st.tiri[i]?.origine ?? null, esito: e.esiti[i].esito }));

/**
 * Apre la scelta dell'attacco e del bersaglio, poi il pannello.
 * @param p partecipante che attacca (nemico o manuale con attacco)
 * @param bersagli [{ id, nome, descrizione, colpito: (proposta) → apre «Colpito» }] (l'attaccante escluso)
 * @param registra async ({ attaccante, bersaglio, arma, va, tiri, esito }) → true se scritto nel registro
 */
export function apriAttaccoNemico(ctx, p, { bersagli, registra, dichiarazione = {} }) {
  const attacchi = attacchiDi(p);
  const contenitore = h('div', { class: 'attacco-nemico' });
  document.body.append(contenitore);
  // dichiarazione: valori già impostati (linea di tiro della mappa: distanza e Copertura), modificabili nel pannello
  // fase 2, lotto 4: la luce della zona del bersaglio dalla mappa (modificabile con «Luce sul bersaglio»)
  const st = { indice: 0, bersaglio: bersagli[0]?.id ?? null, fase: 'scelta', dichiarazione: { ...dichiarazione }, luce: dichiarazione.luce ?? null, luceVisione: false, ui: {}, tiri: [], errore: null, inCorso: false };
  const chiudi = () => contenitore.remove();
  const esc = (e) => { if (e.key === 'Escape' && document.body.contains(contenitore)) { chiudi(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);

  const scelta = () => h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudi(); } },
    h('section', { class: 'attacco-pannello pannello-semplice', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Attacco di ${p.nome}` },
      h('header', { class: 'attacco-testa' }, h('h2', {}, `Attacca · ${p.nome}`), h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Chiudi')),
      h('div', { class: 'scelta-attacco' }, h('p', { class: 'scelta-titolo' }, 'Attacco'),
        h('div', { class: 'scelta-pulsanti scelta-colonna' }, attacchi.map((a, i) => h('button', {
          type: 'button', class: `btn scelta-btn${i === st.indice ? ' scelta' : ''}`, 'aria-pressed': String(i === st.indice), onclick: () => { st.indice = i; disegna(); },
        }, descriviAttacco(a))))),
      h('div', { class: 'scelta-attacco' }, h('p', { class: 'scelta-titolo' }, 'Bersaglio'),
        bersagli.length ? h('div', { class: 'scelta-pulsanti scelta-colonna' }, bersagli.map((b) => h('button', {
          type: 'button', class: `btn scelta-btn${b.id === st.bersaglio ? ' scelta' : ''}`, 'aria-pressed': String(b.id === st.bersaglio), onclick: () => { st.bersaglio = b.id; disegna(); },
        }, b.nome, b.descrizione ? h('small', { class: 'nota' }, ` · ${b.descrizione}`) : null)))
          : h('p', { class: 'nota' }, 'Nessun bersaglio: servono PG al tavolo o altri nemici nello scontro.')),
      h('div', { class: 'attacco-azioni' },
        h('button', { type: 'button', class: 'btn primario btn-grande', disabled: !attacchi[st.indice] || !st.bersaglio, onclick: () => { st.fase = 'pannello'; st.dichiarazione = { ...dichiarazione }; st.ui = {}; st.tiri = []; disegna(); } }, 'Avanti: «Attacca!» →'))));

  // riga finale del pannello: bersaglio, tiri per colpire, esito, registro e «Applica danno»
  const finale = (attacco, arma, b) => (r) => {
    const { tiri, e, nodi } = righeTiri(ctx, arma, r, st, disegna);
    const conDanno = attacco.tipo === 'distanza' ? !!r.danno_per_colpo : !!r.danno;
    const esegui = async (applica) => {
      st.inCorso = true; st.errore = null; disegna();
      try {
        const ok = await registra({
          attaccante: p.nome, bersaglio: b.nome, arma: attacco.nome, va: tiri.map((t) => t.va).join('/'),
          tiri: tiriPerRegistro(tiri, st, e), esito: e.esito,
        });
        if (!ok) throw new Error('attacco non registrato (scontro cambiato o chiuso): riprova.');
        chiudi();
        // la fonte degli Stati periodici è chi attacca: le ricorrenze vanno alla sua Iniziativa (§5.15)
        if (applica) b.colpito(propostaColpo({ ...attacco, fonte: p.id, fonteNome: p.nome }, r, { magistrale: e.magistrale, colpiASegno: e.riusciti * (attacco.tipo === 'distanza' ? Math.max(1, r.colpi_a_segno ?? 1) : 1) }));
      } catch (err) {
        st.errore = err.message; st.inCorso = false; disegna();
      }
    };
    return h('div', { class: 'attacco-azioni attacco-nemico-esito' },
      h('p', {}, h('strong', {}, 'Bersaglio: '), b.nome, b.descrizione ? h('small', { class: 'nota' }, ` · ${b.descrizione}`) : null,
        ' ', h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { st.fase = 'scelta'; disegna(); } }, 'Cambia attacco o bersaglio')),
      r.prova?.tipo === 'contrapposta' ? h('p', { class: 'nota' }, 'Prova contrapposta: l’esito qui sotto è quello del d20 del nemico; il confronto con la Prova del bersaglio si fa al tavolo (§5.12).') : null,
      nodi,
      st.errore ? h('p', { class: 'motivo', role: 'alert' }, st.errore) : null,
      h('div', { class: 'riga-azioni' },
        e.colpisce && conDanno ? h('button', { type: 'button', class: 'btn primario btn-grande', disabled: st.inCorso, onclick: () => esegui(true) }, 'Applica danno') : null,
        e.completo ? h('button', { type: 'button', class: `btn${e.colpisce && conDanno ? '' : ' primario'}`, disabled: st.inCorso, onclick: () => esegui(false) }, e.colpisce ? 'Registra senza danno' : 'Registra l’attacco') : null),
      h('small', { class: 'nota' }, 'L’attacco va nel registro dello scontro; con «Applica danno» si apre «Colpito» sul bersaglio, già compilata.'));
  };

  const disegna = () => {
    if (!document.body.contains(contenitore)) return;
    if (st.fase === 'scelta') { contenitore.replaceChildren(scelta()); return; }
    const attacco = attacchi[st.indice];
    const b = bersagli.find((x) => x.id === st.bersaglio);
    // fase 2, lotto 4: la luce sul bersaglio (proposta dalla mappa, modificabile) entra nel VA del nemico
    const { arma, chi } = conLuceNemico(armaDaAttacco(attacco, `${p.id}:${st.indice}`, ctx.dati), attaccanteDa(p, ctx.dati), st.luce, ctx.dati, { visione: st.luceVisione === true });
    // il pannello chiude mettendo ctx.ui.attacco a null
    if (st.ui.aperto && st.ui.attacco === null) { chiudi(); return; }
    st.ui.aperto = true;
    const finto = {
      dati: ctx.dati,
      tab: { scheda: chi.scheda },
      sessione: { ...chi.sessione, ...(st.luce ? { luce: st.luce, luceVisione: st.luceVisione } : {}), attacchi: { [arma.uid]: st.dichiarazione } },
      ui: st.ui,
      azioni: {
        ridisegna: disegna,
        ricordaAttacco: (uid, d) => { st.dichiarazione = d; st.tiri = []; disegna(); },
        // «Luce sul bersaglio» del pannello: vale per questo attacco
        imposta: (k, v) => { if (k === 'luce' || k === 'luceVisione') { st[k] = v; st.tiri = []; disegna(); } },
        spara: () => {},
        finale: finale(attacco, arma, b),
      },
    };
    // il pannello si ricostruisce a ogni scelta: lo scorrimento resta dov'era
    const su = contenitore.querySelector('.attacco-sfondo')?.scrollTop ?? 0;
    contenitore.replaceChildren(pannelloAttacco(finto, arma));
    const sfondo = contenitore.querySelector('.attacco-sfondo');
    if (sfondo) sfondo.scrollTop = su;
  };
  disegna();
  return { chiudi };
}
