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
 * Proposta per la finestra «Colpito» (pezzo 4) dopo un attacco riuscito: formula, moltiplicatore di ogni
 * applicazione (Bruciapelo, Carica…), quello della prima con il Magistrale (§1.6: solo la prima istanza),
 * natura, tipo, applicazioni (AC, e i colpi a segno delle raffiche) e proprietà dell'attacco.
 * @param colpiASegno colpi a segno dei tiri riusciti (1 per un attacco normale)
 */
export function propostaColpo(attacco, risultato, { magistrale = false, colpiASegno = 1 } = {}) {
  const dist = attacco.tipo === 'distanza';
  const base = dist ? leggiDanno(risultato.danno_per_colpo) : { formula: risultato.danno?.formula ?? attacco.danno, moltiplicatore: risultato.danno?.moltiplicatore ?? 1 };
  const magi = dist ? leggiDanno(risultato.danno_magistrale ?? risultato.danno_per_colpo).moltiplicatore : risultato.danno?.moltiplicatore_magistrale ?? base.moltiplicatore;
  return {
    formula: base.formula,
    moltiplicatore: base.moltiplicatore,
    moltiplicatorePrimo: magistrale ? magi : base.moltiplicatore,
    natura: attacco.natura,
    tipo: dist ? 'distanza' : 'ravvicinato',
    ac: Math.max(1, (risultato.applicazioni ?? attacco.ac ?? 1) * Math.max(1, colpiASegno)),
    proprieta: [...(attacco.proprieta ?? [])],
  };
}
