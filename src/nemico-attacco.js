// Tavolo del Master, pezzo 5 (docs/tavolo-direttore.md): gli attacchi dei nemici con «Attacca!» dell'app.
// Adattatore puro: il nemico (o un partecipante scritto a mano con un attacco) diventa un «personaggio»
// { scheda, sessione } e il suo attacco un'arma, così src/attacco.js calcola il VA finale con le stesse
// regole dei PG (movimento, distanza, Copertura, modalità di fuoco, Manovre, Superiorità numerica…). Il nemico
// non ha Talenti né equipaggiamento: le opzioni che ne dipendono non contano. I numeri restano quelli del
// formato (data/formato_nemici.json): VA e danno «già fatti», senza bonus di Caratteristica aggiunti.
import { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, dichiarazioneDistanza, dichiarazioneRavvicinato, voce } from './attacco.js';
import { catalogo } from './equipaggiamento.js';

/** Attacchi di un partecipante dello scontro: quelli del tipo di nemico, o quello scritto a mano. */
export function attacchiDi(p) {
  if (p?.tipo === 'nemico') return p.scheda?.attacchi ?? [];
  if (p?.tipo === 'manuale' && p.attacco) return [p.attacco];
  return [];
}

/**
 * L'attacco come arma di «Attacca!». L'Abilità viene dall'arma del catalogo indicata in «rif», se c'è
 * (serve a Tiro Ravvicinato, Bruciapelo e Imbracciatura); senza, quelle manovre restano spente con il motivo.
 */
export function armaDaAttacco(attacco, uid, dati) {
  const def = attacco.rif ? catalogo(dati).perRif.get(attacco.rif) : null;
  const distanza = attacco.tipo === 'distanza';
  // Manovre compatibili (Armamenti §7.1.7): quelle dell'arma del catalogo; un attacco naturale ravvicinato (artigli,
  // morso, schianto) ha quelle consentite anche senz'armi (Giocatore §5.12: Spazzata «consentita a tutti anche
  // senz'armi»), come gli Artigli dell'Umanoide mostruoso (Bestiario §3.5)
  const manovre = def?.manovre ?? (distanza ? [] : Object.values(dati.regole.attacco_ravvicinato.manovre).filter((m) => m.compatibilita === 'arma' && m.senz_armi).map((m) => m.nome_catalogo));
  return {
    uid,
    nome: attacco.nome,
    tipo: distanza ? 'arma_distanza' : 'arma_ravvicinata',
    abilita: def?.abilita ?? null,
    rif: attacco.rif ?? null,
    va: attacco.va,
    vaEffettivo: attacco.va,
    scomposizione: [voce(`VA dell’attacco (${attacco.nome})`, attacco.va, 'regole')],
    danno: { una_mano: attacco.danno, due_mani: null },
    mani: 1,
    ac: attacco.ac ?? 1,
    modalita: distanza ? (attacco.modalita ?? ['S']) : undefined,
    gittataQ: distanza ? attacco.gittata_q ?? null : null,
    portataQ: distanza ? null : attacco.portata_q ?? 1,
    portata_q: distanza ? null : attacco.portata_q ?? 1,
    proprieta: (attacco.proprieta ?? []).map((nome) => ({ nome })),
    manovre,
    // arma di un attaccante esterno: «Attacca!» non mostra le opzioni di mani ed equipaggiamento del PG
    esterno: true,
  };
}

/**
 * Il partecipante come attaccante: nessun equipaggiamento, i suoi Stati per i divieti. Talenti solo dalle capacità
 * che il Bestiario dichiara equivalenti (data/bestiario.json → capacita_come_talenti: la Spazzata del gigante come
 * Spazzata Migliorata, §3.9).
 */
export function attaccanteDa(p, dati = null) {
  const mappa = dati?.bestiario?.capacita_come_talenti ?? {};
  const talenti = [...new Set((p?.scheda?.capacita ?? []).flatMap((c) => mappa[c.nome] ?? []))].map((id) => ({ id }));
  const car = p?.scheda?.caratteristiche ?? {};
  return {
    scheda: {
      talentiLiberi: talenti, classi: [], abilita: [], bonusTalenti: talenti.length > 0,
      caratteristiche: Object.fromEntries(Object.entries(car).map(([k, v]) => [k, { valore: v }])),
      azioni: { principali: 1, movimento: 1 },
      equipaggiamento: { armi: [] },
    },
    sessione: { statiAttivi: p?.stati ?? [], munizioni: {}, attacchi: {} },
  };
}

/**
 * Luce sul bersaglio per l'attacco di un nemico (A.106; mappa, fase 2, lotto 4): il VA dei nemici viene dal profilo,
 * quindi la penalità si aggiunge qui, con la sua riga. Penombra −2 e Luce molto scarsa −4 (regole.json →
 * illuminazione.livelli[].effetti); Buio totale come Accecato (−8 e i suoi divieti, non sommato a un Accecato già
 * attivo). `visione`: una visione che copre il bersaglio elimina −2/−4, non il buio.
 * @returns { arma, chi } con la penalità applicata (o gli stessi oggetti con luce sufficiente)
 */
export function conLuceNemico(arma, chi, luce, dati, { visione = false } = {}) {
  const L = dati.regole.illuminazione;
  const liv = L?.livelli?.find((x) => x.id === luce && !x.base);
  if (!liv) return { arma, chi };
  const conVa = (v, testo) => ({ ...arma, va: arma.va + v, vaEffettivo: (arma.vaEffettivo ?? arma.va) + v, scomposizione: [...(arma.scomposizione ?? []), voce(testo, v, 'stato')] });
  if (liv.stato) {
    if ((chi.sessione.statiAttivi ?? []).includes(liv.stato)) return { arma, chi };
    const st = dati.regole.stati.elenco.find((x) => x.id === liv.stato);
    const v = st?.effetti?.find((e) => e.tipo === 'va' && e.ambito === 'generale')?.valore ?? 0;
    return { arma: conVa(v, `Luce: ${liv.nome} (come ${st?.nome ?? liv.stato})`), chi: { ...chi, sessione: { ...chi.sessione, statiAttivi: [...(chi.sessione.statiAttivi ?? []), liv.stato] } } };
  }
  if (visione && (L.visione?.elimina ?? []).includes(liv.id)) return { arma, chi };
  const v = liv.effetti?.find((e) => e.prove === 'luce' && e.ambito === 'generale')?.valore ?? 0;
  return v ? { arma: conVa(v, `Luce: ${liv.nome}`), chi } : { arma, chi };
}

/** VA finale e danno dell'attacco con la dichiarazione di «Attacca!» (src/attacco.js, stesso contratto dei PG). */
export function calcolaAttaccoNemico(p, indice, dichiarazione, dati) {
  const attacco = attacchiDi(p)[indice];
  if (!attacco) return null;
  const arma = armaDaAttacco(attacco, `${p.id}:${indice}`, dati);
  const chi = attaccanteDa(p, dati);
  const r = arma.tipo === 'arma_distanza'
    ? calcolaAttaccoDistanza(chi, arma, dichiarazioneDistanza(dichiarazione), dati)
    : calcolaAttaccoRavvicinato(chi, arma, dichiarazioneRavvicinato(dichiarazione), dati);
  return { attacco, arma, risultato: r };
}

/** «(1d8+2) ×2» → { formula: '1d8+2', moltiplicatore: 2 }; «1d8+2» → moltiplicatore 1. */
export function leggiDanno(testo) {
  const m = /^\((.+)\)\s*×(\d+)$/.exec(String(testo ?? '').trim());
  return m ? { formula: m[1], moltiplicatore: Number(m[2]) } : { formula: testo ?? null, moltiplicatore: 1 };
}

/**
 * Proposta per la finestra «Colpito» (pezzo 4) dopo un attacco riuscito: formula del danno (dadi e bonus
 * ordinari), moltiplicatore di ogni applicazione (Bruciapelo, Carica…), Successo Magistrale, natura, tipo,
 * applicazioni (AC, e i colpi a segno delle raffiche) e proprietà dell'attacco.
 *
 * Il raddoppio del Magistrale non sta qui: lo applica src/danno.js → applicaColpo sulla prima applicazione
 * (§1.6, §5.13 passo 3), così vale anche con il danno scritto dal vivo. Qui si passa solo «magistrale».
 * @param colpiASegno colpi a segno dei tiri riusciti (1 per un attacco normale)
 */
export function propostaColpo(attacco, risultato, { magistrale = false, colpiASegno = 1 } = {}) {
  const dist = attacco.tipo === 'distanza';
  const base = dist ? leggiDanno(risultato.danno_per_colpo) : { formula: risultato.danno?.formula ?? attacco.danno, moltiplicatore: risultato.danno?.moltiplicatore ?? 1 };
  return {
    formula: base.formula,
    moltiplicatore: base.moltiplicatore,
    magistrale: !!magistrale,
    natura: attacco.natura,
    tipo: dist ? 'distanza' : 'ravvicinato',
    ac: Math.max(1, (risultato.applicazioni ?? attacco.ac ?? 1) * Math.max(1, colpiASegno)),
    proprieta: [...(attacco.proprieta ?? [])],
    // fonte degli Stati periodici che il colpo può applicare (Sanguinante X: §5.15, all'Iniziativa della fonte)
    ...(attacco.fonte ? { fonte: attacco.fonte, fonteNome: attacco.fonteNome } : {}),
  };
}
