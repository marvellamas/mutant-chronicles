// Condizioni di sessione nei valori: Ferite (§5.14), Affaticamento (§5.19) e Stati (§5.18).
// Funzioni pure. Il valore EFFETTIVO = valore da regole + equipaggiamento + condizioni attive;
// il `totale` da regole non cambia (serve all'avanzamento) e la stampa resta a riposo.

import { descriviFerite } from './sessione.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Condizioni attive della sessione, con effetto strutturato:
 * [{ etichetta, fonte: 'ferite'|'affaticamento'|'stato', effetto: { va, salvezze, va_categorie, va_abilita, va_gruppi } }].
 * Gli Stati senza `effetto` nei dati non compaiono: restano promemoria.
 */
export function condizioniAttive(sessione, dati) {
  if (!isOggetto(sessione)) return [];
  const r = dati.regole;
  const out = [];
  // §5.14: penalità a VA e Prove Salvezza (a che cosa si applica sta in regole.json)
  const ferita = descriviFerite(sessione.ferite, dati);
  if (sessione.ferite && ferita.penalita) out.push({ etichetta: `Ferita ${ferita.nome}`, fonte: 'ferite', effetto: perAmbiti(r.ferite.si_applica_a, ferita.penalita) });
  // §5.19: si applica solo la penalità dello Stato di Affaticamento attuale
  const aft = r.affaticamento.stati[sessione.affaticamento];
  if (aft?.penalita) out.push({ etichetta: aft.nome, fonte: 'affaticamento', effetto: perAmbiti(r.affaticamento.si_applica_a, aft.penalita) });
  // §5.18: solo gli Stati con un effetto numerico nei dati
  const attivi = new Set(Array.isArray(sessione.statiAttivi) ? sessione.statiAttivi : []);
  for (const s of r.stati.elenco) if (attivi.has(s.id) && s.effetto) out.push({ etichetta: s.nome, fonte: 'stato', effetto: s.effetto });
  return out;
}

function perAmbiti(ambiti, valore) {
  const e = {};
  for (const a of ambiti ?? ['abilita', 'salvezze']) e[a === 'abilita' ? 'va' : a] = valore;
  return e;
}

/** Contributo di una condizione al VA di un'Abilità (0 se non la riguarda). */
export function effettoSuAbilita(effetto, abilita, dati) {
  const gruppi = dati.regole.stati;
  let v = effetto.va ?? 0;
  v += effetto.va_categorie?.[abilita.categoria] ?? 0;
  v += effetto.va_abilita?.[abilita.nome] ?? 0;
  for (const [g, x] of Object.entries(effetto.va_gruppi ?? {})) if ((gruppi[`abilita_${g}`] ?? []).includes(abilita.nome)) v += x;
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
 * - condizioni: le condizioni attive.
 * Ogni scomposizione è [{ etichetta, valore, fonte: 'regole'|'equipaggiamento'|'ferite'|'affaticamento'|'stato' }].
 */
export function applicaCondizioni(scheda, sessione, dati) {
  const condizioni = condizioniAttive(sessione, dati);
  const perNome = new Map();
  scheda.abilita = scheda.abilita.map((a) => {
    const cond = vociCondizioniAbilita(condizioni, a, dati);
    const scomposizione = [
      voce('Valore da regole', a.totale, 'regole'),
      ...(a.componentiEquip ?? (a.equip ? [voce('Equipaggiamento', a.equip, 'equipaggiamento')] : [])),
      ...cond,
    ];
    const x = { ...a, effettivo: somma(scomposizione), daRegole: a.totale, scomposizione, condizioni: somma(cond) };
    perNome.set(a.nome, x);
    return x;
  });

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
  scheda.condizioni = condizioni;
  return scheda;
}
