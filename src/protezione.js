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
    if (o.fuoriCatalogo || (o.voce.quantita ?? 1) !== 1 || !tipi.has(o.tipo) || o.def?.modifica_elmetto) continue;
    const piMax = o.def?.pi ?? o.voce.personalizzato?.pi;
    if (!Number.isInteger(piMax) || piMax <= 0) continue;
    const qualita = o.def?.qualita ?? null;
    out.push({ uid: o.uid, nome: o.nome, tipo: o.tipo, piMax, qualita, ps: o.def?.ps_int ?? ps[qualita] ?? null });
  }
  return out;
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
 *   valori: [{ id, etichetta, valore, principale? }], esclusi: [{ etichetta, motivo }] }}
 */
export function calcolaAR(equip, dati, { talenti = [], accesi = new Set(), rotti = new Set(), tecniche = [] } = {}) {
  const R = dati.regole.ar ?? {};
  const voci = [];
  const esclusi = [];
  const protezioni = equip?.protezioni ?? [];
  const arDi = (p) => ({ totale: intero(p.ar?.totale), magica: intero(p.ar?.magica) });

  // armatura: con due armature (avviso nel motore) vale la maggiore; il kit di rinforzo a 0 PI perde il suo +AR (A.45)
  const armature = protezioni.filter((p) => p.tipo === 'armatura' && p.ar);
  const armatureUsabili = [];
  for (const p of armature) {
    if (rotti.has(p.uid)) { esclusi.push({ etichetta: p.nome, motivo: 'Rotta (0 PI): non dà AR' }); continue; }
    const a = arDi(p);
    if (p.rinforzo && p.arKit && rotti.has(p.rinforzo.uid)) {
      a.totale -= p.arKit;
      esclusi.push({ etichetta: p.rinforzo.nome, motivo: 'Rotto (0 PI): il suo +AR non vale' });
    }
    armatureUsabili.push({ p, a });
  }
  const scegli = (lista, regola) => (regola === 'somma' ? lista : lista.length ? [lista.reduce((m, x) => (x.a.totale > m.a.totale ? x : m))] : []);
  for (const { p, a } of scegli(armatureUsabili, R.cumulo?.armatura)) {
    voci.push({ etichetta: p.rinforzo && !rotti.has(p.rinforzo.uid) ? `${p.nome} + ${p.rinforzo.nome}` : p.nome, ...a, fonte: 'armatura', uid: p.uid });
  }

  // scudo imbracciato: vale il contributo maggiore (§7.4)
  const scudi = protezioni.filter((p) => p.tipo === 'scudo' && p.ar).filter((p) => {
    if (rotti.has(String(p.uid).split(':')[0])) { esclusi.push({ etichetta: p.nome, motivo: 'Rotto (0 PI): non dà AR' }); return false; }
    return true;
  }).map((p) => ({ p, a: arDi(p) }));
  for (const { p, a } of scegli(scudi, R.cumulo?.scudo)) voci.push({ etichetta: p.nome, ...a, fonte: 'scudo', uid: p.uid });

  // effetti «ar» degli oggetti in uso: generali sempre, situazionali con la condizione accesa
  for (const e of (equip?.effettiOggetti ?? []).filter((x) => x.tipo === 'ar')) {
    if (rotti.has(e.uid)) continue;
    if (e.ambito === 'situazionale' && !accesi.has(e.uid)) continue;
    voci.push({ etichetta: `${e.oggetto}${e.ambito === 'situazionale' ? ' (condizione attiva)' : ''}`, totale: e.valore, magica: intero(e.magica), fonte: 'effetto', uid: e.uid });
  }

  // Talenti passivi (Corazza Potenziata, Giocatore §3.9.5): una volta sola, con la protezione richiesta
  const nomi = new Set(talenti);
  // A.48: Corazza Potenziata vuole un'armatura o uno scudo Artefatto, utilizzabili e con almeno 1 PI
  const artefattiUsabili = protezioni.filter((p) => (p.tipo === 'armatura' || p.tipo === 'scudo') && p.artefatto && !rotti.has(String(p.uid).split(':')[0]));
  for (const t of R.talenti ?? []) {
    if (!nomi.has(t.talento)) continue;
    const richiesta = t.richiede === 'armatura' ? armatureUsabili.length > 0 : t.richiede === 'protezione_artefatto' ? artefattiUsabili.length > 0 : true;
    if (richiesta) voci.push({ etichetta: t.talento, totale: t.totale ?? 0, magica: t.magica ?? 0, fonte: 'talento', uid: null });
    else if (t.richiede === 'protezione_artefatto') esclusi.push({ etichetta: t.talento, motivo: 'serve un’armatura o uno scudo Artefatto Mistico o TecnoMistico, utilizzabile (A.48)' });
  }
  // A.48: Tecniche Interiori accese al tavolo («tecnica:<id>» fra le condizioni); quelle «contro» un
  // tipo di attacco (Pelle di Rinoceronte: ravvicinato) danno un valore a parte
  const tecnicheContro = [];
  const possedute = new Set(tecniche);
  for (const t of R.tecniche ?? []) {
    if (!possedute.has(t.tecnica) || !accesi.has(`tecnica:${t.tecnica}`)) continue;
    const nome = dati.tecniche_interiori?.tecniche?.find((x) => x.id === t.tecnica)?.nome ?? t.tecnica;
    if (t.contro) tecnicheContro.push({ contro: t.contro, valore: t.totale, fonte: nome });
    else voci.push({ etichetta: `${nome} (${t.durata})`, totale: t.totale, magica: t.magica, fonte: 'tecnica', uid: null });
  }

  const totale = voci.reduce((s, v) => s + v.totale, 0);
  const magica = Math.min(totale, voci.reduce((s, v) => s + v.magica, 0));

  // AR contro un tipo di danno (Antiesplosione): per ogni tipo vale il maggiore fra scudo e armatura
  const perContro = new Map();
  for (const e of (equip?.effettiOggetti ?? []).filter((x) => x.tipo === 'ar_contro')) {
    if (rotti.has(e.uid)) continue;
    const x = perContro.get(e.contro);
    if (!x || e.valore > x.valore) perContro.set(e.contro, { contro: e.contro, valore: e.valore, fonte: e.oggetto });
  }
  for (const x of tecnicheContro) {
    const y = perContro.get(x.contro);
    perContro.set(x.contro, y ? { ...y, valore: y.valore + x.valore, fonte: `${y.fonte}, ${x.fonte}` } : x);
  }
  const contro = [...perContro.values()].map((x) => ({ ...x, totale: totale + x.valore }));

  const valori = [
    { id: 'totale', etichetta: R.etichette?.totale ?? 'AR', valore: totale, principale: true },
    { id: 'magica', etichetta: R.etichette?.magica ?? 'contro Etereo', valore: magica },
    ...contro.map((c) => ({ id: `contro:${c.contro}`, etichetta: `contro ${c.contro}`, valore: c.totale })),
  ];
  return { totale, magica, voci, contro, valori, esclusi };
}

/** «Armatura X +3 · Scudo Y +2 (di cui 1 magica)»: provenienza dell'AR in una riga. */
export function testoProvenienzaAR(ar) {
  if (!ar.voci.length) return 'nessuna protezione';
  return ar.voci.map((v) => `${v.etichetta} ${v.totale >= 0 ? '+' : '−'}${Math.abs(v.totale)}${v.magica ? ` (di cui ${v.magica} magica)` : ''}`).join(' · ');
}
