// Modelli PNG generici Classe / Grado / EQ (Manuale dei Mostri 0.46, «PNG generici Classe Grado ed EQ»; Direttore 0.45 §9.6).
// Dieci modelli (data/png_generici.json, scritto da tools/importa-png-generici.mjs): si sceglie una Classe, un Grado da I a VI e
// un solo valore di Qualità complessiva EQ da 0 a 5, e si ottiene un nemico nel formato di data/formato_nemici.json
// (A.73) da ritoccare e salvare con «Crea nemico». Funzioni pure, senza interfaccia (test in tests/png-generici.test.js).
// Tutti i numeri vengono dal manuale: qui solo la somma di EQ (§9.6.1) e la traduzione nel formato dei nemici.
import { iniziativaCreatura } from './iniziativa-creature.js';
import { riga } from './provenienza.js';

const idDaNome = (n) => String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const P = (dati) => dati.png_generici;

/** Elenco per la scelta: { id, nome, categoria, descrizione } nell'ordine del manuale (Avventurieri, poi Combattenti). */
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
  const fonte = `${c.nome}, ${g} Grado (Mostri 0.46, PNG generici)`;
  const pr = {}; // provenienza: campo → righe
  const prov = (campo, base, nota) => {
    pr[campo] = [riga(fonte, base, nota)];
    if (eq) pr[campo].push(riga(`EQ ${eq} (${nomeEq})`, eq, 'Direttore §9.6.1: una sola volta'));
  };
  const n = {
    formato: 'mutant-nemico', versione: 1, id: 'x', nome: 'x',
    caratteristiche: { FOR: car.FOR, DES: car.DES, COS: car.COS, INT: car.INT, SAG: car.SAG, CAR: car.CAR },
    pv: R.pv, pm: R.pm,
    ar: { totale: R.ar + eq, magica: 0 },
    difese: (R.parata ?? R.schivata) + eq,
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
  prov('ar', R.ar); prov('iniziativa', R.ini);
  if (R.parata === null) {
    // il manuale scrive «—» per la Parata (il Lottatore di I Grado non la ha): Difese = Schivata, detto, e la domanda è A.206
    prov('difese', R.schivata, 'Parata «—» nel manuale: vale la Schivata (A.206)');
    avvisi.push(`${c.nome} ${g} Grado: nel manuale la Parata è «—»; le Difese del nemico valgono la Schivata (${R.schivata + eq}). Da confermare con Davide (A.206).`);
  } else prov('difese', R.parata, `Parata; Schivata ${R.schivata + eq}`);
  pr.passo = [riga(fonte, D.movimento.passo, 'EQ non modifica il Movimento')];
  pr.azioni = [riga(fonte, R.ap, 'EQ non modifica le Azioni')];
  for (const k of ['tempra', 'riflessi', 'volonta', 'magia']) prov(`salvezze.${k}`, S[k]);

  // attacchi: VA e danno dalla tabella dei pronti, armamenti astratti per portata e modalità
  c.attacchi[g].forEach((a, i) => {
    const arma = D.armamenti.find((x) => x.tipo === a.arma);
    const danno = sommaEqDanno(a.danno, eq);
    const att = { nome: a.arma, tipo: 'ravvicinato', va: a.va + eq, danno: danno ?? a.danno, natura: 'Naturale', ac: 1 };
    if (arma && arma.q > 1) { att.tipo = 'distanza'; att.gittata_q = arma.q; att.modalita = arma.modalita.slice(); } else att.portata_q = arma?.q ?? 1;
    att.note = `${arma ? `Mani ${arma.mani}; dado base ${arma.dado}${arma.colpi ? `; ${arma.colpi} colpi` : ''}. ` : ''}Tutti i colpi hanno AC 1 e danni Naturali.`;
    n.attacchi.push(att);
    prov(`attacchi.${i}.va`, a.va, a.arma);
    prov(`attacchi.${i}.danno`, a.danno, a.arma);
  });

  // Abilità: i VA personali della tabella, prima di EQ (EQ vale solo per gli impieghi offensivi e le Difese)
  const idx = romano.indexOf(g);
  for (const [nome, valori] of Object.entries(c.abilita)) n.abilita.push({ nome, va: valori[idx] });

  // capacità: Talenti di Classe fino al Grado, Talenti Liberi già acquisiti, regole comuni del blocco
  for (const gr of romano.slice(0, idx + 1)) {
    const t = c.talenti_classe[gr];
    if (t) n.capacita.push({ nome: `${t.nome} (${gr} Grado)`, effetto: t.testo });
  }
  const liv = car.livello;
  const liberi = c.talenti_liberi.filter((t) => t.livello <= liv);
  if (liberi.length) {
    n.capacita.push({
      nome: 'Talenti Liberi acquisiti',
      effetto: liberi.map((t) => `${t.livello}° ${t.talento}`).join('; ') + '. I bonus permanenti sono già compresi nelle tabelle; gli effetti condizionati sono nelle regole condivise del manuale.',
    });
  }
  const R2 = D.regole;
  if (R2.vantaggio_addestramento) n.capacita.push({ nome: 'Vantaggio di Addestramento', effetto: R2.vantaggio_addestramento.replace(/^Vantaggio di Addestramento\.\s*/, '') });
  if (R2.opportunita) n.capacita.push({ nome: 'Opportunità', effetto: R2.opportunita.replace(/^Opportunità\.\s*/, '') });
  if (c.nome === 'Paramedico' && R2.pronto_soccorso) {
    n.capacita.push({ nome: 'Pronto Soccorso', effetto: R2.pronto_soccorso.replace(/^Pronto Soccorso\.\s*/, '') + (R2.trattamenti ? ` ${R2.trattamenti.replace(/^Trattamenti\.\s*/, '')}` : '') });
  }

  const px = pxPng(g, eq, dati);
  n.nome = String(scelte.nome ?? '').trim() || proponiNomePng(scelte, dati);
  n.id = scelte.id ?? idDaNome(n.nome);
  n.fonte = `dal Manuale dei Mostri v0.46, «PNG generici Classe Grado ed EQ» (Direttore 0.45 §9.6): ${c.nome}, ${g} Grado, EQ ${eq} (${nomeEq})`;
  n.note = [
    String(scelte.descrizione ?? '').trim() || c.descrizione,
    `PX pronti per quattro PG: ${px} (Grado ${g}, EQ ${eq} ${nomeEq}); già comprendono EQ, non si aggiungono moltiplicatori di dotazione (Direttore §9.6).`,
    c.comportamento ? `Comportamento: ${c.comportamento}` : null,
    c.strumenti ?? null,
    'Umano di Natura Comune, sensi ordinari, 1 AM per Round; Attacchi Naturali, AR magica 0.',
  ].filter(Boolean).join(' ');
  n._bestiario = { scelte: { png: { classe: scelte.classe, grado: g, eq } }, png: true };
  if (n.id === 'x') avvisi.push('identificativo da impostare');
  return { nemico: n, provenienza: pr, round: { grado: null }, avvisi, errori };
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
