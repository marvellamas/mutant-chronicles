// Danno applicato (Tavolo del Master, pezzo 4; docs/tavolo-direttore.md, decisione 3: niente locativi).
// Funzione pura: per ogni applicazione del colpo (AC, Giocatore §5.10) Difesa → AR applicabile alla
// natura del danno (§5.13, §5.24, con Perforante e Laser) → PV → Ferite (§5.14). Le regole stanno in
// regole.json → danno_applicato; l'AR del bersaglio è quella della scheda (src/protezione.js → valori)
// o quella del nemico (data/formato_nemici.json: «AR totale, di cui magica»).
import { provenienza } from './provenienza.js';

const riga = (fonte, valore, nota) => ({ fonte, valore, ...(nota ? { nota } : {}) });

/** «Perforante 2» → { nome: 'Perforante', valore: 2 }; «Laser» → { nome: 'Laser', valore: null }. */
export function leggiProprieta(testo) {
  const m = /^\s*(.+?)(?:\s+(\d+))?\s*$/.exec(String(testo ?? ''));
  return m ? { nome: m[1].trim(), valore: m[2] ? Number(m[2]) : null } : null;
}

/** Fascia di danno finale del §5.14 e nuove Ferite per l'esito della PS di Tempra. */
export function nuoveFerite(dannoFinale, esito, dati) {
  const T = dati.regole.danno_applicato.nuove_ferite;
  const fascia = T.fasce.find((f) => f.fino_a === null || dannoFinale <= f.fino_a);
  const i = T.fasce.indexOf(fascia);
  const da = i === 0 ? 1 : T.fasce[i - 1].fino_a + 1;
  return { fascia: fascia.fino_a === null ? `${da}+` : `${da}–${fascia.fino_a}`, ferite: esito ? fascia[esito] : null, tabella: fascia };
}

/** Nome dello Stato di Ferita al grado n (1 = Superficiale); oltre l'ultimo: Morte (§5.14). */
export function nomeFerita(n, dati) {
  const F = dati.regole.ferite;
  if (!n) return null;
  return n > F.stati.length ? F.oltre : F.stati[n - 1].nome;
}

/**
 * AR applicabile a una applicazione (§5.13, §5.24): il valore della natura (contro Etereo solo la
 * componente magica), il valore «contro» del tipo d'attacco se c'è, poi Perforante X (sulla sola parte
 * non magica, non contro Etereo) e Laser (dimezza per difetto). Con la provenienza.
 */
export function arApplicabile(ar, colpo, dati) {
  const D = dati.regole.danno_applicato;
  const chiave = D.ar_per_natura[colpo.natura] ?? 'totale';
  const valori = ar?.valori ?? [{ id: 'totale', valore: ar?.totale ?? 0 }, { id: 'magica', valore: ar?.magica ?? 0 }];
  const valore = (id) => valori.find((v) => v.id === id)?.valore ?? null;
  const contro = colpo.tipo && chiave === 'totale' ? D.ar_contro[colpo.tipo] : null;
  let base = chiave;
  if (contro && valore(contro) !== null) base = contro;
  const magica = Math.min(valore('magica') ?? 0, valore(base) ?? 0);
  let totale = valore(base) ?? 0;
  const righe = [riga(base === 'magica' ? 'AR contro Etereo (componente magica)' : base.startsWith('contro:') ? `AR ${base.replace(':', ' ')}` : 'AR', totale)];
  for (const p of (colpo.proprieta ?? []).map(leggiProprieta).filter(Boolean)) {
    const regola = D.proprieta_ar[p.nome];
    if (!regola || (regola.non_contro ?? []).includes(colpo.natura)) continue;
    if (regola.effetto === 'sottrae_non_magica' && p.valore) {
      const nonMagica = Math.max(0, totale - magica);
      const tolti = Math.min(p.valore, nonMagica);
      if (tolti) { totale -= tolti; righe.push(riga(`${p.nome} ${p.valore}`, -tolti, 'solo la parte non magica (§5.24)')); }
    } else if (regola.effetto === 'dimezza_per_difetto') {
      const nuovo = Math.floor(totale / 2);
      if (nuovo !== totale) { righe.push(riga(p.nome, nuovo - totale, 'dimezza per difetto (§5.24)')); totale = nuovo; }
    }
  }
  return { valore: Math.max(0, totale), provenienza: provenienza(righe, Math.max(0, totale)) };
}

/**
 * Applica un colpo a un bersaglio.
 * @param bersaglio { nome, pv: { attuali, massimo }, ferite: grado attuale (anche i nemici, che seguono la
 *   procedura dei PG: per-davide A.73, decisione 7; null per chi non le registra), ar: { totale, magica, valori? } }
 * @param colpo { danni: [danno tirato per applicazione], natura: 'Naturale'|'Magico'|'Etereo',
 *   tipo: 'ravvicinato'|'distanza'|null, difesa: id di regole.json → danno_applicato.difese,
 *   proprieta: ['Perforante 2', 'Laser', …], tempra: [esito della PS di Tempra per applicazione, se serve] }
 * @returns {{ applicazioni, pv: {prima, dopo}, ferite: {prima, dopo, nome}|null, morte, pvPersi,
 *   tempraMancanti: number[], stati: {id, nome, automatico, testo}[], menomazioni: {stato, testo}[],
 *   promemoria: string[] }}
 */
export function applicaColpo(bersaglio, colpo, dati) {
  const D = dati.regole.danno_applicato;
  const difesa = D.difese.find((x) => x.id === (colpo.difesa ?? 'nessuna')) ?? D.difese[0];
  let pv = bersaglio.pv.attuali;
  let ferite = Number.isInteger(bersaglio.ferite) ? bersaglio.ferite : null;
  const conFerite = ferite !== null;
  const applicazioni = [];
  const tempraMancanti = [];
  const promemoria = [];
  let penetrati = 0;
  (colpo.danni ?? []).forEach((tirato, i) => {
    const t = Math.max(0, Number(tirato) || 0);
    // §5.10: la Difesa vale per ogni applicazione, prima dell'Armatura
    const dopoDifesa = difesa.effetto === 'evita' ? 0 : difesa.effetto === 'dimezza_per_eccesso' ? Math.ceil(t / 2) : t;
    const ar = arApplicabile(bersaglio.ar, colpo, dati);
    const finale = Math.max(0, dopoDifesa - ar.valore); // §5.13: mai sotto 0
    if (finale > 0) penetrati += 1;
    const pvPrima = pv;
    const a = { tirato: t, dopoDifesa, ar, finale, pvPrima, pvDopo: pv, tempra: null, feriteNuove: 0 };
    if (finale > 0 && pvPrima > 0) {
      // §5.14: non si scende sotto 0; l'eccesso dell'applicazione che porta a 0 non produce Ferite
      pv = Math.max(0, pv - finale);
      a.pvDopo = pv;
    } else if (finale > 0 && pvPrima === 0) {
      // §5.14: già a 0 PV, danno finale positivo → PS di Tempra e nuove Ferite per fascia
      if (conFerite) {
        const esito = colpo.tempra?.[i] ?? null;
        const nf = nuoveFerite(finale, esito, dati);
        a.tempra = { richiesta: true, esito, fascia: nf.fascia, tabella: nf.tabella };
        if (esito === null) tempraMancanti.push(i);
        else { a.feriteNuove = nf.ferite; ferite += nf.ferite; }
      } else {
        promemoria.push(`Applicazione ${i + 1}: ${finale} danni a 0 PV; Ferite non registrate per ${bersaglio.nome} (§5.14).`);
      }
    }
    applicazioni.push(a);
  });
  const morte = conFerite && ferite > dati.regole.ferite.stati.length;
  if (morte) promemoria.push(`${bersaglio.nome}: oltre Grave, ${dati.regole.ferite.oltre} (§5.14).`);
  // §5.14.1: al primo raggiungimento di Profonda, Seria e Grave, PS di Tempra per la Menomazione
  const menomazioni = [];
  if (conFerite && ferite > (bersaglio.ferite ?? 0)) {
    for (const s of dati.regole.ferite.stati.slice(bersaglio.ferite ?? 0, Math.min(ferite, dati.regole.ferite.stati.length)).filter((x) => x.menomazione)) {
      menomazioni.push({ stato: s.nome, testo: s.menomazione });
      promemoria.push(`Prima volta a ${s.nome}: PS di Tempra per la Menomazione (${s.menomazione}, §5.14.1).`);
    }
  }
  // §5.24: effetti delle proprietà, solo se almeno 1 danno ha superato l'Armatura (salvo Contromisura)
  const stati = [];
  if (penetrati) {
    const proprieta = (colpo.proprieta ?? []).map(leggiProprieta).filter(Boolean);
    // §5.24: Laser «applica anche Plasma»
    if (proprieta.some((p) => p.nome === 'Laser') && !proprieta.some((p) => p.nome === 'Plasma')) proprieta.push({ nome: 'Plasma', valore: null });
    for (const p of proprieta) {
      const e = D.proprieta_effetti.find((x) => x.nome === p.nome);
      if (!e) continue;
      const stato = e.stato ? dati.regole.stati.elenco.find((s) => s.id === e.stato) : null;
      stati.push({ id: stato?.id ?? null, nome: e.nome, automatico: !e.prova, valore: p.valore, testo: `${e.nome}${p.valore ? ` ${p.valore}` : ''}: ${e.testo} Durata: ${e.durata}. Contromisura: ${e.contromisura} (§5.24).` });
    }
  }
  const pvPersi = bersaglio.pv.attuali - pv;
  return {
    applicazioni,
    difesa,
    pv: { prima: bersaglio.pv.attuali, dopo: pv, massimo: bersaglio.pv.massimo },
    ferite: conFerite ? { prima: bersaglio.ferite, dopo: ferite, nome: nomeFerita(ferite, dati) } : null,
    morte,
    pvPersi,
    tempraMancanti,
    stati,
    menomazioni,
    promemoria,
  };
}

/** Riga di registro di un colpo applicato. */
export function testoColpo(nome, colpo, r) {
  const danni = r.applicazioni.map((a) => `${a.tirato}${a.dopoDifesa !== a.tirato ? `→${a.dopoDifesa}` : ''} − AR ${a.ar.valore} = ${a.finale}`).join('; ');
  const ferite = r.ferite && r.ferite.dopo !== r.ferite.prima ? `, Ferite ${r.ferite.prima} → ${r.ferite.dopo} (${r.ferite.nome})` : '';
  // a 0 PV e Menomazioni nella stessa riga: la riga del registro è anche la conferma della plancia (src/ui/avvisi.js)
  const zero = r.pv.dopo === 0 && r.pv.prima > 0 ? ', a 0 PV' : '';
  const menomazioni = (r.menomazioni ?? []).length ? `; PS di Tempra per la Menomazione: ${r.menomazioni.map((m) => `${m.stato} (${m.testo})`).join(', ')}` : '';
  return `${nome} colpito (${colpo.natura}${r.difesa.id !== 'nessuna' ? `, ${r.difesa.nome}` : ''}${colpo.proprieta?.length ? `, ${colpo.proprieta.join(', ')}` : ''}): ${danni}; PV ${r.pv.prima} → ${r.pv.dopo}${zero}${ferite}${r.morte ? ', MORTE' : ''}${menomazioni}.`;
}
