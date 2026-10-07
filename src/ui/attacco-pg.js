// Un PG attacca un nemico dello scontro e ne applica il danno (ritocchi del 07/10/2026): il percorso simmetrico di
// «Attacca» dei nemici (src/ui/attacco-nemico.js). In fondo al pannello «Attacca!» della scheda (src/ui/attacco.js),
// quando il PG è in uno scontro aperto sul server: bersaglio fra i nemici dello scontro (o quello scelto dalla linea di
// tiro della mappa), con Difese, AR e PV; tiri per colpire dal vivo o con l'app ed esito (src/prova.js); se colpisce,
// «Applica il danno» apre «Colpito» (src/ui/colpo.js) già compilata, con AR, natura, Perforante e le altre proprietà
// come dalla plancia (src/danno.js → applicaColpo, src/colpo-nemico.js). Lo scontro si scrive con la revisione
// (server.mjs → 409): se la plancia l'ha cambiato nel frattempo si rilegge e si riprova; se il nemico è cambiato, errore.
// Una riga nel registro (attacco e colpo insieme); «Annulla questo colpo» qui, o «Annulla ultimo colpo» nella plancia.
import { h } from './dom.js';
import { righeTiri, tiriPerRegistro } from './attacco-nemico.js';
import { apriColpo } from './colpo.js';
import { leggiScontro, salvaScontro } from './scontro.js';
import { propostaColpo } from '../nemico-attacco.js';
import { registraAttacco, testoAttacco, annullaUltimoColpo } from '../scontro.js';
import { colpoSuNemico } from '../colpo-nemico.js';

const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const TENTATIVI = 3;

/** Scrive `cambia(scontro)` sullo scontro con la revisione: se un'altra finestra l'ha cambiato, rilegge e riprova. */
export async function scriviScontro(id, cambia) {
  let s = await leggiScontro(id);
  for (let i = 0; i < TENTATIVI; i++) {
    if (s?.stato !== 'aperto') throw new Error('lo scontro è stato chiuso');
    const t = cambia(s);
    const r = await salvaScontro(t);
    if (r.scontro) return r.scontro;
    if (!r.conflitto) throw new Error('scontro non leggibile');
    s = r.conflitto;
  }
  throw new Error('lo scontro cambia di continuo: riprova fra un attimo');
}

/** Bersagli: i nemici dello scontro, prima gli avversari ancora in piedi. */
export function nemiciBersaglio(partecipanti) {
  const n = (partecipanti ?? []).filter((p) => p.tipo === 'nemico');
  const peso = (p) => (p.lato === 'avversario' ? 0 : 2) + (p.pv?.attuali > 0 ? 0 : 1);
  return [...n].sort((a, b) => peso(a) - peso(b));
}

/** Proposta per «Colpito» dall'arma del PG e dal risultato di «Attacca!» (src/nemico-attacco.js → propostaColpo). */
export function propostaDaPg(a, r, e, fonte) {
  const distanza = a.tipo === 'arma_distanza';
  const attacco = {
    tipo: distanza ? 'distanza' : 'ravvicinato', natura: r.danno?.natura ?? a.natura ?? 'Naturale', danno: null, ac: a.ac ?? 1,
    proprieta: (a.proprieta ?? []).map((x) => x?.nome ?? x).filter(Boolean), fonte: fonte.id, fonteNome: fonte.nome,
  };
  return propostaColpo(attacco, r, { magistrale: e.magistrale, colpiASegno: e.riusciti * (distanza ? Math.max(1, r.colpi_a_segno ?? 1) : 1) });
}

/**
 * Blocco «Contro un nemico dello scontro» in fondo al pannello «Attacca!».
 * @param info { scontro: { id, nome, partecipanti } (src/round-scontro.js → collegamentoScontro), pg: { id, nome },
 *   bersaglio?: id proposto (linea di tiro), aggiorna(): rilettura dello scontro dopo una scrittura }
 */
export function bloccoControNemico(ctx, a, r, info) {
  const nemici = nemiciBersaglio(info.scontro.partecipanti);
  const tutti = (ctx.ui.controNemico ??= {});
  const st = (tutti[a.uid] ??= { bersaglio: null, tiri: [], errore: null, inCorso: false, ultimo: null, firma: null });
  const disegna = () => ctx.azioni.ridisegna();
  // VA o numero di tiri cambiati (altre scelte nel pannello): i tiri fatti non valgono più
  const firma = JSON.stringify([r.va_finale, r.tiri ?? 1, r.attacchi?.map((x) => x.va) ?? null]);
  if (st.firma !== firma) { st.firma = firma; st.tiri = []; }
  // il bersaglio della linea di tiro vale quando arriva (poi si può cambiare)
  if (info.bersaglio && info.bersaglio !== st.proposto && nemici.some((n) => n.id === info.bersaglio)) { st.proposto = info.bersaglio; st.bersaglio = info.bersaglio; }
  if (!nemici.some((n) => n.id === st.bersaglio)) st.bersaglio = nemici[0]?.id ?? null;
  const b = nemici.find((n) => n.id === st.bersaglio) ?? null;
  const descrizione = (n) => `${n.lato ?? 'avversario'} · PV ${n.pv?.attuali ?? '?'}/${n.pv?.massimo ?? '?'}${n.difese !== null && n.difese !== undefined ? ` · Difese ${numero(n.difese)}` : ''}${n.ar !== null && n.ar !== undefined ? ` · AR ${n.ar}` : ''}`;
  const titolo = h('h3', { class: 'contro-nemico-titolo' }, `Contro un nemico dello scontro «${info.scontro.nome}»`);
  if (!nemici.length) return h('section', { class: 'riquadro contro-nemico' }, titolo, h('p', { class: 'nota' }, 'Nessun nemico nello scontro.'));

  const { tiri, e, nodi } = righeTiri(ctx, a, r, st, disegna);
  const conDanno = a.tipo === 'arma_distanza' ? !!r.danno_per_colpo : !!r.danno;
  const datiAttacco = (nome) => ({ attaccante: info.pg.nome, bersaglio: nome, arma: a.nome, va: tiri.map((t) => t.va).join('/'), tiri: tiriPerRegistro(tiri, st, e), esito: e.esito });
  const errore = (err) => { st.errore = err.message; st.inCorso = false; disegna(); };

  // senza danno (mancato, o «Registra senza danno»): una riga con l'attacco
  const registra = async () => {
    st.inCorso = true; st.errore = null; disegna();
    try {
      await scriviScontro(info.scontro.id, (s) => registraAttacco(s, datiAttacco(b.nome)));
      st.inCorso = false; st.tiri = []; st.ultimo = { testo: `Attacco registrato contro ${b.nome}.` };
      await info.aggiorna?.();
      disegna();
    } catch (err) { errore(err); }
  };
  // «Applica il danno»: «Colpito» sul nemico com'è ora nello scontro, già compilata; la riga unisce attacco e colpo
  const applica = async () => {
    st.inCorso = true; st.errore = null; disegna();
    let s;
    try { s = await leggiScontro(info.scontro.id); } catch (err) { errore(err); return; }
    const p = s?.stato === 'aperto' ? s.partecipanti.find((x) => x.id === b.id) : null;
    if (!p) { errore(new Error(`${b.nome} non è più nello scontro aperto.`)); return; }
    st.inCorso = false; disegna();
    const prefisso = testoAttacco(datiAttacco(p.nome));
    apriColpo(ctx, { nome: p.nome, pv: p.pv, ferite: p.ferite ?? 0, ar: p.scheda.ar }, {
      proposta: propostaDaPg(a, r, e, info.pg),
      fonti: [{ id: info.pg.id, nome: info.pg.nome }],
      applica: async (ris, colpo, stati, periodici = []) => {
        const t = await scriviScontro(info.scontro.id, (x) => colpoSuNemico(x, p, ris, colpo, stati, periodici, ctx.dati, { prefisso }));
        const c = t.colpi.at(-1);
        st.tiri = [];
        st.ultimo = { testo: `${p.nome}: PV ${c.prima.pv} → ${c.dopo.pv}${c.dopo.ferite !== c.prima.ferite ? `, Ferite ${c.prima.ferite} → ${c.dopo.ferite}` : ''}.`, colpo: { bersaglio: c.bersaglio, ora: c.ora } };
        await info.aggiorna?.();
        disegna();
        return true;
      },
    });
  };
  // «Annulla questo colpo»: solo se è ancora l'ultimo colpo dello scontro (altrimenti dalla plancia)
  const annulla = async () => {
    st.inCorso = true; st.errore = null; disegna();
    try {
      await scriviScontro(info.scontro.id, (s) => {
        const c = (s.colpi ?? []).at(-1);
        if (!c || c.bersaglio !== st.ultimo.colpo.bersaglio || c.ora !== st.ultimo.colpo.ora) throw new Error('non è più l’ultimo colpo dello scontro: correggilo dalla plancia («Annulla ultimo colpo» o i PV della carta).');
        return annullaUltimoColpo(s).scontro;
      });
      st.inCorso = false; st.ultimo = { testo: 'Colpo annullato: PV, Ferite e Stati del nemico come prima.' };
      await info.aggiorna?.();
      disegna();
    } catch (err) { errore(err); }
  };

  return h('section', { class: 'riquadro contro-nemico' },
    titolo,
    h('div', { class: 'scelta-attacco' }, h('p', { class: 'scelta-titolo' }, 'Bersaglio'),
      h('div', { class: 'scelta-pulsanti scelta-colonna' }, nemici.map((n) => h('button', {
        type: 'button', class: `btn scelta-btn${n.id === st.bersaglio ? ' scelta' : ''}${n.pv?.attuali > 0 ? '' : ' a-zero'}`, 'aria-pressed': String(n.id === st.bersaglio),
        onclick: () => { st.bersaglio = n.id; st.tiri = []; st.ultimo = null; disegna(); },
      }, n.nome, h('small', { class: 'nota' }, ` · ${descrizione(n)}`))))),
    b ? h('p', { class: 'nota' }, `Difese di ${b.nome}: ${b.difese ?? '—'} (la Difesa si sceglie in «Colpito»: Parata o Schivata); AR ${b.ar ?? '—'}, applicata con la natura del danno e le proprietà dell’arma.`) : null,
    nodi,
    st.errore ? h('p', { class: 'motivo', role: 'alert' }, st.errore) : null,
    st.ultimo ? h('p', { class: 'esito-attacco', role: 'status' }, st.ultimo.testo,
      st.ultimo.colpo ? [' ', h('button', { type: 'button', class: 'btn btn-piccolo', disabled: st.inCorso, onclick: annulla }, 'Annulla questo colpo')] : null) : null,
    h('div', { class: 'riga-azioni' },
      e.colpisce && conDanno ? h('button', { type: 'button', class: 'btn primario btn-grande', disabled: st.inCorso || !b, onclick: applica }, 'Applica il danno') : null,
      e.completo ? h('button', { type: 'button', class: `btn${e.colpisce && conDanno ? '' : ' primario'}`, disabled: st.inCorso || !b, onclick: registra }, e.colpisce ? 'Registra senza danno' : 'Registra l’attacco') : null),
    h('small', { class: 'nota' }, 'Va nel registro dello scontro con una riga; «Applica il danno» apre «Colpito» sul nemico. Si corregge con «Annulla questo colpo» o, nella plancia, «Annulla ultimo colpo».'));
}
