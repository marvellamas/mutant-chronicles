// Anticipazione (Magia sez. 12.3): il valore che si ottiene forzando un aspetto di un gradino, dalla
// scala della scheda estratta in incantesimi.json → meccanica.anticipazione.aspetti[].scala
// (tools/scale_anticipazione.mjs). Funzioni pure, nessun numero inventato: «Le altre scale e i massimi
// sono specificati nelle schede; raggiunto il massimo non si inventa un ulteriore gradino» (sez. 12.3).
//
// Tipi di scala:
// - sequenza { colonna|null, valori: [...] }: il valore della versione e il gradino dopo nella sequenza;
// - incremento { colonna, passo, massimo? }: valore della versione + passo, fino al massimo;
// - riga_successiva { colonne: [...], oltre?: [{ da, a }], oltre_ultima? }: il valore distinto della
//   versione successiva nella stessa colonna; oltre l'ultima riga solo se la scheda lo scrive.
// Senza scala (null) l'aspetto resta «valore da definire al tavolo», con il motivo.
import { aggiungiDanno } from './equipaggiamento.js';

const UNITA = [
  [/^(rnd|round)$/, 'rnd'], [/^(min|minuto|minuti)$/, 'min'], [/^(ora|ore|h)$/, 'h'], [/^(giorno|giorni)$/, 'g'],
  [/^(mese|mesi)$/, 'mese'], [/^(anno|anni)$/, 'anno'],
];
/** Forma confrontabile di un valore: «20 RND» = «20 rnd», «5 minuti» = «5 min», «−2» = «-2», «3Q» = «3 q». */
export function normValore(v) {
  let s = String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  s = s.replace(/(\d)\s*([a-z])/g, '$1 $2');
  const p = s.split(' ');
  if (p.length === 2 && /^[+-]?\d/.test(p[0])) {
    const u = UNITA.find(([rx]) => rx.test(p[1]));
    if (u) return `${p[0].replace(/^\+/, '')}${u[1]}`;
  }
  return s.replace(/^\+(?=\d)/, '').replace(/\s+/g, '');
}

const MENO = '−';
const conSegno = (n, segnoPiu) => (n < 0 ? `${MENO}${-n}` : `${segnoPiu ? '+' : ''}${n}`);

/** Valore + passo, conservando la forma: «+2» → «+3», «−2» → «−3», «2 Q» → «3 Q», «1d6+1» → «1d6+2». */
export function incrementaValore(valore, passo) {
  const s = String(valore ?? '').trim();
  if (/\d+d\d+/.test(s)) return { testo: aggiungiDanno(s, passo), numero: null };
  const m = /^([+−-]?)\s*(\d+)(.*)$/.exec(s);
  if (!m) return null;
  const n = (m[1] === '−' || m[1] === '-' ? -1 : 1) * Number(m[2]);
  const nuovo = n + passo;
  return { testo: `${conSegno(nuovo, m[1] === '+')}${m[3]}`, numero: nuovo, prima: n };
}

/**
 * Valore anticipato di un aspetto per la versione scelta.
 * @param aspetto voce di meccanica.anticipazione.aspetti (con «scala»)
 * @param versione riga della versione scelta (chiavi = colonne della scheda)
 * @param righe tutte le righe delle versioni, in ordine di livello
 * @returns {{ righe: { colonna, da, a, nota? }[], daDefinire: string|null }}
 */
export function valoreAnticipato(aspetto, versione, righe = []) {
  const sc = aspetto?.scala ?? null;
  const daDefinire = (motivo) => ({ righe: [], daDefinire: motivo });
  if (!sc) return daDefinire(aspetto?.scala_motivo ?? 'la scheda non dà una scala leggibile');
  if (sc.tipo === 'sequenza') {
    const valori = sc.valori;
    if (!sc.colonna) {
      // «da A a B» senza colonna nella tabella: il gradino è B
      return valori.length === 2 ? { righe: [{ colonna: aspetto.nome ?? aspetto.etichetta, da: valori[0], a: valori[1] }], daDefinire: null }
        : daDefinire('la scala della scheda non indica da quale valore si parte');
    }
    const attuale = versione?.[sc.colonna];
    const i = valori.findIndex((x) => normValore(x) === normValore(attuale));
    if (i < 0) return daDefinire(`il valore della versione (${attuale ?? '—'}) non compare nella scala della scheda`);
    if (i === valori.length - 1) return { righe: [{ colonna: sc.colonna, da: attuale, a: attuale, nota: 'già al massimo della scala: nessun gradino ulteriore (sez. 12.3)' }], daDefinire: null };
    return { righe: [{ colonna: sc.colonna, da: attuale, a: valori[i + 1] }], daDefinire: null };
  }
  if (sc.tipo === 'incremento') {
    const attuale = versione?.[sc.colonna];
    const r = incrementaValore(attuale, sc.passo);
    if (!r) return daDefinire(`il valore della versione (${attuale ?? '—'}) non è un numero`);
    if (sc.massimo !== undefined && r.numero !== null) {
      const oltre = sc.passo > 0 ? r.numero > sc.massimo : r.numero < sc.massimo;
      if (oltre) {
        const giaAl = r.prima === sc.massimo;
        return { righe: [{ colonna: sc.colonna, da: attuale, a: giaAl ? attuale : incrementaValore(attuale, sc.massimo - r.prima).testo, nota: `massimo ${conSegno(sc.massimo, String(attuale).trim().startsWith('+'))} della scheda${giaAl ? ': nessun gradino ulteriore' : ''}` }], daDefinire: null };
      }
    }
    return { righe: [{ colonna: sc.colonna, da: attuale, a: r.testo }], daDefinire: null };
  }
  if (sc.tipo === 'riga_successiva') {
    const k = righe.indexOf(versione);
    const out = sc.colonne.map((colonna) => {
      const attuale = versione?.[colonna];
      const oltre = (sc.oltre ?? []).find((o) => normValore(attuale).startsWith(normValore(o.da)));
      if (oltre) return { colonna, da: attuale, a: oltre.a };
      const dopo = righe.slice(k + 1).map((r) => r?.[colonna]).find((x) => x !== undefined && normValore(x) !== normValore(attuale));
      if (dopo !== undefined) return { colonna, da: attuale, a: dopo };
      if (sc.oltre_ultima) return { colonna, da: attuale, a: sc.oltre_ultima, nota: 'oltre l’ultima riga, come scrive la scheda' };
      return { colonna, da: attuale, a: attuale, nota: 'ultima riga della tabella: nessun gradino ulteriore (sez. 12.3)' };
    });
    return { righe: out, daDefinire: null };
  }
  return daDefinire('tipo di scala sconosciuto');
}
