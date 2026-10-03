// Risorse Interiori nella tab Poteri (richiesta di Davide del 02/10; Giocatore §8.9, §8.9.1): le
// Tecniche Interiori apprese elencate come gli incantesimi, una scheda per Tecnica con «Attiva»,
// il contatore dei Round con «Nuovo Round» e il riquadro delle Tecniche attive. Le regole stanno in
// src/tecniche.js; qui solo la presentazione. Il pannello «Attiva» usa lo stesso impianto di
// «Lancia!» (src/ui/pannello-passi.js), con due passi.
import { h } from './dom.js';
import { info } from './tooltip.js';
import { rigaScelte, interruttore, pannelloPassi } from './pannello-passi.js';
import { haRisorseInteriori, tecnicaDi, statoAttivazione, roundAttuale, inScadenza, testoFine, costoTecnica, gruppoTecnica, ordineGruppo, tecnicheInCorso, righeInCorso, sintesiTecnica, curaTecnica } from '../tecniche.js';

const etichettaTecnica = (gruppo) => h('span', { class: 'etichetta-macro' }, gruppoTecnica(gruppo).etichetta);

/** Costo in testo: «4 PM», per Imposizione «1–10 PM». */
const testoCosto = (t) => (Array.isArray(t.opzioni_costo)
  ? `${Math.min(...t.opzioni_costo.map((o) => o.pm))}–${Math.max(...t.opzioni_costo.map((o) => o.pm))} PM` : `${t.costo_pm} PM`);

/**
 * Sezione «Risorse Interiori» della tab Poteri: solo per chi ha Risorse Interiori (Talento Libero
 * o di Classe del Lottatore). null altrimenti.
 */
export function sezioneRisorseInteriori(ctx) {
  const scheda = ctx.tab.scheda;
  if (!haRisorseInteriori(scheda)) return null;
  const s = ctx.sessione;
  const round = roundAttuale(s);
  const apprese = (scheda.tecniche ?? []).map((x) => tecnicaDi(x.id, ctx.dati)).filter(Boolean);
  const ultima = s.ultimaTecnica?.round === round ? tecnicaDi(s.ultimaTecnica.id, ctx.dati) : null;
  const scadono = inScadenza(s).map((x) => tecnicaDi(x.id, ctx.dati)?.nome ?? x.id);
  const umn = scheda.umanita && scheda.umanita.risorseInteriori === false;
  // gruppi nell'ordine del manuale: generiche, Scuole, Lottatore
  const gruppi = [...new Set(apprese.map((t) => t.gruppo))].sort((a, b) => ordineGruppo(a) - ordineGruppo(b) || a.localeCompare(b));
  return h('section', { class: 'sezione-tab risorse-interiori' },
    h('h2', {}, `Risorse Interiori · Tecniche Interiori (${apprese.length} / ${scheda.tecnicheAmmesse ?? apprese.length})`),
    h('div', { class: 'griglia-tavolo tecniche-testa' },
      h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Round'),
        // con il server e il PG in uno scontro aperto il Round è quello dello scontro (src/round-scontro.js)
        h('p', { class: 'valore-tavolo' }, h('strong', {}, String(round)), ctx.roundScontro ? h('span', { class: 'round-scontro' }, ' · dallo scontro') : null),
        h('button', {
          type: 'button', class: 'btn', onclick: ctx.azioni.nuovoRound, disabled: !!ctx.roundScontro,
          title: ctx.roundScontro ? `Sei nello scontro «${ctx.roundScontro.nome}»: il Round lo fa avanzare il master dalla plancia, così le durate scadono per tutti allo stesso momento. Il contatore torna alla scheda quando lo scontro finisce.`
            : scadono.length ? `Scadono: ${scadono.join(', ')}` : 'Passa al Round successivo: si può attivare un’altra Tecnica',
        }, 'Nuovo Round'),
        h('p', { class: 'nota' }, ultima ? `Questo Round: ${ultima.nome}. La prossima Tecnica dal Round ${round + 1} (§8.9.1).` : 'Nessuna Tecnica attivata in questo Round: se ne può attivare una (§8.9.1).',
          scadono.length ? (ctx.roundScontro ? ` Al prossimo Round dello scontro scade: ${scadono.join(', ')}.` : ` Con «Nuovo Round» scade: ${scadono.join(', ')}.`) : null)),
      h('div', { class: 'contatore-tavolo riquadro-pm' }, h('h3', {}, 'PM personali'),
        h('p', { class: 'valore-tavolo' }, h('strong', {}, String(s.pmAttuali)), h('span', {}, ` / ${ctx.massimi.pm}`)),
        h('p', { class: 'nota' }, 'Le Tecniche si pagano solo con i PM personali, non con batterie o riserve di Chroma (§8.9.1).')),
      tecnicheAttive(ctx)),
    umn ? h('p', { class: 'riquadro attenzione' }, `Umanità ${scheda.umanita.valore}: le Tecniche dipendenti da Risorse Interiori non sono utilizzabili (§8.9.1, §5.21).`) : null,
    gruppi.map((g) => h('div', { class: 'incantesimi-griglia' },
      h('h3', { class: 'spec' }, gruppoTecnica(g).titolo),
      apprese.filter((t) => t.gruppo === g).map((t) => schedaTecnica(ctx, t)))));
}

/** Riquadro delle Tecniche attive, con il loro scadere e «Termina» per quelle a tempo. */
function tecnicheAttive(ctx) {
  // effetti in corso (§8.9): i numeri sono già nei valori della scheda, con la provenienza «Tecnica: …»;
  // qui l'effetto in breve e le regole che non sono un numero
  const attive = tecnicheInCorso(ctx.sessione, ctx.dati);
  return h('div', { class: 'contatore-tavolo tecniche-attive' }, h('h3', {}, 'Tecniche attive'),
    attive.length ? h('ul', {}, attive.map((x) => {
      const t = x.t;
      const breve = sintesiTecnica(t);
      const righe = righeInCorso(x, ctx.tab.scheda);
      return h('li', {}, h('strong', {}, t.nome), breve ? ` (${breve})` : null, ` · dal Round ${x.dal}, ${testoFine(t, x)} `,
        x.al === null || t.durata_tipo === 'istantanea' ? h('button', { type: 'button', class: 'btn btn-piccolo', title: t.durata_tipo === 'istantanea' ? 'Effetto usato: toglila dalle Tecniche in corso' : null, onclick: () => ctx.azioni.terminaTecnica(x.id) }, 'Termina') : null,
        righe.length ? h('ul', { class: 'nota' }, righe.map((r) => h('li', {}, r))) : null);
    })) : h('p', { class: 'nota' }, 'Nessuna.'));
}

/** Scheda di una Tecnica appresa, come quella di un incantesimo, con «Attiva». */
function schedaTecnica(ctx, t) {
  // con una tabella di costi il controllo usa l'opzione più economica: il costo si sceglie nel pannello
  const minima = Array.isArray(t.opzioni_costo) ? t.opzioni_costo.reduce((m, o, i, a) => (o.pm < a[m].pm ? i : m), 0) : 0;
  const st = statoAttivazione(ctx.tab.scheda, ctx.sessione, t, ctx.dati, { opzione: minima });
  return h('article', { class: 'incantesimo-scheda macro-tecnica scheda-tecnica' },
    h('div', { class: 'arma-testa' },
      h('h4', {}, info('tecnica', t.id, t.nome), ' ', etichettaTecnica(t.gruppo), h('span', { class: 'sigla' }, ` · ${testoCosto(t)}`)),
      h('button', {
        type: 'button', class: 'btn primario btn-attacca', disabled: !st.possibile, title: ctx.roundScontro && st.motivo ? st.motivo.replace('«Nuovo Round» per la prossima', 'la prossima quando il master passa al Round dopo, dalla plancia') : st.motivo,
        onclick: () => { ctx.ui.tecnica = { id: t.id, passo: 0, opzione: minima, silenzio: false, conferma: false }; ctx.azioni.ridisegna(); },
      }, 'Attiva')),
    st.motivo ? h('p', { class: 'nota motivo' }, `Non attivabile ora: ${st.motivo}.`) : null,
    h('dl', { class: 'voci griglia-voci voci-tecnica' },
      [['Costo', t.costo], ['Azione', t.azione], ['Bersaglio', t.bersaglio], ['Durata', t.durata]]
        .map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
    h('details', { class: 'testo-tecnica' }, h('summary', {}, 'Testo della scheda'),
      String(t.testo).split('\n').map((p) => h('p', { class: 'piccolo' }, p))));
}

/** Pannello «Attiva» (stesso impianto di «Lancia!»): scelta del costo, poi risultato e conferma. */
export function pannelloTecnica(ctx, t) {
  const u = ctx.ui.tecnica;
  const chiudi = () => { ctx.ui.tecnica = null; ctx.azioni.ridisegna(); };
  const imposta = (x) => { Object.assign(u, x); ctx.azioni.ridisegna(); };
  const A = ctx.dati.tecniche_interiori.attivazione ?? {};
  const st = statoAttivazione(ctx.tab.scheda, ctx.sessione, t, ctx.dati, { opzione: u.opzione, silenzioMentale: u.silenzio });
  const opz = Array.isArray(t.opzioni_costo) ? t.opzioni_costo[u.opzione] : null;
  // Imposizione della Mano Curativa: effetto sul proprio personaggio, o promemoria per un altro (§8.9.2)
  const cura = curaTecnica(ctx.tab.scheda, ctx.sessione, t, u.opzione, ctx.dati, { bersaglio: u.bersaglio, dado: u.dado });
  const dadoCura = t.effetti?.cura?.[u.opzione]?.dado ?? null;
  const breve = sintesiTecnica(t);
  const fine = cura ? (cura.al ? `Sanguinamento sospeso fino alla fine del Round ${cura.al}` : t.durata) : t.durata_tipo === 'round' ? `fino alla fine del Round ${st.round + (t.durata_round ?? 0)} (Round ${st.round} + ${t.durata_round ?? 0})`
    : t.durata_tipo === 'tempo' ? `${t.durata}: resta attiva finché non la termini` : `${t.durata}: in corso fino alla fine del Round ${st.round}, per il colpo o la reazione`;
  const bloccato = !st.possibile || (st.conferma && !u.conferma) || (cura && !cura.pronto);
  const passi = [
    {
      titolo: 'Tecnica',
      contenuto: [
        h('p', { class: 'nota' }, h('strong', {}, `${t.nome}. `), `${t.costo} · ${t.azione} · ${t.bersaglio} · ${t.durata}.`),
        Array.isArray(t.opzioni_costo) ? rigaScelte('Uso (tabella della scheda)', t.opzioni_costo.map((o, i) => ({
          valore: i, etichetta: `${o.pm} PM`, riga: `${o.tempo} · ${o.effetto}`,
          motivo: o.pm > ctx.sessione.pmAttuali ? `servono ${o.pm} PM personali, ne hai ${ctx.sessione.pmAttuali}` : null,
        })), u.opzione, (i) => imposta({ opzione: i, conferma: false })) : null,
        cura ? rigaScelte('Su chi', [
          { valore: 'se', etichetta: 'Su me stesso', riga: 'l’effetto si applica alla scheda' },
          { valore: 'altro', etichetta: 'Su un altro personaggio', riga: 'promemoria: l’effetto si segna sulla sua scheda' },
        ], u.bersaglio ?? 'se', (x) => imposta({ bersaglio: x })) : null,
        cura && dadoCura ? h('label', { class: 'campo-dado' }, `Risultato di ${dadoCura} `,
          h('input', { type: 'number', min: 1, max: Number(/d(\d+)/.exec(dadoCura)?.[1] ?? 4), step: 1, value: u.dado ?? '', inputmode: 'numeric',
            onchange: (e) => imposta({ dado: e.target.value === '' ? null : Number(e.target.value) }) })) : null,
        A.silenzio_mentale ? interruttore('Sotto Silenzio Mentale', u.silenzio, (x) => imposta({ silenzio: x }), {
          info: { titolo: 'Silenzio Mentale', sottotitolo: A.silenzio_mentale.fonte, sezioni: [{ testo: A.silenzio_mentale.testo }] },
        }) : null,
      ],
    },
    {
      titolo: 'Risultato',
      contenuto: [
        !st.possibile ? h('div', { class: 'riquadro errore', role: 'alert' }, h('p', {}, h('strong', {}, 'Non si può attivare. '), st.motivo, '.')) : null,
        h('div', { class: 'attacco-risultato' },
          h('p', { class: 'costo-lancio' }, h('strong', {}, `${st.costo} PM personali`), ` · PM ${st.pm} → ${Math.max(0, st.pmDopo)}`),
          h('dl', { class: 'voci griglia-voci' },
            h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, opz ? opz.tempo : t.azione)),
            h('div', {}, h('dt', {}, 'Durata'), h('dd', {}, fine)),
            h('div', {}, h('dt', {}, 'Bersaglio'), h('dd', {}, t.bersaglio)),
            opz ? h('div', {}, h('dt', {}, 'Effetto'), h('dd', {}, opz.effetto)) : breve ? h('div', {}, h('dt', {}, 'Effetto'), h('dd', {}, breve)) : null,
            cura ? h('div', {}, h('dt', {}, cura.sul === 'se' ? 'Sulla scheda' : 'Promemoria'), h('dd', {}, cura.righe.join(' '))) : null,
            h('div', {}, h('dt', {}, 'Prova'), h('dd', {}, st.potere))),
          [...st.avvisi, ...(cura?.avvisi ?? [])].length ? h('div', { class: 'riquadro attenzione' }, [...st.avvisi, ...(cura?.avvisi ?? [])].map((x) => h('p', {}, x))) : null,
          st.conferma ? h('label', { class: 'conferma-tecnica' },
            h('input', { type: 'checkbox', checked: !!u.conferma, onchange: (e) => imposta({ conferma: e.target.checked }) }),
            ' Confermo: la riserva resta a 0 PM e il personaggio è Svenuto') : null,
          h('div', { class: 'attacco-azioni' },
            h('button', {
              type: 'button', class: 'btn primario btn-grande', disabled: bloccato,
              title: !st.possibile ? st.motivo : bloccato ? 'Serve la conferma qui sopra' : null,
              onclick: () => { ctx.ui.tecnica = null; ctx.azioni.attivaTecnica(t.id, { opzione: u.opzione, silenzioMentale: u.silenzio, cura: { bersaglio: u.bersaglio ?? 'se', dado: u.dado ?? null } }); },
            }, `Attiva (−${st.costo} PM)`),
            h('small', { class: 'nota' }, 'Una sola Tecnica per Round (§8.9.1). «Annulla» nell’intestazione annulla l’attivazione e restituisce i PM.'))),
      ],
    },
  ];
  return pannelloPassi({
    etichetta: `Attivazione di ${t.nome}`, titolo: `Attiva · ${t.nome}`, classe: 'lancio-pannello macro-tecnica', chiudi,
    passi, stato: u, ridisegna: ctx.azioni.ridisegna, etichettaNav: 'Passi dell’attivazione',
  });
}

/** Costo minimo di una Tecnica (per i testi brevi). */
export const costoMinimo = (t) => (Array.isArray(t.opzioni_costo) ? Math.min(...t.opzioni_costo.map((o) => o.pm)) : costoTecnica(t));
