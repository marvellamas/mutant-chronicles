// Condizioni di sessione nei valori: Ferite (§5.14), Affaticamento (§5.19), Stati (§5.18) e carico
// (Giocatore §5.2.6, Equipaggiamento §1.6).
// Funzioni pure. Il valore EFFETTIVO = valore da regole + equipaggiamento + condizioni attive;
// il `totale` da regole non cambia (serve all'avanzamento) e la stampa resta a riposo.

import { descriviFerite } from './sessione.js';
import { calcolaCarico } from './carico.js';
import { calcolaAR, oggettiRotti } from './protezione.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Condizioni attive della sessione, con effetto strutturato:
 * [{ etichetta, fonte: 'ferite'|'affaticamento'|'stato'|'carico', effetto: { va, salvezze, va_categorie, va_abilita, va_gruppi } }].
 * Gli Stati senza `effetto` nei dati non compaiono: restano promemoria. Con la scheda (per il peso
 * dell'equipaggiamento e FOR) si aggiunge il carico, se supera la soglia ordinaria.
 */
export function condizioniAttive(sessione, dati, scheda = null) {
  if (!isOggetto(sessione)) return [];
  const r = dati.regole;
  const out = [];
  // §5.14: penalità a VA e Prove Salvezza (a che cosa si applica sta in regole.json)
  const ferita = descriviFerite(sessione.ferite, dati);
  if (sessione.ferite && ferita.penalita) out.push({ etichetta: `Ferita ${ferita.nome}`, fonte: 'ferite', effetto: perAmbiti(r.ferite.si_applica_a, ferita.penalita) });
  // §5.19: si applica solo la penalità dello Stato di Affaticamento attuale
  const aft = r.affaticamento.stati[sessione.affaticamento];
  if (aft?.penalita) out.push({ etichetta: aft.nome, fonte: 'affaticamento', effetto: perAmbiti(r.affaticamento.si_applica_a, aft.penalita) });
  // §5.18: solo gli Stati con effetti numerici nei dati; più Stati si sommano
  const attivi = new Set(Array.isArray(sessione.statiAttivi) ? sessione.statiAttivi : []);
  for (const s of r.stati.elenco) {
    if (!attivi.has(s.id) || !s.effetti?.length) continue;
    out.push({ etichetta: s.nome, fonte: 'stato', effetto: effettoDaEffetti(s.effetti), usi: s.effetti.filter((e) => e.ambito === 'uso_specifico') });
  }
  // §5.2.6: il Sovraccarico penalizza le Prove fisiche, compresi attacchi e Difese
  if (scheda && r.carico) {
    const c = calcolaCarico(scheda, sessione, dati);
    if (c.livello.effetto) out.push({ etichetta: c.livello.nome, fonte: 'carico', effetto: c.livello.effetto });
  }
  return out;
}

/**
 * Lista di effetti di uno Stato (schema degli effetti degli oggetti) → effetto di condizione
 * { va, salvezze, va_abilita, va_gruppi } per il VA generale. Gli usi specifici restano a parte.
 */
export function effettoDaEffetti(effetti) {
  const e = {};
  for (const x of effetti.filter((y) => y.ambito === 'generale')) {
    if (x.tipo === 'salvezza') e.salvezze = (e.salvezze ?? 0) + x.valore; // «tutte»: le quattro Prove Salvezza
    else if (x.prove === 'tutte') e.va = (e.va ?? 0) + x.valore;
    else if (x.prove) (e.va_gruppi ??= {})[x.prove] = (e.va_gruppi[x.prove] ?? 0) + x.valore;
    else if (x.abilita) (e.va_abilita ??= {})[x.abilita] = (e.va_abilita[x.abilita] ?? 0) + x.valore;
  }
  return e;
}

function perAmbiti(ambiti, valore) {
  const e = {};
  for (const a of ambiti ?? ['abilita', 'salvezze']) e[a === 'abilita' ? 'va' : a] = valore;
  return e;
}

/** Contributo di una condizione al VA di un'Abilità (0 se non la riguarda). */
export function effettoSuAbilita(effetto, abilita, dati) {
  const gruppi = dati.regole.categorie_prove ?? {};
  let v = effetto.va ?? 0;
  v += effetto.va_categorie?.[abilita.categoria] ?? 0;
  v += effetto.va_abilita?.[abilita.nome] ?? 0;
  for (const [g, x] of Object.entries(effetto.va_gruppi ?? {})) if ((gruppi[g] ?? []).includes(abilita.nome)) v += x;
  return v;
}

const voce = (etichetta, valore, fonte) => ({ etichetta, valore, fonte });
const somma = (voci) => voci.reduce((s, x) => s + x.valore, 0);
/** Parte «da regole» di una scomposizione: il riferimento per colore e segno ▼/▲ nella scheda. */
const daRegole = (voci) => somma(voci.filter((x) => x.fonte === 'regole'));

const meno = (n) => (n < 0 ? `−${-n}` : String(n));

/**
 * Scomposizione in una riga: «Furtività 9 = 11 (Valore da regole) − 2 (Ferita Importante)».
 * @param {{etichetta, valore}[]} voci
 */
export function formulaScomposizione(nome, voci) {
  const totale = somma(voci);
  const parti = voci.map((x, i) => (i === 0 ? `${meno(x.valore)} (${x.etichetta})` : `${x.valore < 0 ? '−' : '+'} ${Math.abs(x.valore)} (${x.etichetta})`));
  return `${nome} ${meno(totale)} = ${parti.join(' ')}`;
}

/**
 * Effetti degli oggetti su un'Abilità nella modalità tavolo (docs/effetti-oggetti.md). I generali
 * sono già nel VA con l'equipaggiamento; qui:
 * - situazionali: con la condizione dell'oggetto accesa entrano nel VA effettivo; spenti restano
 *   «disponibili» (nel tooltip);
 * - usi specifici: il VA generale non cambia; per ogni uso un valore a parte.
 * Giocatore §1.4.1: «Si applica un solo modificatore complessivo per la qualità degli strumenti
 * impiegati»: fra i bonus degli oggetti per la stessa Prova vale il maggiore; le penalità si sommano.
 */
function effettiOggettiAbilita(effetti, accesi, a) {
  const miei = effetti.filter((e) => e.abilita === a.nome && e.ambito !== 'generale');
  const situ = miei.filter((e) => e.ambito === 'situazionale');
  const on = situ.filter((e) => accesi.has(e.uid));
  const migliore = (lista) => lista.filter((e) => e.valore > 0).reduce((m, e) => (!m || e.valore > m.valore ? e : m), null);
  const bonusOn = migliore(on);
  const penalitaOn = on.filter((e) => e.valore < 0);
  const voci = [...(bonusOn ? [bonusOn] : []), ...penalitaOn].map((e) => voce(`${e.oggetto} (condizione attiva)`, e.valore, 'oggetto'));
  const nonCumulati = on.filter((e) => e.valore > 0 && e !== bonusOn);
  const disponibili = situ.filter((e) => !accesi.has(e.uid));
  const usi = new Map();
  for (const e of miei.filter((x) => x.ambito === 'uso_specifico')) (usi.get(e.uso) ?? usi.set(e.uso, []).get(e.uso)).push(e);
  return { voci, nonCumulati, disponibili, usi, bonusOn };
}

/** Valore di ogni uso specifico: dal VA effettivo, con un solo bonus degli strumenti (§1.4.1). */
function valoriUsi(usi, effettivo, bonusOn) {
  return [...usi].map(([uso, lista]) => {
    const bonus = lista.filter((e) => e.valore > 0).reduce((m, e) => (!m || e.valore > m.valore ? e : m), null);
    const penalita = lista.filter((e) => e.valore < 0).reduce((s, e) => s + e.valore, 0);
    const giaAcceso = bonusOn?.valore ?? 0;
    const valore = effettivo - giaAcceso + Math.max(giaAcceso, bonus?.valore ?? 0) + penalita;
    return {
      uso, valore, base: effettivo, modificatore: valore - effettivo,
      oggetti: lista.map((e) => ({ oggetto: e.oggetto, valore: e.valore, condizione: e.condizione ?? null, fonte: e.fonte ?? null, contato: e.valore < 0 || e === bonus })),
      assorbito: !!bonus && giaAcceso >= bonus.valore, permanente: lista.every((e) => e.permanente),
    };
  });
}

/** Voci delle condizioni per un'Abilità: [{ etichetta, valore, fonte }]. */
function vociCondizioniAbilita(condizioni, abilita, dati) {
  return condizioni.map((c) => voce(c.etichetta, effettoSuAbilita(c.effetto, abilita, dati), c.fonte)).filter((x) => x.valore);
}

/**
 * Aggiunge alla scheda i valori effettivi, sempre (senza sessione coincidono con quelli a riposo):
 * - abilita[i]: effettivo, daRegole, scomposizione (regole, equipaggiamento, condizioni);
 * - salvezze[id]: effettivo, daRegole, scomposizione;
 * - equipaggiamento.armi[i]: vaEffettivo, vaDaRegole, scomposizione; parata: vaEffettivo,
 *   distanzaEffettiva, vaDaRegole, scomposizione;
 * - equipaggiamento.protezioni[i].parata: ravvicinataEffettiva, distanzaEffettiva, daRegole,
 *   scomposizioneRavvicinata, scomposizioneDistanza;
 * - condizioni: le condizioni attive; carico: il carico trasportato (src/carico.js), con la sessione.
 * Ogni scomposizione è [{ etichetta, valore, fonte: 'regole'|'equipaggiamento'|'ferite'|'affaticamento'|'stato'|'carico' }].
 */
export function applicaCondizioni(scheda, sessione, dati) {
  const condizioni = condizioniAttive(sessione, dati, scheda);
  const perNome = new Map();
  // oggetti Rotti (0 PI, Armamenti §7.2.1): i loro effetti non valgono al tavolo
  const rotti = oggettiRotti(sessione, dati);
  const effettiOggetti = (scheda.equipaggiamento?.effettiOggetti ?? []).filter((e) => !rotti.has(e.uid));
  const accesi = new Set(isOggetto(sessione) && Array.isArray(sessione.condizioniOggetti) ? sessione.condizioniOggetti : []);
  scheda.abilita = scheda.abilita.map((a) => {
    const cond = vociCondizioniAbilita(condizioni, a, dati);
    const ogg = effettiOggettiAbilita(effettiOggetti, accesi, a);
    const scomposizione = [
      voce('Valore da regole', a.totale, 'regole'),
      ...(a.componentiEquip ?? (a.equip ? [voce('Equipaggiamento', a.equip, 'equipaggiamento')] : [])).filter((c) => !(c.effetto && rotti.has(c.uid))),
      ...ogg.voci,
      ...cond,
    ];
    const effettivo = somma(scomposizione);
    const x = {
      ...a, effettivo, daRegole: a.totale, scomposizione, condizioni: somma(cond),
      disponibili: ogg.disponibili, nonCumulati: ogg.nonCumulati, usiSpecifici: valoriUsi(ogg.usi, effettivo, ogg.bonusOn),
    };
    perNome.set(a.nome, x);
    return x;
  });
  scheda.oggettiAccesi = effettiOggetti.filter((e) => e.ambito === 'situazionale' && accesi.has(e.uid));

  for (const s of Object.values(scheda.salvezze ?? {})) {
    const cond = condizioni.filter((c) => c.effetto.salvezze).map((c) => voce(c.etichetta, c.effetto.salvezze, c.fonte));
    s.scomposizione = [voce('Valore da regole', s.totale, 'regole'), ...cond];
    s.effettivo = somma(s.scomposizione);
    s.daRegole = s.totale;
  }

  const eq = scheda.equipaggiamento;
  if (eq) {
    const condDi = (nome) => { const a = perNome.get(nome); return a ? vociCondizioniAbilita(condizioni, a, dati) : []; };
    const difese = eq.abilitaDifese ?? 'Difese';
    const condDifese = condDi(difese);
    for (const w of eq.armi) {
      const cond = condDi(w.abilita);
      w.scomposizione = [...(w.componenti ?? []).map((c) => voce(c.nome, c.valore, c.fonte ?? 'equipaggiamento')), ...cond];
      w.vaEffettivo = w.va === null ? null : w.va + somma(cond);
      w.vaDaRegole = w.va === null ? null : daRegole(w.scomposizione);
      if (w.parata) {
        w.parata.scomposizione = [...w.parata.componenti.map((c) => voce(c.nome, c.valore, c.fonte ?? 'equipaggiamento')), ...condDifese];
        w.parata.vaEffettivo = w.parata.va + somma(condDifese);
        w.parata.vaDaRegole = daRegole(w.parata.scomposizione);
        w.parata.distanzaEffettiva = w.parata.distanza === null || w.parata.distanza === undefined ? null : w.parata.distanza + somma(condDifese);
      }
    }
    // §7.4.11: Parata con lo Scudo = Difese (con l'equipaggiamento) + modificatori dello Scudo − FOR insufficiente
    const d = perNome.get(difese);
    for (const p of eq.protezioni) {
      if (!p.parata || !d) continue;
      const comuni = [voce(`VA ${difese}`, d.totale, 'regole'), ...(d.componentiEquip ?? []).map((c) => voce(c.etichetta, c.valore, 'equipaggiamento'))];
      const perDistanza = (k) => {
        const voci = [...comuni, voce(`${p.nome}, ${k === 'ravvicinata' ? 'ravvicinata' : 'a distanza'} (§7.4.11)`, p.parata.modificatori[k], 'equipaggiamento'),
          p.forMancante ? voce(`FOR insufficiente (${p.nome})`, -p.forMancante, 'equipaggiamento') : null].filter((x) => x && x.valore !== 0 || x?.fonte === 'regole');
        // se i conti a riposo non tornano (profili speciali) si tiene il valore calcolato come una voce sola
        const aRiposo = somma(voci) === p.parata[k] ? voci : [voce(`Parata di ${p.nome}`, p.parata[k], 'equipaggiamento')];
        return [...aRiposo, ...condDifese];
      };
      p.parata.scomposizioneRavvicinata = perDistanza('ravvicinata');
      p.parata.scomposizioneDistanza = perDistanza('distanza');
      p.parata.ravvicinataEffettiva = somma(p.parata.scomposizioneRavvicinata);
      p.parata.distanzaEffettiva = somma(p.parata.scomposizioneDistanza);
      p.parata.daRegole = d.totale;
    }
  }
  if (eq) {
    // AR al tavolo: effetti situazionali accesi, oggetti Rotti esclusi (docs/ricognizione-ar-pi.md)
    const talenti = (scheda.classi ?? []).flatMap((c) => (c.talenti ?? []).map((t) => t.nome));
    eq.arEffettiva = calcolaAR(eq, dati, { talenti, accesi, rotti });
    eq.rotti = [...rotti];
    for (const w of eq.armi) w.rotta = rotti.has(String(w.uid).split(':')[0]);
    for (const p of eq.protezioni) p.rotta = rotti.has(String(p.uid).split(':')[0]);
  }
  scheda.condizioni = condizioni;
  scheda.carico = isOggetto(sessione) && dati.regole.carico ? calcolaCarico(scheda, sessione, dati) : null;
  scheda.tavolo = valoriTavolo(scheda, sessione, dati);
  return scheda;
}

/**
 * Iniziativa, Movimento e Azioni effettivi per la modalità tavolo, con la scomposizione:
 * - Iniziativa (§2.14): Mod DES + Mod INT e i Talenti (scheda.vociIniziativa), tutti «da regole»;
 * - Movimento (§5.2): Passo, Corsa, Scatto da regole (Talenti compresi); MOV dell'armatura una volta
 *   sul budget di ogni modalità (Armamenti §7.11.1); Sovraccarico −2 Q e solo Passo (§5.2.6);
 *   Stati con `movimento` in regole.json (A Terra, Immobilizzato, Rallentato, Stordito, Svenuto, §5.5, §5.18);
 * - Azioni (§5.1): Principali e di Movimento per Round; Stati con `azioni` (Stordito, Svenuto).
 * Ogni valore: { effettivo, daRegole, scomposizione, note }; le modalità non disponibili hanno effettivo null.
 */
export function valoriTavolo(scheda, sessione, dati) {
  const r = dati.regole;
  const attivi = new Set(isOggetto(sessione) && Array.isArray(sessione.statiAttivi) ? sessione.statiAttivi : []);
  const stati = r.stati.elenco.filter((s) => attivi.has(s.id));

  const vociIni = (scheda.vociIniziativa ?? [{ etichetta: 'Iniziativa', valore: scheda.iniziativa ?? 0 }]).map((v) => voce(v.etichetta, v.valore, 'regole'));
  // effetti «iniziativa» dell'equipaggiamento in uso (Allerta tattica dell'elmetto, Armamenti §7.21.2)
  const vociIniEquip = (scheda.equipaggiamento?.iniziativa ?? []).map((v) => voce(v.etichetta, v.valore, 'equipaggiamento'));
  const iniziativa = { effettivo: somma([...vociIni, ...vociIniEquip]), daRegole: somma(vociIni), scomposizione: [...vociIni, ...vociIniEquip], note: [] };

  const base = scheda.movimento ?? {};
  const mov = scheda.equipaggiamento?.movimentoQ ?? 0;
  const carico = isOggetto(sessione) && r.carico ? (scheda.carico ?? calcolaCarico(scheda, sessione, dati)) : null;
  const liv = carico?.livello ?? null;
  const movimento = {};
  for (const modo of ['passo', 'corsa', 'scatto']) {
    const note = [];
    let voci = [voce(`${modo[0].toUpperCase()}${modo.slice(1)} da regole`, base[modo] ?? 0, 'regole')];
    if (mov) voci.push(voce('Armatura (MOV)', mov, 'equipaggiamento'));
    let disponibile = true;
    if (liv?.movimento_q && modo === 'passo') voci.push(voce(liv.nome, liv.movimento_q, 'carico'));
    if (liv?.solo_passo && modo !== 'passo') { disponibile = false; note.push(`${liv.nome}: soltanto Passo (§5.2.6)`); }
    for (const s of stati) {
      const m = s.movimento;
      if (!m) continue;
      if (m.nessuno) { disponibile = false; note.push(`${s.nome}: ${m.fonte}`); continue; }
      if (m.solo_passo && modo !== 'passo') { disponibile = false; note.push(`${s.nome}: ${m.fonte}`); }
      if (modo === 'passo' && Number.isInteger(m.passo_q)) {
        const ora = Math.max(0, somma(voci));
        if (m.passo_q < ora) voci.push(voce(`${s.nome} (Passo ${m.passo_q} Q)`, m.passo_q - ora, 'stato'));
      }
    }
    // il budget non scende sotto 0 (§5.2.6: «minimo 0»)
    const totale = Math.max(0, somma(voci));
    if (totale !== somma(voci)) voci = [...voci, voce('minimo 0', totale - somma(voci), 'regole')];
    movimento[modo] = { effettivo: disponibile ? totale : null, daRegole: base[modo] ?? 0, scomposizione: voci, note };
  }
  movimento.unita = base.unita ?? 'Q';

  const azioni = {};
  for (const tipo of ['principali', 'movimento']) {
    const b = scheda.azioni?.[tipo] ?? 0;
    const voci = [voce(tipo === 'principali' ? 'Azioni Principali da regole' : 'Azioni di Movimento da regole', b, 'regole')];
    const note = [];
    for (const s of stati) {
      const x = s.azioni?.[tipo];
      if (!Number.isInteger(x)) continue;
      const ora = somma(voci);
      if (x < ora) voci.push(voce(s.nome, x - ora, 'stato'));
      note.push(`${s.nome}: ${s.azioni.fonte}`);
    }
    azioni[tipo] = { effettivo: somma(voci), daRegole: b, scomposizione: voci, note };
  }
  return { iniziativa, movimento, azioni };
}
