// Dati della scheda stampata (docs/layout-ss.md): fogli A4 orizzontali come i tab della SD, nell'ordine
// di FOGLI (prima i sempre presenti), preparati solo da calcolaScheda e dai dati delle regole.
// Un foglio senza contenuto non si stampa. Funzioni pure, senza DOM:
// la vista src/ui/stampa.js trasforma il risultato in HTML e lo impagina (il carattere non si
// riduce: css/stampa.css, --ss-font).
import { calcolaScheda } from './calc.js';
import { migraPersonaggio } from './avanzamento.js';
import { valoreTiro } from './tiri.js';
import { rigaAlLivello } from './descrizioni.js';
import { CAMPI_ANAGRAFICA } from './character.js';
import { checklist } from './checklist.js';
import { aggiungiDanno, NOME_TESTO_PRECEDENTE, catalogo, normalizzaEquipaggiamento, STATO_DEPOSITO, consumabili, rapportoConversione, risolvi, infoArtefattoVoce, regoleSintonizzazione, NOMI_STATI, riserveNec } from './equipaggiamento.js';
import { gradiTaumaturgici } from './incantesimi.js';
import { saldoIniziale, crediti } from './dotazioni.js';
import { SEZIONI_INVENTARIO, sezioneInventario, COLORI_MACROFAMIGLIE } from './palette.js';
import { modoRicarica } from './ricarica.js';
import { calcolaCarico, pesoVoce } from './carico.js';
import { testoProvenienza } from './provenienza.js';

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
    const stato = o.fuoriCatalogo ? ' (non più in catalogo)' : o.voce.stato === 'pronta' ? ' (addosso)' : o.voce.stato === 'deposito' ? ' (deposito comune)' : '';
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

/** Il foglio Poteri si stampa solo se il personaggio ha accesso agli incantesimi. */
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
      effettivo: x.effettivo ?? x.totale, scomposizione: x.scomposizione ?? [], provenienza: x.provenienza ?? null,
    })),
    pv: s.pv,
    pm: s.pm,
    puntiEroe: { valore: Number.isInteger(pe) ? pe : null, massimo: dati.regole.punti_eroe.riserva_massima },
    // con gli effetti generali dell'equipaggiamento indossato (Allerta tattica, §7.21.2), come le armature
    iniziativa: s.iniziativa + (s.equipaggiamento?.iniziativa ?? []).reduce((x, v) => x + v.valore, 0),
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
        // §2.3, §8.3: categoria di competenza, VA grezzo e limite del VA personale
        competenza: a.competenza ?? null, grezzo: a.grezzo ?? a.totale, limite: a.limite ?? null,
        avanzamento: a.avanzamento, equip: a.equip ?? 0, va: a.vaEquip ?? a.totale, diClasse: a.daClasse > 0,
        totale: a.totale, effettivo: a.effettivo ?? a.vaEquip ?? a.totale, scomposizione: a.scomposizione ?? [], provenienza: a.provenienza ?? null,
        // effetti degli oggetti (docs/effetti-oggetti.md): situazionali spenti e valori d'uso specifico
        disponibili: a.disponibili ?? [], nonCumulati: a.nonCumulati ?? [], usiSpecifici: a.usiSpecifici ?? [],
      })),
    })),
    talentiClasse: s.classi.flatMap((cl) => cl.talenti.map((t) => ({
      nome: t.parametroNome ? `${t.nome} (${t.parametroNome})` : t.nome, classe: cl.nome, grado: GRADI_ROMANI[t.grado] ?? String(t.grado), scelto: !!t.scelto, frase: frase(t.testo),
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
    a.dannoDaMunizione ? (a.munizioneRiferimento ? `${aggiungiDanno(a.munizioneRiferimento.danno, a.bonusDanno + (a.bonusCaratteristica?.bonus ?? 0))} (mun.)` : 'munizione') : testoDanno(a.danno),
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
      a.bonusCaratteristica?.bonus ? `+${a.bonusCaratteristica.bonus} danno (${a.bonusCaratteristica.sigla})` : null,
      a.attivazione ? `att. +${a.attivazione.danno_extra} ${a.attivazione.natura}` : null,
      a.naturaDanno && a.naturaDanno !== 'Naturale' ? `danno ${a.naturaDanno}` : null,
      ...a.proprieta.map((p) => p.nome),
      a.parata ? `Parata ${a.parata.va < 0 ? `−${-a.parata.va}` : a.parata.va}${a.parata.distanza !== null && a.parata.distanza !== undefined ? ` (dist. ${a.parata.distanza < 0 ? `−${-a.parata.distanza}` : a.parata.distanza})` : ''}` : null,
    ].filter(Boolean).join('; '),
  ]);
  const meno = (n) => (n < 0 ? `−${-n}` : String(n));
  const elmetti = eq.protezioni.filter((p) => p.tipo === 'elmetto');
  const conElmetto = eq.protezioni.find((p) => p.tipo === 'armatura') ?? null;
  const nomeElmetti = elmetti.map((p) => (p.modifiche?.length ? `${p.nome} (${p.modifiche.join(', ')})` : p.nome)).join(', ');
  const righeProtezioni = eq.protezioni.filter((p) => p.tipo !== 'elmetto' || !conElmetto).map((p) => [
    [p.rinforzo ? `${p.nome} + ${p.rinforzo.nome}` : p.nome, p === conElmetto && nomeElmetti ? (/^Elmetto/.test(nomeElmetti) ? nomeElmetti : `elmetto ${nomeElmetti}`) : null, p.modifiche?.length && p.tipo === 'armatura' ? `elmetto standard (${p.modifiche.join(', ')})` : null].filter(Boolean).join(' + '),
    p.tipo === 'elmetto' ? '—' : p.ar ? `${p.ar.totale}${p.ar.magica ? ` (${p.ar.magica} magica)` : ''}` : '—',
    p.categoria ?? p.taglia ?? '—',
    [
      p.parata ? `Parata ${meno(p.parata.ravvicinata)} ravv. / ${meno(p.parata.distanza)} dist.` : null,
      ...p.alternative.map((a) => `${a.condizione}: ${[a.ar ? `AR ${a.ar.totale}` : null, a.parata ? `Parata ${meno(a.parata.ravvicinata)}/${meno(a.parata.distanza)}` : null,
        a.penalita || a.forRichiesta ? testoPenalita({ penalita: a.penalita, forRichiesta: a.forRichiesta }) : null].filter(Boolean).join(', ')}`),
      p.mov ? `MOV ${meno(p.mov)} Q` : null,
      testoPenalita(p) || null,
    ].filter(Boolean).join('; '),
  ]);
  const sArmi = schedaConArmiAddosso(p, dati) ?? s; // SS: anche le armi addosso
  // SS: PI massimi di ogni protezione stampata (armatura, kit di rinforzo, elmetto), per i quadratini
  const piDi = new Map((eq.integrita ?? []).map((x) => [x.uid, x.piMax]));
  const piProtezioni = eq.protezioni.filter((p) => p.tipo !== 'elmetto' || !conElmetto).map((p) => [
    { etichetta: p.tipo === 'armatura' ? 'armatura' : p.tipo === 'scudo' ? 'scudo' : 'elmetto', pi: piDi.get(String(p.uid)) },
    p.rinforzo ? { etichetta: 'rinforzo', pi: piDi.get(p.rinforzo.uid) } : null,
    ...(p === conElmetto ? elmetti.map((e) => ({ etichetta: 'elmetto', pi: piDi.get(e.uid) })) : []),
  ].filter((x) => x && x.pi));
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
      totale: difese.totale, effettivo: difese.effettivo ?? difese.vaEquip ?? difese.totale, scomposizione: difese.scomposizione ?? [], provenienza: difese.provenienza ?? null,
    } : null,
    condizioni: s.condizioni ?? [],
    ferite: { stati: dati.regole.ferite.stati, oltre: dati.regole.ferite.oltre },
    affaticamento: dati.regole.affaticamento.stati,
    corruzione: dati.regole.corruzione?.stati ?? [],
    stati: dati.regole.stati.elenco,
    equipaggiamento: completo ? equip : equip.slice(0, LIMITI_STAMPA.righeEquipaggiamento),
    equipaggiamentoTroncato: !completo && equip.length > LIMITI_STAMPA.righeEquipaggiamento,
    // §2.16.28–29: saldo iniziale (la stampa resta a riposo: i crediti attuali si scrivono a penna)
    creditiIniziali: dati.dotazioni ? saldoIniziale(c, dati) : null,
    pv: s.pv,
    // SS, foglio 3: riquadro compatto (come la tab Combattimento), armi con tutte le colonne e le
    // file di quadratini dei colpi, equipaggiamento in tabella con il carico, Stati con il riassunto
    // SS: AR a riposo (docs/ricognizione-ar-pi.md) e PI delle protezioni
    // provenienza dell'AR totale in una riga, dalle stesse righe dei tooltip della SD (src/provenienza.js)
    arStampa: eq.ar ? {
      valori: eq.ar.valori,
      provenienza: eq.ar.valori[0].provenienza.righe.length ? testoProvenienza(eq.ar.valori[0].provenienza, { totale: null, separatore: ' · ', note: false }) : 'nessuna protezione',
    } : null,
    piProtezioni,
    sintesi: {
      iniziativa: identita.iniziativa, dadoIniziativa: identita.dadoIniziativa, movimento: s.movimento, azioni: s.azioni,
      salvezze: identita.salvezze, difese: difese ? { va: difese.vaEquip ?? difese.totale, caratteristica: difese.caratteristica } : null,
    },
    armiStampa: armiStampa(sArmi, c, dati),
    specializzazioni: abilita.specializzazioni,
    tecniche: abilita.tecniche,
    tecnicheAmmesse: abilita.tecnicheAmmesse,
    statiRiassunto: dati.regole.stati.elenco.map((x) => ({ id: x.id, nome: x.nome, riassunto: x.promemoria ?? '' })),
    // foglio 3, colonna destra (docs/layout-ss.md, pezzo 3): Stati con il solo effetto numerico dai dati
    statiStampa: dati.regole.stati.elenco.map((x) => ({ id: x.id, nome: x.nome, effetto: effettoStato(x) })),
    // §7.19: kit sanitari (non nel deposito comune) con le applicazioni da annerire
    sanitario: consumabili(c.equipaggiamento ?? [], dati).map((k) => ({ uid: k.uid, nome: k.nome, applicazioni: k.capacita, unita: k.unita })),
    // §8.6.7: Parata e Schivata Istintiva (e i Talenti che le richiedono), accanto alle Difese
    istintive: (() => {
      const ids = ['parata-istintiva', 'schivata-istintiva'];
      const posseduti = new Set((s.talentiLiberi ?? []).map((t) => t.id));
      return (dati.talenti_liberi?.talenti ?? []).filter((t) => posseduti.has(t.id) && (ids.includes(t.id) || (t.prerequisiti ?? []).some((p) => ids.includes(p)))).map((t) => t.nome);
    })(),
    // A.49, §5.17: condizione delle armi, i gradi da cerchiare; sulla carta il nome breve, senza la
    // precisazione fra parentesi («Riparata sul campo (era Rotta)» → «Riparata sul campo»), una volta sola
    condizioniArmi: [...new Set((dati.regole.condizioni_armi?.elenco ?? []).map((x) => x.nome.replace(/\s*\(.*\)\s*$/, '')))],
  };

  // foglio 3, pagina 2 (ritocchi post-stampa): tabella di consultazione delle azioni, dai soli dati
  combattimento.azioni = azioniCombattimento(dati, combattimento.armiStampa);

  const fogli = [
    { id: 'identita', titolo: 'Identità', dati: identita },
    { id: 'abilita', titolo: 'Abilità e statistiche', dati: abilita },
    { id: 'combattimento', titolo: 'Combattimento', dati: combattimento },
    // foglio 4 (docs/layout-ss.md, pezzo 1): l'Equipaggiamento esce dal foglio 3 e vive qui
    { id: 'inventario', titolo: 'Inventario', dati: inventarioStampa(s, dati, combattimento.creditiIniziali) },
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
          const base = rigaAlLivello(i, i.livello_base) ?? {};
          // valore della colonna al livello base; l'unità nel nome della colonna («Gittata Q») va sul numero
          const campo = (re) => {
            const [k, v] = Object.entries(base).find(([x]) => re.test(x)) ?? [];
            if (v === undefined || v === '') return '—';
            return / Q$/.test(k) && /^\d+$/.test(v) ? `${v} Q` : v;
          };
          return {
            nome: i.nome,
            livelloBase: i.livello_base,
            macrofamiglia: i.macrofamiglia,
            // SS, foglio 4: indice per il tavolo e scheda completa (descrizione e regole)
            indice: {
              pm: campo(/PM/), gittata: campo(/Gittata/), durata: campo(/Durata/),
              tempo: i.meccanica?.azioni?.azioni_principali ? `${i.meccanica.azioni.azioni_principali} AP` : i.meccanica?.azioni?.tempo ?? '—',
            },
            descrizione: i.descrizione ?? '',
            regole: i.regole ?? '',
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
      id: 'poteri', titolo: 'Poteri',
      dati: {
        pm: s.pm,
        // Magia sez. 6, Meditazione: recupero dei PM come nel riquadro della SD (null senza la capacità)
        meditazione: s.magia?.meditazione ?? null,
        // uso specifico permanente (docs/effetti-oggetti.md): Potere per lanciare con l'armatura
        // indossata (§7.11.1), a riposo come il resto della stampa
        lancio: (() => {
          const pen = s.equipaggiamento?.lancioPotere ?? 0;
          const potere = s.abilita.find((a) => a.nome === 'Potere');
          return pen && potere ? { va: (potere.vaEquip ?? potere.totale) + pen, penalita: pen } : null;
        })(),
        scalaPotere: inc.scalaPotere === 'altri_utilizzatori' ? 'altri utilizzatori' : 'Taumaturgo',
        scala,
        livelloMassimo: inc.livelloMassimo,
        conosciuti: inc.conosciuti.length,
        quota: inc.quote.totale,
        macrofamiglie: macro,
        // valori di lancio come nella tab Magia (Magia sez. 2, regole.json → lancio, Talenti)
        valoriLancio: {
          focalizzazione: s.magia?.focalizzazioneVa ?? dati.regole.lancio.focalizzazione.va,
          ingaggio: s.magia?.penalitaIngaggio ?? dati.regole.lancio.ingaggio.va,
          potere: (() => {
            // Potere a riposo, con la penalità d'armatura al lancio (uso specifico «lancio», Armamenti §7.11.1)
            const p = s.abilita.find((a) => a.nome === 'Potere');
            if (!p) return null;
            const uso = (p.usiSpecifici ?? []).find((u) => u.uso === 'lancio');
            return (p.vaEquip ?? p.totale) + (uso?.modificatore ?? 0);
          })(),
          armiDaLancio: s.magia?.tiroArmiDaLancio ?? dati.regole.lancio.tiro_armi_da_lancio,
          anticipazione: dati.regole.lancio.anticipazione.moltiplicatore_costo,
        },
        // Magia sez. 6: riserve esterne, con le caselle per i PM attuali (a penna). Decisione 5 del
        // piano SS: i PM delle batterie e riserve di Chroma stanno qui; il foglio Artefatti avrà solo
        // la sintonizzazione
        riserve: (s.equipaggiamento?.contenitori ?? []).map((c) => ({
          nome: c.nome, energia: c.energia, capacita: c.capacita, macrofamiglie: c.macrofamiglie,
          regoleRimandate: c.regoleRimandate, integrato: c.integrato, sintonizzato: c.sintonizzato, costo: c.costo,
        })),
        // Convertire Potere e ricaricare (Magia sez. 6): rapporto con i Talenti, come nel riquadro dei PM della SD
        conversione: (() => {
          const cv = rapportoConversione(s, dati);
          return cv?.disponibile ? { rapporto: cv.rapporto, talenti: cv.talenti, fissi: cv.fissi } : null;
        })(),
        // Magia sez. 1: Gradi taumaturgici complessivi (la riga del riquadro Incantesimi della SD)
        gradi: (() => {
          const g = gradiTaumaturgici(s, dati);
          return g ? { testo: g.testo, gradi: g.gradi, livelloMassimo: g.livelloMassimo } : null;
        })(),
        // «Da artefatti» (come la tab Poteri della SD): Artefatti con attivazione o riserva integrata;
        // il loro dettaglio sta nel foglio Artefatti, qui solo il rimando
        daArtefatti: (() => {
          const st = s.equipaggiamento?.sintonizzazione;
          if (!st) return [];
          const cat = catalogo(dati);
          const perUid = new Map((c.equipaggiamento ?? []).map((v) => [v.uid, risolvi(v, cat)]));
          return st.artefatti.map((x) => ({ x, r: perUid.get(x.uid) }))
            .filter(({ r }) => r?.def?.attivazione || infoArtefattoVoce(r, dati)?.contenitore?.integrato).map(({ x }) => x.nome);
        })(),
      },
    });
  }

  // foglio 6 (docs/layout-ss.md, pezzo 5): solo con Artefatti, contenitori di Chroma compresi
  if (s.equipaggiamento?.sintonizzazione?.artefatti?.length) {
    fogli.push({ id: 'artefatti', titolo: 'Artefatti', dati: artefattiStampa(s, c, dati, { conPoteri: haMagia(s) }) });
  }

  const ordinati = ordinaFogli(fogli, dati);
  // rimandi fra i fogli 5 e 6 (decisione 5: i PM delle riserve stanno nel foglio Poteri)
  const poteri = ordinati.find((f) => f.id === 'poteri');
  const artefatti = ordinati.find((f) => f.id === 'artefatti');
  if (poteri) poteri.dati.foglioArtefatti = artefatti?.numero ?? null;
  if (artefatti) artefatti.dati.foglioPoteri = poteri?.numero ?? null;

  return {
    completa: s.completa,
    errori: s.errori,
    scheda: s,
    fogli: ordinati,
    piede: { nome, livello: s.livello, versioni: versioniDati },
  };
}

/**
 * Armi per la SS (foglio 3): tutte le colonne dei dati, nell'ordine della SD, e le file di
 * quadratini dei colpi: una per caricatore (almeno 2) o per cella; le armi a inserimento (revolver,
 * pompa, doppiette) hanno una sola fila «colpi». I moduli integrati hanno la loro riga.
 */
export function armiStampa(s, creazione, dati) {
  const pronte = s.armiAddosso ?? new Set();
  const cat = catalogo(dati);
  const voci = normalizzaEquipaggiamento(creazione?.equipaggiamento);
  const quantita = (rif) => voci.filter((v) => v.rif === rif).reduce((n, v) => n + (v.quantita ?? 1), 0);
  return (s.equipaggiamento?.armi ?? []).map((a) => {
    const def = a.rif ? cat.perRif.get(a.rif) : null;
    const cap = a.munizioni?.capacita ?? null;
    let colpi = null;
    if (Number.isInteger(cap) && cap > 0 && a.tipo === 'arma_distanza') {
      const r = modoRicarica(def, dati, cat);
      if (r.modo === 'inserimento') colpi = { modo: 'inserimento', capacita: cap, file: 1 };
      else if (r.modo === 'cella') colpi = { modo: 'cella', capacita: cap, file: 2 };
      else colpi = { modo: 'caricatore', capacita: cap, file: Math.max(2, 1 + (r.vuoto ? quantita(r.vuoto.rif) : 0)) };
    } else if (Number.isInteger(cap) && cap > 0) colpi = { modo: 'cella', capacita: cap, file: 2 }; // cariche di armi ravvicinate (PM, batterie)
    const meno = (n) => (n < 0 ? `−${-n}` : String(n));
    return {
      nome: a.nome,
      uid: a.uid,
      addosso: pronte.has(String(a.uid).split(':')[0]),
      moduloDi: a.moduloDi ?? null,
      abilita: a.abilita ?? '—',
      va: a.va === null ? '—' : meno(a.va),
      danno: a.dannoDaMunizione ? (a.munizioneRiferimento ? `${aggiungiDanno(a.munizioneRiferimento.danno, a.bonusDanno + (a.bonusCaratteristica?.bonus ?? 0))} (mun.)` : 'munizione') : testoDanno(a.danno),
      ac: a.ac !== null && a.ac !== undefined && a.ac !== 1 ? String(a.ac === 'munizione' ? (a.munizioneRiferimento?.ac ?? 'mun.') : a.ac) : '1',
      gittata: a.gittataQ ? `${a.gittataQ} Q` : a.portataQ ? `port. ${a.portataQ} Q` : '—',
      inc: a.inc ? String(a.inc) : '—',
      parata: a.parata ? `${meno(a.parata.va)}${a.parata.distanza !== null && a.parata.distanza !== undefined ? ` / ${meno(a.parata.distanza)}` : ''}` : '—',
      mani: a.mani ? String(a.mani) : '—',
      forza: def?.for_richiesta ? String(def.for_richiesta) : '—',
      pi: def?.pi ? String(def.pi) : '—',
      piMax: Number.isInteger(def?.pi) ? def.pi : null,
      qualita: def?.qualita ?? '—',
      capacita: cap ? `${cap}${a.munizioni.unita && a.munizioni.unita !== 'colpi' ? ` ${a.munizioni.unita}` : ''}` : '—',
      modalita: (a.modalita ?? []).join(' ') || '—',
      proprieta: [
        ...(a.accessori ?? []).map((x) => x.nome),
        a.mirino ? `mirino −${a.mirino.riduzione} dist.` : null,
        a.munizioneRiferimento ? `RS ${a.munizioneRiferimento.rs_q} Q` : null,
        a.mov ? `MOV ${meno(a.mov)} Q` : null,
        a.specializzazione ? `+${a.bonusDanno} danno (Spec.)` : null,
        a.bonusCaratteristica?.bonus ? `+${a.bonusCaratteristica.bonus} danno (${a.bonusCaratteristica.sigla})` : null,
        a.attivazione ? `att. +${a.attivazione.danno_extra} ${a.attivazione.natura}` : null,
        a.naturaDanno && a.naturaDanno !== 'Naturale' ? `danno ${a.naturaDanno}` : null,
        ...(a.proprieta ?? []).map((p) => p.nome),
      ].filter(Boolean).join('; '),
      colpi,
    };
  });
}

/**
 * Le armi «addosso (pronta)» non sono attive e la scheda non ne calcola i valori; per la SS si
 * calcolano come se fossero impugnate, in una scheda a parte usata solo per la tabella delle armi.
 */
export function schedaConArmiAddosso(p, dati) {
  const voci = normalizzaEquipaggiamento(p.creazione?.equipaggiamento);
  const pronte = new Set(voci.filter((v) => v.stato === 'pronta').map((v) => v.uid));
  if (!pronte.size) return null;
  const creazione = { ...p.creazione, equipaggiamento: voci.map((v) => (pronte.has(v.uid) ? { ...v, stato: 'impugnata' } : v)) };
  const s = calcolaScheda({ ...p, creazione }, dati);
  return s.equipaggiamento ? Object.assign(s, { armiAddosso: pronte }) : null;
}

const conSegnoStampa = (n) => (n < 0 ? `−${-n}` : `+${n}`);
const GRUPPI_PROVE = { tutte: 'tutte le Prove', fisiche: 'fisiche', fisiche_ravvicinate: 'fisiche ravvicinate', vista: 'vista', udito: 'udito' };
/**
 * Effetto numerico di uno Stato (regole.json → stati.elenco, §5.18) in poche parole, per la colonna
 * destra del foglio 3: «−2 fisiche, Passo 3 Q». Solo i numeri dei dati, senza descrizioni.
 */
export function effettoStato(x) {
  const parti = [];
  for (const e of x.effetti ?? []) {
    const uso = e.ambito === 'uso_specifico' && e.uso ? ` (${e.uso})` : '';
    if (e.tipo === 'salvezza') parti.push(`${conSegnoStampa(e.valore)} Salvezze${uso}`);
    else if (e.prove) parti.push(`${conSegnoStampa(e.valore)} ${GRUPPI_PROVE[e.prove] ?? e.prove}${uso}`);
    else if (e.abilita) parti.push(`${conSegnoStampa(e.valore)} ${e.abilita}${uso}`);
  }
  const m = x.movimento;
  if (m?.nessuno) parti.push('nessun Movimento');
  else {
    if (m?.solo_passo) parti.push('solo Passo');
    if (Number.isInteger(m?.passo_q)) parti.push(`Passo ${m.passo_q} Q`);
  }
  const a = x.azioni;
  if (a?.principali === 0 && a?.movimento === 0) parti.push('nessuna Azione');
  else {
    if (Number.isInteger(a?.principali)) parti.push(a.principali ? `${a.principali} AzP` : 'nessuna AzP');
    if (Number.isInteger(a?.movimento)) parti.push(a.movimento ? `${a.movimento} AzM` : 'nessuna AzM');
  }
  return parti.join(', ');
}

const testoAr = (ar) => (ar ? `${ar.totale}${ar.magica ? ` (${ar.magica} magica)` : ''}` : '—');
const IN_USO = ['impugnata', 'imbracciato', 'indossata', 'in_uso'];

/**
 * Foglio Artefatti della SS (docs/layout-ss.md, foglio 6; pezzo 5), come la tab Artefatti della SD:
 * - sintonizzazione (§7.10): capacità per Gradi complessivi e bonus del Talento, punti occupati
 *   dagli Artefatti segnati «sintonizzati» nel file (a riposo, come la SD), elenco con i costi;
 * - una scheda per Artefatto: tipologia, potenza, costo, stato nell'Inventario, «Sintonizzato»,
 *   effetti se in uso (VA e danno dell'arma in mano, AR della protezione indossata, con la
 *   provenienza in una riga), attivazione con il costo in PM, riserva integrata;
 * - riserve di Chroma (batterie, cristalli, contenitori): una riga di sintonizzazione ciascuna.
 * I PM delle riserve stanno nel foglio Poteri (decisione 5); senza magia (niente foglio Poteri) qui.
 */
export function artefattiStampa(s, creazione, dati, { conPoteri = false } = {}) {
  const eq = s.equipaggiamento;
  const st = eq.sintonizzazione;
  const rs = regoleSintonizzazione(dati);
  const cat = catalogo(dati);
  const perUid = new Map((creazione.equipaggiamento ?? []).map((v) => [v.uid, risolvi(v, cat)]));
  const base = (uid) => String(uid).split(':')[0];
  const contenitori = eq.contenitori ?? [];
  const riga = (p) => (p?.righe?.length ? testoProvenienza(p, { totale: null, separatore: ' · ', note: false }) : null);
  const schede = st.artefatti.filter((x) => !contenitori.some((c) => c.uid === x.uid && !c.integrato)).map((x) => {
    const r = perUid.get(x.uid);
    const def = r?.def;
    const inUso = IN_USO.includes(r?.voce.stato);
    const arma = inUso ? (eq.armi ?? []).find((a) => base(a.uid) === x.uid && !a.moduloDi) : null;
    const prot = inUso ? (eq.protezioni ?? []).find((p) => base(p.uid) === x.uid && p.tipo !== 'elmetto') : null;
    const riserva = contenitori.find((c) => c.uid === x.uid && c.integrato);
    const effettiPossibili = ['arma_ravvicinata', 'arma_distanza', 'armatura', 'scudo'].includes(r?.tipo);
    return {
      uid: x.uid, nome: x.nome, tipologia: x.tipologia ?? 'Artefatto', potenza: x.potenza, costo: x.costo,
      sintonizzato: x.sintonizzato, deposito: x.deposito, stato: NOMI_STATI[r?.voce.stato] ?? 'Con sé',
      arma: arma ? { va: arma.va, danno: testoDanno(arma.danno), provenienzaVa: riga(arma.provenienza), provenienzaDanno: riga(arma.provenienzaDanno) } : null,
      ar: prot ? { testo: testoAr(prot.ar), provenienza: riga(prot.provenienza) } : null,
      nonInUso: !arma && !prot && effettiPossibili,
      attivazione: def?.attivazione?.testo ?? null,
      riserva: riserva ? { energia: riserva.energia, capacita: riserva.capacita } : null,
    };
  });
  return {
    sintonizzazione: {
      capacita: st.capacita, usata: st.usata, gradi: st.gradi,
      daGradi: rs.capacita_per_gradi[st.gradi - 1] ?? null, talento: st.talento, bonusTalento: st.talento ? rs.talento.bonus : 0,
      elenco: st.artefatti.map((x) => ({ nome: x.nome, costo: x.costo, sintonizzato: x.sintonizzato, deposito: x.deposito })),
    },
    schede,
    riserve: contenitori.filter((c) => !c.integrato).map((c) => ({
      uid: c.uid, nome: c.nome, energia: c.energia, capacita: c.capacita, costo: c.costo, sintonizzato: c.sintonizzato, potenza: c.potenza,
      deposito: st.artefatti.find((x) => x.uid === c.uid)?.deposito ?? false,
    })),
    // decisione 5: i PM delle riserve si segnano nel foglio Poteri; senza foglio Poteri, qui
    pmQui: !conPoteri,
  };
}

const valoreAzione = (v) => (v === null || v === undefined ? '—' : conSegno(v));
/** Codici delle modalità di fuoco delle armi stampate («S RB RM» → S, RB, RM). */
const codiciModalita = (armi) => [...new Set(armi.flatMap((a) => (a.modalita && a.modalita !== '—' ? a.modalita.split(/\s+/) : [])))];

/**
 * Riquadro «Azioni di combattimento» del foglio 3, pagina 2 (docs/layout-ss.md, ritocchi
 * post-stampa): tabella di consultazione con i soli valori di data/regole.json, a riposo (niente
 * Talenti né situazione: quelli li fa «Attacca!» nella SD). Gruppi interi, nell'ordine di stampa:
 * con armi a distanza prima il tiro (modalità di fuoco delle armi del personaggio, §5.10; manovre
 * di tiro e Imbracciatura, §5.10), poi il corpo a corpo (manovre del §5.12 e Carica del §5.6);
 * senza armi a distanza il contrario, con tutte le modalità. La vista toglie i gruppi dall'ultimo
 * se lo spazio non basta.
 * @returns {{ id, titolo, colonne: string[], righe: string[][] }[]}
 */
export function azioniCombattimento(dati, armi = []) {
  const R = dati.regole;
  const D = R.attacco_distanza;
  const A = R.attacco_ravvicinato;
  const MF = R.modalita_di_fuoco;
  const gruppi = { distanza: [], ravvicinato: [] };
  const codici = codiciModalita(armi);
  if (MF && D) {
    const M = D.modalita ?? {};
    const aSegno = (k) => (M.area?.[k] ? `area ${M.area[k]}` : M.applicazioni?.[k] ? `${M.applicazioni[k]} applicazioni` : M.tiri?.[k] ? `${M.colpi_a_segno?.[k] ?? '—'} × ${M.tiri[k]} tiri` : String(M.colpi_a_segno?.[k] ?? '—'));
    // Tiro Mirato sta fra le manovre di tiro, con il suo danno
    const elenco = Object.keys(MF).filter((k) => !k.startsWith('_') && k !== 'TM' && (!codici.length || codici.includes(k)));
    if (elenco.length) gruppi.distanza.push({
      id: 'modalita', titolo: `Modalità di fuoco (${MF[elenco[0]].paragrafo ?? '§5.10'})`,
      colonne: ['Modalità', 'Colpi', 'AzP', 'VA', 'A segno'],
      righe: elenco.map((k) => [`${MF[k].nome} (${k})`, String(MF[k].colpi_consumati), String(MF[k].azioni_principali), valoreAzione(MF[k].modificatore_va), aSegno(k)]),
    });
    const T = D.manovre ?? {};
    const righe = [];
    if (T.mirato) righe.push([T.mirato.nome, `+${T.mirato.azioni_principali}`, valoreAzione(T.mirato.va), valoreAzione(T.mirato.danno), '—']);
    if (T.ravvicinato) righe.push([T.ravvicinato.nome, '—', Object.entries(T.ravvicinato.va_per_abilita ?? {}).map(([ab, v]) => `${valoreAzione(v)} ${ab}`).join(' / '), valoreAzione(T.ravvicinato.danno), `≤ ${T.ravvicinato.distanza_max_q} Q`]);
    if (T.bruciapelo) righe.push([T.bruciapelo.nome, '—', '0', `×${T.bruciapelo.moltiplicatore}`, `≤ ${T.bruciapelo.distanza_max_q} Q`]);
    if (D.imbracciatura) righe.push(['Senza Imbracciatura', '—', valoreAzione(D.imbracciatura.va), '—', D.imbracciatura.abilita?.join(', ') ?? '—']);
    if (righe.length) gruppi.distanza.push({ id: 'manovre-tiro', titolo: 'Manovre di tiro (§5.10)', colonne: ['Manovra', 'AzP', 'VA', 'Danno', 'Distanza'], righe });
  }
  if (A?.manovre) {
    const effetto = (m) => [m.effetto && m.effetto.length <= 24 ? m.effetto : null,
      m.dopo_armatura?.stato ? `${m.dopo_armatura.stato}${m.dopo_armatura.valore ? ` ${m.dopo_armatura.valore}` : ''}${m.dopo_armatura.salvezza ? ` (${m.dopo_armatura.salvezza})` : ''}` : null,
      m.spinta_q ? `spinta ${m.spinta_q} Q` : null].filter(Boolean).join(', ') || '—';
    const va = (m) => (m.va_per_bersagli ? Object.entries(m.va_per_bersagli).map(([n, v]) => `${valoreAzione(v)} (${n})`).join(' / ') : valoreAzione(m.va));
    const righe = Object.values(A.manovre).map((m) => [m.nome, String(m.azioni_principali), va(m), m.danno === null ? '—' : valoreAzione(m.danno), m.prova?.tipo === 'contrapposta' ? 'contrapposta' : 'per colpire', effetto(m)]);
    if (A.carica) righe.push(['Carica', `${A.carica.azioni_principali} + ${A.carica.azioni_movimento} AzM`,
      A.carica.fasce.map((f) => `${valoreAzione(f.va)} (${f.da}–${f.a} Q)`).join(' / '), `×${A.carica.moltiplicatore}`, 'per colpire', '—']);
    gruppi.ravvicinato.push({ id: 'manovre-ravvicinate', titolo: `Manovre corpo a corpo (${(A.paragrafo ?? '§5.12').replace(/^Giocatore\s+/, '')})`, colonne: ['Manovra', 'AzP', 'VA', 'Danno', 'Prova', 'Effetto'], righe });
  }
  return codici.length ? [...gruppi.distanza, ...gruppi.ravvicinato] : [...gruppi.ravvicinato, ...gruppi.distanza];
}

/**
 * Abbreviazioni della SS (foglio 5, prima pagina; ritocchi post-stampa): solo parole, mai numeri,
 * e solo sulla carta (la SD scrive per intero). L'energia di Chroma resta scritta per intero nella
 * riga accanto al pallino, così nulla si legge solo per il colore.
 */
export const ABBREVIAZIONI_SS = [
  [/Batteria da /g, 'Batt. '], [/\bBatterie\b/g, 'Batt.'],
  [/Chroma Rosso\b/g, 'Chroma R.'], [/Chroma Verde\b/g, 'Chroma V.'], [/Chroma Blu\b/g, 'Chroma B.'],
  [/Chroma Bianco\b/g, 'Chroma Bi.'], [/Chroma Viola\b/g, 'Chroma Vi.'], [/Chroma Trasparente\b/g, 'Chroma T.'],
  [/\bsintonizzato\b/g, 'sint.'], [/da sintonizzare/g, 'da sint.'], [/tutte le macrofamiglie/g, 'tutte le macrof.'],
  [/\battivazioni\b/g, 'attiv.'], [/regole rimandate/g, 'regole rimand.'],
];

/** Testo abbreviato per la SS (ABBREVIAZIONI_SS). */
export const abbreviaSS = (testo) => ABBREVIAZIONI_SS.reduce((t, [da, a]) => t.replace(da, a), String(testo ?? ''));

/**
 * Elenco degli incantesimi conosciuti della prima pagina del foglio Poteri (docs/layout-ss.md,
 * ritocchi post-stampa): un'intestazione per macrofamiglia, poi una riga per incantesimo con le
 * sole colonne essenziali (livello base, PM, gittata, durata, numero di scheda del Manuale della
 * Magia); `tinta` è il colore della famiglia (palette.js), per la riga e l'intestazione.
 * @returns {({ tipo: 'macro', nome, tinta, numero } | { tipo: 'incantesimo', nome, livello, pm, gittata, durata, scheda, macrofamiglia, tinta })[]}
 */
export function righeElencoIncantesimi(macrofamiglie) {
  return macrofamiglie.flatMap((m) => {
    const tinta = COLORI_MACROFAMIGLIE[m.nome] ?? null;
    const incantesimi = m.specializzazioni.flatMap((sp) => sp.incantesimi);
    return [
      { tipo: 'macro', nome: m.nome, tinta, numero: incantesimi.length },
      ...incantesimi.map((i) => ({
        tipo: 'incantesimo', nome: i.nome, livello: i.livelloBase, pm: i.indice.pm, gittata: i.indice.gittata, durata: i.indice.durata,
        scheda: i.scheda ?? '—', macrofamiglia: i.macrofamiglia ?? m.nome, tinta: COLORI_MACROFAMIGLIE[i.macrofamiglia ?? m.nome] ?? tinta,
      })),
    ];
  });
}

/**
 * Stato di un oggetto nel foglio Inventario (docs/layout-ss.md, foglio 4): quattro caselle, una per
 * gruppo di stati della SD (src/equipaggiamento.js → STATI), con quella attuale prestampata piena.
 * «Con sé» comprende gli oggetti senza stati propri (null), «pronta» e «trasportato».
 */
export const STATI_INVENTARIO_STAMPA = [
  { id: 'conse', sigla: 'sé', nome: 'Con sé', stati: [null, 'pronta', 'trasportato'] },
  { id: 'inuso', sigla: 'uso', nome: 'In uso (impugnato, imbracciato, indossato, montato)', stati: ['impugnata', 'imbracciato', 'indossata', 'in_uso'] },
  { id: 'zaino', sigla: 'zai', nome: 'Zaino', stati: ['zaino'] },
  { id: 'deposito', sigla: 'dep', nome: 'Deposito comune', stati: [STATO_DEPOSITO] },
];
/** Gruppo di stato della stampa per lo stato salvato di una voce (sconosciuto → «con sé»). */
export const statoInventarioStampa = (stato) => (STATI_INVENTARIO_STAMPA.find((x) => x.stati.includes(stato ?? null)) ?? STATI_INVENTARIO_STAMPA[0]).id;

const kg = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} kg`;

/**
 * Foglio Inventario della SS (docs/layout-ss.md, foglio 4): le sezioni della tab Inventario della SD
 * (SEZIONI_INVENTARIO, nell'ordine della tab, solo quelle con oggetti), una riga per oggetto con
 * costo, Qualità, peso, stato, PI massimi e PS Integrità; in testa Crediti (saldo iniziale) e Carico
 * noto con le soglie (§5.2.6). A riposo, come tutta la SS: lo stato è la scelta salvata della voce.
 * @returns {{ creditiIniziali, carico, stati, sezioni: { id, titolo, colore, righe }[] }}
 */
/**
 * Quadratini della riserva di un NEC nella SS (foglio 4): una casella per unità fino a 50 (ore, usi);
 * oltre, 10 caselle che valgono un decimo della riserva ciascuna («1 casella = 100 Lx»). È una scelta
 * di presentazione per la carta, non una regola del manuale: la riserva esatta si segna nella SD.
 */
export function quadratiniNec(r, nomeOggetto = r.nome) {
  const parte = r.nome !== nomeOggetto ? r.nome.slice(nomeOggetto.length).trim() : '';
  const etichetta = `${r.unita === 'Lx' ? 'Riserva' : 'NEC'}${parte ? ` ${parte}` : ''}`;
  if (r.massimo <= 50) return { etichetta, caselle: r.massimo, perCasella: 1, unita: r.unita, massimo: r.massimo };
  const perCasella = r.massimo / 10;
  return { etichetta, caselle: 10, perCasella, unita: r.unita, massimo: r.massimo };
}

export function inventarioStampa(s, dati, creditiIniziali = null) {
  const eq = s.equipaggiamento;
  const integrita = new Map((eq?.integrita ?? []).map((x) => [x.uid, x]));
  // A.49, §5.17: condizione dell'arma, i gradi da cerchiare (distinta dai PI)
  const condizioni = (dati.regole.condizioni_armi?.elenco ?? []).map((c) => c.nome);
  const righe = (eq?.oggetti ?? []).map((o) => {
    const q = o.voce.quantita ?? 1;
    const p = pesoVoce(o);
    const x = integrita.get(o.uid);
    return {
      uid: o.uid,
      sezione: sezioneInventario(o)?.id ?? 'altro',
      nome: `${o.nome}${q > 1 ? ` ×${q}` : ''}`,
      note: tronca(String(o.voce.note ?? '').trim(), LIMITI_STAMPA.frase),
      costo: Number.isInteger(o.def?.costo) ? crediti(o.def.costo) : '—',
      qualita: x?.qualita ?? o.def?.qualita ?? '—',
      peso: p === null ? 'da def.' : kg(p * q),
      stato: statoInventarioStampa(o.voce.stato),
      piMax: x?.piMax ?? null,
      ps: x?.ps ?? null,
      condizioni: ['arma_ravvicinata', 'arma_distanza'].includes(o.tipo) && condizioni.length ? condizioni : null,
      // NEC (Equipaggiamento 0.5, §5.4): quadratini della riserva, da annerire a matita
      nec: riserveNec([o.voce], dati).map((r) => quadratiniNec(r, o.nome)),
    };
  });
  const c = eq && dati.regole.carico ? calcolaCarico(s, null, dati) : null;
  return {
    creditiIniziali,
    carico: c ? { peso: kg(c.peso), parziale: c.parziale, senzaPeso: c.senzaPeso.length, ordinario: kg(c.soglie.ordinario), massimo: kg(c.soglie.massimo) } : null,
    stati: STATI_INVENTARIO_STAMPA.map(({ id, sigla, nome }) => ({ id, sigla, nome })),
    sezioni: SEZIONI_INVENTARIO.map((x) => ({ id: x.id, titolo: x.titolo, colore: x.colore, righe: righe.filter((r) => r.sezione === x.id) }))
      .filter((x) => x.righe.length),
  };
}

/**
 * Quadratini con un massimo (docs/layout-ss.md, §3; PV, PM, colpi, PI, applicazioni, cariche,
 * riserve): righe da 10 con uno stacco dopo la quinta casella e il cumulato a destra, in blocchi
 * da 5 righe (50 caselle). Le caselle oltre il massimo attuale si stampano in grigio: il tetto si
 * vede e un aumento di livello non richiede di ristampare. `compatto`: il blocco si accorcia alla
 * prima riga intera che contiene il massimo (colpi, PI, Punti Eroe); `bloccoInPiu`: un blocco
 * grigio in più, da aggiungere solo se lo spazio lo consente (lo decide la vista).
 * @returns {{ massimo, blocchi: [{ facoltativo, righe: [{ da, cumulato, caselle: boolean[] }] }] }}
 *   caselle: true = disponibile (nera), false = oltre il massimo (grigia)
 */
export const QUADRATINI = { perRiga: 10, stacco: 5, righePerBlocco: 5 };

export function schemaQuadratini(massimo, { compatto = false, bloccoInPiu = false, perRiga = QUADRATINI.perRiga, righeInPiu = 0 } = {}) {
  const { righePerBlocco } = QUADRATINI;
  const max = Math.max(0, Math.floor(Number(massimo) || 0));
  const righeMinime = Math.max(1, Math.ceil(max / perRiga));
  // compatto: le righe fino al massimo, più `righeInPiu` grigie (PV del foglio 3 a righe lunghe)
  const righeTotali = compatto ? righeMinime + righeInPiu : Math.ceil(righeMinime / righePerBlocco) * righePerBlocco;
  const riga = (r) => ({
    da: r * perRiga, cumulato: (r + 1) * perRiga,
    caselle: Array.from({ length: perRiga }, (_, k) => r * perRiga + k < max),
  });
  const blocchi = [];
  if (compatto) return { massimo: max, blocchi: [{ facoltativo: false, righe: Array.from({ length: righeTotali }, (_, k) => riga(k)) }] };
  for (let r = 0; r < righeTotali; r += righePerBlocco) {
    blocchi.push({ facoltativo: false, righe: Array.from({ length: Math.min(righePerBlocco, righeTotali - r) }, (_, k) => riga(r + k)) });
  }
  if (bloccoInPiu && !compatto) blocchi.push({ facoltativo: true, righe: Array.from({ length: righePerBlocco }, (_, k) => riga(righeTotali + k)) });
  return { massimo: max, blocchi };
}

/**
 * Fogli della SS nell'ordine di stampa (docs/layout-ss.md, §5.1 e decisione 9.1): prima i sempre
 * presenti (numero fisso 1–4), poi quelli che si stampano solo con un contenuto. `presente`
 * (scheda, dati) dice se il foglio ha contenuto; `icona`: immagine del tab della SD (img/pagine/).
 * Inventario e Artefatti arrivano con i pezzi 1 e 5; Cibernetica e Veicoli restano fuori finché i
 * tab sono «In attesa del manuale» (regole.json → tab_in_arrivo).
 */
export const FOGLI = [
  { id: 'identita', sempre: true },
  { id: 'abilita', sempre: true },
  { id: 'combattimento', sempre: true },
  { id: 'inventario', sempre: true },
  { id: 'poteri', icona: 'magia' },
  { id: 'artefatti' },
  // foglio del lotto 3 (Equipaggiamento 0.5, cap. 7): in preparazione
  { id: 'cibernetica', presente: () => false },
  { id: 'veicoli', presente: (s, dati) => !dati.regole?.tab_in_arrivo?.veicoli },
];
const ID_FOGLI = FOGLI.map((f) => f.id);
/** Vecchi id dei fogli nelle preferenze salvate: il foglio Magia è diventato Poteri. */
const ALIAS_FOGLI = { magia: 'poteri' };

/** Icona del foglio: quella del tab della SD (Poteri usa per ora quella della Magia). */
export const iconaFoglio = (id) => FOGLI.find((f) => f.id === id)?.icona ?? id;

/**
 * Fogli preparati → nell'ordine di FOGLI, senza quelli vuoti (Cibernetica e Veicoli finché i tab
 * sono in attesa del manuale), con il numero fisso: posizione fra i fogli del personaggio.
 */
export function ordinaFogli(fogli, dati) {
  const ordinati = ID_FOGLI.map((id) => fogli.find((f) => f.id === id)).filter(Boolean)
    .filter((f) => FOGLI.find((x) => x.id === f.id).presente?.(null, dati) ?? true);
  return ordinati.map((f, i) => ({ ...f, numero: i + 1 }));
}

/**
 * Numerazione delle pagine (docs/layout-ss.md, §5.2): «foglio N» fisso (il numero del foglio fra
 * quelli del personaggio, anche se se ne stampano solo alcuni; «(segue)» nelle continuazioni) e
 * «pagina P di T» con le pagine davvero stampate.
 * @param pagine [{ id, seguito }] nell'ordine di stampa
 * @param fogli i fogli del personaggio (preparaStampa → fogli, con `numero`)
 * @returns [{ id, foglio, seguito, pagina, totale }]
 */
export function numeraPagine(pagine, fogli) {
  const numero = new Map(fogli.map((f) => [f.id, f.numero]));
  return pagine.map((p, i) => {
    const n = { id: p.id, foglio: numero.get(p.id) ?? null, seguito: !!p.seguito, pagina: i + 1, totale: pagine.length };
    // fogli a pagine proprie (il 3, ritocchi post-stampa): «pagina k/n» dentro il foglio, al posto di «(segue)»
    if (p.parti) {
      const stesse = pagine.filter((x) => x.id === p.id);
      Object.assign(n, { parte: stesse.indexOf(p) + 1, parti: stesse.length });
    }
    return n;
  });
}

/**
 * Testo del piè di pagina: «Nome · 8° livello · foglio 3 (segue) · pagina 4 di 9 · Dati: …»; per i
 * fogli a pagine proprie «foglio 3 · pagina 1/2 · 4 di 9».
 */
export function testoPiede(piede, n) {
  const foglio = n.parti ? `foglio ${n.foglio ?? '—'} · pagina ${n.parte}/${n.parti}` : `foglio ${n.foglio ?? '—'}${n.seguito ? ' (segue)' : ''}`;
  const pagina = n.parti ? `${n.pagina} di ${n.totale}` : `pagina ${n.pagina} di ${n.totale}`;
  return [piede.nome, `${piede.livello}° livello`, foglio, pagina,
    piede.versioni ? `Dati: ${piede.versioni}` : null].filter(Boolean).join(' · ');
}

/**
 * Preferenze di stampa del personaggio (salvate con il personaggio, non sono regole):
 * - magia: 'elenco' (solo la prima pagina del foglio Poteri e il seguito dell'indice) oppure
 *   'completo' (anche le schede complete degli incantesimi). La chiave resta «magia» (§5.3):
 *   nessuna migrazione del file del personaggio;
 * - fogli: id dei fogli da stampare, o null = tutti; un vecchio «magia» si legge «poteri».
 */
export const SCELTE_MAGIA = ['elenco', 'completo'];
export const OPZIONI_STAMPA_PREDEFINITE = { fogli: null, magia: 'elenco' };

/** Opzioni di stampa ripulite: valori sconosciuti → predefiniti. */
export function normalizzaOpzioniStampa(o) {
  const x = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const scelti = Array.isArray(x.fogli) ? x.fogli.map((id) => ALIAS_FOGLI[id] ?? id) : null;
  const fogli = scelti ? ID_FOGLI.filter((id) => scelti.includes(id)) : null;
  return {
    fogli: fogli && fogli.length ? fogli : null,
    magia: SCELTE_MAGIA.includes(x.magia) ? x.magia : OPZIONI_STAMPA_PREDEFINITE.magia,
  };
}

/** I fogli da stampare secondo le opzioni (il foglio Poteri esiste solo con la magia). */
export function fogliDaStampare(fogli, opzioni) {
  const o = normalizzaOpzioniStampa(opzioni);
  return o.fogli ? fogli.filter((f) => o.fogli.includes(f.id)) : fogli;
}

/** Numero di incantesimi nei gruppi del foglio Poteri. */
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

const TITOLI_TAB = { identita: 'Identità', abilita: 'Abilità', combattimento: 'Combattimento', poteri: 'Poteri' };

/**
 * Dati delle tab della scheda digitale (roadmap §3): gli stessi fogli della stampa, senza
 * troncamenti, più Progressione e controllo §2.17 nella tab Identità. I dati di Poteri (la Magia)
 * ci sono solo con accesso agli incantesimi.
 * @returns {{ completa, errori, scheda, tab: {id, titolo, dati}[] }}
 */
export function preparaTab(personaggio, dati, { sessione = null } = {}) {
  const st = preparaStampa(personaggio, dati, { completo: true, sessione });
  const p = migraPersonaggio(personaggio);
  // la SD ha i suoi tab Inventario e Artefatti (src/ui/tab.js): i fogli di stampa non diventano tab
  const tab = st.fogli.filter((f) => !['inventario', 'artefatti'].includes(f.id)).map((f) => ({ id: f.id, titolo: TITOLI_TAB[f.id], dati: { ...f.dati } }));
  const identita = tab.find((t) => t.id === 'identita');
  if (identita) {
    identita.dati.progressione = st.scheda.progressione ?? [];
    identita.dati.checklist = checklist(p.creazione, dati);
  }
  return { completa: st.completa, errori: st.errori, scheda: st.scheda, tab };
}
