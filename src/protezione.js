// AR del personaggio e Punti Integrità degli oggetti (docs/ricognizione-ar-pi.md). Funzioni pure.
//
// AR: un valore unico «AR totale, di cui magica» (Giocatore §5.13, §5.24; Armamenti §7.11): contro
// il danno Naturale e Magico vale il totale, contro l'Etereo soltanto la componente magica. Le
// regole di cumulo stanno in regole.json → ar: armatura (con il suo kit di rinforzo, §7.11.2), un
// solo scudo imbracciato (§7.4), niente elmetto (§7.21.1), effetti «ar» degli oggetti (anche
// situazionali, con l'interruttore al tavolo), Talenti passivi. Gli «ar_contro» (Antiesplosione,
// §7.11.4, §7.4.3) danno un valore a parte contro quel tipo di danno.
//
// PI: massimi dalla scheda del catalogo (`pi`), attuali nella sessione. A 0 PI l'oggetto è Rotto
// e non si può usare finché non è riparato (Armamenti §7.2.1, Equipaggiamento §1.7): regole.json
// → integrita.

import { riga, sommaRighe } from './provenienza.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const intero = (v) => (Number.isInteger(v) ? v : 0);

/**
 * Oggetti della lista con PI da tracciare: [{ uid, nome, tipo, piMax, qualita, ps }].
 * Solo voci del catalogo (o personalizzate) con `pi`, dei tipi di regole.json → integrita.tipi_tracciati,
 * con quantità 1. Le modifiche d'elmetto condividono i PI dell'elmetto (§7.21.3): non hanno PI propri.
 * @param oggetti voci risolte (risolvi() di src/equipaggiamento.js)
 */
export function oggettiConPi(oggetti, dati) {
  const r = dati.regole.integrita ?? {};
  const tipi = new Set(r.tipi_tracciati ?? []);
  const ps = r.ps_per_qualita ?? {};
  const out = [];
  for (const o of oggetti) {
    if (o.fuoriCatalogo || !tipi.has(o.tipo) || o.def?.modifica_elmetto) continue;
    // A.47: PI del catalogo, oppure fissati dal Direttore per l'oggetto senza PI a catalogo
    const piMax = o.def?.pi ?? o.voce.pi_direttore ?? o.voce.personalizzato?.pi;
    if (!Number.isInteger(piMax) || piMax <= 0) continue;
    const qualita = o.def?.qualita ?? null;
    const quantita = o.voce.quantita ?? 1;
    out.push({
      uid: o.uid, nome: o.nome, tipo: o.tipo, piMax, qualita, ps: o.def?.ps_int ?? ps[qualita] ?? null, costo: Number.isFinite(o.def?.costo) ? o.def.costo : null,
      // A.47: esemplari identici raggruppati finché integri (nessun PI in sessione); «Danneggia uno» li separa
      ...(quantita > 1 ? { gruppo: quantita } : {}),
      ...(o.def?.pi === undefined || o.def?.pi === null ? { daDirettore: Number.isInteger(o.voce.pi_direttore) } : {}),
    });
  }
  return out;
}

/**
 * Oggetti della lista senza PI a catalogo (A.47), fra i tipi tracciati: il Direttore può fissarne i PI
 * in modalità tavolo («pi_direttore» della voce). Nessun valore predefinito, nemmeno 0.
 */
export function oggettiSenzaPi(oggetti, dati) {
  const tipi = new Set(dati.regole.integrita?.tipi_tracciati ?? []);
  return oggetti.filter((o) => !o.fuoriCatalogo && o.def && tipi.has(o.tipo) && !o.def.modifica_elmetto && !Number.isInteger(o.def.pi))
    .map((o) => ({ uid: o.uid, nome: o.nome, tipo: o.tipo, piDirettore: Number.isInteger(o.voce.pi_direttore) ? o.voce.pi_direttore : null }));
}

/** Etichetta della soglia di Integrità (regole.json → integrita.soglie): { etichetta, effetto } o null. */
export function statoIntegrita(attuali, massimi, dati) {
  if (!Number.isInteger(attuali) || !Number.isInteger(massimi)) return null;
  const soglie = [...(dati.regole.integrita?.soglie ?? [])].sort((a, b) => a.pi_fino_a - b.pi_fino_a);
  return soglie.find((s) => attuali <= s.pi_fino_a) ?? null;
}

/** Uid degli oggetti Rotti nella sessione (PI attuali a 0 o sotto la soglia «inutilizzabile»). */
export function oggettiRotti(sessione, dati) {
  const pi = isOggetto(sessione?.integrita) ? sessione.integrita : {};
  const soglie = dati.regole.integrita?.soglie ?? [];
  return new Set(Object.entries(pi).filter(([, v]) => soglie.some((s) => s.effetto === 'inutilizzabile' && Number.isInteger(v) && v <= s.pi_fino_a)).map(([uid]) => uid));
}

/**
 * AR del personaggio.
 * @param equip risultato di calcolaEquipaggiamento (protezioni, effettiOggetti)
 * @param opz { talenti: nomi dei Talenti di Classe, accesi: Set degli uid con la condizione accesa
 *   (effetti situazionali), rotti: Set degli uid a 0 PI }
 * @returns {{ totale, magica, voci: [{ etichetta, totale, magica, fonte, uid }], contro: [{ contro, valore, totale, fonte }],
 *   valori: [{ id, etichetta, valore, principale?, provenienza: { totale, righe } }], esclusi: [{ etichetta, motivo }] }}
 * `provenienza` (src/provenienza.js): i contributi di ogni valore, uno per riga, anche quelli a 0
 * (elmetto) o che non contano (Rotto, non cumulabile, «solo ravvicinato»).
 */
export function calcolaAR(equip, dati, { talenti = [], accesi = new Set(), rotti = new Set(), tecniche = [] } = {}) {
  const R = dati.regole.ar ?? {};
  const voci = [];
  const esclusi = [];
  const protezioni = equip?.protezioni ?? [];
  const arDi = (p) => ({ totale: intero(p.ar?.totale), magica: intero(p.ar?.magica) });
  // righe della provenienza: `magica` è la parte magica della riga (per il valore contro Etereo)
  const righe = [];
  const ROTTO = 'Rotto: non conta';
  /** Protezione in righe: parte non magica, rinforzo, parte magica («+1 magica, Armatura Marte»). */
  const righeProtezione = (p, a, nota, kit = 0) => [
    riga(p.nome, a.totale - a.magica - kit, nota),
    ...(kit ? [riga(p.rinforzo.nome, kit, 'rinforzo (§7.11.2)')] : []),
    ...(a.magica ? [riga(`magica, ${p.nome}`, a.magica, null, { magica: a.magica })] : []),
  ];
  const nonConta = (lista, nota, barrato = false) => lista.map((r) => ({ ...r, escluso: true, nota, ...(barrato ? { barrato: true } : {}) }));

  // armatura: con due armature (avviso nel motore) vale la maggiore; il kit di rinforzo a 0 PI perde il suo +AR (A.45)
  const armature = protezioni.filter((p) => p.tipo === 'armatura' && p.ar);
  const armatureUsabili = [];
  for (const p of armature) {
    if (rotti.has(p.uid)) {
      esclusi.push({ etichetta: p.nome, motivo: 'Rotta (0 PI): non dà AR' });
      righe.push(...nonConta(righeProtezione(p, arDi(p), null), ROTTO, true));
      continue;
    }
    const a = arDi(p);
    let kitRotto = null;
    if (p.rinforzo && p.arKit && rotti.has(p.rinforzo.uid)) {
      a.totale -= p.arKit;
      esclusi.push({ etichetta: p.rinforzo.nome, motivo: 'Rotto (0 PI): il suo +AR non vale' });
      kitRotto = { ...riga(p.rinforzo.nome, p.arKit, ROTTO), escluso: true, barrato: true };
    }
    armatureUsabili.push({ p, a, kitRotto });
  }
  const scegli = (lista, regola) => (regola === 'somma' ? lista : lista.length ? [lista.reduce((m, x) => (x.a.totale > m.a.totale ? x : m))] : []);
  const armatureScelte = scegli(armatureUsabili, R.cumulo?.armatura);
  for (const x of armatureUsabili) {
    const { p, a, kitRotto } = x;
    const kit = p.rinforzo && !kitRotto ? p.arKit : 0;
    if (!armatureScelte.includes(x)) { righe.push(...nonConta(righeProtezione(p, a, null, kit), 'non si somma: vale l’armatura maggiore (§7.11.2)')); continue; }
    voci.push({ etichetta: p.rinforzo && !rotti.has(p.rinforzo.uid) ? `${p.nome} + ${p.rinforzo.nome}` : p.nome, ...a, fonte: 'armatura', uid: p.uid });
    righe.push(...righeProtezione(p, a, 'armatura', kit), ...(kitRotto ? [kitRotto] : []));
  }
  // §7.21.1: gli elmetti indossati non danno AR, neppure magica (riga a 0: l'app li ha visti)
  for (const p of protezioni.filter((x) => x.tipo === 'elmetto')) righe.push(riga(p.nome, 0, 'elmetto: nessuna AR (§7.21.1)'));

  // rinforzi indossati da soli (soprabiti e mantelli, richiesta di Davide del 02/10; regole.json →
  // rinforzi.da_solo, TODO(Davide) A.80): §7.23.4 «non costituiscono un profilo autonomo di armatura»
  const RD = dati.regole?.rinforzi?.da_solo ?? {};
  for (const x of equip?.rinforziDaSoli ?? []) {
    if (rotti.has(x.uid)) { righe.push({ ...riga(x.nome, x.ar, ROTTO), escluso: true, barrato: true }); continue; }
    if (x.conArmatura && RD.con_armatura_indossata !== 'vale') {
      righe.push({ ...riga(x.nome, x.ar, 'indossato da solo con un’armatura: non conta, va montato (§7.11.2)'), escluso: true });
    } else if (RD.ar === 'propria') {
      voci.push({ etichetta: `${x.nome} (da solo)`, totale: x.ar, magica: 0, fonte: 'rinforzo', uid: x.uid });
      righe.push(riga(x.nome, x.ar, 'rinforzo indossato da solo (regole.json → rinforzi)'));
    } else {
      righe.push(riga(x.nome, 0, 'indossato da solo: nessun profilo autonomo di armatura (§7.23.4)'));
    }
  }

  // scudo imbracciato: vale il contributo maggiore (§7.4)
  const scudi = protezioni.filter((p) => p.tipo === 'scudo' && p.ar).filter((p) => {
    if (rotti.has(String(p.uid).split(':')[0])) {
      esclusi.push({ etichetta: p.nome, motivo: 'Rotto (0 PI): non dà AR' });
      righe.push(...nonConta(righeProtezione(p, arDi(p), null), ROTTO, true));
      return false;
    }
    return true;
  }).map((p) => ({ p, a: arDi(p) }));
  const scudiScelti = scegli(scudi, R.cumulo?.scudo);
  for (const x of scudi) {
    const { p, a } = x;
    if (!scudiScelti.includes(x)) { righe.push(...nonConta(righeProtezione(p, a, null), 'due scudi non si sommano: vale il maggiore (§7.4)')); continue; }
    voci.push({ etichetta: p.nome, ...a, fonte: 'scudo', uid: p.uid });
    righe.push(...righeProtezione(p, a, 'scudo imbracciato (§7.4)'));
  }

  // effetti «ar» degli oggetti in uso: generali sempre, situazionali con la condizione accesa
  for (const e of (equip?.effettiOggetti ?? []).filter((x) => x.tipo === 'ar')) {
    if (e.ambito === 'situazionale' && !accesi.has(e.uid)) continue;
    const r = riga(e.oggetto, e.valore, e.ambito === 'situazionale' ? 'condizione accesa' : 'effetto dell’oggetto', e.magica ? { magica: intero(e.magica) } : {});
    if (rotti.has(e.uid)) { righe.push({ ...r, escluso: true, barrato: true, nota: ROTTO }); continue; }
    voci.push({ etichetta: `${e.oggetto}${e.ambito === 'situazionale' ? ' (condizione attiva)' : ''}`, totale: e.valore, magica: intero(e.magica), fonte: 'effetto', uid: e.uid });
    righe.push(r);
  }

  // Talenti passivi (Corazza Potenziata, Giocatore §3.9.5): una volta sola, con la protezione richiesta
  const nomi = new Set(talenti);
  // A.48: Corazza Potenziata vuole un'armatura o uno scudo Artefatto, utilizzabili e con almeno 1 PI
  const artefattiUsabili = protezioni.filter((p) => (p.tipo === 'armatura' || p.tipo === 'scudo') && p.artefatto && !rotti.has(String(p.uid).split(':')[0]));
  for (const t of R.talenti ?? []) {
    if (!nomi.has(t.talento)) continue;
    const richiesta = t.richiede === 'armatura' ? armatureUsabili.length > 0 : t.richiede === 'protezione_artefatto' ? artefattiUsabili.length > 0 : true;
    const r = riga(t.talento, t.totale ?? 0, `Talento${t.magica ? ', magica' : ''}`, t.magica ? { magica: t.magica } : {});
    if (richiesta) { voci.push({ etichetta: t.talento, totale: t.totale ?? 0, magica: t.magica ?? 0, fonte: 'talento', uid: null }); righe.push(r); }
    else if (t.richiede === 'protezione_artefatto') {
      esclusi.push({ etichetta: t.talento, motivo: 'serve un’armatura o uno scudo Artefatto Mistico o TecnoMistico, utilizzabile (A.48)' });
      righe.push({ ...r, escluso: true, nota: 'serve una protezione Artefatto utilizzabile (A.48)' });
    }
  }
  // A.48: Tecniche Interiori accese al tavolo («tecnica:<id>» fra le condizioni); quelle «contro» un
  // tipo di attacco (Pelle di Rinoceronte: ravvicinato) danno un valore a parte
  const tecnicheContro = [];
  const possedute = new Set(tecniche);
  for (const t of R.tecniche ?? []) {
    if (!possedute.has(t.tecnica) || !accesi.has(`tecnica:${t.tecnica}`)) continue;
    const nome = dati.tecniche_interiori?.tecniche?.find((x) => x.id === t.tecnica)?.nome ?? t.tecnica;
    if (t.contro) {
      tecnicheContro.push({ contro: t.contro, valore: t.totale, fonte: nome });
      righe.push({ ...riga(nome, t.totale, `solo ${t.contro}`), escluso: true, contro: t.contro });
    } else {
      voci.push({ etichetta: `${nome} (${t.durata})`, totale: t.totale, magica: t.magica, fonte: 'tecnica', uid: null });
      righe.push(riga(nome, t.totale, `Tecnica Interiore${t.magica ? ', magica' : ''}, ${t.durata}`, t.magica ? { magica: t.magica } : {}));
    }
  }

  const totale = voci.reduce((s, v) => s + v.totale, 0);
  const magica = Math.min(totale, voci.reduce((s, v) => s + v.magica, 0));

  // AR contro un tipo di danno (Antiesplosione): per ogni tipo vale il maggiore fra scudo e armatura
  const perContro = new Map();
  const righeContro = new Map();
  const aggiungiContro = (c, r) => (righeContro.get(c) ?? righeContro.set(c, []).get(c)).push(r);
  for (const e of (equip?.effettiOggetti ?? []).filter((x) => x.tipo === 'ar_contro')) {
    if (rotti.has(e.uid)) { aggiungiContro(e.contro, { ...riga(e.oggetto, e.valore, ROTTO), escluso: true, barrato: true }); continue; }
    const x = perContro.get(e.contro);
    if (!x || e.valore > x.valore) perContro.set(e.contro, { contro: e.contro, valore: e.valore, fonte: e.oggetto, uid: e.uid });
  }
  for (const e of (equip?.effettiOggetti ?? []).filter((x) => x.tipo === 'ar_contro' && !rotti.has(x.uid))) {
    const scelto = perContro.get(e.contro)?.uid === e.uid;
    aggiungiContro(e.contro, { ...riga(e.oggetto, e.valore, scelto ? `contro ${e.contro}` : 'non si somma: vale il maggiore fra scudo e armatura'), ...(scelto ? {} : { escluso: true }) });
  }
  for (const x of tecnicheContro) aggiungiContro(x.contro, riga(x.fonte, x.valore, `solo ${x.contro}`));
  for (const x of tecnicheContro) {
    const y = perContro.get(x.contro);
    perContro.set(x.contro, y ? { ...y, valore: y.valore + x.valore, fonte: `${y.fonte}, ${x.fonte}` } : x);
  }
  const contro = [...perContro.values()].map(({ uid: _u, ...x }) => ({ ...x, totale: totale + x.valore }));

  // provenienza per valore: il totale; la sola parte magica (contro Etereo); totale + il valore contro
  const righeMagiche = righe.filter((r) => r.magica && !r.escluso).map((r) => ({ ...r, valore: r.magica }));
  if (sommaRighe(righeMagiche) > magica) righeMagiche.push(riga('non oltre l’AR totale', magica - sommaRighe(righeMagiche)));
  const perValore = new Map([
    ['totale', righe],
    ['magica', righeMagiche.length ? righeMagiche : [riga('nessuna protezione magica', 0)]],
    ...contro.map((c) => [`contro:${c.contro}`, [...righe.filter((r) => r.contro !== c.contro), ...(righeContro.get(c.contro) ?? [])]]),
  ]);
  const pulisci = (r) => { const { magica: _m, contro: _c, ...x } = r; return x; };

  const valori = [
    { id: 'totale', etichetta: R.etichette?.totale ?? 'AR', valore: totale, principale: true },
    { id: 'magica', etichetta: R.etichette?.magica ?? 'contro Etereo', valore: magica },
    ...contro.map((c) => ({ id: `contro:${c.contro}`, etichetta: `contro ${c.contro}`, valore: c.totale })),
  ].map((v) => ({ ...v, provenienza: { totale: v.valore, righe: (perValore.get(v.id) ?? []).map(pulisci) } }));
  return { totale, magica, voci, contro, valori, esclusi };
}

/** «Armatura X +3 · Scudo Y +2 (di cui 1 magica)»: provenienza dell'AR in una riga. */
export function testoProvenienzaAR(ar) {
  if (!ar.voci.length) return 'nessuna protezione';
  return ar.voci.map((v) => `${v.etichetta} ${v.totale >= 0 ? '+' : '−'}${Math.abs(v.totale)}${v.magica ? ` (di cui ${v.magica} magica)` : ''}`).join(' · ');
}
