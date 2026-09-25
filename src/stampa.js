// Dati della scheda stampata (docs/roadmap-equipaggiamento-e-scheda.md, §2): quattro fogli A4
// orizzontali, preparati solo da calcolaScheda e dai dati delle regole. Funzioni pure, senza DOM:
// la vista src/ui/stampa.js trasforma il risultato in HTML e riduce il carattere se un foglio
// non entra nella pagina.
import { calcolaScheda } from './calc.js';
import { migraPersonaggio } from './avanzamento.js';
import { valoreTiro } from './tiri.js';
import { rigaAlLivello } from './descrizioni.js';

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
 * Prepara i fogli da stampare.
 * @param personaggio { creazione, livelli } oppure le sole scelte della creazione
 * @param {object} opzioni { versioniDati: testo delle versioni dei manuali (per il piede) }
 * @returns {{ completa, errori, fogli: {id, titolo, numero, totale, dati}[], piede: {nome, livello, versioni} }}
 */
export function preparaStampa(personaggio, dati, { versioniDati = '' } = {}) {
  const p = migraPersonaggio(personaggio);
  const c = p.creazione;
  const s = calcolaScheda(p, dati);
  if (!s.caratteristiche) return { completa: false, errori: s.errori ?? [], fogli: [], piede: null };

  const nome = String(c.nome ?? '').trim() || 'Personaggio senza nome';
  const pe = valoreTiro(c.puntiEroe);

  const identita = {
    nome,
    livello: s.livello,
    corporazione: s.corporazione,
    addestramento: s.addestramento,
    classi: s.classi.map((x) => ({ nome: x.nome, grado: GRADI_ROMANI[x.grado] ?? String(x.grado), addestramento: x.addestramento })),
    caratteristiche: Object.entries(s.caratteristiche).map(([sigla, x]) => ({ sigla, nome: x.nome, valore: x.valore, mod: x.mod, modSalvezza: x.modSalvezza })),
    salvezze: Object.values(s.salvezze).map((x) => ({ nome: x.nome, caratteristica: x.caratteristica, totale: x.totale, limitato: x.limitato, tetto: x.tetto })),
    pv: s.pv,
    pm: s.pm,
    puntiEroe: { valore: Number.isInteger(pe) ? pe : null, massimo: dati.regole.punti_eroe.riserva_massima },
    iniziativa: s.iniziativa,
    dadoIniziativa: dati.regole.iniziativa.dado_in_combattimento,
    movimento: s.movimento,
    azioni: s.azioni,
    vantaggio: s.vantaggio,
    background: tronca(c.concetto, LIMITI_STAMPA.background),
    backgroundTroncato: String(c.concetto ?? '').trim().replace(/\s+/g, ' ').length > LIMITI_STAMPA.background,
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
      nome: t.nome, classe: cl.nome, grado: GRADI_ROMANI[t.grado] ?? String(t.grado), scelto: !!t.scelto, frase: primaFrase(t.testo),
    }))),
    talentiLiberi: s.talentiLiberi.map((t) => ({
      nome: t.nome,
      parametro: t.parametro ? (dati.caratteristiche.salvezze.some((x) => x.id === t.parametro) ? nomeSalvezza(t.parametro, dati) : t.parametro) : null,
      annotazione: t.annotazione ?? null,
      livello: t.livello,
      provvisorio: t.provvisorio,
      frase: primaFrase(t.testo),
    })),
    specializzazioni: s.specializzazioni.map((x) => ({
      nome: `Specializzazione in ${x.nome}`,
      abilita: x.abilita.length ? x.abilita.join(', ') : 'Abilità della scheda dell’arma',
      effetto: effettoSpecializzazione(x.effetto),
      livello: x.livello,
    })),
    tecniche: s.tecniche.map((t) => ({ nome: t.nome, costo: t.costo, azione: t.azione })),
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
    stati: dati.regole.stati.elenco,
    equipaggiamento: vociEquipaggiamento(c.equipaggiamento).slice(0, LIMITI_STAMPA.righeEquipaggiamento),
    equipaggiamentoTroncato: vociEquipaggiamento(c.equipaggiamento).length > LIMITI_STAMPA.righeEquipaggiamento,
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

  const totale = fogli.length;
  return {
    completa: s.completa,
    errori: s.errori,
    fogli: fogli.map((f, i) => ({ ...f, numero: i + 1, totale })),
    piede: { nome, livello: s.livello, versioni: versioniDati },
  };
}
