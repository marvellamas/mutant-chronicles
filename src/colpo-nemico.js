// Colpo applicato a un nemico dello scontro (pezzo 4, «Colpito»; A.73, decisione 7): la stessa procedura dalla carta
// del nemico nella plancia e, dai ritocchi del 07/10/2026, dal pannello «Attacca!» della scheda di un PG. Funzione pura
// sullo scontro: PV, Ferite, Menomazioni e Stati del nemico nello scontro, riga nel registro, pila dei colpi per
// «Annulla ultimo colpo», perdite periodiche dei soli Stati applicati davvero (§5.15).
import { registraColpo } from './scontro.js';
import { registraPeriodico } from './periodici.js';
import { testoColpo } from './danno.js';

const nomeDi = (s, id) => (id ? (s?.partecipanti ?? []).find((p) => p.id === id)?.nome ?? null : null);

/**
 * @param visto il nemico com'era quando si è aperto «Colpito» ({ id, nome, pv: { attuali }, ferite }): se nello scontro
 *   letto ora è cambiato, errore (lo ha colpito qualcun altro nel frattempo)
 * @param ris esito di src/danno.js → applicaColpo; colpo: il colpo della finestra; stati: Stati scelti; periodici: perdite
 * @param o { prefisso: testo prima di quello del colpo (la riga dell'attacco, per averne una sola), adesso }
 */
export function colpoSuNemico(s, visto, ris, colpo, stati, periodici, dati, { prefisso = '', adesso } = {}) {
  const q = s.partecipanti.find((y) => y.id === visto.id);
  if (!q || q.pv.attuali !== visto.pv.attuali || (q.ferite ?? 0) !== (visto.ferite ?? 0)) throw new Error(`${visto.nome} è cambiato nel frattempo: chiudi e riapri «Colpito».`);
  const ammessi = stati.filter((id) => !(q.scheda?.immunita ?? []).includes(id));
  const prima = { pv: q.pv.attuali, ferite: q.ferite ?? 0, menomazioni: q.menomazioni ?? [], stati: q.stati };
  const dopo = { pv: ris.pv.dopo, ferite: ris.ferite?.dopo ?? prima.ferite, menomazioni: [...prima.menomazioni, ...(ris.menomazioni ?? [])], stati: [...new Set([...q.stati, ...ammessi])] };
  const testo = `${prefisso ? `${prefisso} ` : ''}${testoColpo(q.nome, colpo, ris)}`;
  let t = registraColpo(s, { bersaglio: q.id, nome: q.nome, tipo: 'nemico', testo, prima, dopo }, adesso);
  // §5.15: perdita periodica dei soli Stati applicati davvero (un nemico immune non la prende)
  for (const y of periodici.filter((z) => ammessi.includes(z.stato))) {
    t = registraPeriodico(t, { ...y, bersaglio: q.id, nome: q.nome, tipo: 'nemico', fonteNome: nomeDi(t, y.fonte) }, adesso, dati);
  }
  return t;
}
