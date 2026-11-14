// Modelli PNG generici Classe / Grado / EQ (Manuale dei Mostri 0.67, «PNG generici Classe Grado ed EQ»;
// Direttore 0.51 §§9.6–9.6.2). **Venticinque** modelli, cinque per categoria (data/png_generici.json, scritto da
// tools/importa-png-generici.mjs dai dati strutturati di Davide): si sceglie una Classe, un Grado da I a VI e un
// solo valore di Qualità complessiva EQ da 0 a 5, e si ottiene un nemico nel formato di data/formato_nemici.json
// (A.73) da ritoccare e salvare con «Crea nemico». Funzioni pure, senza interfaccia (test in tests/png-generici-197.test.js).
//
// Tutti i numeri vengono dal manuale: qui solo la somma di EQ (§9.6.1) e la traduzione nel formato dei nemici.
//
// La regola da non rompere (Direttore §9.6.2, Mostri «Bonus permanenti»): **i valori pronti comprendono già i
// benefici fissi delle acquisizioni raggiunte, una volta sola.** L'Agente di I Grado ha Armi leggere VA personale
// 11 e attacca con la Pistola a 12, perché la Specializzazione Pistole del livello 1 è già dentro quel 12. Qui
// non si somma nessuna Specializzazione: si prendono i valori come sono, si aggiunge EQ una volta, e i benefici
// condizionati restano scritti accanto perché li applichi il Direttore quando la condizione c'è.
import { iniziativaCreatura } from './iniziativa-creature.js';
import { riga } from './provenienza.js';

const idDaNome = (n) => String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const P = (dati) => dati.png_generici;

/** Elenco per la scelta: { id, nome, categoria, descrizione } nell'ordine del manuale. */
export function classiPng(dati) {
  return Object.entries(P(dati).classi).map(([id, c]) => ({ id, nome: c.nome, categoria: c.categoria, descrizione: c.descrizione }));
}

/** PX pronti per un esemplare e quattro PG (tabella del manuale: già comprendono EQ). */
export function pxPng(grado, eq, dati) {
  return P(dati).px[grado]?.[eq] ?? null;
}

/** «1d8+3» + EQ → «1d8+5»: il bonus di EQ si somma al danno di ogni colpo prima di moltiplicatori, Difese e AR (§9.6.1). */
export function sommaEqDanno(danno, eq) {
  const m = String(danno).match(/^(\d+d\d+)(?:([+-])(\d+))?$/);
  if (!m) return null;
  const base = m[3] ? (m[2] === '-' ? -Number(m[3]) : Number(m[3])) : 0;
  const tot = base + eq;
  return tot === 0 ? m[1] : `${m[1]}${tot > 0 ? '+' : '-'}${Math.abs(tot)}`;
}

const romano = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * La riga della tabella degli armamenti astratti di un'arma dei pronti. «Spada» nelle tabelle di Classe è la riga
 * «Arma da guerra» della tabella comune: alias dichiarato nei dati con il motivo e la domanda (A.269).
 */
export function armamentoPng(arma, dati) {
  const D = P(dati);
  const nome = D.alias_armi?.[arma]?.riga ?? arma;
  return D.armamenti.find((x) => x.tipo === nome) ?? null;
}

/** Le acquisizioni raggiunte a un Grado, nelle tre progressioni separate (Direttore §9.6.2). */
export function acquisizioniPng(classe, grado, dati) {
  return P(dati).classi[classe]?.acquisizioni_per_grado?.[grado] ?? { specializzazioni: [], maestrie: [], talenti_liberi: [] };
}

const ETICHETTE = { specializzazioni: 'Specializzazioni', maestrie: 'Maestrie', talenti_liberi: 'Talenti Liberi' };

/**
 * Profilo di un modello PNG.
 * @param scelte { classe: id, grado: 'I'..'VI', eq: 0..5, nome?, descrizione?, id? }
 * @returns {{ nemico, provenienza, round, avvisi: string[], errori: string[] }} come src/crea-nemico.js → profiloNemico
 */
export function profiloPng(scelte, dati) {
  const D = P(dati);
  const avvisi = [];
  const c = D?.classi?.[scelte.classe];
  const g = scelte.grado;
  const eq = Number(scelte.eq);
  const errori = [];
  if (!c) errori.push(`modello PNG sconosciuto: ${scelte.classe}`);
  if (!romano.includes(g)) errori.push(`Grado sconosciuto: ${g}`);
  if (!Number.isInteger(eq) || eq < 0 || eq > 5) errori.push(`EQ da 0 a 5: ${scelte.eq}`);
  if (errori.length) return { nemico: null, provenienza: {}, round: null, avvisi, errori };
  const nomeEq = D.eq.find((x) => x.eq === eq)?.nome ?? '';
  const R = c.risorse[g]; const S = c.salvezze[g]; const car = c.caratteristiche[g];
  const fonte = `${c.nome}, ${g} Grado (Mostri 0.67, PNG generici)`;
  const pr = {}; // provenienza: campo → righe
  const prov = (campo, base, nota) => {
    pr[campo] = [riga(fonte, base, nota)];
    if (eq) pr[campo].push(riga(`EQ ${eq} (${nomeEq})`, eq, 'Direttore §9.6.1: una sola volta'));
  };
  const n = {
    formato: 'mutant-nemico', versione: 1, id: 'x', nome: 'x',
    caratteristiche: { FOR: car.FOR, DES: car.DES, COS: car.COS, INT: car.INT, SAG: car.SAG, CAR: car.CAR },
    pv: R.pv, pm: R.pm,
    ar: { totale: R.ar + eq, magica: R.ar_magica ?? 0 },
    difese: R.difese + eq,
    iniziativa: iniziativaCreatura(R.ini + eq),
    movimento: { passo: D.movimento.passo, corsa: D.movimento.corsa, scatto: D.movimento.scatto },
    spazio: '1 Q',
    salvezze: { tempra: S.tempra + eq, riflessi: S.riflessi + eq, volonta: S.volonta + eq, magia: S.magia + eq },
    azioni: { principali: R.ap, movimento: 1 },
    attacchi: [],
    abilita: [],
    capacita: [],
  };
  pr.pv = [riga(fonte, R.pv, 'EQ non modifica PV e PM massimi')];
  prov('ar', R.ar, R.ar_magica ? `AR magica ${R.ar_magica}, che EQ non modifica` : undefined);
  prov('iniziativa', R.ini);
  // La Difesa del profilo: Parata per i venti modelli con Parata e Schivata, «Difese» per i Taumaturghi.
  // Il Lottatore di I Grado ha Parata «—» e resta la Schivata (A.270: la A.206 aveva deciso il contrario).
  const nomeDifesa = { difese: 'Difese', parata: 'Parata', schivata: 'Schivata' }[R.difese_da] ?? 'Difese';
  const altra = R.difese_da === 'parata' && R.schivata !== null ? `; Schivata ${R.schivata + eq}` : '';
  prov('difese', R.difese, `${nomeDifesa}${altra}`);
  if (R.difese_da === 'schivata' && R.parata === null) avvisoParata(avvisi, c, g);
  pr.passo = [riga(fonte, D.movimento.passo, 'EQ non modifica il Movimento')];
  pr.azioni = [riga(fonte, R.ap, 'EQ non modifica le Azioni')];
  for (const k of ['tempra', 'riflessi', 'volonta', 'magia']) prov(`salvezze.${k}`, S[k]);

  // attacchi: VA e danno dalla tabella dei pronti — già con i benefici fissi, una volta sola (§9.6.2)
  c.attacchi[g].forEach((a, i) => {
    const arma = armamentoPng(a.arma, dati);
    const danno = sommaEqDanno(a.danno, eq);
    const att = { nome: a.arma, tipo: 'ravvicinato', va: a.va + eq, danno: danno ?? a.danno, natura: 'Naturale', ac: 1 };
    if (arma && arma.q > 1) { att.tipo = 'distanza'; att.gittata_q = arma.q; att.modalita = arma.modalita.slice(); } else att.portata_q = arma?.q ?? 1;
    att.note = `${arma ? `Mani ${arma.mani}; dado base ${arma.dado}${arma.colpi ? `; ${arma.colpi} colpi` : ''}. ` : ''}Tutti i colpi hanno AC 1 e danni Naturali. VA e danno comprendono già i benefici fissi delle acquisizioni raggiunte, una volta sola.`;
    n.attacchi.push(att);
    prov(`attacchi.${i}.va`, a.va, `${a.arma}; benefici fissi già compresi`);
    prov(`attacchi.${i}.danno`, a.danno, a.arma);
  });

  // Abilità: i VA personali della tabella, prima di EQ, Specializzazioni, strumenti e condizioni (§9.6.2)
  const idx = romano.indexOf(g);
  for (const [nome, valori] of Object.entries(c.abilita)) n.abilita.push({ nome, va: valori[idx] });

  // capacità: Talenti di Classe fino al Grado, le tre progressioni raggiunte, le note del modello, le regole comuni
  for (const gr of romano.slice(0, idx + 1)) {
    const t = c.talenti_classe[gr];
    if (t) n.capacita.push({ nome: `${t.nome} (${gr} Grado)`, effetto: t.testo });
  }
  const acq = acquisizioniPng(scelte.classe, g, dati);
  for (const k of ['specializzazioni', 'maestrie', 'talenti_liberi']) {
    const elenco = acq[k] ?? [];
    if (!elenco.length) continue;
    const livelli = c.acquisizioni[k].filter((x) => elenco.includes(x.nome));
    n.capacita.push({
      nome: `${ETICHETTE[k]} (livello ${car.livello})`,
      effetto: `${livelli.map((x) => `${x.livello}° ${x.nome}`).join('; ')}. I benefici fissi sono già compresi nelle tabelle pronte, una volta sola; quelli condizionati si applicano quando la condizione c’è.`,
    });
  }
  // la tabella delle azioni magiche pronte del Grado, per i Taumaturghi
  if (c.magia_pronta) {
    const t = c.magia_pronta;
    const r = t.righe.find((x) => x[0] === g);
    if (r) n.capacita.push({ nome: 'Azione magica pronta', effetto: `${t.colonne.slice(1).map((col, i) => `${col} ${r[i + 1]}`).join(' · ')}. Valori pronti del Grado: comprendono i benefici fissi raggiunti; EQ si applica solo dove il §9.6.1 lo consente.` });
  }
  for (const nota of c.note_acquisizioni ?? []) n.capacita.push({ nome: 'Nota sulle acquisizioni', effetto: nota });
  const R2 = D.regole;
  if (R2.vantaggio_addestramento) n.capacita.push({ nome: 'Vantaggio di Addestramento', effetto: R2.vantaggio_addestramento.replace(/^Vantaggio di Addestramento\.\s*/, '') });
  if (R2.opportunita) n.capacita.push({ nome: 'Opportunità', effetto: R2.opportunita.replace(/^Opportunità\.\s*/, '') });
  if (c.nome === 'Paramedico' && R2.pronto_soccorso) {
    n.capacita.push({ nome: 'Pronto Soccorso', effetto: R2.pronto_soccorso.replace(/^Pronto Soccorso\.\s*/, '') + (R2.trattamenti ? ` ${R2.trattamenti.replace(/^Trattamenti\.\s*/, '')}` : '') });
  }

  const px = pxPng(g, eq, dati);
  n.nome = String(scelte.nome ?? '').trim() || proponiNomePng(scelte, dati);
  n.id = scelte.id ?? idDaNome(n.nome);
  n.fonte = `dal Manuale dei Mostri v0.67, «PNG generici Classe Grado ed EQ» (Direttore 0.51 §§9.6–9.6.2): ${c.nome}, ${g} Grado, EQ ${eq} (${nomeEq})`;
  n.note = [
    String(scelte.descrizione ?? '').trim() || c.descrizione,
    `PX pronti per quattro PG: ${px} (Grado ${g}, EQ ${eq} ${nomeEq}); già comprendono EQ, non si aggiungono moltiplicatori di dotazione (Direttore §9.6).`,
    c.comportamento ? `Comportamento: ${c.comportamento}` : null,
    c.strumenti ?? null,
    // §9.9 del Direttore: il +30% dei mostri non vale per questi modelli, che tengono PV e Ferite ordinari
    'Umano di Natura Comune, sensi ordinari, 1 AM per Round; Attacchi Naturali. Sistema di salute completo: PV e Ferite ordinari, senza il +30% delle creature senza Ferite (Direttore §9.6.2, §9.9).',
  ].filter(Boolean).join(' ');
  n._bestiario = { scelte: { png: { classe: scelte.classe, grado: g, eq } }, png: true, sistema_salute: c.sistema_salute, edizione: D.versione_manuale };
  if (n.id === 'x') avvisi.push('identificativo da impostare');
  return { nemico: n, provenienza: pr, round: { grado: null }, avvisi, errori };
}

/** Avviso del caso dichiarato: il modello non ha Parata a quel Grado, e la Difesa che resta è la Schivata. */
function avvisoParata(avvisi, c, g) {
  avvisi.push(`${c.nome} ${g} Grado: il manuale non dà la Parata («—»), quindi la Difesa del profilo è la Schivata. Il Mostri 0.67 e il blocco approvato del 12/11 dicono che para a mani nude dal II Grado; la A.206 del 30/10 aveva deciso il contrario (A.270).`);
}

/** «Soldato III Grado, EQ 2 (Rara)». */
export function proponiNomePng(scelte, dati) {
  const D = P(dati);
  const c = D.classi[scelte.classe];
  const nomeEq = D.eq.find((x) => x.eq === Number(scelte.eq))?.nome ?? '';
  return `${c?.nome ?? scelte.classe} PNG ${scelte.grado} Grado EQ ${scelte.eq}${nomeEq ? ` ${nomeEq}` : ''}`.trim();
}

export function proponiDescrizionePng(scelte, dati) {
  return P(dati).classi[scelte.classe]?.descrizione ?? '';
}
