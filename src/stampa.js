// Dati della scheda stampata (docs/roadmap-equipaggiamento-e-scheda.md, §2): quattro fogli A4
// orizzontali, preparati solo da calcolaScheda e dai dati delle regole. Funzioni pure, senza DOM:
// la vista src/ui/stampa.js trasforma il risultato in HTML e riduce il carattere se un foglio
// non entra nella pagina.
import { calcolaScheda } from './calc.js';
import { migraPersonaggio } from './avanzamento.js';
import { valoreTiro } from './tiri.js';
import { rigaAlLivello } from './descrizioni.js';
import { CAMPI_ANAGRAFICA } from './character.js';
import { checklist } from './checklist.js';
import { aggiungiDanno, NOME_TESTO_PRECEDENTE } from './equipaggiamento.js';

/** Limiti di impaginazione (non regole di gioco): lunghezze massime dei testi stampati. */
export const LIMITI_STAMPA = {
  background: 900, // caratteri; il testo completo resta nella vista digitale
  frase: 220, // prima frase di Talenti e Specializzazioni
  righeArmi: 6,
  righeProtezioni: 3,
  righeEquipaggiamento: 24,
};

export const GRADI_ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/** Taglia un testo a `max` caratteri sull'ultimo spazio, con «…». */
export function tronca(testo, max) {
  const t = String(testo ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const taglio = t.slice(0, max - 1);
  const spazio = taglio.lastIndexOf(' ');
  return `${(spazio > 0 ? taglio.slice(0, spazio) : taglio).replace(/[\s,;:.–—-]+$/, '')}…`;
}

// Frasi di rimando che da sole non dicono cosa fa il Talento (Risorse Interiori, §8.6):
// la stampa passa alla frase successiva.
const FRASI_DI_RIMANDO = /^Si applicano le incompatibilità descritte in questa sezione\.\s+(?=\S)/;

/** Prima frase di un testo (fino al primo punto seguito da spazio), entro `max` caratteri. */
export function primaFrase(testo, max = LIMITI_STAMPA.frase) {
  const t = String(testo ?? '').trim().replace(/\s+/g, ' ').replace(FRASI_DI_RIMANDO, '');
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  const frase = m ? m[1] : t;
  return frase.length > max ? tronca(frase, max) : frase;
}

/** Righe della tabella delle versioni accessibili: dal livello base al livello massimo. */
export function versioniAccessibili(incantesimo, livelloMassimo) {
  const righe = Array.isArray(incantesimo.versioni) ? incantesimo.versioni : [];
  return righe.filter((r) => {
    const n = Number(String(Object.values(r)[0]).trim());
    return Number.isFinite(n) && n >= incantesimo.livello_base && n <= livelloMassimo;
  });
}

/**
 * Intestazione dell'incantesimo senza le parti già date dal raggruppamento del foglio
 * (Scheda, Macrofamiglia, Specializzazione): restano Rituale, PM utilizzabili e simili.
 */
export function intestazioneBreve(intestazione) {
  return String(intestazione ?? '').split('•').map((x) => x.trim())
    .filter((x) => x && !/^(Scheda|Macrofamiglia|Specializzazione)\b/.test(x)).join(' • ');
}

/** Danno per la tabella: una mano e/o due mani. */
export function testoDanno(danno) {
  if (!danno) return '—';
  if (danno.una_mano && danno.due_mani) return `${danno.una_mano} / ${danno.due_mani} (2 mani)`;
  return danno.una_mano ?? danno.due_mani ?? '—';
}

const conSegno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

function testoPenalita(p) {
  const pen = p.penalita ?? {};
  const parti = [];
  if (pen.agilita) parti.push(`Agilità ${conSegno(pen.agilita)}`);
  if (pen.attacchi_ravvicinati || pen.attacchi_distanza) parti.push(`attacchi ${conSegno(pen.attacchi_ravvicinati ?? 0)} ravv. / ${conSegno(pen.attacchi_distanza ?? 0)} dist.`);
  if (pen.movimento_q) parti.push(`MOV ${conSegno(pen.movimento_q)} Q`);
  if (pen.lancio_potere) parti.push(`lancio ${conSegno(pen.lancio_potere)}`);
  if (p.forRichiesta) parti.push(`FOR ${p.forRichiesta}${p.forMancante ? ` (−${p.forMancante})` : ''}`);
  return parti.join('; ');
}

/**
 * Elenco compatto degli oggetti non attivi: «nome ×quantità — note». Le note con più voci (righe o «;») di un
 * oggetto «altro» (per esempio il vecchio campo di testo migrato) diventano voci separate.
 */
export function elencoZaino(zaino) {
  const out = [];
  for (const o of zaino) {
    const q = o.voce.quantita > 1 ? ` ×${o.voce.quantita}` : '';
    const stato = o.fuoriCatalogo ? ' (non più in catalogo)' : o.voce.stato === 'pronta' ? ' (addosso)' : '';
    const note = String(o.voce.note ?? '').trim();
    // solo il vecchio testo libero migrato si spezza in voci: un oggetto personalizzato con «;»
    // nelle note resta una voce sola, con il suo nome
    if (o.personalizzato && o.nome === NOME_TESTO_PRECEDENTE && vociEquipaggiamento(note).length > 1) {
      out.push(...vociEquipaggiamento(note));
      continue;
    }
    out.push(`${o.nome}${q}${stato}${note ? ` — ${note.replace(/\s+/g, ' ')}` : ''}`);
  }
  return out;
}

/** Il foglio Magia si stampa solo se il personaggio ha accesso agli incantesimi. */
export function haMagia(scheda) {
  const inc = scheda.incantesimi;
  return !!inc && (inc.quote.totale > 0 || inc.conosciuti.length > 0);
}

/** Elenco dell'equipaggiamento dal campo di testo libero: una voce per riga (o per «;»). */
export function vociEquipaggiamento(testo) {
  return String(testo ?? '').split(/\r?\n|;/).map((x) => x.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
}

const nomeSalvezza = (id, dati) => dati.caratteristiche.salvezze.find((s) => s.id === id)?.nome ?? id;

function effettoSpecializzazione(e) {
  const segno = (n) => (n > 0 ? `+${n}` : `−${-n}`);
  const parti = [];
  if (e?.va) parti.push(`${segno(e.va)} VA`);
  if (e?.danno) parti.push(`${segno(e.danno)} danno`);
  if (e?.pm) parti.push(`${segno(e.pm)} PM (minimo ${e.pm_minimo})`);
  return parti.join(', ');
}

/**
 * Prepara i fogli da stampare. Con `completo: true` (le tab della scheda digitale) i testi non si
 * troncano: Background, Talenti ed equipaggiamento restano interi.
 * @param personaggio { creazione, livelli } oppure le sole scelte della creazione
 * @param {object} opzioni { versioniDati: testo delle versioni dei manuali (per il piede), completo,
 *   sessione: solo per le tab, valori effettivi con le condizioni; la stampa resta a riposo }
 * @returns {{ completa, errori, scheda, fogli: {id, titolo, numero, totale, dati}[], piede: {nome, livello, versioni} }}
 */
export function preparaStampa(personaggio, dati, { versioniDati = '', completo = false, sessione = null } = {}) {
  const p = migraPersonaggio(personaggio);
  const c = p.creazione;
  const s = calcolaScheda(sessione ? { ...p, sessione } : p, dati);
  if (!s.caratteristiche) return { completa: false, errori: s.errori ?? [], scheda: s, fogli: [], piede: null };

  const nome = String(c.nome ?? '').trim() || 'Personaggio senza nome';
  const pe = valoreTiro(c.puntiEroe);
  const testo = (t) => String(t ?? '').trim();
  const frase = (t) => (completo ? testo(t) : primaFrase(t));
  const bg = String(c.concetto ?? '').trim().replace(/\s+/g, ' ');
  const equip = elencoZaino(s.equipaggiamento?.zaino ?? []);

  const identita = {
    nome,
    livello: s.livello,
    corporazione: s.corporazione,
    addestramento: s.addestramento,
    classi: s.classi.map((x) => ({ nome: x.nome, grado: GRADI_ROMANI[x.grado] ?? String(x.grado), addestramento: x.addestramento })),
    // Anagrafica facoltativa: un campo vuoto si stampa come riga da compilare a penna
    anagrafica: CAMPI_ANAGRAFICA.map(({ campo, etichetta }) => ({ campo, etichetta, valore: testo(c[campo]) })),
    puntiEsperienza: typeof c.puntiEsperienza === 'number' && Number.isFinite(c.puntiEsperienza) ? c.puntiEsperienza : null,
    caratteristiche: Object.entries(s.caratteristiche).map(([sigla, x]) => ({ sigla, nome: x.nome, valore: x.valore, mod: x.mod, modSalvezza: x.modSalvezza })),
    salvezze: Object.entries(s.salvezze).map(([id, x]) => ({
      id, nome: x.nome, caratteristica: x.caratteristica, totale: x.totale, limitato: x.limitato, tetto: x.tetto,
      effettivo: x.effettivo ?? x.totale, scomposizione: x.scomposizione ?? [],
    })),
    pv: s.pv,
    pm: s.pm,
    puntiEroe: { valore: Number.isInteger(pe) ? pe : null, massimo: dati.regole.punti_eroe.riserva_massima },
    iniziativa: s.iniziativa,
    dadoIniziativa: dati.regole.iniziativa.dado_in_combattimento,
    movimento: s.movimento,
    azioni: s.azioni,
    vantaggio: s.vantaggio,
    background: completo ? testo(c.concetto) : tronca(c.concetto, LIMITI_STAMPA.background),
    backgroundTroncato: !completo && bg.length > LIMITI_STAMPA.background,
    annotazioni: s.annotazioni,
  };

  const abilita = {
    categorie: dati.abilita.categorie.map((cat) => ({
      nome: cat,
      abilita: s.abilita.filter((a) => a.categoria === cat).map((a) => ({
        nome: a.nome, caratteristica: a.caratteristica, mod: a.mod, base: a.base, corporazione: a.corporazione,
        avanzamento: a.avanzamento, equip: a.equip ?? 0, va: a.vaEquip ?? a.totale, diClasse: a.daClasse > 0,
        totale: a.totale, effettivo: a.effettivo ?? a.vaEquip ?? a.totale, scomposizione: a.scomposizione ?? [],
      })),
    })),
    limiteAvanzamento: s.abilita[0]?.limite ?? null,
    talentiClasse: s.classi.flatMap((cl) => cl.talenti.map((t) => ({
      nome: t.nome, classe: cl.nome, grado: GRADI_ROMANI[t.grado] ?? String(t.grado), scelto: !!t.scelto, frase: frase(t.testo),
    }))),
    talentiLiberi: s.talentiLiberi.map((t) => ({
      id: t.id,
      nome: t.nome,
      parametro: t.parametro ? (dati.caratteristiche.salvezze.some((x) => x.id === t.parametro) ? nomeSalvezza(t.parametro, dati) : t.parametro) : null,
      annotazione: t.annotazione ?? null,
      livello: t.livello,
      provvisorio: t.provvisorio,
      frase: frase(t.testo),
    })),
    specializzazioni: s.specializzazioni.map((x) => ({
      id: x.id,
      nome: `Specializzazione in ${x.nome}`,
      abilita: x.abilita.length ? x.abilita.join(', ') : 'Abilità della scheda dell’arma',
      effetto: effettoSpecializzazione(x.effetto),
      livello: x.livello,
    })),
    tecniche: s.tecniche.map((t) => ({ id: t.id, nome: t.nome, costo: t.costo, azione: t.azione, durata: t.durata })),
    tecnicheAmmesse: s.tecnicheAmmesse,
  };

  const difese = s.abilita.find((a) => a.nome === 'Difese');
  // Armi e Protezioni si riempiono dagli oggetti attivi (impugnati, imbracciati, indossati); le
  // righe vuote restano per la penna. Il resto dell'equipaggiamento va nell'elenco compatto.
  const eq = s.equipaggiamento;
  const righeArmi = eq.armi.map((a) => [
    a.nome,
    a.abilita ?? '—',
    a.va === null ? '—' : a.va < 0 ? `−${-a.va}` : String(a.va),
    a.dannoDaMunizione ? (a.munizioneRiferimento ? `${aggiungiDanno(a.munizioneRiferimento.danno, a.bonusDanno)} (mun.)` : 'munizione') : testoDanno(a.danno),
    a.gittataQ ? `${a.gittataQ} Q${a.gittataFormula ? ` (${a.gittataFormula})` : ''}` : a.portataQ ? `portata ${a.portataQ} Q` : '—',
    // capacità del caricatore; i colpi rimasti si segnano a penna
    a.munizioni?.capacita ? (a.munizioni.unita === 'cariche' ? `${a.munizioni.capacita} cariche` : a.munizioni.unita === 'PM' ? `${a.munizioni.capacita} PM` : `CC ${a.munizioni.capacita}`) : '',
    [
      a.moduloDi ? `modulo di ${a.moduloDi}` : null,
      ...(a.accessori ?? []).map((x) => x.nome),
      a.mirino ? `mirino −${a.mirino.riduzione} dist.` : null,
      ...(a.condizionali ?? []).map((c) => `${c.nome}: VA ${c.vaTotale < 0 ? `−${-c.vaTotale}` : c.vaTotale}`),
      a.ac !== null && a.ac !== 1 ? `AC ${a.ac === 'munizione' ? (a.munizioneRiferimento ? a.munizioneRiferimento.ac : 'mun.') : a.ac}` : null,
      a.munizioneRiferimento ? `RS ${a.munizioneRiferimento.rs_q} Q` : null,
      a.inc ? `INC ${a.inc}` : null,
      a.modalita.length ? a.modalita.join(' ') : null,
      a.mov ? `MOV ${a.mov < 0 ? `−${-a.mov}` : a.mov} Q` : null,
      a.specializzazione ? `+${a.bonusDanno} danno (Spec.)` : null,
      a.attivazione ? `att. +${a.attivazione.danno_extra} ${a.attivazione.natura}` : null,
      a.naturaDanno && a.naturaDanno !== 'Naturale' ? `danno ${a.naturaDanno}` : null,
      ...a.proprieta.map((p) => p.nome),
      a.parata ? `Parata ${a.parata.va < 0 ? `−${-a.parata.va}` : a.parata.va}${a.parata.distanza !== null && a.parata.distanza !== undefined ? ` (dist. ${a.parata.distanza < 0 ? `−${-a.parata.distanza}` : a.parata.distanza})` : ''}` : null,
    ].filter(Boolean).join('; '),
  ]);
  const meno = (n) => (n < 0 ? `−${-n}` : String(n));
  const righeProtezioni = eq.protezioni.map((p) => [
    p.rinforzo ? `${p.nome} + ${p.rinforzo.nome}` : p.nome,
    p.ar ? `${p.ar.totale}${p.ar.magica ? ` (${p.ar.magica} magica)` : ''}` : '—',
    p.categoria ?? p.taglia ?? '—',
    [
      p.parata ? `Parata ${meno(p.parata.ravvicinata)} ravv. / ${meno(p.parata.distanza)} dist.` : null,
      ...p.alternative.map((a) => `${a.condizione}: ${[a.ar ? `AR ${a.ar.totale}` : null, a.parata ? `Parata ${meno(a.parata.ravvicinata)}/${meno(a.parata.distanza)}` : null,
        a.penalita || a.forRichiesta ? testoPenalita({ penalita: a.penalita, forRichiesta: a.forRichiesta }) : null].filter(Boolean).join(', ')}`),
      p.mov ? `MOV ${meno(p.mov)} Q` : null,
      testoPenalita(p) || null,
    ].filter(Boolean).join('; '),
  ]);
  const combattimento = {
    armi: { colonne: ['Arma', 'Abilità', 'VA', 'Danno', 'Gittata', 'Munizioni', 'Note'], righe: righeArmi, righeVuote: Math.max(2, LIMITI_STAMPA.righeArmi - righeArmi.length) },
    protezioni: { colonne: ['Protezione', 'AR', 'Categoria', 'Note'], righe: righeProtezioni, righeVuote: Math.max(1, LIMITI_STAMPA.righeProtezioni - righeProtezioni.length) },
    armiCalcolate: eq.armi,
    protezioniCalcolate: eq.protezioni,
    avvisiEquipaggiamento: eq.avvisi,
    movimentoQ: eq.movimentoQ,
    lancioPotere: eq.lancioPotere,
    difese: difese ? {
      va: difese.vaEquip ?? difese.totale, caratteristica: difese.caratteristica,
      totale: difese.totale, effettivo: difese.effettivo ?? difese.vaEquip ?? difese.totale, scomposizione: difese.scomposizione ?? [],
    } : null,
    condizioni: s.condizioni ?? [],
    ferite: { stati: dati.regole.ferite.stati, oltre: dati.regole.ferite.oltre },
    affaticamento: dati.regole.affaticamento.stati,
    stati: dati.regole.stati.elenco,
    equipaggiamento: completo ? equip : equip.slice(0, LIMITI_STAMPA.righeEquipaggiamento),
    equipaggiamentoTroncato: !completo && equip.length > LIMITI_STAMPA.righeEquipaggiamento,
    pv: s.pv,
  };

  const fogli = [
    { id: 'identita', titolo: 'Identità', dati: identita },
    { id: 'abilita', titolo: 'Abilità e statistiche', dati: abilita },
    { id: 'combattimento', titolo: 'Combattimento', dati: combattimento },
  ];

  if (haMagia(s)) {
    const inc = s.incantesimi;
    const scala = (dati.regole.taumaturgo.scala_potere ?? []).map((r) => ({ livelli: r.livelli, prova: r[inc.scalaPotere] ?? '—' }));
    const macro = dati.incantesimi.macrofamiglie.map((m) => ({
      nome: m.nome,
      specializzazioni: m.specializzazioni.map((sp) => ({
        nome: sp,
        incantesimi: inc.conosciuti.filter((i) => i.macrofamiglia === m.nome && i.specializzazione === sp).map((i) => {
          const righe = versioniAccessibili(i, inc.livelloMassimo);
          return {
            nome: i.nome,
            livelloBase: i.livello_base,
            scheda: i.scheda,
            intestazione: intestazioneBreve(i.intestazione),
            lancio: i.lancio ?? '',
            colonne: righe.length ? Object.keys(righe[0]) : (rigaAlLivello(i, i.livello_base) ? Object.keys(rigaAlLivello(i, i.livello_base)) : []),
            righe: righe.map((r) => Object.values(r).map(String)),
          };
        }),
      })).filter((x) => x.incantesimi.length),
    })).filter((x) => x.specializzazioni.length);
    fogli.push({
      id: 'magia', titolo: 'Magia',
      dati: {
        pm: s.pm,
        scalaPotere: inc.scalaPotere === 'altri_utilizzatori' ? 'altri utilizzatori' : 'Taumaturgo',
        scala,
        livelloMassimo: inc.livelloMassimo,
        conosciuti: inc.conosciuti.length,
        quota: inc.quote.totale,
        macrofamiglie: macro,
        // Magia sez. 6: riserve esterne, con le caselle per i PM attuali (a penna)
        riserve: (s.equipaggiamento?.contenitori ?? []).map((c) => ({
          nome: c.nome, energia: c.energia, capacita: c.capacita, macrofamiglie: c.macrofamiglie,
          regoleRimandate: c.regoleRimandate, integrato: c.integrato, sintonizzato: c.sintonizzato, costo: c.costo,
        })),
      },
    });
  }

  return {
    completa: s.completa,
    errori: s.errori,
    scheda: s,
    fogli: rinumera(fogli),
    piede: { nome, livello: s.livello, versioni: versioniDati },
  };
}

/** Numera i fogli: «foglio N di M». */
export function rinumera(fogli) {
  return fogli.map((f, i) => ({ ...f, numero: i + 1, totale: fogli.length }));
}

/** Numero di incantesimi nei gruppi del foglio Magia. */
export function contaIncantesimi(macrofamiglie) {
  return macrofamiglie.reduce((n, m) => n + m.specializzazioni.reduce((k, sp) => k + sp.incantesimi.length, 0), 0);
}

/**
 * Spezza gli incantesimi del foglio Magia su più pagine: `tagli` è il numero di incantesimi di
 * ogni pagina tranne l'ultima, che prende il resto. Le intestazioni di macrofamiglia e
 * specializzazione si ripetono in ogni pagina in cui il gruppo compare (con `continua: true` se
 * il gruppo era già iniziato). La prima pagina conserva l'intestazione del foglio (PM, scala).
 * @returns {object[]} i dati di ciascuna pagina Magia
 */
export function spezzaMagia(magia, tagli) {
  const tutti = magia.macrofamiglie.flatMap((m) => m.specializzazioni.flatMap((sp) => sp.incantesimi.map((i) => ({ m: m.nome, sp: sp.nome, i }))));
  const limiti = [];
  let inizio = 0;
  for (const t of tagli) {
    const fine = Math.min(tutti.length, inizio + Math.max(1, t));
    limiti.push([inizio, fine]);
    inizio = fine;
  }
  if (inizio < tutti.length || !limiti.length) limiti.push([inizio, tutti.length]);
  const iniziati = new Set();
  return limiti.filter(([a, b], k) => b > a || k === 0).map(([a, b], k) => {
    const macrofamiglie = [];
    for (const { m, sp, i } of tutti.slice(a, b)) {
      let gm = macrofamiglie.at(-1);
      if (gm?.nome !== m) {
        gm = { nome: m, continua: iniziati.has(m), specializzazioni: [] };
        macrofamiglie.push(gm);
        iniziati.add(m);
      }
      let gs = gm.specializzazioni.at(-1);
      const chiave = `${m}/${sp}`;
      if (gs?.nome !== sp) {
        gs = { nome: sp, continua: iniziati.has(chiave), incantesimi: [] };
        gm.specializzazioni.push(gs);
        iniziati.add(chiave);
      }
      gs.incantesimi.push(i);
    }
    return { ...magia, prima: k === 0, continuazione: k > 0, macrofamiglie };
  });
}

const TITOLI_TAB = { identita: 'Identità', abilita: 'Abilità', combattimento: 'Combattimento', magia: 'Magia' };

/**
 * Dati delle tab della scheda digitale (roadmap §3): gli stessi fogli della stampa, senza
 * troncamenti, più Progressione e controllo §2.17 nella tab Identità. La tab Magia c'è solo con
 * accesso agli incantesimi.
 * @returns {{ completa, errori, scheda, tab: {id, titolo, dati}[] }}
 */
export function preparaTab(personaggio, dati, { sessione = null } = {}) {
  const st = preparaStampa(personaggio, dati, { completo: true, sessione });
  const p = migraPersonaggio(personaggio);
  const tab = st.fogli.map((f) => ({ id: f.id, titolo: TITOLI_TAB[f.id], dati: { ...f.dati } }));
  const identita = tab.find((t) => t.id === 'identita');
  if (identita) {
    identita.dati.progressione = st.scheda.progressione ?? [];
    identita.dati.checklist = checklist(p.creazione, dati);
  }
  return { completa: st.completa, errori: st.errori, scheda: st.scheda, tab };
}
