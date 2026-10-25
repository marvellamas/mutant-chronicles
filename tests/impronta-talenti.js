// Impronta dei valori calcolati di un PG, per controllare che i Talenti nuovi (lotto 1 del 25/10/2026) non cambino
// niente ai personaggi salvati con i Talenti vecchi. Solo i numeri e i nomi che contano al tavolo: PV, PM, Iniziativa,
// Salvezze, VA delle Abilità, Movimento, Azioni, magia, Tecniche, effetti dei Talenti e valori del tavolo.
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';

const CHIAVI = ['livello', 'caratteristiche', 'abilita', 'salvezze', 'pv', 'pm', 'pmUmanita', 'iniziativa', 'vociIniziativa', 'movimento', 'azioni',
  'tecnicheAmmesse', 'incantesimi', 'magia', 'effettiTalenti', 'usiSalvezzeTalenti', 'usiCaratteristicheTalenti', 'tavolo', 'errori'];
// campi descrittivi che il lotto aggiunge: non sono valori
const VIA = new Set(['testo', 'sintesi', 'categoria', 'sostituito_da', 'solo_regime_nuovo', 'fonte_regole', 'fonte', 'fonte_frase']);
const pulisci = (v) => (Array.isArray(v) ? v.map(pulisci)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !VIA.has(k)).map(([k, x]) => [k, pulisci(x)])) : v);

export function improntaPg(testo, dati) {
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const s = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
  const out = Object.fromEntries(CHIAVI.map((k) => [k, pulisci(s[k])]));
  out.talentiLiberi = (s.talentiLiberi ?? []).map((t) => [t.id, t.parametro ?? null, t.livello]);
  out.specializzazioni = (s.specializzazioni ?? []).map((t) => [t.id, t.livello]);
  return JSON.parse(JSON.stringify(out));
}
