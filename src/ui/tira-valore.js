// La finestrella del tiro dalla scheda (13/10/2026, S9, S15, S18): si tocca il valore e si tira.
// Nessun pulsante nuovo accanto ai numeri: il numero stesso si tocca (col mouse resta il tooltip della provenienza,
// il conto sta in «Calcolo»). Il dado dal vivo resta il modo di base: qui si tira solo se il giocatore lo chiede.
// Le regole stanno in src/tiri-scheda.js (dadi dai dati, esito di src/prova.js); qui solo la presentazione.
// Il componente del wizard («Tira» o «risultato tirato dal vivo») resta in src/ui/tiro.js, per i tiri della creazione.
import { h } from './dom.js';
import { apri } from './finestrella.js';
import { tiroDelValore, esitoTiro, tiraValore, siTira, rigaTiro, rigaRegistroScontro, tiriRecenti } from '../tiri-scheda.js';
import { eCapolavoro, giaUsato, puoUsare, esitoRipetizione, testoAlTavolo, quandoTorna } from '../capolavori.js';
import { catalogo, risolvi } from '../equipaggiamento.js';

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const quando = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
const casuale = (facce) => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return (buf[0] % facce) + 1;
};

/**
 * Apre la finestrella «Tira Percezione — VA 12»: un pulsante con il dado delle regole, il risultato con l'esito
 * (§1.6, §1.7, A.78) e lo scarto. Si può tirare più volte; ogni tiro va nel registro del personaggio e, in uno
 * scontro, nel registro della plancia.
 * @param v { genere: 'prova'|'iniziativa'|'danno', nome, va?, formula?, tipo?, abilita?, magistraleMigliorato?, note? }
 *   `note`: righe in piccolo con i bonus e i malus già compresi nel valore.
 */
export function apriTiro(ctx, v) {
  const t = tiroDelValore(v, ctx.dati);
  const puo = siTira(t, ctx.dati);
  return apri('finestrella-tiro', t.titolo, (fine) => {
    const corpo = h('div', { class: 'corpo-tiro' });
    let ultimo = null;
    // A.259 (Davide, 06/11/2026): i Capolavori di questo personaggio. Una finestrella è **una prova**: qui dentro si
    // usa un solo Capolavoro e si ripete il tiro una volta sola, e vale il secondo risultato anche se è peggiore.
    // Quello che l'app non giudica (pertinenza, strumento principale, prova non offensiva) è scritto accanto al
    // pulsante: lo decide il tavolo.
    let prova = {};
    let primo = null;
    // le voci dei Capolavori di questo personaggio, con il nome risolto dal catalogo
    const capolavori = () => (ctx.azioni?.equipaggiamentoOra?.() ?? ctx.scelte?.equipaggiamento ?? []).filter(eCapolavoro)
      .map((voce) => ({ voce, nome: risolvi(voce, catalogo(ctx.dati)).nome ?? voce.uid, usato: giaUsato(voce) }));
    const usaIlCapolavoro = (x) => {
      const r = ctx.azioni?.usaCapolavoro?.(x.voce.uid, prova);
      if (!r || r.errore) { ultimo = ultimo; return; }
      prova = r.prova;
      primo = ultimo;
      const t2 = tiraValore(t, casuale);
      if (!t2) return;
      ultimo = esitoTiro(t, t2.naturale, ctx.dati, t2.risultati);
      const e = esitoRipetizione(primo, ultimo, ctx.dati);
      ctx.azioni?.tiro?.(rigaTiro(t, ultimo), `${rigaRegistroScontro(ctx.scelte?.nome?.trim() || 'Il PG', ultimo, t)} (ripetuto con il Capolavoro «${x.nome}»: ${e.testo})`);
      disegna();
    };
    const disegna = () => corpo.replaceChildren(...[
      (v.note ?? []).length ? h('p', { class: 'nota note-tiro' }, 'Nel valore: ', v.note.join(' · ')) : null,
      puo.si ? null : h('p', { class: 'riquadro attenzione' }, puo.motivo),
      ultimo ? h('div', { class: `esito-tiro ${ultimo.esito ?? 'somma'}`, role: 'status' },
        h('p', { class: 'dado-tiro' }, h('strong', {}, String(ultimo.naturale)),
          h('small', { class: 'nota' }, t.modo === 'prova' ? ` naturale su ${t.spec.formula}` : ` ${t.spec.formula}`)),
        ultimo.esito
          ? h('p', { class: 'nome-esito' }, h('strong', {}, ultimo.nome), h('span', { class: 'scarto-tiro' }, ` · scarto ${segno(ultimo.scarto)}`))
          : h('p', { class: 'nome-esito' }, h('strong', {}, String(ultimo.totale))),
        h('p', { class: 'nota' }, ultimo.testo)) : null,
      // A.259: i Capolavori, solo quando c'è già un tiro da ripetere (si ripete un tiro, non se ne comincia uno)
      ultimo && capolavori().length ? h('div', { class: 'capolavori-tiro' },
        primo ? h('p', { class: 'nota riquadro' }, h('strong', {}, 'Tiro ripetuto con il Capolavoro: '),
          `primo ${primo.naturale}, secondo ${ultimo.naturale}. ${esitoRipetizione(primo, ultimo, ctx.dati).testo}`)
          : h('ul', { class: 'elenco-capolavori' }, capolavori().map((x) => {
            const ok = puoUsare(x.voce, prova, ctx.dati);
            return h('li', {},
              h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !ok.si, title: ok.si ? null : ok.motivo, onclick: () => usaIlCapolavoro(x) },
                `Ripeti con ${x.nome}`),
              h('small', { class: 'nota' }, x.usato ? ` · ${quandoTorna(ctx.dati)}` : ''));
          })),
        primo ? null : h('p', { class: 'nota' }, testoAlTavolo(ctx.dati))) : null,
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(true) }, 'Chiudi'),
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !puo.si && !ultimo,
          onclick: () => {
            const r = tiraValore(t, casuale);
            if (!r) return;
            ultimo = esitoTiro(t, r.naturale, ctx.dati, r.risultati);
            ctx.azioni?.tiro?.(rigaTiro(t, ultimo), rigaRegistroScontro(ctx.scelte?.nome?.trim() || 'Il PG', ultimo, t));
            disegna();
          },
        }, `${ultimo ? 'Tira ancora' : 'Tira'} ${t.spec?.formula ?? ''}`)),
      h('p', { class: 'nota' }, 'Il dado vero al tavolo vale sempre: questo serve quando non lo si ha in mano.'),
    ].filter(Boolean));
    disegna();
    return [corpo];
  });
}

/** «Ultimi tiri» nella scheda: richiudibile, dal più recente; non c'è finché non si tira. */
export function sezioneTiri(ctx) {
  const righe = tiriRecenti(ctx.sessione);
  if (!righe.length) return null;
  return h('details', { class: 'sezione-tab ultimi-tiri' },
    h('summary', {}, `Ultimi tiri (${righe.length})`),
    h('ul', {}, righe.map((x) => h('li', {},
      h('small', { class: 'nota' }, `${quando(x.quando)} · `),
      h('span', { class: `tiro-riga${x.esito ? ` ${x.esito}` : ''}` }, x.testo)))),
    h('p', { class: 'nota' }, 'Tocca un valore della scheda (VA, Difese, Iniziativa, Prove Salvezza, o il VA e il danno in «Attacca!») per tirare con l’app.'));
}
