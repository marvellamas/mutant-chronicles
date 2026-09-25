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

/** Prima frase di un testo (fino al primo punto seguito da spazio), entro `max` caratteri. */
export function primaFrase(testo, max = LIMITI_STAMPA.frase) {
  const t = String(testo ?? '').trim().replace(/\s+/g, ' ');
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
 * @param {object} opzioni { versioniDati: testo delle versioni dei manuali (per il piede), completo }
 * @returns {{ completa, errori, scheda, fogli: {id, titolo, numero, totale, dati}[], piede: {nome, livello, versioni} }}
 */
export function preparaStampa(personaggio, dati, { versioniDati = '', completo = false } = {}) {
  const p = migraPersonaggio(personaggio);
  const c = p.creazione;
  const s = calcolaScheda(p, dati);
  if (!s.caratteristiche) return { completa: false, errori: s.errori ?? [], scheda: s, fogli: [], piede: null };

  const nome = String(c.nome ?? '').trim() || 'Personaggio senza nome';
  const pe = valoreTiro(c.puntiEroe);
  const testo = (t) => String(t ?? '').trim();
  const frase = (t) => (completo ? testo(t) : primaFrase(t));
  const bg = String(c.concetto ?? '').trim().replace(/\s+/g, ' ');
  const equip = vociEquipaggiamento(c.equipaggiamento);

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
    salvezze: Object.entries(s.salvezze).map(([id, x]) => ({ id, nome: x.nome, caratteristica: x.caratteristica, totale: x.totale, limitato: x.limitato, tetto: x.tetto })),
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
        avanzamento: a.avanzamento, va: a.totale, diClasse: a.daClasse > 0,
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
  // Il foglio Combattimento ha le tabelle Armi e Protezioni vuote: quando arriverà il catalogo
  // dell'equipaggiamento, le righe si riempiranno da lì (roadmap §1) con le stesse colonne.
  const combattimento = {
    armi: { colonne: ['Arma', 'Abilità', 'VA', 'Danno', 'Gittata', 'Munizioni', 'Note'], righe: [], righeVuote: LIMITI_STAMPA.righeArmi },
    protezioni: { colonne: ['Protezione', 'AR', 'Zone', 'Note'], righe: [], righeVuote: LIMITI_STAMPA.righeProtezioni },
    difese: difese ? { va: difese.totale, caratteristica: difese.caratteristica } : null,
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
export function preparaTab(personaggio, dati) {
  const st = preparaStampa(personaggio, dati, { completo: true });
  const p = migraPersonaggio(personaggio);
  const tab = st.fogli.map((f) => ({ id: f.id, titolo: TITOLI_TAB[f.id], dati: { ...f.dati } }));
  const identita = tab.find((t) => t.id === 'identita');
  if (identita) {
    identita.dati.progressione = st.scheda.progressione ?? [];
    identita.dati.checklist = checklist(p.creazione, dati);
  }
  return { completa: st.completa, errori: st.errori, scheda: st.scheda, tab };
}
