// I passi del wizard (sequenza §2.0 del Manuale del Giocatore). Ogni passo si genera dai dati.
import { h, segno, dadi } from './dom.js';
import { validaScelte } from '../calc.js';
import { eTaumaturgo, specTiroPM, specTiroPuntiEroe } from '../character.js';
import { statoIncantesimi, motivoBloccoIncantesimo, IPOTESI_INCANTESIMI } from '../incantesimi.js';
import { renderScheda } from './scheda.js';
import { info, elencoInfo } from './tooltip.js';
import { componenteTiro } from './tiro.js';
import { valoreTiro } from '../tiri.js';

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const GRADI = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
const somma = (obj) => Object.values(obj ?? {}).reduce((s, v) => s + v, 0);

/**
 * Contesto passato a ogni passo:
 * { dati, scelte, scheda, ante, ui, aggiorna(modifica, {ridisegna}), ridisegna() }
 */
export const PASSI = [
  {
    // Il manuale (§2.0) lo chiama «Concetto»; la chiave nelle scelte resta `concetto`.
    titolo: 'Background', rif: '§2.0',
    completo: ({ scelte }) => !!scelte.nome.trim() && !!scelte.concetto.trim(),
    render: passoBackground,
  },
  {
    titolo: 'Corporazione', rif: '§2.9, §2.11',
    completo: ({ scelte }) => !!scelte.corporazione,
    render: passoCorporazione,
  },
  {
    titolo: 'Caratteristiche', rif: '§2.1',
    requisito: ({ scelte }) => (scelte.corporazione ? null : 'Scegli prima la Corporazione.'),
    completo: ({ scheda }) => !scheda.errori.some((e) => e.campo.startsWith('puntiCaratteristica')),
    render: passoCaratteristiche,
  },
  {
    titolo: 'Addestramento', rif: '§2.2–2.8, §2.10–2.11',
    completo: ({ scelte }) => !!scelte.addestramento,
    render: passoAddestramento,
  },
  {
    titolo: 'Classe', rif: '§2.12, cap. 3',
    requisito: ({ scelte }) => (scelte.addestramento ? null : 'Scegli prima l’Addestramento.'),
    completo: ({ scheda }) => !scheda.errori.some((e) => e.campo === 'classe' || e.campo === 'tiroDadoPM'),
    render: passoClasse,
  },
  {
    titolo: 'Abilità', rif: '§2.13',
    requisito: ({ scelte }) => (!scelte.corporazione ? 'Scegli prima la Corporazione.'
      : !scelte.addestramento ? 'Scegli prima l’Addestramento.'
        : !scelte.classe ? 'Scegli prima la Classe.' : null),
    completo: ({ scheda }) => !!scheda.abilita && !scheda.errori.some((e) => e.campo.startsWith('puntiAbilitaLiberi')),
    render: passoAbilita,
  },
  {
    titolo: 'Incantesimi', rif: '§2.10, §3.8, Magia §1',
    visibile: ({ scelte, dati }) => eTaumaturgo(scelte, dati),
    requisito: ({ scelte }) => (!scelte.corporazione ? 'Scegli prima la Corporazione.'
      : !scelte.classe ? 'Scegli prima la Classe.' : null),
    completo: ({ ante }) => !!ante.incantesimi?.completo,
    render: passoIncantesimi,
  },
  {
    titolo: 'Punti Eroe', rif: '§2.15',
    completo: ({ scelte }) => Number.isInteger(valoreTiro(scelte.puntiEroe)),
    render: passoPuntiEroe,
  },
  {
    titolo: 'Equipaggiamento', rif: '§2.16',
    completo: () => true,
    render: passoEquipaggiamento,
  },
  {
    titolo: 'Scheda', rif: '§2.17',
    requisito: ({ scelte }) => (scelte.corporazione && scelte.addestramento && scelte.classe
      ? null : 'Servono almeno Corporazione, Addestramento e Classe.'),
    completo: ({ scheda }) => scheda.completa === true,
    render: renderScheda,
  },
];

export const passoVisibile = (i, ctx) => !PASSI[i].visibile || PASSI[i].visibile(ctx);
export const requisitoPasso = (i, ctx) => PASSI[i].requisito?.(ctx) ?? null;

// ---------------------------------------------------------------------------
// componenti comuni

/** <details> che ricorda se era aperto fra un ridisegno e l'altro. */
function dettagli(ctx, chiave, sommario, ...contenuto) {
  const d = h('details', { open: ctx.ui.aperti.has(chiave) }, h('summary', {}, sommario), ...contenuto);
  d.addEventListener('toggle', () => (d.open ? ctx.ui.aperti.add(chiave) : ctx.ui.aperti.delete(chiave)));
  return d;
}

function bottoneScelta(selezionato, onclick, etichetta = 'Scegli') {
  return selezionato
    ? h('button', { type: 'button', class: 'btn scelto', disabled: true, 'aria-pressed': 'true' }, 'Scelta ✓')
    : h('button', { type: 'button', class: 'btn primario', onclick }, etichetta);
}

function bonusSalvezze(ctx, obj) {
  const v = ctx.dati.caratteristiche.salvezze.filter((s) => obj[s.id]).map((s) => `+${obj[s.id]} ${s.nome}`);
  return v.length ? v.join(', ') : 'nessuno';
}

function carta(selezionata, ...figli) {
  return h('article', { class: `carta${selezionata ? ' selezionata' : ''}` }, ...figli);
}

/**
 * Perché una modifica proposta non è ammessa: il primo errore di validaScelte di tipo violazione
 * sui campi indicati, oppure null. Così la UI applica esattamente le regole del motore.
 */
function vietato(ctx, proposta, campi) {
  return validaScelte({ ...ctx.scelte, ...proposta }, ctx.dati)
    .find((x) => x.tipo === 'violazione' && campi.includes(x.campo)) ?? null;
}

function contatore(rimasti, totale, etichetta) {
  const classe = rimasti === 0 ? 'ok' : rimasti < 0 ? 'errore' : 'attenzione';
  return h('p', { class: `contatore ${classe}`, role: 'status' },
    h('strong', {}, String(rimasti)), ` ${etichetta} da spendere su ${totale}`);
}

function stepper(valore, { meno, piu, motivoMeno, motivoPiu, etichetta }) {
  return h('span', { class: 'stepper' },
    h('button', { type: 'button', class: 'btn tondo', onclick: meno, disabled: !!motivoMeno, title: motivoMeno ?? `Togli un punto a ${etichetta}`, 'aria-label': `Togli un punto a ${etichetta}` }, '−'),
    h('output', { class: 'valore-stepper' }, String(valore)),
    h('button', { type: 'button', class: 'btn tondo', onclick: piu, disabled: !!motivoPiu, title: motivoPiu ?? `Aggiungi un punto a ${etichetta}`, 'aria-label': `Aggiungi un punto a ${etichetta}` }, '+'),
  );
}

// ---------------------------------------------------------------------------
// 0 Background

function passoBackground(ctx) {
  const { scelte } = ctx;
  return [
    h('p', { class: 'guida' }, 'Bastano poche righe per definire nome e identità, aspetto generale, passato, motivazioni, obiettivi e rapporto con la Corporazione. Il background non assegna bonus e non impone Addestramento o Classe.'),
    h('label', { class: 'campo' }, h('span', {}, 'Nome'),
      h('input', { type: 'text', value: scelte.nome, autocomplete: 'off', maxlength: 80,
        oninput: (e) => ctx.aggiorna({ nome: e.target.value }, { ridisegna: false }) })),
    h('label', { class: 'campo' }, h('span', {}, 'Background'),
      h('textarea', { rows: 6, value: scelte.concetto,
        oninput: (e) => ctx.aggiorna({ concetto: e.target.value }, { ridisegna: false }) })),
  ];
}

// ---------------------------------------------------------------------------
// 1 Corporazione

function tabellaValori(ctx, valori) {
  const sigle = ctx.dati.caratteristiche.caratteristiche.map((c) => c.sigla);
  return h('dl', { class: 'valori' }, sigle.map((s) => h('div', {}, h('dt', {}, info('caratteristica', s)), h('dd', {}, String(valori[s])))));
}

function passoCorporazione(ctx) {
  return [
    h('p', { class: 'guida' }, 'La Corporazione assegna i sei valori iniziali delle Caratteristiche, +1 a quattro Abilità e i bonus fissi alle Salvezze.'),
    h('div', { class: 'griglia-carte' }, ctx.dati.corporazioni.corporazioni.map((c) => {
      const sel = ctx.scelte.corporazione === c.nome;
      return carta(sel,
        h('header', {}, h('h3', {}, c.nome), bottoneScelta(sel, () => ctx.aggiorna({ corporazione: c.nome }))),
        tabellaValori(ctx, c.caratteristiche),
        h('p', {}, h('strong', {}, 'Abilità +1: '), elencoInfo('abilita', c.abilita_bonus)),
        h('p', {}, h('strong', {}, 'Salvezze: '), bonusSalvezze(ctx, c.salvezze)),
        dettagli(ctx, `corp:${c.nome}`, 'Descrizione',
          h('p', {}, c.descrizione),
          h('dl', { class: 'voci' },
            [['Filosofia', c.filosofia], ['Sistema politico', c.sistema_politico], ['Economia', c.economia], ['Cultura', c.cultura]]
              .filter(([, v]) => v).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))))),
      );
    })),
  ];
}

// ---------------------------------------------------------------------------
// 2 Punti Caratteristica

function passoCaratteristiche(ctx) {
  const { dati, scelte, ante } = ctx;
  const corp = trova(dati.corporazioni.corporazioni, scelte.corporazione);
  const cr = dati.regole.creazione;
  const pc = scelte.puntiCaratteristica;
  const imposta = (s, v) => ctx.aggiorna({ puntiCaratteristica: { ...pc, [s]: v } });
  const campi = (s) => ['puntiCaratteristica', `puntiCaratteristica.${s}`];

  const righe = dati.caratteristiche.caratteristiche.map(({ sigla, nome }) => {
    const punti = pc[sigla] ?? 0;
    const a = ante.caratteristiche[sigla];
    const blocco = vietato(ctx, { puntiCaratteristica: { ...pc, [sigla]: punti + 1 } }, campi(sigla));
    const motivoPiu = blocco?.campo === 'puntiCaratteristica' ? 'Nessun Punto Caratteristica rimasto da spendere.' : blocco?.problema ?? null;
    const motivoMeno = punti === 0 ? `Non si scende sotto il valore iniziale di ${corp.nome} (§2.1).` : null;
    // Il motivo "punti esauriti" vale per tutte le righe: lo spiega il contatore, non la riga.
    const inRiga = blocco && blocco.campo !== 'puntiCaratteristica' ? motivoPiu : null;
    return h('tr', {},
      h('th', { scope: 'row' }, info('caratteristica', sigla, nome), h('span', { class: 'sigla' }, ` ${sigla}`),
        h('small', { class: 'formula' }, `Iniziale ${corp.caratteristiche[sigla]} · Mod Salv. ${segno(a.modSalvezza)}`),
        inRiga ? h('small', { class: 'motivo' }, inRiga) : null),
      h('td', { class: 'dettaglio' }, String(corp.caratteristiche[sigla])),
      h('td', {}, stepper(punti, {
        etichetta: nome, motivoMeno, motivoPiu,
        meno: () => imposta(sigla, punti - 1), piu: () => imposta(sigla, punti + 1),
      })),
      h('td', { class: 'forte' }, String(a.valore)),
      h('td', {}, segno(a.mod)),
      h('td', { class: 'dettaglio' }, segno(a.modSalvezza)));
  });

  const rimasti = ante.puntiCaratteristicaRimasti;
  return [
    h('p', { class: 'guida' }, `Distribuisci ${cr.punti_caratteristica} punti: ogni punto aumenta una Caratteristica di 1, fino a ${cr.massimo_caratteristica} alla creazione. I valori iniziali non si riducono; si può lasciare una Caratteristica a 4.`),
    contatore(rimasti, cr.punti_caratteristica, 'Punti Caratteristica'),
    rimasti === 0 ? h('p', { class: 'nota' }, 'Punti esauriti: per spostarne uno, toglilo prima da un’altra Caratteristica.') : null,
    h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Caratteristica'), h('th', { class: 'dettaglio' }, 'Iniziale'), h('th', {}, 'Punti'),
        h('th', {}, 'Valore'), h('th', { title: 'Modificatore ordinario (valore − 5)' }, 'Mod'),
        h('th', { class: 'dettaglio', title: 'Modificatore per le Salvezze (§1.2.3)' }, 'Mod Salv.'))),
      h('tbody', {}, righe))),
  ];
}

// ---------------------------------------------------------------------------
// 3 Addestramento

function tabellaValoriBase(ctx, valori) {
  const { abilita, categorie } = ctx.dati.abilita;
  return h('table', { class: 'tabella compatta' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Car.'), h('th', {}, 'Base'))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 3 }, cat)),
      abilita.filter((a) => a.categoria === cat).map((a) => h('tr', {},
        h('td', {}, info('abilita', a.nome)), h('td', {}, a.caratteristica),
        h('td', { class: `base base-${valori[a.nome]}` }, String(valori[a.nome])))))));
}

function passoAddestramento(ctx) {
  return [
    h('p', { class: 'guida' }, 'L’Addestramento fissa il valore base (0–4) delle 24 Abilità, concede un vantaggio e i bonus alle Salvezze. La prima Classe deve appartenere all’Addestramento scelto.'),
    ctx.scelte.classe ? h('p', { class: 'nota' }, `Cambiare Addestramento azzera la Classe scelta (${ctx.scelte.classe}).`) : null,
    h('div', { class: 'griglia-carte' }, ctx.dati.addestramenti.addestramenti.map((a) => {
      const sel = ctx.scelte.addestramento === a.nome;
      return carta(sel,
        h('header', {}, h('h3', {}, a.nome), bottoneScelta(sel, () => ctx.aggiorna({ addestramento: a.nome }))),
        h('p', { class: 'identita' }, a.identita),
        h('p', {}, h('strong', {}, `Vantaggio — ${a.vantaggio.nome}. `), a.vantaggio.testo),
        h('p', {}, h('strong', {}, 'Salvezze: '), bonusSalvezze(ctx, a.salvezze)),
        dettagli(ctx, `addestr:${a.nome}`, 'Valori base delle 24 Abilità', tabellaValoriBase(ctx, a.valori_base)),
      );
    })),
  ];
}

// ---------------------------------------------------------------------------
// 4 Classe

function talento(ctx, chiave, titolo, testo) {
  return dettagli(ctx, chiave, titolo, testo.split('\n').map((p) => h('p', {}, p)));
}

function pannelloDadoPM(ctx, classe) {
  const t = ctx.scelte.tiroDadoPM;
  return h('section', { class: `riquadro ${t ? 'ok' : 'attenzione'}` },
    h('h3', {}, `Dado dei PM di ${classe.nome}`),
    h('p', {}, `Al 1° livello solo il dado dei PV è massimizzato; per i PM si applica il contributo del profilo (${dadi(classe.pm_per_grado)}), quindi il dado va tirato (§2.12, §3.3).`),
    componenteTiro({ id: 'tiro-pm', spec: specTiroPM(classe), tiro: t, memoria: ctx.ui,
      imposta: (tiro) => ctx.aggiorna({ tiroDadoPM: tiro }) }));
}

function passoClasse(ctx) {
  const { dati, scelte } = ctx;
  const classi = dati.classi.classi.filter((c) => c.addestramento === scelte.addestramento);
  const scelta = trova(classi, scelte.classe);
  const cos = ctx.ante.caratteristiche?.COS.valore;
  return [
    h('p', { class: 'guida' }, `Le Classi dell’Addestramento ${scelte.addestramento}. Il I Grado concede +1 alle cinque Abilità di Classe, il Talento fisso del I Grado e i contributi a PV e PM; il dado dei PV è massimizzato.`),
    scelta && scelta.pm_per_grado.dado > 0 ? pannelloDadoPM(ctx, scelta) : null,
    h('div', { class: 'griglia-carte' }, classi.map((c) => {
      const sel = scelte.classe === c.nome;
      const pv1 = c.pv_per_grado.fisso + c.pv_per_grado.dado;
      return carta(sel,
        h('header', {}, h('h3', {}, c.nome), bottoneScelta(sel, () => ctx.aggiorna({ classe: c.nome }))),
        h('p', { class: 'identita' }, c.specializzazioni.join(' / ')),
        h('p', {}, h('strong', {}, 'Abilità di Classe: '), elencoInfo('abilita', c.abilita)),
        h('dl', { class: 'voci in-linea' },
          h('div', {}, h('dt', {}, 'PV/Grado'), h('dd', {}, dadi(c.pv_per_grado),
            h('small', {}, ` (1° livello: ${cos ? `${cos} COS + ${pv1} = ${cos + pv1}` : `+${pv1}`})`))),
          h('div', {}, h('dt', {}, 'PM/Grado'), h('dd', {}, dadi(c.pm_per_grado)))),
        c.incantesimi ? h('p', {}, h('strong', {}, 'Incantesimi al I Grado: '),
          Object.entries(c.incantesimi.primo_grado).filter(([, n]) => n).map(([m, n]) => `${n} ${m}`).join(' + ')) : null,
        h('h4', {}, 'Talenti fissi'),
        c.talenti_fissi.map((t) => talento(ctx, `tal:${c.nome}:${t.nome}`, `${GRADI[t.grado]} Grado — ${t.nome}`, t.testo)),
        h('h4', {}, 'Talenti a scelta (Gradi II, IV, VI)'),
        c.talenti_a_scelta.map((t) => talento(ctx, `tal:${c.nome}:${t.nome}`,
          `${t.specializzazione.startsWith('TODO(') ? 'Specializzazione da definire' : t.specializzazione} — ${t.nome}`, t.testo)),
        c.note?.length ? dettagli(ctx, `note:${c.nome}`, 'Note della Classe', c.note.map((n) => h('p', {}, n))) : null,
      );
    })),
  ];
}

// ---------------------------------------------------------------------------
// 5 Punti Abilità Liberi

function passoAbilita(ctx) {
  const { dati, scelte, scheda } = ctx;
  if (!scheda.abilita) return [h('p', { class: 'nota errore' }, 'Correggi prima le scelte precedenti.')];
  const cr = dati.regole.creazione;
  const pa = scelte.puntiAbilitaLiberi;
  const imposta = (n, v) => ctx.aggiorna({ puntiAbilitaLiberi: { ...pa, [n]: v } });
  const rimasti = cr.punti_abilita_liberi - somma(pa);

  const righe = (cat) => scheda.abilita.filter((a) => a.categoria === cat).map((a) => {
    const blocco = vietato(ctx, { puntiAbilitaLiberi: { ...pa, [a.nome]: a.liberi + 1 } }, ['puntiAbilitaLiberi', `puntiAbilitaLiberi.${a.nome}`]);
    const motivoPiu = blocco?.campo === 'puntiAbilitaLiberi' ? 'Nessun Punto Abilità Libero rimasto da spendere.' : blocco?.problema ?? null;
    const inRiga = blocco && blocco.campo !== 'puntiAbilitaLiberi' ? motivoPiu : null;
    return h('tr', { class: a.daClasse ? 'di-classe' : null },
      h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`),
        a.daClasse ? h('span', { class: 'etichetta' }, 'Classe') : null,
        // su telefono le quattro colonne diventano una riga di testo
        h('small', { class: 'formula' }, `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz`),
        inRiga ? h('small', { class: 'motivo' }, inRiga) : null),
      h('td', { class: 'dettaglio' }, segno(a.mod)),
      h('td', { class: 'dettaglio' }, String(a.base)),
      h('td', { class: 'dettaglio' }, String(a.corporazione)),
      h('td', { class: 'dettaglio', title: `Classe ${a.daClasse} + liberi ${a.liberi}` }, String(a.avanzamento)),
      h('td', { class: 'forte' }, String(a.totale)),
      h('td', {}, stepper(a.liberi, {
        etichetta: a.nome, motivoPiu,
        motivoMeno: a.liberi === 0 ? 'Nessun punto libero da togliere.' : null,
        meno: () => imposta(a.nome, a.liberi - 1), piu: () => imposta(a.nome, a.liberi + 1),
      })));
  });

  return [
    h('p', { class: 'guida' }, `Distribuisci ${cr.punti_abilita_liberi} Punti Abilità Liberi. Ogni punto aggiunge +1 all’Avanzamento; l’Avanzamento iniziale non può superare ${cr.avanzamento_massimo_iniziale}, compreso il +1 di Classe, e l’Abilità deve avere VA almeno ${cr.va_minimo_per_punti_liberi} prima dei punti liberi.`),
    contatore(rimasti, cr.punti_abilita_liberi, 'Punti Abilità Liberi'),
    rimasti === 0 ? h('p', { class: 'nota' }, 'Punti esauriti: per spostarne uno, toglilo prima da un’altra Abilità.') : null,
    h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella abilita' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'),
        h('th', { class: 'dettaglio', title: 'Modificatore della Caratteristica' }, 'Mod'), h('th', { class: 'dettaglio', title: 'Valore base dell’Addestramento' }, 'Base'),
        h('th', { class: 'dettaglio', title: 'Bonus di Corporazione' }, 'Corp'), h('th', { class: 'dettaglio', title: 'Avanzamento: Classe + punti liberi' }, 'Avanz'),
        h('th', {}, 'VA'), h('th', {}, 'Liberi'))),
      dati.abilita.categorie.map((cat) => h('tbody', {},
        h('tr', { class: 'categoria' }, h('th', { colspan: 7 }, cat)), righe(cat))))),
    h('p', { class: 'nota' }, 'VA = Mod + Base + Corp + Avanz. Avanzamento = +1 di Classe + punti liberi.'),
  ];
}

// ---------------------------------------------------------------------------
// 6 Incantesimi

function passoIncantesimi(ctx) {
  const { dati, scelte } = ctx;
  const st = statoIncantesimi(scelte, dati);
  if (!st) return [h('p', { class: 'nota errore' }, 'Correggi prima le scelte precedenti.')];
  const todo = dati.regole.taumaturgo['TODO(Davide)'] ?? [];
  const catalogo = dati.incantesimi.incantesimi;
  const nascosti = catalogo.filter((i) => i.livello_base > st.livelloMassimo).length;
  const cambia = (nome, aggiungi) => ctx.aggiorna({
    incantesimi: aggiungi ? [...scelte.incantesimi, nome] : scelte.incantesimi.filter((n) => n !== nome),
  });

  return [
    h('p', { class: 'guida' }, `L’Addestramento Taumaturgo concede ${dati.regole.taumaturgo.incantesimi_liberi.formula} incantesimi liberi; la Classe aggiunge le sue quote per macrofamiglia. Con 1 Grado taumaturgico il livello massimo è ${st.livelloMassimo}.`),
    todo.length ? h('aside', { class: 'riquadro attenzione' },
      h('h3', {}, 'Regole ancora da chiarire con il master'),
      h('p', {}, 'Finché Davide non conferma, l’app applica le ipotesi più permissive:'),
      h('ul', {}, IPOTESI_INCANTESIMI.map((t) => h('li', {}, t))),
      dettagli(ctx, 'todo-incantesimi', 'Le domande aperte (TODO in regole.json)', h('ul', {}, todo.map((t) => h('li', {}, t))))) : null,
    h('div', { class: 'contatori' },
      h('p', { class: `contatore ${st.completo ? 'ok' : st.eccesso ? 'errore' : 'attenzione'}` },
        h('strong', {}, `${st.scelti} / ${st.totale}`), ' incantesimi scelti'),
      Object.entries(st.perMacro).map(([m, x]) => h('p', { class: 'contatore piccolo' },
        h('strong', {}, m), `: ${x.scelti} scelti, quota di Classe ${x.quota}`)),
      h('p', { class: 'contatore piccolo' }, h('strong', {}, 'Liberi'), `: ${st.liberiUsati} usati su ${st.liberi}`)),
    nascosti ? h('p', { class: 'nota' }, `Nascosti ${nascosti} incantesimi con livello base oltre ${st.livelloMassimo}.`) : null,
    dati.incantesimi.macrofamiglie.map((m) => h('section', { class: 'famiglia' },
      h('h3', {}, `${m.nome}`),
      m.specializzazioni.map((sp) => {
        const lista = catalogo.filter((i) => i.macrofamiglia === m.nome && i.specializzazione === sp && i.livello_base <= st.livelloMassimo);
        return h('fieldset', { class: 'specializzazione' },
          h('legend', {}, sp),
          lista.map((i) => {
            const preso = scelte.incantesimi.includes(i.nome);
            const motivo = motivoBloccoIncantesimo(i, st, scelte);
            return h('label', { class: `incantesimo${motivo ? ' bloccato' : ''}` },
              h('input', { type: 'checkbox', checked: preso, disabled: !!motivo, onchange: (e) => cambia(i.nome, e.target.checked) }),
              h('span', {}, h('strong', {}, info('incantesimo', i.nome)), h('small', {}, ` liv. base ${i.livello_base} · scheda ${i.scheda}, p. ${i.pagina}`),
                motivo ? h('small', { class: 'motivo' }, motivo) : null));
          }));
      }))),
    h('p', { class: 'nota' }, 'Il testo delle schede non è ancora nei dati: consulta il Manuale della Magia alla scheda indicata.'),
  ];
}

// ---------------------------------------------------------------------------
// 7 Punti Eroe

function passoPuntiEroe(ctx) {
  const pe = ctx.dati.regole.punti_eroe;
  return [
    h('p', { class: 'guida' }, `I Punti Eroe iniziali si determinano con ${pe.formula}. Il massimo posseduto resta sempre ${pe.riserva_massima}. Spesa, recupero e Distintivi seguono il §1.8.`),
    componenteTiro({ id: 'tiro-pe', spec: specTiroPuntiEroe(ctx.dati), tiro: ctx.scelte.puntiEroe, memoria: ctx.ui,
      imposta: (tiro) => ctx.aggiorna({ puntiEroe: tiro }) }),
  ];
}

// ---------------------------------------------------------------------------
// 8 Equipaggiamento

function passoEquipaggiamento(ctx) {
  return [
    h('p', { class: 'nota' }, 'Le regole dell’equipaggiamento iniziale non sono ancora scritte (§2.16: «integrazione successiva»). Per ora annota qui ciò che concordi con il master.'),
    h('label', { class: 'campo' }, h('span', {}, 'Equipaggiamento'),
      h('textarea', { rows: 8, value: ctx.scelte.equipaggiamento,
        oninput: (e) => ctx.aggiorna({ equipaggiamento: e.target.value }, { ridisegna: false }) })),
  ];
}
