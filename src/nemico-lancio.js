// Tavolo del Master, lotto 8 (per-davide A.73, decisione 8): gli incantesimi dei nemici con «Lancia!» dell'app.
// Adattatore puro, come src/nemico-attacco.js per «Attacca!»: il nemico diventa un «personaggio» { scheda,
// sessione } e la sua voce di incantesimo una scheda di incantesimi.json ristretta alla versione del nemico,
// così src/lancio.js applica le stesse regole dei PG (Anticipazione, Focalizzazione, Ingaggio, componenti,
// circostanze, cumulo degli effetti magici). I numeri restano quelli del formato (data/formato_nemici.json):
// - VA di lancio «già calcolato per quella versione, prima dei modificatori temporanei»: il calcolo riapplica
//   la penalità di livello della sez. 1, quindi la base è VA − penalità (il totale torna il VA del nemico);
// - costo in PM della voce al posto di quello della scheda;
// - regime di lancio della voce (A.84, E&L del 05/10/2026): colonna Taumaturgo o altri utilizzatori della
//   sez. 1; la capacità specifica segue il profilo (promemoria); senza regime la voce è incompleta;
// - bonus di SAG al danno magico della voce (A.85): calcolato per gli umani, dichiarato per le creature,
//   «incluso» se la formula lo contiene già; mai dedotto, mai due volte.
// Nessun Talento, nessun contenitore di Chroma. Una voce incompleta resta un promemoria (decisione 8).
import { calcolaLancio, livelloVersione } from './lancio.js';
import { voce as voceProv } from './attacco.js';
import { aggiungiDanno } from './equipaggiamento.js';
import { provenienza } from './provenienza.js';

/** La scheda di incantesimi.json con il nome della voce (maiuscole e spazi non contano). */
export function schedaIncantesimo(nome, dati) {
  const n = String(nome ?? '').trim().toLowerCase();
  return (dati.incantesimi?.incantesimi ?? []).find((i) => i.nome.toLowerCase() === n) ?? null;
}

/**
 * Voce di incantesimo del nemico: completa (si lancia) o promemoria, con il motivo.
 * @returns {{ completo: boolean, motivo: string|null, scheda: object|null, riga: object|null }}
 */
export function statoIncantesimoNemico(voce, dati) {
  const richiesti = dati.formato_nemici?.campi?.incantesimi?.completo_se ?? ['nome', 'livello', 'va', 'costo_pm'];
  const mancano = richiesti.filter((k) => voce?.[k] === undefined || voce?.[k] === null || voce?.[k] === '');
  const scheda = schedaIncantesimo(voce?.nome, dati);
  const riga = scheda?.versioni?.find((r) => livelloVersione(r) === voce?.livello) ?? null;
  const motivo = mancano.length ? `mancano ${mancano.join(', ')}`
    : !scheda ? `«${voce.nome}» non è fra le schede degli incantesimi`
      : !riga ? `la scheda non ha la versione di livello ${voce.livello}`
        : scheda.meccanica?.procedura_rituale?.stato ? 'si esegue con un Rituale: al tavolo'
          : voce.regime === 'capacita_specifica' ? 'capacità specifica: segue il profilo del nemico (A.84)'
            : null;
  return { completo: !motivo, motivo, scheda, riga };
}

/** Penalità di livello della sez. 1 nella colonna del regime (A.84; formato_nemici.json → regimi_lancio). */
function penalitaLivello(livello, regime, dati) {
  const F = dati.regole.lancio.penalita_livello.fasce;
  const colonna = dati.formato_nemici?.regimi_lancio?.[regime] ?? 'taumaturgo';
  return (F.find((f) => livello <= f.fino_a) ?? F.at(-1))[colonna];
}

/** La scheda ristretta alla versione del nemico, con il suo costo in PM. */
export function incantesimoPerNemico(voce, scheda) {
  const riga = scheda.versioni.find((r) => livelloVersione(r) === voce.livello);
  return { ...scheda, versioni: [{ ...riga, PM: String(voce.costo_pm) }] };
}

/** Il nemico come lanciatore: il VA di lancio della voce come Potere, le sue Abilità, PM e Stati dello scontro. */
export function lanciatoreDa(p, voce, dati) {
  const pen = penalitaLivello(voce.livello, voce.regime, dati);
  const altri = dati.formato_nemici?.regimi_lancio?.[voce.regime] === 'altri';
  const base = voce.va - pen;
  const scomposizione = [voceProv(`VA di lancio del nemico (${voce.nome}, livello ${voce.livello})`, voce.va, 'regole')];
  if (pen) scomposizione.push(voceProv(`senza la penalità di livello (${altri ? 'altri utilizzatori' : 'Taumaturgo'}), applicata qui sotto`, -pen, 'regole'));
  const altre = (p?.scheda?.abilita ?? []).filter((a) => a.nome !== 'Potere').map((a) => ({ nome: a.nome, totale: a.va, effettivo: a.va }));
  return {
    scheda: {
      talentiLiberi: [], classi: [], bonusTalenti: false, caratteristiche: {},
      incantesimi: { livelloMassimo: voce.livello, ...(altri ? { scalaPotere: 'altri_utilizzatori' } : {}) },
      abilita: [{ nome: 'Potere', totale: base, effettivo: base, scomposizione, provenienza: provenienza(scomposizione.map((x) => ({ fonte: x.etichetta, valore: x.valore })), base) }, ...altre],
      equipaggiamento: { contenitori: [], bonusAttacco: [] },
      magia: {},
      pm: p?.pm?.attuali ?? 0,
    },
    sessione: { pmAttuali: p?.pm?.attuali ?? 0, statiAttivi: p?.stati ?? [], lanci: {} },
  };
}

/**
 * «Lancia!» di un incantesimo del nemico con la dichiarazione del pannello (src/lancio.js, stesso contratto dei PG).
 * null se la voce è incompleta: resta un promemoria.
 */
export function calcolaLancioNemico(p, indice, dichiarazione, dati) {
  const voce = p?.scheda?.incantesimi?.[indice];
  const st = statoIncantesimoNemico(voce, dati);
  if (!st.completo) return null;
  const inc = incantesimoPerNemico(voce, st.scheda);
  const chi = lanciatoreDa(p, voce, dati);
  const r = calcolaLancio(chi, inc, { ...dichiarazione, versione: voce.livello, fonte: 'personali', contenitore: null }, dati);
  // A.85: danno della versione più il bonus di SAG della voce, una sola volta; senza bonus dichiarato la scheda
  // è incompleta e il bonus non si assume 0
  const colonne = Object.entries(st.riga).filter(([k, t]) => /^Danno/.test(k) && /\d+d\d+/.test(String(t)));
  if (colonne.length) {
    const b = voce.bonus_danno_magico;
    const testo = (t) => (b === 'incluso' ? t : Number.isInteger(b) ? aggiungiDanno(t, b) : `${t} + bonus di SAG da dichiarare`);
    r.danno = { voci: colonne.map(([k, t]) => ({ colonna: k, base: String(t), testo: testo(String(t)), provenienza: Number.isInteger(b) && b ? `${t} + ${b} (SAG)` : String(t) })), note: [] };
    if (b === undefined || b === null) r.promemoria.unshift('Bonus di SAG al danno magico non dichiarato: la scheda è incompleta, il bonus non vale 0 (A.85).');
  }
  if (!p?.pm) r.impossibile ??= { motivo: 'Il nemico non ha PM nella scheda.' };
  if (voce.azioni) r.promemoria.unshift(`Azioni e durata per questo nemico: ${voce.azioni}`);
  if (voce.eccezioni) r.promemoria.unshift(`Eccezioni del nemico: ${voce.eccezioni}`);
  return { voce, inc, chi, risultato: r };
}

/**
 * Proposta per «Colpito» dopo il lancio di un incantesimo con danno: formula della prima colonna Danno della
 * versione, natura dalla colonna «Natura» (o dal nome della colonna: «Danno magico»), Colpi come applicazioni,
 * a distanza salvo il Contatto. Senza natura riconoscibile la sceglie il Direttore nella finestra.
 */
export function propostaLancio(inc, risultato, dati) {
  const voce = risultato?.danno?.voci?.[0];
  if (!voce) return null;
  const riga = inc.versioni[0] ?? {};
  const nature = dati.formato_nemici.nature_danno;
  const daColonna = nature.find((n) => new RegExp(n, 'i').test(voce.colonna));
  const natura = [riga.Natura, riga['Natura AR'], daColonna].find((x) => nature.includes(x)) ?? null;
  const colpi = Number.parseInt(riga.Colpi, 10);
  return {
    formula: voce.testo.replace(/\s.*$/, ''), moltiplicatore: 1, moltiplicatorePrimo: 1,
    ...(natura ? { natura } : {}),
    tipo: risultato.contatto ? 'ravvicinato' : 'distanza',
    ac: Number.isInteger(colpi) && colpi > 0 ? colpi : 1,
    proprieta: [],
  };
}
