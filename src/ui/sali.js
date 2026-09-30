// Schermata "Sali di livello" (cap. 8): un passo per ogni evento del livello successivo, generato
// da regole.json → avanzamento.eventi tramite passiDelLivello(). Fino alla conferma le scelte
// restano in una bozza ("voce") e non si salva nulla. Tutti i controlli vengono da
// validaLivello() e prossimoLivello() del motore.
import { h, segno, dadi } from './dom.js';
import { calcolaScheda, validaLivello, modOrdinario } from '../calc.js';
import { prossimoLivello, applicaLivello } from '../character.js';
import { passiDelLivello, descriviVoce } from '../avanzamento.js';
import { info, etichettaMacro, pallini } from './tooltip.js';
import { classeMacrofamiglia } from '../palette.js';
import { componenteTiro } from './tiro.js';
import { dettagli, bottoneScelta, contatore, stepper, sceltaParametroTalento, competenzeClasse } from './passi.js';
import { conOrdinale } from '../lingua.js';
import { barraPassi } from './navigazione.js';

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const GRADI_ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const somma = (obj) => Object.values(obj ?? {}).reduce((s, v) => s + v, 0);
const normalizzaTesto = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Campi della voce che ogni passo controlla: servono per mostrare gli errori al posto giusto. */
export const CAMPI_PASSO = {
  caratteristiche: ['caratteristiche'],
  talento: ['talentoLibero'],
  grado: ['grado', 'tiroPV', 'tiroPM', 'talentoClasse', 'parametriTalenti'],
  tecniche: ['tecniche', 'scuolaMishima'],
  incantesimi: ['incantesimi'],
  abilita: ['puntiAbilita'],
  riepilogo: [],
};

const delPasso = (id, errori) => errori.filter((e) => CAMPI_PASSO[id]?.some((c) => e.campo === c || e.campo.startsWith(`${c}.`)));

/**
 * Contesto: { dati, personaggio, voce, passo, ui, aggiornaVoce(modifica), vaiPasso(i), conferma(), esci() }
 * Restituisce i nodi della pagina.
 */
export function renderSali(ctx) {
  const { dati, personaggio, voce } = ctx;
  const struttura = passiDelLivello(personaggio, voce, dati);
  if (!struttura) {
    return [h('section', { class: 'passo' }, h('h1', {}, 'Sali di livello'),
      h('p', { class: 'nota errore' }, 'Non si può salire di livello: livello massimo raggiunto o creazione non valida.'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esci }, '← Torna alla scheda'))];
  }
  const passi = struttura.passi;
  const i = Math.min(ctx.passo, passi.length - 1);
  const passo = passi[i];
  const errori = validaLivello(personaggio, voce, dati);
  const c = {
    ...ctx, struttura, errori,
    prossimo: prossimoLivello(personaggio, dati),
    prima: calcolaScheda(personaggio, dati),
    dopo: calcolaScheda(applicaLivello(personaggio, voce), dati),
  };

  const nav = h('nav', { class: 'passi', 'aria-label': 'Passi del livello' },
    h('ol', {}, passi.map((p, k) => {
      const completo = p.id !== 'riepilogo' && delPasso(p.id, errori).length === 0;
      return h('li', {}, h('button', {
        type: 'button', class: `passo-link${k === i ? ' attuale' : ''}${completo ? ' completo' : ''}`,
        'aria-current': k === i ? 'step' : null, onclick: () => ctx.vaiPasso(k),
      }, h('span', { class: 'num' }, completo ? '✓' : String(k + 1)), h('span', { class: 'etichetta-passo' }, p.titolo)));
    })));

  const corpo = {
    caratteristiche: passoCaratteristiche,
    talento: passoTalento,
    grado: passoGrado,
    tecniche: passoTecniche,
    incantesimi: passoIncantesimi,
    abilita: passoAbilita,
    riepilogo: passoRiepilogo,
  }[passo.id](c, passo);

  const erroriPasso = delPasso(passo.id, errori);
  // la stessa barra in cima e (se il passo supera lo schermo) in fondo: src/ui/navigazione.js
  const ultimo = i === passi.length - 1;
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: i > 0 ? { etichetta: '← Indietro', onclick: () => ctx.vaiPasso(i - 1) } : { etichetta: '← Esci senza salvare', onclick: ctx.esci },
    avanti: !ultimo
      ? { etichetta: `${passi[i + 1].titolo} →`, corta: 'Avanti →', onclick: () => ctx.vaiPasso(i + 1) }
      : { etichetta: `Conferma il livello ${struttura.livello}`, corta: 'Conferma', disabilitato: errori.length > 0,
        motivo: errori.length ? `${errori.length} ${errori.length === 1 ? 'problema' : 'problemi'} da risolvere` : null, onclick: ctx.conferma },
    extra: i > 0 ? { etichetta: 'Esci senza salvare', corta: 'Esci', onclick: ctx.esci } : null,
  });
  return [h('div', { class: 'wizard sali' },
    nav,
    h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
      h('header', { class: 'passo-testa' },
        h('p', { class: 'sopratitolo' }, `Sali al livello ${struttura.livello} · passo ${i + 1} di ${passi.length} · ${passo.rif}`),
        h('h1', { id: 'titolo-passo' }, passo.titolo)),
      barra('cima'),
      struttura.informazioni.length ? h('div', { class: 'riquadro ok' },
        h('p', {}, h('strong', {}, `${conOrdinale('Al', struttura.livello)} livello, automaticamente:`)),
        h('ul', {}, struttura.informazioni.map((x) => h('li', {}, x)))) : null,
      corpo,
      passo.id !== 'riepilogo' && erroriPasso.length ? h('div', { class: 'riquadro attenzione' },
        h('ul', {}, erroriPasso.map((e) => h('li', { class: e.tipo === 'violazione' ? 'motivo' : null }, e.problema)))) : null,
      barra('fondo'))),
  ];
}

// ---------------------------------------------------------------------------
// Caratteristiche (§8.2)

function passoCaratteristiche(c, passo) {
  const { dati, voce, prossimo } = c;
  const pc = voce.caratteristiche ?? {};
  const k = passo.punti;
  const max = prossimo.massimoCaratteristica;
  const rimasti = k - somma(pc);
  const imposta = (s, v) => {
    const nuovo = { ...pc, [s]: v };
    if (v <= 0) delete nuovo[s];
    c.aggiornaVoce({ caratteristiche: nuovo });
  };
  const alMassimo = Object.entries(prossimo.caratteristiche).filter(([, x]) => x.valore >= max).map(([s]) => s);
  return [
    h('p', { class: 'guida' }, `Distribuisci ${k} Punti Caratteristica, anche sulla stessa Caratteristica. ${conOrdinale('Al', prossimo.livello)} livello il massimo è ${max}.`),
    contatore(rimasti, k, 'Punti Caratteristica'),
    alMassimo.length ? h('p', { class: 'nota' }, `${alMassimo.join(', ')} ${alMassimo.length > 1 ? 'sono' : 'è'} già a ${max}: il punto che lo supererebbe va su un’altra Caratteristica (§8.2).`) : null,
    h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Caratteristica'), h('th', {}, 'Attuale'), h('th', {}, 'Punti'), h('th', {}, 'Valore'), h('th', {}, 'Mod'))),
      h('tbody', {}, dati.caratteristiche.caratteristiche.map(({ sigla, nome }) => {
        const attuale = prossimo.caratteristiche[sigla].valore;
        const punti = pc[sigla] ?? 0;
        const valore = attuale + punti;
        // stesse regole di validaLivello: somma dei punti e massimo del livello
        const motivoPiu = rimasti <= 0 ? 'Nessun Punto Caratteristica rimasto da spendere.'
          : valore + 1 > max ? `${sigla} arriverebbe a ${valore + 1}: ${conOrdinale('al', prossimo.livello)} livello il massimo è ${max} (§8.2).` : null;
        return h('tr', {},
          h('th', { scope: 'row' }, info('caratteristica', sigla, nome), h('span', { class: 'sigla' }, ` ${sigla}`),
            motivoPiu && rimasti > 0 ? h('small', { class: 'motivo' }, motivoPiu) : null),
          h('td', {}, String(attuale)),
          h('td', {}, stepper(punti, {
            etichetta: nome, motivoPiu,
            motivoMeno: punti === 0 ? 'I valori dei livelli precedenti non si riducono.' : null,
            meno: () => imposta(sigla, punti - 1), piu: () => imposta(sigla, punti + 1),
          })),
          h('td', { class: 'forte' }, String(valore)),
          h('td', {}, segno(modOrdinario(valore, dati.caratteristiche.modificatore_ordinario))));
      })))),
  ];
}

// ---------------------------------------------------------------------------
// Talento Libero (§8.6, §8.8, Talenti di magia)

function gruppiTalenti(dati) {
  const g = [{ id: 'tutti', titolo: 'Tutti i Talenti e le Specializzazioni' }];
  for (const [k, v] of Object.entries(dati.talenti_liberi.sezioni)) {
    if (dati.talenti_liberi.talenti.some((t) => t.sezione === k)) g.push({ id: `sez:${k}`, titolo: k.startsWith('8.') ? `§${k} ${v.titolo}` : v.titolo });
  }
  g.push({ id: 'spec:armi', titolo: 'Specializzazioni nelle armi (§8.8.1)' });
  g.push({ id: 'spec:mistiche', titolo: 'Specializzazioni mistiche (§8.8.2)' });
  g.push({ id: 'spec:operative_sociali_professionali', titolo: 'Specializzazioni operative, sociali e professionali (§8.8.3)' });
  return g;
}

function gruppoDi(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) return `sez:${t.sezione}`;
  return `spec:${dati.specializzazioni.specializzazioni.find((x) => x.id === id)?.gruppo}`;
}

function passoTalento(c) {
  const { dati, voce, prossimo, ui } = c;
  ui.filtroTalenti ??= { gruppo: 'tutti', testo: '' };
  const f = ui.filtroTalenti;
  const candidati = prossimo.talentiLiberi;
  const scelto = voce.talentoLibero?.id ? candidati.find((t) => t.id === voce.talentoLibero.id) : null;
  const gruppi = gruppiTalenti(dati);
  const titoloGruppo = Object.fromEntries(gruppi.map((g) => [g.id, g.titolo]));

  const elenco = h('ul', { class: 'elenco-talenti' });
  const disegnaElenco = () => {
    const testo = normalizzaTesto(f.testo.trim());
    const visibili = candidati.filter((t) => (f.gruppo === 'tutti' || gruppoDi(t.id, dati) === f.gruppo)
      && (!testo || normalizzaTesto(t.nome).includes(testo)));
    elenco.replaceChildren(...(visibili.length ? visibili.map((t) => {
      const sel = voce.talentoLibero?.id === t.id;
      return h('li', { class: `voce-talento${t.ammesso ? '' : ' bloccato'}${sel ? ' selezionata' : ''}` },
        h('div', {},
          info('talento', t.id, t.nome),
          t.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null,
          f.gruppo === 'tutti' ? h('small', { class: 'sigla' }, ` · ${titoloGruppo[gruppoDi(t.id, dati)] ?? ''}`) : null,
          !t.ammesso ? h('small', { class: 'motivo' }, t.motivo) : null),
        t.ammesso || sel ? bottoneScelta(sel, () => c.aggiornaVoce({
          talentoLibero: { id: t.id, ...(t.parametri?.length === 1 ? { parametro: t.parametri[0] } : {}) },
          tecniche: undefined, scuolaMishima: undefined,
        })) : null);
    }) : [h('li', { class: 'vuoto' }, 'Nessun Talento corrisponde alla ricerca.')]));
  };
  disegnaElenco();

  return [
    h('p', { class: 'guida' }, 'Un Talento Libero o una Specializzazione. I Talenti non acquisibili restano nell’elenco con il motivo.'),
    scelto ? pannelloTalentoScelto(c, scelto) : h('p', { class: 'contatore attenzione' }, 'Nessun Talento scelto'),
    h('div', { class: 'filtri' },
      h('label', { class: 'campo-inline' }, 'Sezione ',
        h('select', { onchange: (e) => { f.gruppo = e.target.value; disegnaElenco(); } },
          gruppi.map((g) => h('option', { value: g.id, selected: g.id === f.gruppo }, g.titolo)))),
      h('label', { class: 'campo-inline' }, 'Cerca ',
        h('input', { type: 'search', value: f.testo, placeholder: 'nome del Talento',
          oninput: (e) => { f.testo = e.target.value; disegnaElenco(); } }))),
    elenco,
  ];
}

function pannelloTalentoScelto(c, scelto) {
  const { dati, voce } = c;
  const def = dati.talenti_liberi.talenti.find((x) => x.id === scelto.id);
  const tl = voce.talentoLibero;
  const nomeParam = (p) => dati.caratteristiche.salvezze.find((s) => s.id === p)?.nome
    ?? dati.caratteristiche.caratteristiche.find((s) => s.sigla === p)?.nome ?? p;
  return h('section', { class: 'riquadro ok' },
    h('h3', {}, 'Scelto: ', info('talento', scelto.id, scelto.nome)),
    scelto.provvisorio ? h('p', { class: 'nota' }, 'Talento provvisorio: ricavato dalle citazioni del Manuale della Magia, prerequisiti da definire con il master.') : null,
    def?.parametro ? h('label', { class: 'campo-inline' }, def.parametro === 'salvezza' ? 'Salvezza ' : 'Caratteristica ',
      h('select', { onchange: (e) => c.aggiornaVoce({ talentoLibero: { ...tl, parametro: e.target.value || undefined } }) },
        h('option', { value: '' }, '— scegli —'),
        (scelto.parametri ?? []).map((p) => h('option', { value: p, selected: tl.parametro === p }, nomeParam(p))))) : null,
    def?.annotazione ? h('label', { class: 'campo-inline' }, `Indica ${def.annotazione}: `,
      h('input', { type: 'text', value: tl.annotazione ?? '', maxlength: 80,
        onchange: (e) => c.aggiornaVoce({ talentoLibero: { ...tl, annotazione: e.target.value.trim() || undefined } }) })) : null,
    h('button', { type: 'button', class: 'btn', onclick: () => c.aggiornaVoce({ talentoLibero: undefined, tecniche: undefined, scuolaMishima: undefined }) }, 'Togli la scelta'));
}

// ---------------------------------------------------------------------------
// Grado di Classe (§8.7, cap. 3)

function passoGrado(c) {
  const { dati, voce, prossimo, ui } = c;
  const scelta = prossimo.classi.find((x) => x.nome === voce.grado?.classe);
  const possedute = prossimo.classi.filter((x) => x.gradoAttuale > 0);
  const nuove = prossimo.classi.filter((x) => x.gradoAttuale === 0);
  const riga = (x) => h('li', { class: `voce-talento${x.ammessa ? '' : ' bloccato'}${scelta?.nome === x.nome ? ' selezionata' : ''}` },
    h('div', {},
      h('strong', {}, x.nome),
      h('small', { class: 'sigla' }, x.gradoAttuale ? ` · Grado ${GRADI_ROMANI[x.gradoAttuale]} → ${GRADI_ROMANI[x.prossimoGrado]}` : ` · ${x.addestramento}, I Grado`),
      !x.ammessa ? h('small', { class: 'motivo' }, x.motivo) : null),
    x.ammessa ? bottoneScelta(scelta?.nome === x.nome, () => c.aggiornaVoce({
      grado: { classe: x.nome }, tiroPV: undefined, tiroPM: undefined, talentoClasse: undefined, parametriTalenti: undefined, incantesimi: undefined, tecniche: undefined, scuolaMishima: undefined,
    })) : null);
  const def = scelta ? trova(dati.classi.classi, scelta.nome) : null;
  return [
    h('p', { class: 'guida' }, `Un Grado di una Classe posseduta oppure il I Grado di una nuova Classe, di qualunque Addestramento (al massimo ${dati.regole.avanzamento.classi_massime} Classi). Dopo la creazione i dadi di PV e PM si tirano.`),
    h('h3', {}, 'Classi possedute'),
    h('ul', { class: 'elenco-talenti' }, possedute.map(riga)),
    dettagli(c, 'nuove-classi', `Nuova Classe (${nuove.filter((x) => x.ammessa).length} disponibili)`,
      dati.addestramenti.addestramenti.map((a) => h('div', {},
        h('h4', {}, a.nome),
        h('ul', { class: 'elenco-talenti' }, nuove.filter((x) => x.addestramento === a.nome).map(riga))))),
    scelta ? h('section', { class: 'riquadro ok' },
      h('h3', {}, `${scelta.nome} — Grado ${GRADI_ROMANI[scelta.prossimoGrado]}`),
      // §3.1 e §8.3: il +1 si registra sempre; oltre il limite conta quando il limite sale
      h('p', {}, h('strong', {}, 'Abilità di Classe (+1, registrato anche oltre il limite): '), def.abilita.join(', ')),
      // §8.7: una Classe nuova alza i limiti con le sue categorie, non cambia le basi (§2.3)
      dettagli(c, `comp-sali:${def.nome}`, scelta.gradoAttuale ? 'Competenze della Classe (limiti del VA personale)' : 'Competenze della nuova Classe: alzano i limiti del VA personale, non le basi (§8.7)',
        competenzeClasse(c, def, { primaClasse: false })),
      h('h4', {}, `Punti Vita: ${dadi(def.pv_per_grado)}`),
      componenteTiro({ id: 'tiro-pv', spec: scelta.tiroPV, tiro: voce.tiroPV ?? null, memoria: ui, imposta: (t) => c.aggiornaVoce({ tiroPV: t ?? undefined }) }),
      scelta.tiroPM ? h('h4', {}, `Punti Magia: ${dadi(def.pm_per_grado)}`) : h('p', {}, `Punti Magia: +${def.pm_per_grado.fisso}`),
      scelta.tiroPM ? componenteTiro({ id: 'tiro-pm', spec: scelta.tiroPM, tiro: voce.tiroPM ?? null, memoria: ui, imposta: (t) => c.aggiornaVoce({ tiroPM: t ?? undefined }) }) : null,
      h('h4', {}, 'Talento di Classe'),
      scelta.talentoFisso
        ? h('div', {},
          talentoClasse(c, def, def.talenti_fissi.find((t) => t.nome === scelta.talentoFisso), `${GRADI_ROMANI[scelta.prossimoGrado]} Grado — ${scelta.talentoFisso} (fisso)`),
          sceltaParametroTalento(def.talenti_fissi.find((t) => t.nome === scelta.talentoFisso), voce.parametriTalenti?.[scelta.talentoFisso] ?? null,
            (id) => c.aggiornaVoce({ parametriTalenti: { [scelta.talentoFisso]: id } })))
        : h('div', {},
          h('p', { class: 'nota' }, 'Scegli un Talento fra quelli non ancora presi:'),
          h('ul', { class: 'elenco-talenti' }, scelta.talentiAScelta.map((n) => {
            const t = def.talenti_a_scelta.find((x) => x.nome === n);
            return h('li', { class: `voce-talento${voce.talentoClasse === n ? ' selezionata' : ''}` },
              h('div', {}, talentoClasse(c, def, t, `${t.specializzazione.startsWith('TODO(') ? '' : `${t.specializzazione} — `}${n}`)),
              bottoneScelta(voce.talentoClasse === n, () => c.aggiornaVoce({ talentoClasse: n, tecniche: undefined, scuolaMishima: undefined })));
          })))) : null,
  ];
}

function talentoClasse(c, def, t, titolo) {
  return dettagli(c, `sali-tc:${def.nome}:${t.nome}`, titolo, t.testo.split('\n').map((p) => h('p', {}, p)));
}

// ---------------------------------------------------------------------------
// Tecniche Interiori (§8.9, §8.6.10)

function passoTecniche(c) {
  const { dati, voce, prima, dopo } = c;
  const catalogo = dati.tecniche_interiori.tecniche;
  const note = new Set(prima.tecniche.map((t) => t.id));
  const nuove = voce.tecniche ?? [];
  const daScegliere = dopo.tecnicheAmmesse - note.size;
  const scuolaFissata = prima.scuolaMishima?.nome ?? null;
  const scuola = scuolaFissata ?? voce.scuolaMishima ?? null;
  const cambia = (id, aggiungi) => c.aggiornaVoce({ tecniche: aggiungi ? [...nuove, id] : nuove.filter((x) => x !== id) });
  const gruppi = [{ id: 'generica', titolo: 'Tecniche generiche (§8.9.2)' }];
  if (dopo.classi.some((x) => x.nome === 'Lottatore')) gruppi.push({ id: 'lottatore', titolo: 'Tecniche del Lottatore (§8.9.4)' });
  const scuole = [...new Set(catalogo.filter((t) => t.gruppo.startsWith('scuola:')).map((t) => t.gruppo.slice(7)))];
  const mishima = dopo.corporazione === 'Mishima';

  const casella = (t) => {
    const giaNota = note.has(t.id);
    const presa = giaNota || nuove.includes(t.id);
    const scuolaT = t.gruppo.startsWith('scuola:') ? t.gruppo.slice(7) : null;
    const motivo = giaNota ? 'già conosciuta'
      : scuolaT && scuolaT !== scuola ? `serve l’iniziazione alla Scuola ${scuolaT}`
        : !presa && nuove.length >= daScegliere ? 'nessuna Tecnica rimasta da scegliere' : null;
    return h('label', { class: `incantesimo${motivo && !presa ? ' bloccato' : ''}` },
      h('input', { type: 'checkbox', checked: presa, disabled: giaNota || (!!motivo && !presa), onchange: (e) => cambia(t.id, e.target.checked) }),
      h('span', {}, h('strong', {}, info('tecnica', t.id, t.nome)), h('small', {}, ` ${t.costo} · ${t.azione}`),
        motivo && !giaNota ? h('small', { class: 'motivo' }, motivo) : null));
  };
  return [
    h('p', { class: 'guida' }, 'Risorse Interiori concede 2 + Mod SAG Tecniche (minimo 1), numero fissato al momento dell’acquisizione; Tecniche Interiori Supplementari ne aggiunge 3. Le Tecniche non sono Incantesimi.'),
    contatore(daScegliere - nuove.length, daScegliere, 'Tecniche Interiori'),
    gruppi.map((g) => h('fieldset', { class: 'specializzazione' }, h('legend', {}, g.titolo),
      catalogo.filter((t) => t.gruppo === g.id).map(casella))),
    mishima ? h('section', {},
      h('h3', {}, 'Scuole Mishima (§8.9.3)'),
      h('p', { class: 'nota' }, 'Servono l’iniziazione alla Scuola e il giuramento al suo Overlord, che si concordano con il master. Si appartiene a una sola Scuola.'),
      scuole.map((sc) => h('fieldset', { class: 'specializzazione' },
        h('legend', {},
          h('label', {}, h('input', {
            type: 'radio', name: 'scuola-mishima', checked: scuola === sc, disabled: !!scuolaFissata && scuolaFissata !== sc,
            onchange: () => c.aggiornaVoce({
              scuolaMishima: scuolaFissata ? undefined : sc,
              tecniche: nuove.filter((id) => !catalogo.find((t) => t.id === id)?.gruppo.startsWith('scuola:') || catalogo.find((t) => t.id === id).gruppo === `scuola:${sc}`),
            }),
          }), ` Iniziato alla Scuola ${sc}${scuolaFissata === sc ? ' (dai livelli precedenti)' : ''}`)),
        catalogo.filter((t) => t.gruppo === `scuola:${sc}`).map(casella))),
      !scuolaFissata && scuola ? h('button', { type: 'button', class: 'btn', onclick: () => c.aggiornaVoce({ scuolaMishima: undefined, tecniche: nuove.filter((id) => !catalogo.find((t) => t.id === id)?.gruppo.startsWith('scuola:')) }) }, 'Nessuna Scuola') : null)
      : h('p', { class: 'nota' }, 'Le Tecniche delle Scuole Mishima richiedono la Corporazione Mishima.'),
  ];
}

// ---------------------------------------------------------------------------
// Incantesimi (Magia, sezione 1; tabella dei Gradi del master)

function passoIncantesimi(c) {
  const { dati, voce, prima, dopo } = c;
  const q = dopo.incantesimi;
  const noti = new Set(prima.incantesimi.conosciuti.map((i) => i.nome));
  const nuovi = voce.incantesimi ?? [];
  const perMacro = {};
  for (const m of Object.keys(q.quote.perMacro)) perMacro[m] = q.conosciuti.filter((i) => i.macrofamiglia === m).length;
  const catalogo = dati.incantesimi.incantesimi;
  const cambia = (nome, aggiungi) => c.aggiornaVoce({ incantesimi: aggiungi ? [...nuovi, nome] : nuovi.filter((n) => n !== nome) });
  const nascosti = catalogo.filter((i) => i.livello_base > q.livelloMassimo).length;
  return [
    h('p', { class: 'guida' }, `Quote di Classe per macrofamiglia (qualunque specializzazione) più ${q.quote.liberi} incantesimi liberi di qualunque famiglia. Livello massimo degli incantesimi conosciuti: ${q.livelloMassimo}.`),
    h('div', { class: 'contatori' },
      h('p', { class: `contatore ${q.conosciuti.length === q.quote.totale ? 'ok' : 'attenzione'}` }, h('strong', {}, `${q.conosciuti.length} / ${q.quote.totale}`), ' incantesimi conosciuti'),
      Object.entries(q.quote.perMacro).map(([m, quota]) => h('p', { class: 'contatore piccolo' }, h('strong', {}, m), `: ${perMacro[m]} conosciuti, quota di Classe ${quota}`)),
      h('p', { class: 'contatore piccolo' }, h('strong', {}, 'Liberi'), `: ${q.quote.liberiUsati} usati su ${q.quote.liberi}`)),
    nascosti ? h('p', { class: 'nota' }, `Nascosti ${nascosti} incantesimi con livello base oltre ${q.livelloMassimo}.`) : null,
    dati.incantesimi.macrofamiglie.map((m) => h('section', { class: 'famiglia' },
      h('h3', {}, m.nome),
      m.specializzazioni.map((sp) => h('fieldset', { class: 'specializzazione' },
        h('legend', {}, sp),
        catalogo.filter((i) => i.macrofamiglia === m.nome && i.specializzazione === sp && i.livello_base <= q.livelloMassimo).map((i) => {
          const giaNoto = noti.has(i.nome);
          const preso = giaNoto || nuovi.includes(i.nome);
          const pieno = perMacro[m.nome] >= (q.quote.perMacro[m.nome] ?? 0) && q.quote.liberiUsati >= q.quote.liberi;
          const motivo = giaNoto ? null : !preso && pieno ? `Quota ${m.nome} e incantesimi liberi esauriti.` : null;
          return h('label', { class: `incantesimo ${classeMacrofamiglia(m.nome)}${motivo ? ' bloccato' : ''}` },
            h('input', { type: 'checkbox', checked: preso, disabled: giaNoto || !!motivo, onchange: (e) => cambia(i.nome, e.target.checked) }),
            h('span', {}, h('strong', {}, info('incantesimo', i.nome)), ' ', pallini(i.livello_base), ' ', etichettaMacro(m.nome), h('small', {}, ` liv. base ${i.livello_base}${giaNoto ? ' · già conosciuto' : ''}`),
              motivo ? h('small', { class: 'motivo' }, motivo) : null));
        }))))),
  ];
}

// ---------------------------------------------------------------------------
// Punti Abilità Liberi (§8.3, §2.13)

function passoAbilita(c, passo) {
  const { dati, personaggio, voce, prossimo } = c;
  const pa = voce.puntiAbilita ?? {};
  const k = passo.punti;
  const rimasti = k - somma(pa);
  // Abilità dopo i +1 di Classe e i limiti del Grado di questo livello (si applicano prima dei liberi)
  const base = calcolaScheda(applicaLivello(personaggio, { ...voce, puntiAbilita: undefined }), dati).abilita;
  const minimo = dati.regole.creazione.va_minimo_per_punti_liberi;
  const imposta = (n, v) => {
    const nuovo = { ...pa, [n]: v };
    if (v <= 0) delete nuovo[n];
    c.aggiornaVoce({ puntiAbilita: nuovo });
  };
  // stesse regole di validaLivello: ogni punto aumenta il VA personale (§8.3) e VA ≥ 1 prima dei liberi
  const abilita = base.map((a) => {
    const punti = pa[a.nome] ?? 0;
    const motivoPiu = rimasti <= 0 ? 'Nessun Punto Abilità Libero rimasto da spendere.'
      : a.grezzo + punti + 1 > a.limite ? motivoAlLimite(a, punti, dati)
        : a.totale < minimo ? `VA ${a.totale} prima dei punti liberi: serve almeno ${minimo} (§2.13).` : null;
    return { ...a, punti, motivoPiu };
  });
  return [
    h('p', { class: 'guida' }, `Distribuisci ${k} Punti Abilità Liberi. Ogni punto deve aumentare il VA personale: ${conOrdinale('al', prossimo.livello)} livello il VA non supera il limite della categoria di competenza (colonna «Lim», §8.3; con più Classi la categoria migliore, §8.7), compresi i +1 di Classe già applicati. L’Abilità deve avere VA almeno ${minimo} prima dei punti liberi.`),
    contatore(rimasti, k, 'Punti Abilità Liberi'),
    tabellaPuntiAbilita({ dati, abilita, rimasti, imposta }),
  ];
}

/** §8.3: perché un punto in più non si può spendere su un'Abilità già al limite. */
export function motivoAlLimite(a, punti, dati) {
  const cat = dati.regole.competenze.categorie[a.limiteCategoria]?.nome ?? a.limiteCategoria;
  const va = Math.min(a.grezzo + punti, a.limite);
  return `VA ${va} già al limite ${a.limite} (${cat}${a.limiteDa?.length ? `, ${a.limiteDa.join(' e ')}` : ''}, §8.3): un punto in più non aumenta il VA personale.`;
}

/**
 * Tabella di assegnazione dei Punti Abilità Liberi, comune a «Sali di livello» e al completamento
 * dei punti di un evento passato (src/ui/completa.js).
 * abilita: [{ nome, categoria, caratteristica, mod, base, competenza, corporazione, avanzamento, daClasse,
 *   grezzo, limite, limiteCategoria, totale, punti, motivoPiu, inattivi? }]
 * con avanzamento, grezzo e totale prima dei punti della bozza; inattivi: punti dell'evento che non
 * aumentano più il VA (completamento, §8.3), tolti dall'evento alla conferma.
 */
export function tabellaPuntiAbilita({ dati, abilita, rimasti, imposta }) {
  const C = dati.regole.competenze.categorie;
  const righe = (cat) => abilita.filter((a) => a.categoria === cat).map((a) => {
    const { punti, motivoPiu } = a;
    const avanz = a.avanzamento + punti;
    // §1.2.1: VA personale = min(grezzo, limite)
    const va = a.limite === null || a.limite === undefined ? a.grezzo + punti : Math.min(a.grezzo + punti, a.limite);
    const inattivi = a.inattivi ? `${a.inattivi === 1 ? '1 punto' : `${a.inattivi} punti`} di questo evento non ${a.inattivi === 1 ? 'aumentava' : 'aumentavano'} il VA: ${a.inattivi === 1 ? 'va riassegnato' : 'vanno riassegnati'}.` : null;
    const inRiga = [inattivi, motivoPiu && rimasti > 0 ? motivoPiu : null].filter(Boolean).join(' ') || null;
    const comp = a.competenza ? C[a.competenza] : null;
    return h('tr', { class: a.daClasse ? 'di-classe' : null },
      h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`),
        comp ? h('span', { class: 'etichetta', title: `${comp.nome}: base ${comp.base} (§2.3)` }, a.competenza) : null,
        h('small', { class: 'formula' }, `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${avanz} Avanz, limite ${a.limite ?? '—'}`),
        inRiga ? h('small', { class: 'motivo' }, inRiga) : null),
      h('td', { class: 'dettaglio' }, segno(a.mod)),
      h('td', { class: 'dettaglio' }, String(a.base)),
      h('td', { class: 'dettaglio' }, String(a.corporazione)),
      h('td', { class: 'dettaglio' }, String(avanz)),
      h('td', { class: 'forte', title: a.grezzo + punti > va ? `VA grezzo ${a.grezzo + punti}, oltre il limite (§8.3)` : null }, String(va)),
      h('td', { class: 'dettaglio', title: a.limiteCategoria ? `${C[a.limiteCategoria]?.nome ?? a.limiteCategoria}${a.limiteDa?.length ? ` (${a.limiteDa.join(', ')})` : ''}, §8.3` : null }, String(a.limite ?? '—')),
      h('td', {}, stepper(punti, {
        etichetta: a.nome, motivoPiu,
        motivoMeno: punti === 0 ? 'Nessun punto da togliere.' : null,
        meno: () => imposta(a.nome, punti - 1), piu: () => imposta(a.nome, punti + 1),
      })));
  });
  return h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella abilita' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'),
      h('th', { class: 'dettaglio' }, 'Mod'), h('th', { class: 'dettaglio', title: 'Base della categoria di competenza nella prima Classe (§2.3)' }, 'Base'), h('th', { class: 'dettaglio' }, 'Corp'),
      h('th', { class: 'dettaglio' }, 'Avanz'), h('th', {}, 'VA'), h('th', { class: 'dettaglio', title: 'Limite del VA personale (§8.3, §8.7)' }, 'Lim'), h('th', {}, 'Punti'))),
    dati.abilita.categorie.map((cat) => h('tbody', {}, h('tr', { class: 'categoria' }, h('th', { colspan: 8 }, cat)), righe(cat)))));
}

// ---------------------------------------------------------------------------
// Riepilogo e conferma

function passoRiepilogo(c) {
  const { dati, voce, prima, dopo, errori, struttura } = c;
  const gradi = Object.fromEntries(prima.classi.map((x) => [x.nome, x.grado]));
  const righe = descriviVoce(voce, dati, gradi);
  const confronto = [
    ...Object.entries(prima.caratteristiche).filter(([k, x]) => x.valore !== dopo.caratteristiche[k].valore)
      .map(([k, x]) => [x.nome, x.valore, dopo.caratteristiche[k].valore]),
    ['Punti Vita', prima.pv, dopo.pv],
    ['Punti Magia', prima.pm, dopo.pm],
    ['Iniziativa', segno(prima.iniziativa), segno(dopo.iniziativa)],
    ...Object.keys(prima.salvezze).map((id) => [prima.salvezze[id].nome, prima.salvezze[id].totale, dopo.salvezze[id].totale]),
    ['Azioni Principali', prima.azioni.principali, dopo.azioni.principali],
  ];
  return [
    h('h3', {}, `Scelte ${conOrdinale('del', struttura.livello)} livello`),
    righe.length ? h('ul', {}, righe.map((x) => h('li', {}, x))) : h('p', { class: 'vuoto' }, 'Nessuna scelta.'),
    h('h3', {}, 'Cosa cambia'),
    h('table', { class: 'tabella compatta confronto' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, `${prima.livello}° livello`), h('th', {}, `${struttura.livello}° livello`))),
      h('tbody', {}, confronto.map(([n, a, b]) => h('tr', { class: String(a) !== String(b) ? 'evidenziata' : null },
        h('th', { scope: 'row' }, n), h('td', {}, String(a ?? '—')), h('td', { class: 'forte' }, String(b ?? '—')))))),
    errori.length
      ? h('div', { class: 'riquadro attenzione' }, h('p', {}, h('strong', {}, 'Prima di confermare:')),
        h('ul', {}, errori.map((e) => h('li', {}, e.problema))))
      : h('p', { class: 'riquadro ok' }, 'Tutto a posto: con «Conferma» il livello viene aggiunto al personaggio e salvato. Si potrà annullare solo l’ultimo livello.'),
  ];
}
