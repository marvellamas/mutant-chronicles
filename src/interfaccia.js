// Funzioni pure per la scheda digitale (SD): colore delle barre di PV e PM e dati del riquadro
// «Condizioni attive» della tab Abilità. Le soglie stanno in regole.json → interfaccia.

/**
 * Colore della barra di un valore attuale rispetto al massimo: 'verde' sopra la soglia alta,
 * 'rosso' sotto quella bassa, 'giallo' fra le due (comprese). null se il massimo non c'è.
 * @param {{verde_sopra: number, rosso_sotto: number}} soglie frazioni da 0 a 1
 */
export function colore(attuale, massimo, soglie) {
  if (!Number.isFinite(attuale) || !Number.isFinite(massimo) || massimo <= 0) return null;
  const f = attuale / massimo;
  if (f > soglie.verde_sopra) return 'verde';
  if (f < soglie.rosso_sotto) return 'rosso';
  return 'giallo';
}

/** Larghezza della barra in percentuale, fra 0 e 100. */
export function riempimento(attuale, massimo) {
  if (!Number.isFinite(attuale) || !Number.isFinite(massimo) || massimo <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, attuale / massimo)) * 100);
}

const segno = (n) => (n > 0 ? `+${n}` : `−${-n}`);
const elenco = (voci) => (voci.length > 1 ? `${voci.slice(0, -1).join(', ')} e ${voci.at(-1)}` : voci[0] ?? '');
// «a» davanti a consonante, «ad» davanti ad «a» (ad attacchi, ad Atletica)
const a = (testo) => (/^[aA]/.test(testo) ? `ad ${testo}` : /^Prove /.test(testo) ? `alle ${testo}` : `a ${testo}`);

/** Testo di un effetto di condizione (regole.json → stati.elenco[].effetto, ferite, affaticamento). */
function testoEffetto(e, dati) {
  const parti = [];
  const abilita = dati.abilita.abilita;
  if (e.va !== undefined && e.va === e.salvezze) parti.push(`${segno(e.va)} a tutte le Abilità e Salvezze`);
  else {
    if (e.va) parti.push(`${segno(e.va)} a tutte le Abilità`);
    if (e.salvezze) parti.push(`${segno(e.salvezze)} alle Salvezze`);
  }
  for (const [cat, v] of Object.entries(e.va_categorie ?? {})) {
    parti.push(`${segno(v)} alle Abilità ${cat === 'Ravvicinato' ? 'ravvicinate' : `della categoria ${cat}`} (${elenco(abilita.filter((x) => x.categoria === cat).map((x) => x.nome))})`);
  }
  for (const [nome, v] of Object.entries(e.va_abilita ?? {})) parti.push(`${segno(v)} ${a(nome)}`);
  for (const [g, v] of Object.entries(e.va_gruppi ?? {})) {
    parti.push(`${segno(v)} alle Prove ${g === 'fisiche_ravvicinate' ? 'fisiche ravvicinate' : g === 'vista' ? 'che richiedono la vista' : g === 'udito' ? 'basate sull’udito' : g} (${elenco(dati.regole.categorie_prove?.[g] ?? [])})`);
  }
  return parti.join('; ');
}

/**
 * Voci del riquadro «Condizioni attive» (tab Abilità): prima le condizioni di sessione (Ferite,
 * Affaticamento, Stati con effetto), poi l'equipaggiamento che tocca Abilità e attacchi (armature:
 * Agilità, penalità agli attacchi, penalità proprie del modello, FOR insufficiente), gli effetti
 * generali degli oggetti e quelli situazionali con la condizione accesa. Gli effetti d'uso specifico
 * (lancio con Potere, tracce, pronto soccorso…) stanno in voci a parte con `uso`: non cambiano il VA.
 * Vuoto quando non c'è nulla: il riquadro non si mostra.
 * @returns {{fonte: 'sessione'|'equipaggiamento'|'oggetto'|'uso', nome, testo, verso: 'malus'|'bonus', uso?, vedi?}[]}
 */
export function condizioniAttiveAbilita(scheda, dati) {
  const out = [];
  for (const c of scheda.condizioni ?? []) {
    const testo = testoEffetto(c.effetto, dati);
    if (!testo) continue;
    const nome = c.fonte === 'affaticamento' ? `${c.etichetta} (Affaticamento)` : c.fonte === 'corruzione' ? `${c.etichetta} (Corruzione)` : c.fonte === 'carico' ? `${c.etichetta} (carico, §5.2.6)` : c.etichetta;
    out.push({ fonte: 'sessione', nome, testo, verso: versoDi(c.effetto) });
  }
  // usi specifici degli Stati (A Terra: equilibrio; Assordato: udito): non cambiano il VA
  for (const c of scheda.condizioni ?? []) {
    for (const e of c.usi ?? []) {
      const dove = e.abilita ? a(e.abilita) : `alle Prove ${e.prove === 'udito' ? 'basate sull’udito' : e.prove} (${elenco(dati.regole.categorie_prove?.[e.prove] ?? [])})`;
      out.push({ fonte: 'uso', nome: c.etichetta, testo: `${segno(e.valore)} ${dove}`, verso: e.valore < 0 ? 'malus' : 'bonus', uso: e.uso, vedi: 'Abilità' });
    }
  }
  const eq = scheda.equipaggiamento;
  const armature = dati.equipaggiamento?.file?.armature ?? {};
  const agilita = armature.abilita_agilita ?? [];
  const difese = armature.abilita_difese ?? 'Difese';
  for (const p of eq?.protezioni ?? []) {
    if (p.tipo !== 'armatura') continue;
    const pen = p.penalita ?? {};
    // gruppi per valore: «−2 ad attacchi, Atletica e Furtività»
    const perValore = new Map();
    const aggiungi = (v, bersaglio) => { if (v) (perValore.get(v) ?? perValore.set(v, []).get(v)).push(bersaglio); };
    if (pen.attacchi_ravvicinati && pen.attacchi_ravvicinati === pen.attacchi_distanza) aggiungi(pen.attacchi_ravvicinati, 'attacchi');
    else {
      aggiungi(pen.attacchi_ravvicinati, 'attacchi ravvicinati');
      aggiungi(pen.attacchi_distanza, 'attacchi a distanza');
    }
    for (const x of agilita) aggiungi(pen.agilita, x);
    for (const [x, v] of Object.entries(pen.abilita ?? {})) aggiungi(v, x);
    const parti = [...perValore].map(([v, bersagli]) => `${segno(v)} ${a(elenco(bersagli))}`);
    // §7.1.6, §7.11.1: la FOR mancante pesa su Agilità, Difese e attacchi
    if (p.forMancante) parti.push(`${segno(-p.forMancante)} per FOR insufficiente ${a(elenco([...agilita, difese, 'attacchi']))}`);
    if (!parti.length) continue;
    const nome = p.rinforzo ? `${p.nome} + ${p.rinforzo.nome}` : p.nome;
    const valori = [...perValore.keys(), p.forMancante ? -p.forMancante : 0];
    out.push({ fonte: 'equipaggiamento', nome, testo: parti.join('; '), verso: valori.some((v) => v < 0) ? 'malus' : 'bonus' });
  }
  // effetti degli oggetti (docs/effetti-oggetti.md)
  const effetti = eq?.effettiOggetti ?? [];
  const verso = (v) => (v < 0 ? 'malus' : 'bonus');
  // solo gli effetti sui VA delle Abilità (AR, Contromisure, Iniziativa… stanno altrove)
  const suAbilita = (x) => (x.tipo ?? 'va') === 'va';
  for (const e of effetti.filter((x) => x.ambito === 'generale' && suAbilita(x))) out.push({ fonte: 'equipaggiamento', nome: e.oggetto, testo: `${segno(e.valore)} ${a(e.abilita)}`, verso: verso(e.valore) });
  for (const e of scheda.oggettiAccesi ?? []) out.push({ fonte: 'oggetto', nome: `${e.oggetto} (condizione attiva)`, testo: `${segno(e.valore)} ${a(e.abilita)}`, verso: verso(e.valore) });
  for (const e of effetti.filter((x) => x.ambito === 'uso_specifico' && suAbilita(x))) {
    out.push({ fonte: 'uso', nome: e.oggetto, testo: `${segno(e.valore)} ${a(e.abilita)}`, verso: verso(e.valore), uso: e.uso, vedi: e.uso === 'lancio' ? 'Magia' : 'Abilità' });
  }
  return out;
}

function versoDi(e) {
  const valori = [e.va, e.salvezze, ...Object.values(e.va_categorie ?? {}), ...Object.values(e.va_abilita ?? {}), ...Object.values(e.va_gruppi ?? {})].filter((v) => typeof v === 'number');
  return valori.some((v) => v < 0) ? 'malus' : 'bonus';
}
