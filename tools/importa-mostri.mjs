// Importatore del Manuale dei Mostri (lotto 141, 29/10/2026): legge il testo del Word (docs/manuali-txt/mostri-word.md) e
// produce le schede dei nemici (formato data/formato_nemici.json), invece di trascriverle a mano.
//
// Regole del lavoro:
//  - ogni valore viene dal manuale; un dato assente resta assente (mai 0 al suo posto); «Volontà —» diventa senza_salvezza;
//  - ciò che lo strumento non capisce NON si indovina: va nell'elenco «non capito», scheda per scheda; una scheda a cui manca
//    un campo obbligatorio del formato (PV, Difese, AR, Iniziativa, Salvezze, Passo) non si scrive: resta fuori, con il motivo;
//  - senza --scrivi non scrive nulla: dice cosa cambierebbe (schede nuove, schede già presenti e differenze sui numeri);
//  - con --scrivi scrive soltanto le schede NUOVE in esempi/nemici/mostri/ (le altre non si toccano: sono già nel Bestiario,
//    a mano o da un lotto precedente); con --aggiorna=<id,id> riscrive anche quelle indicate.
//
// Uso:  node tools/importa-mostri.mjs [--testo=file.md] [--dest=cartella] [--scrivi] [--aggiorna=id,id] [--json=file]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { iniziativaCreatura } from '../src/iniziativa-creature.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTO_PREDEFINITO = join(RADICE, 'docs/manuali-txt/mostri-word.md');
const DEST_PREDEFINITA = join(RADICE, 'esempi/nemici/mostri');
export const FONTE = 'dal Manuale dei Mostri v0.46 (Word del 27/10/2026)';
const LATO_MAX = 12; // data/mappa.json → creatura_ingombro_max (A.167)
const Q_TATTICO_IN_Q_BASE = 10; // Mostri 0.46: 1 Q Base = 1,5 m, 1 Q Tattico = 15 m
const ABILITA = new Set((JSON.parse(readFileSync(join(RADICE, 'data/abilita.json'), 'utf8')).abilita ?? []).map((a) => a.nome));
const SIGLE = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];
const NATURE = ['Naturale', 'Magico', 'Etereo'];
const ALIAS_ABILITA = { Mischia: 'Armi da mischia', Lancio: 'Armi da lancio', Guerra: 'Armi da guerra' };

// Pagine comuni di un blocco → creature a cui si applicano (le schede rimandano alle «pagine comuni di questo blocco»).
// Il testo delle pagine comuni entra nelle capacità, una voce per sezione; le tabelle delle pagine comuni non si importano
// (i valori per creatura sono nella scheda) e sono dette nel «non capito».
const CROM = '(bianco|nero|verde|blu|rosso)';
const MET = '(ottone|rame|bronzo|argento|oro)';
export const GRUPPI_COMUNI = [
  { pagine: /^Draghi cromatici (azioni|soffi)/, per: new RegExp(`^Drago ${CROM} (giovane|adulto)$`) },
  { pagine: /^Draghi cuccioli e antichi/, per: new RegExp(`^Drago ${CROM} (cucciolo|antico)$`) },
  { pagine: /^Draghi metallici (azioni|soffi|terrore)/, per: new RegExp(`^Drago (di|d’) ?${MET} (giovane|adulto)$`) },
  { pagine: /^Metallici (cuccioli e antichi|antichi)/, per: new RegExp(`^Drago (di|d’) ?${MET} (cucciolo|antico)$`) },
  { pagine: /^Draghi fatati/, per: /^Drago fatato /i },
  { pagine: /^Draghi d’ombra/, per: /d’ombra giovane$/ },
  { pagine: /^Dracolich/, per: /^Dracolich/ },
  { pagine: /^Fauna ordinaria/, per: /^(Gatto|Donnola|Tasso gigante|Donnola gigante|Lucertola|Lucertola gigante|Rana|Rana gigante|Rospo gigante|Serpente costrittore)$/ },
  { pagine: /^Anfibi giganti/, per: /^(Rana gigante|Rospo gigante)$/ },
  { pagine: /^Fauna terrestre acquatica e volante regole comuni/, per: /^(Becco d’ascia|Falco sanguinario|Serpente volante|Granchio|Coccodrillo|Ratto gigante|Cavalluccio marino|Cavalluccio marino gigante|Polpo|Ragno)$/ },
  { pagine: /^(Le miniere di Rutteng|Crescita e corporeità|Passaggio nella roccia|Occhi di cristallo e risorse)$/, per: /^Murena della Roccia|^Madre delle Murene/ },
];
// sezioni di pagine comuni che non sono regole di gioco (solo presentazione del blocco)
const SEZIONI_NON_REGOLE = /^(Riferimenti del blocco|Come leggere le schede|GS e PX di riferimento|Quattro età distinte|Impiego e riferimento|Le miniere di Rutteng)$/;
// schede che hanno una tabella dei dati ma non sono creature (ambiente, oggetti): restano fuori, dette nel rapporto
const NON_CREATURE = { 'Bozzoli di cristallo': 'ambientazione dell’incontro a Rutteng (procedure di salvataggio), senza PV, Difese e Salvezze: non è una creatura' };

// ---------- lettura del testo ----------
export function leggiRighe(testo) {
  const righe = [];
  testo.split('\n').forEach((s, i) => { const t = s.trim(); if (t && !t.startsWith('<!--')) righe.push({ t, n: i + 1 }); });
  return righe;
}
const titolo = (t) => t.replace(/^#+\s*/, '').replace(/^7\.\d+(\.\d+)?\s+/, '');
const eIntestazione = (t) => /^# /.test(t);
const primaParola = (nome) => nome.split(/\s+/)[0].toLowerCase();

function eScheda(R, i) {
  if (!eIntestazione(R[i].t)) return false;
  for (let j = i + 1; j < Math.min(R.length - 1, i + 9); j += 1) {
    if (eIntestazione(R[j].t)) return false;
    if (/^(Campo|Dato)$/.test(R[j].t) && (/^Valore( pronto)?$/.test(R[j + 1].t || '') || (intestazioneMulti(R, j) && /Natura Comune/.test(R[i + 1].t)))) return true;
  }
  return false;
}
// tabella a più colonne (Dato | Giovane | Adulto): le prime etichette note dopo le due colonne
function intestazioneMulti(R, j) {
  return R[j + 3] && R[j + 1].t.length < 32 && R[j + 2].t.length < 32 && /^(Spazio|Caratteristiche|Risorse|PV|Difese|FOR)/.test(R[j + 3].t);
}

// Divide il testo in schede (creature) e pagine (comuni o di raccordo). Le pagine «di continuazione» (il titolo comincia con
// la prima parola del nome) restano nella scheda.
export function dividi(R) {
  const inizi = [];
  for (let i = 0; i < R.length; i += 1) if (eIntestazione(R[i].t)) inizi.push(i);
  const schede = [];
  const pagine = [];
  let corrente = null;
  for (let k = 0; k < inizi.length; k += 1) {
    const i = inizi[k];
    const fine = k + 1 < inizi.length ? inizi[k + 1] : R.length;
    const t = titolo(R[i].t);
    if (eScheda(R, i)) {
      corrente = { nome: t, righe: R.slice(i, fine), riga: R[i].n };
      schede.push(corrente);
    } else if (corrente && t.toLowerCase().startsWith(primaParola(corrente.nome) + ' ') && !/^Draghi?\b/.test(t)) {
      corrente.righe.push(...R.slice(i, fine));
    } else {
      corrente = null;
      pagine.push({ titolo: t, righe: R.slice(i, fine), riga: R[i].n });
    }
  }
  return { schede, pagine };
}

// ---------- tabella dei dati ----------
// Restituisce { colonne:[nomi], righe:[[etichetta, valore1, valore2?]], fine } oppure null.
function leggiTabella(R) {
  let t = -1;
  for (let i = 0; i < R.length - 1; i += 1) if (/^(Campo|Dato)$/.test(R[i].t) && (/^Valore( pronto)?$/.test(R[i + 1].t) || intestazioneMulti(R, i))) { t = i; break; }
  if (t < 0) return null;
  const multi = !/^Valore( pronto)?$/.test(R[t + 1].t);
  const n = multi ? 2 : 1;
  const colonne = multi ? [R[t + 1].t, R[t + 2].t] : [];
  let k = t + 1 + (multi ? 2 : 1);
  const righe = [];
  while (k + n < R.length) {
    const e = R[k].t;
    if (/^#/.test(e) || (e === 'Attacco' && R[k + 1].t === 'VA') || e.length > 55 || /\.\s/.test(e)) break;
    righe.push([e, ...R.slice(k + 1, k + 1 + n).map((x) => x.t)]);
    k += 1 + n;
  }
  return { colonne, righe, fine: k };
}

// Una colonna → coppie [etichetta, valore] con le etichette «a più voci» (FOR / DES / COS) spezzate.
function coppieColonna(righe, c) {
  const out = [];
  for (const r of righe) {
    const e = r[0]; const v = r[1 + c];
    const eT = e.split(/\s\/\s/); const vT = v.split(/\s\/\s/);
    if (eT.length > 1 && eT.length === vT.length && !/^Passo/.test(e)) {
      if (eT.every((x) => SIGLE.includes(x))) out.push(['Caratteristiche', eT.map((x, i) => `${x} ${vT[i]}`).join(' • ')]);
      else if (e === 'PV / PM') out.push(['Risorse', `PV ${vT[0]} • PM ${vT[1]}`]);
      else out.push(['Difese e Salvezze', eT.map((x, i) => `${x} ${vT[i]}`).join(' • ')]);
    } else if (/^Passo \/ Corsa \/ Scatto$/.test(e)) out.push(['Movimento', `Terra ${v}`]);
    else if (e === 'Difese' && /^\d+$/.test(v)) out.push(['Difese e Salvezze', `Difese ${v}`]);
    else if (/^(Salvezze fisiche|Altre Salvezze)$/.test(e)) out.push(['Difese e Salvezze', v]);
    else if (e === 'Iniziativa' && /^[+−-]\d+ a 1d10$/.test(v)) out.push(['Iniziativa e Azioni', `INI ${v.split(' ')[0]}`]);
    else if (e === 'Iniziativa') out.push(['Iniziativa e Azioni', v.startsWith('1d10') ? v : `INI ${v}`]);
    else if (e === 'Azioni per Round') out.push(['Iniziativa e Azioni', `${v} per Round`]);
    else if (/^Caratteristiche (fisiche|mentali)$/.test(e)) out.push(['Caratteristiche', v]);
    else if (e === 'Protezioni' && /^(AR\s)?\d+ biologic/.test(v)) out.push(['Armatura', v.startsWith('AR') ? v : `AR ${v}`]);
    else if (e === 'AR') out.push(['Armatura', `AR ${v}`]);
    else if (/^Furtività ordinaria$/.test(e)) out.push(['Abilità', `Furtività ${v}`]);
    else if (/^Furtività /.test(e)) out.push(['Abilità condizionata', `${e} ${v}`]);
    else out.push([e, v]);
  }
  return out;
}

// ---------- attacchi ----------
const INTEST_ATT = /^(Attacco|VA|Danno[a-z ]*|Portata[a-z \/]*|Costo|Azione|Effetto)$/;
function leggiAttacchi(R, k) {
  if (!(R[k] && R[k].t === 'Attacco' && R[k + 1] && R[k + 1].t === 'VA')) return { attacchi: null, fine: k, note: [] };
  const intest = [];
  while (R[k] && INTEST_ATT.test(R[k].t) && !(intest.length && R[k].t === 'Attacco')) { intest.push(R[k].t); k += 1; }
  const n = intest.length;
  const righe = [];
  while (k + n - 1 < R.length) {
    const cella = R[k].t;
    if (/^#/.test(cella) || cella.length > 90 || /^[¹²³*]/.test(cella)) break;
    const gruppo = R.slice(k, k + n).map((x) => x.t);
    if (gruppo.some((c) => /^#/.test(c) || c.length > 110)) break;
    righe.push(gruppo);
    k += n;
  }
  const note = [];
  while (R[k] && /^[¹²³*]/.test(R[k].t)) { note.push(R[k].t); k += 1; }
  return { attacchi: { intest, righe }, fine: k, note };
}

const inQ = (v, unita) => (/Tattic/i.test(unita || '') ? v * Q_TATTICO_IN_Q_BASE : v);

function leggiMovimento(testo) {
  const out = { extra: [] };
  const segmenti = testo.split(/\s[•·]\s|;\s/).map((s) => s.trim()).filter(Boolean);
  for (const s of segmenti) {
    if (/^1 AzM$/.test(s)) continue;
    const m3 = s.match(/^(.*?)[:\s]*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*(Q Base|Q Tattici|Q)?/);
    const etichetta = m3 ? m3[1].trim() : '';
    if (m3 && /^(Terra|Terrestre|Movimento)?$/i.test(etichetta) && out.passo === undefined) {
      out.passo = inQ(+m3[2], m3[5]); out.corsa = inQ(+m3[3], m3[5]); out.scatto = inQ(+m3[4], m3[5]);
    } else if (m3 && /^Terra e (nuoto|scavo)$/i.test(etichetta) && out.passo === undefined) {
      out.passo = inQ(+m3[2], m3[5]); out.corsa = inQ(+m3[3], m3[5]); out.scatto = inQ(+m3[4], m3[5]);
      out.extra.push(`${etichetta} ${m3[2]} / ${m3[3]} / ${m3[4]}: la stessa andatura vale anche per ${etichetta.replace(/^Terra e /i, '')}`);
    } else if (m3 && /^(?:Forma umanoide:\s*)?terra(?: volo)?(?: e (?:arrampicata|aderenza|volo|nuoto nativo))?(?: e nuoto)?$/i.test(etichetta) && out.passo === undefined) {
      // Terra e arrampicata / aderenza / volo / Nuoto nativo: la stessa andatura a terra; per il volo il Passo di volo vale quanto il Passo
      out.passo = inQ(+m3[2], m3[5]); out.corsa = inQ(+m3[3], m3[5]); out.scatto = inQ(+m3[4], m3[5]);
      if (/volo/i.test(etichetta)) out.volo = out.passo;
      out.extra.push(etichetta + ' ' + m3[2] + ' / ' + m3[3] + ' / ' + m3[4] + ': la stessa andatura vale anche per ' + etichetta.replace(/^.*?terra e /i, '').replace(/^terra\s*/i, ''));
    } else if (/^(terra\s+(0|—)(\s*Q)?|immobile)$/i.test(s)) {
      out.zero = true;
    } else if (m3 && /^volo/i.test(etichetta)) {
      out.volo = inQ(+m3[2], m3[5]); // Passo di volo in Q Base (Dragomedusa: 12 Q Tattici → 120)
    } else {
      const p = s.match(/^Passo\s+(\d+)\s*Q\b.*?Corsa\s+(\d+)\s*Q\b.*?Scatto\s+(\d+)\s*Q\b/i);
      if (p && out.passo === undefined) { out.passo = +p[1]; out.corsa = +p[2]; out.scatto = +p[3]; } else out.extra.push(s);
    }
  }
  return out;
}

function leggiMovimentoRighe(righe) {
  const out = { extra: [] };
  for (const [e, v] of righe) {
    if (/^Movimento( terrestre| e spazio| sul terreno| comune)?$/.test(e)) {
      const pre = v.match(/Passo\s+(\d+)\s*(?:Q)?[\s•·,]+Corsa\s+(\d+)\s*(?:Q)?[\s•·,]+Scatto\s+(\d+)\s*Q/i);
      const pf = v.match(/Passo \/ Corsa \/ Scatto:\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*Q/i);
      const pn = v.match(/Passo\s+(\d+)\s*Q?[\s•·,]+Corsa e Scatto non consentit[io]/i);
      if (pn && out.passo === undefined) { out.passo = +pn[1]; out.corsa = 'non_consentito'; out.scatto = 'non_consentito'; continue; }
      if ((pre || pf) && out.passo === undefined) { const m = pre || pf; out.passo = +m[1]; out.corsa = +m[2]; out.scatto = +m[3]; continue; }
      const r = leggiMovimento(v);
      for (const k of ['passo', 'corsa', 'scatto', 'volo']) if (r[k] !== undefined && out[k] === undefined) out[k] = r[k];
      if (r.zero) out.zero = true;
      out.extra.push(...r.extra);
    } else if (/^Movimento etereo$/.test(e)) {
      const pf = v.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*Q/);
      if (pf && out.passo === undefined) { out.passo = +pf[1]; out.corsa = +pf[2]; out.scatto = +pf[3]; out.soloEtereo = true; } else out.extra.push(`${e}: ${v}`);
    } else out.extra.push(`${e}: ${v}`);
  }
  return out;
}

function leggiSpazio(testo) {
  const re = /(\d+)\s*×\s*(\d+)\s*Q(?:\s*Base)?(?!\s*Tattici)/g;
  const m = re.exec(testo);
  if (m) {
    const a = +m[1]; const b = +m[2];
    if (a > LATO_MAX || b > LATO_MAX) return { oltre: `${a} × ${b} Q`, grande: true };
    return { spazio: a === 1 && b === 1 ? '1 Q' : `${a} × ${b} Q`, grande: a >= 2 && b >= 2 };
  }
  if (/\bpedina di (?:gestione )?(?:di )?1 Q\b/.test(testo) || /\bpedina di 1 Q\b/.test(testo)) return { spazio: '1 Q', grande: false };
  return {};
}

function parteAbilita(testo, nonCapito, grezze) {
  const ab = [];
  // il Word a volte perde il separatore fra due abilità («Corpo a corpo 12Atletica 13»)
  const pulito = testo.replace(/(\d)([A-ZÀ-Ù])/g, '$1 • $2');
  for (const seg of pulito.split(/\s[•·]\s|;\s/)) {
    const m = seg.trim().match(/^(.+?)\s+(\d+)$/);
    const due = m && m[1].trim().match(/^(.+?) e (.+)$/); // «Oratoria e Raggirare 14» = le due Abilità a 14
    if (due && ABILITA.has(due[1]) && ABILITA.has(due[2])) ab.push({ nome: due[1], va: +m[2] }, { nome: due[2], va: +m[2] });
    else if (m) ab.push({ nome: ALIAS_ABILITA[m[1].trim()] ?? m[1].trim(), va: +m[2] });
    else if (seg.trim()) { grezze.push(seg.trim()); nonCapito.push('Abilità con condizione o forma non letta, tenuta come testo nelle capacità: «' + seg.trim() + '»'); }
  }
  return ab;
}

function leggiAttacco(intest, c, nonCapito, acComune) {
  const ix = (re) => intest.findIndex((x) => re.test(x));
  const vaT = c[ix(/^VA$/)] ?? '';
  const dannoT = c[ix(/^(Danno|Effetto)/)] ?? '';
  const portT = c[ix(/^Portata/)] ?? '';
  const costoT = ix(/^Costo$/) >= 0 ? c[ix(/^Costo$/)] : '';
  const sede = `${portT}; ${costoT}`;
  const nomeAtt = c[0];
  const va = /^\d+/.test(vaT) ? parseInt(vaT, 10) : null;
  const dm = dannoT.match(/^(\d+d\d+(?:\s*\+\s*\d+d\d+)*(?:\s*[+−-]\s*\d+)?|\d+)(?:\s*×\s*(\d+))?\s*(?:•\s*)?(Naturale|Magico|Etereo)(?:\s+([A-Za-zÀ-ù]+))?(?:\s*;\s*(.+))?$/);
  if (va === null || !dm) {
    nonCapito.push(`Attacco «${nomeAtt}» non importato come attacco (VA «${vaT}», danno «${dannoT}»): messo fra le capacità`);
    return { capacita: { nome: nomeAtt, effetto: [`VA ${vaT}`, `Danno: ${dannoT}`, `Portata/costo: ${sede}`].join('. ') } };
  }
  let danno = dm[1].replace(/\s+/g, '').replace('−', '-');
  if (dm[2]) danno += `×${dm[2]}`;
  const att = { nome: nomeAtt, tipo: 'ravvicinato', va, danno, natura: dm[3] };
  const props = [dm[4], dm[5]].filter(Boolean).join('; ');
  if (props) att.proprieta = props.split(/\s*[;,]\s*/).map((s) => s.trim()).filter(Boolean);
  const contatto = /contatto/i.test(portT);
  const tatt = sede.match(/(\d+)\s*Q\s*Tattici/);
  const dist = /gittata|massimo|^max\b/i.test(portT) ? sede.match(/(\d+)\s*Q/) : null;
  const q = sede.match(/(\d+)\s*Q(?!\s*Tattici)/);
  if (dist) {
    att.tipo = 'distanza'; att.gittata_q = +dist[1]; att.modalita = ['S'];
    nonCapito.push(`Attacco «${nomeAtt}»: attacco a distanza, modalità di fuoco assunta «S» (lancio): da controllare`);
  } else if (tatt) {
    att.portata_q = +tatt[1] * Q_TATTICO_IN_Q_BASE;
    nonCapito.push(`Attacco «${nomeAtt}»: portata in Q Tattici (${tatt[0]}) convertita in Q Base`);
  } else if (q) att.portata_q = +q[1];
  else {
    nonCapito.push(`Attacco «${nomeAtt}»: portata non letta («${portT}»): messo fra le capacità, non fra gli attacchi`);
    return { capacita: { nome: nomeAtt, effetto: ['VA ' + vaT, 'Danno: ' + dannoT, 'Portata/costo: ' + sede].join('. ') } };
  }
  const ac = sede.match(/AC\s*(\d+)/) || (acComune ? [null, acComune] : null);
  if (ac) att.ac = +ac[1];
  return { attacco: att };
}

// Tabella degli attacchi con una colonna per variante: «Attacco | A | B [| Proprietà e portata]» con celle «VA n • dadi».
function attacchiAColonne(R, colonne, c, nonCapito, acComune, nascosti = []) {
  const out = [];
  for (let i = 0; i + 2 < R.length; i += 1) {
    if (R[i].t !== 'Attacco' || R[i + 1].t !== colonne[0] || R[i + 2].t !== colonne[1]) continue;
    let k = i + 3;
    const conPortata = R[k] && /^Proprietà e portata$/.test(R[k].t);
    if (conPortata) k += 1;
    const n = conPortata ? 4 : 3;
    while (k + n <= R.length) {
      const cella = R.slice(k, k + n).map((x) => x.t);
      const mm = cella[1 + c].match(/^VA\s+(\d+)\s*•\s*(\d+d\d+(?:[+-]\d+)?)$/);
      if (!mm || /^#/.test(cella[0])) break;
      const att = { nome: cella[0], tipo: 'ravvicinato', va: +mm[1], danno: mm[2], natura: 'Naturale' };
      if (conPortata) {
        const pr = cella[3].split(/\s•\s/);
        att.proprieta = [pr[0]];
        let q = pr[1] ?? '';
        const g = q.match(/giovane\s+(\d+)\s*Q;\s*adulto\s+(\d+)\s*Q/i);
        if (g) q = (c === 0 ? g[1] : g[2]) + ' Q';
        const qm = q.match(/(\d+)\s*Q/);
        if (qm) att.portata_q = +qm[1]; else nonCapito.push('Attacco «' + att.nome + '»: portata non letta («' + cella[3] + '»)');
      } else {
        const t = R.map((x) => x.t).join(' ');
        const esc = att.nome.toLowerCase().replace(/[^a-zà-ù ]/gi, '');
        const pp = t.match(new RegExp('(?:Il|La|Lo)\\s+' + esc + '\\s+ha\\s+(?:([A-Za-zÀ-ù]+),\\s+)?portata\\s+(\\d+)\\s*Q', 'i'));
        if (pp) { att.portata_q = +pp[2]; if (pp[1]) att.proprieta = [pp[1]]; }
        const pv = t.match(new RegExp('(?:Il|La|Lo)\\s+' + esc + '\\s+ha\\s+([A-Za-zÀ-ù]+),\\s+portata', 'i'));
        if (pv) att.proprieta = [pv[1]];
        if (att.portata_q === undefined) { nonCapito.push('Attacco «' + att.nome + '»: portata non scritta per questo attacco: messo fra le capacità'); nascosti.push(att); k += n; continue; }
      }
      if (acComune) att.ac = +acComune;
      out.push(att);
      k += n;
    }
    if (out.length) nonCapito.push('Attacchi letti da una tabella a colonne per variante (' + out.length + '): natura «Naturale» e AC dal testo dichiarate nel paragrafo «Attacchi/Azioni»: controllare');
  }
  return out;
}

// Attacchi descritti in prosa: «Nome. Corpo a corpo N, DADI Natura con proprietà X, portata N Q, AC 1, costo 1 AzP.»
function attaccoInProsa(nome, testo, nonCapito, acComune) {
  const p2 = testo.match(/^VA\s+(\d+)\s*•\s*(\d+d\d+(?:[+-]\d+)?)\s*(?:•\s*)?danni?\s+(naturali|naturale|magici|magico|eterei|etereo)(?:\s+da\s+([a-zà-ù]+))?\s*•\s*portata\s+(\d+)\s*Q[^•]*•\s*AC\s+(\d+)/i);
  if (p2) {
    const nat = { naturali: 'Naturale', naturale: 'Naturale', magici: 'Magico', magico: 'Magico', eterei: 'Etereo', etereo: 'Etereo' }[p2[3].toLowerCase()];
    const att = { nome, tipo: 'ravvicinato', va: +p2[1], danno: p2[2], natura: nat, portata_q: +p2[5], ac: +p2[6] };
    if (p2[4]) att.proprieta = [p2[4][0].toUpperCase() + p2[4].slice(1)];
    att.note = testo;
    nonCapito.push('Attacco «' + nome + '» letto da un paragrafo descrittivo (non dalla tabella): controllare');
    return att;
  }
  const p3 = testo.match(/Corpo a corpo\s+(\d+),\s+(\d+d\d+(?:[+-]\d+)?)\s+(Naturale|Magico|Etereo)(?:\s+con\s+([A-Za-zÀ-ù]+))?,\s+AC\s+(\d+).*soltanto contro/);
  if (p3 && !/portata\s+\d+\s*Q/.test(testo)) {
    const att = { nome, tipo: 'ravvicinato', va: +p3[1], danno: p3[2], natura: p3[3], portata_q: 0, ac: +p3[5] };
    if (p3[4]) att.proprieta = [p3[4]];
    att.note = testo;
    nonCapito.push('Attacco «' + nome + '» letto da un paragrafo descrittivo: portata 0 Q (A.171: solo contro la vittima già agganciata, nello spazio condiviso); controllare');
    return att;
  }
  const m = testo.match(/^(?:Corpo a corpo|Armi [a-z]+)\s+(\d+),\s+(\d+d\d+(?:[+-]\d+)?)\s+(Naturale|Magico|Etereo)(?:\s+con proprietà\s+([A-Za-zÀ-ù ]+?))?,\s+portata\s+(\d+)\s*Q/);
  if (!m) return null;
  const att = { nome, tipo: 'ravvicinato', va: +m[1], danno: m[2], natura: m[3], portata_q: +m[5] };
  if (m[4]) att.proprieta = [m[4].trim()];
  att.note = testo;
  const ac = testo.match(/AC\s*(\d+)/);
  att.ac = ac ? +ac[1] : acComune ? +acComune : undefined;
  if (att.ac === undefined) delete att.ac;
  nonCapito.push(`Attacco «${nome}» letto da un paragrafo descrittivo (non dalla tabella): controllare`);
  return att;
}

function paragrafiESezioni(R, da, nonCapito) {
  const cap = [];
  const notaDescr = [];
  const DESCRITTIVI = /^(Identità|Condotta|Comportamento|Impiego|Impiego e PX|Fonte di riferimento|Descrizione|Aspetto|Aspetto e condotta|Aspetto e incontro|Alimentazione e famiglia)$/;
  const spingi = (nome, testo) => { if (DESCRITTIVI.test(nome)) notaDescr.push(`${nome}. ${testo}`); else cap.push({ nome, effetto: testo }); };
  let i = da;
  while (i < R.length) {
    const t = R[i].t;
    if (/^#\s/.test(t)) { i += 1; continue; }
    if (/^##\s/.test(t)) {
      const nome = t.replace(/^##\s*/, '');
      const corpo = [];
      let j = i + 1;
      while (j < R.length && !/^#/.test(R[j].t)) { corpo.push(R[j].t); j += 1; }
      const prosa = corpo.filter((x) => x.length > 60 || /[.:;]$/.test(x));
      const celle = corpo.filter((x) => !(x.length > 60 || /[.:;]$/.test(x)));
      if (celle.length) nonCapito.push(`Sezione «${nome}»: ${celle.length} celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: ${celle.slice(0, 4).join(' | ')}…)`);
      if (prosa.length || celle.length) {
        // paragrafi «Nome. testo» dentro la sezione restano nel testo della sezione (non si perde nulla)
        spingi(nome, [prosa.join(' '), celle.length ? `Tabella (celle in ordine di lettura): ${celle.join(' | ')}.` : ''].filter(Boolean).join(' '));
      }
      i = j; continue;
    }
    const m = t.match(/^([A-ZÀ-ÙÈ][^.:]{1,60})\.\s+(.+)$/) || t.match(/^([A-ZÀ-ÙÈ][A-Za-zÀ-ù’ ]{2,40}):\s+(.+)$/);
    if (m && t.length > 60) { spingi(m[1], m[2]); i += 1; continue; }
    if (t.length > 60) { notaDescr.push(t); i += 1; continue; }
    let j = i;
    const celle = [];
    while (j < R.length && !/^#/.test(R[j].t) && R[j].t.length <= 60 && !/\.$/.test(R[j].t)) { celle.push(R[j].t); j += 1; }
    if (celle.includes('Attacco') && celle.length >= 6 && /^(VA|Giovane|Adulto)/.test(celle.slice(1).join('|')) === false && celle.some((x) => /^VA \d+ •/.test(x))) {
      nonCapito.push(`Tabella degli attacchi a colonne per variante (${celle.length} celle): letta come attacchi, non ripetuta fra le capacità`);
    } else {
      // le colonne non si ricostruiscono: le celle restano come testo, in ordine di lettura, sotto il titolo della tabella
      cap.push({ nome: celle[0], effetto: `Tabella (celle in ordine di lettura): ${celle.slice(1).join(' | ')}.` });
      nonCapito.push(`Tabella «${celle[0]}» (${celle.length} celle) tenuta come testo nelle capacità, in ordine di lettura: le colonne non si ricostruiscono`);
    }
    i = j > i ? j : i + 1;
  }
  return { cap, notaDescr };
}

export function slug(nome) {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\bd[’']/g, 'di ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Classifica le coppie [etichetta, valore] di una colonna nei testi che servono.
function classifica(coppie) {
  const c = { valori: [], mov: [], spazio: [], abil: [], abilCond: [], gs: '', altri: [] };
  for (const [e, v] of coppie) {
    if (/^GS e PX/.test(e)) c.gs = v;
    else if (e === 'GS') c.gsNome = v;
    else if (/^PX per 4 PG$/.test(e)) c.pxT = v;
    else if (/^Movimento|^Nuoto$|^Passo/.test(e)) c.mov.push([e, v]);
    else if (/^Ingombro completo$/.test(e)) { c.spazio.unshift(v); c.completo = true; }
    else if (/^Ingombro parziale$/.test(e)) c.altri.push([e, v]);
    else if (/^(Ingombro|Spazio|Dimensioni|Gruppo e spazio)/.test(e)) { c.spazio.push(v); if (!/^(Ingombro|Spazio sulla mappa)$/.test(e) || /Sensi/.test(e)) c.altri.push([e, v]); }
    else if (/^Abilità condizionata$/.test(e)) c.abilCond.push(v);
    else if (/^(Abilità|Altre Abilità|Abilità offensive|Abilità e sensi)$/.test(e)) c.abil.push(v);
    else if (/^(Caratteristiche|Risorse|Risorse e protezioni|Risorse individuali|Armatura|Protezioni e Difese|Protezioni|Difese e Salvezze|Salvezze|Iniziativa e Azioni|Iniziativa e azioni)$/.test(e)) c.valori.push(v);
    else if (/^Dimensioni e spazio$/.test(e)) c.spazio.push(v);
    else c.altri.push([e, v]);
  }
  if (!c.gs && c.gsNome && c.pxT) {
    const m = c.pxT.match(/^(\d+)(\s+provvisori)?/);
    if (m) c.gs = c.gsNome + ' • ' + m[1] + ' PX' + (m[2] ? ' provvisori' : '');
  }
  return c;
}

// Legge una scheda (o una colonna di una scheda a due colonne) e produce { id, nome, json, nonCapito, ... }
// AC dichiarata da una pagina di blocco («Gli attacchi producono AC 1»): vale per le schede che la seguono, finché un'altra pagina non la riscrive (lotto 143)
const RE_AC_ATTACCHI = /(?<!\b(?:[Ii]l|[Ll]a|[Ll]o|[Ll]’)\s?\w+\s)produc\w+(?:\s+\w+)?\s+AC\s*(\d+)|ciascun\w* (?:costa|attacco)[^.]*AC\s*(\d+)|hanno AC\s*(\d+)|\b(?:morsi|attacchi|colpi|attacco)\s+rest\w+\s+AC\s*(\d+)|\brest\w+\s+AC\s*(\d+)/i;
export function acDelBlocco(pagine, riga) {
  let out = null;
  for (const p of pagine) {
    if (p.riga >= riga) continue;
    const m = p.righe.map((x) => x.t).join(' ').match(RE_AC_ATTACCHI);
    if (m && (out === null || p.riga > out.riga)) out = { riga: p.riga, titolo: p.titolo, ac: m.slice(1).find((x) => x !== undefined) };
  }
  return out;
}

export function leggiScheda(sch, comuni = [], colonna = null, blocco = null) {
  const R = sch.righe;
  const nonCapito = [];
  const baseNome = titolo(R[0].t);
  const sottotitolo = R[1] && !/^(Campo|Dato)$/.test(R[1].t) ? R[1].t : '';
  const tab = leggiTabella(R);
  if (!tab) return { id: slug(baseNome), nome: baseNome, json: null, nonCapito: ['Nessuna tabella dei dati'], esclusa: 'nessuna tabella dei dati' };
  const nome = colonna === null ? baseNome : nomeColonna(baseNome, tab.colonne[colonna]);
  const o = { formato: 'mutant-nemico', versione: 1, id: slug(nome), nome, fonte: `${FONTE}, cap. ${/^7\./.test(R[0].t.replace(/^#\s*/, '')) ? '7 «Fauna di Iris»' : '8 «Catalogo delle creature»'} — ${nome}` };
  const coppie = coppieColonna(tab.righe, colonna === null ? 0 : colonna);
  const k = classifica(coppie);
  const valori = k.valori.join(' | ').replace(/\s·\s/g, ' • ');
  const mancano = [];

  // Caratteristiche
  const car = {};
  for (const s of SIGLE) { const m = valori.match(new RegExp(`\\b${s}\\s+(\\d+)`)); if (m) car[s] = +m[1]; }
  const lacune = SIGLE.filter((s) => !(s in car));
  if (Object.keys(car).length) o.caratteristiche = car;
  if (lacune.length) nonCapito.push(`Caratteristiche assenti nel manuale: ${lacune.join(', ')} (restano assenti)`);

  // PV, PM
  const pv = valori.match(/\bPV\s+(\d[\d.]*)/) || valori.match(/Corpo:\s*(\d+)\s*PV/);
  if (pv) o.pv = +pv[1].replace(/\./g, ''); else mancano.push('PV');
  if (/Corpo:\s*\d+\s*PV/.test(valori)) nonCapito.push(`PV in più parti (${valori.match(/Corpo:[^|]*?(?= • PM|;|$)/)?.[0]}): il formato ha un solo valore, vale quello del corpo; il resto sta nelle note`);
  const pm = valori.match(/\bPM(?:\s+personali)?\s+(\d+)/);
  if (pm) o.pm = +pm[1];

  // AR
  let ar;
  if ((ar = valori.match(/AR totale\s+(\d+)\s*:\s*(\d+)\s*biologic[ao]\s*\+\s*(\d+)\s*magic[ao]/))) o.ar = { totale: +ar[1], magica: +ar[3] };
  else if ((ar = valori.match(/AR totale\s+(\d+):\s*(\d+)\s*(?:biologic[ao]|corporea)\s*\+\s*(\d+)\s*magic[ao]/))) o.ar = { totale: +ar[1], magica: +ar[3] };
  else if ((ar = valori.match(/\bAR\s+(\d+):\s*(\d+)\s*(?:biologic[ao]|corporea)\s*\+\s*(\d+)\s*magic[ao]/))) o.ar = { totale: +ar[1], magica: +ar[3] };
  else if ((ar = valori.match(/\bAR(?: totale)?\s+(\d+),\s*di cui\s+(\d+)\s*magic/))) o.ar = { totale: +ar[1], magica: +ar[2] };
  else if ((ar = valori.match(/AR\s+(\d+)\s+biologic[ao]\s*[,;]\s*(?:di cui\s+)?(\d+)\s+magic/))) o.ar = { totale: +ar[1], magica: +ar[2] };
  else if ((ar = valori.match(/AR\s+(\d+)\s+biologic[ao]\s*;\s*AR magica\s+(\d+)/))) o.ar = { totale: +ar[1] + +ar[2], magica: +ar[2] };
  else if ((ar = valori.match(/AR\s+(\d+)\s*[,;]\s*componente magica\s+(\d+)/))) o.ar = { totale: +ar[1], magica: +ar[2] };
  else if ((ar = valori.match(/\bAR\s+0\b(?!\s*,?\s*\d)/))) o.ar = { totale: 0, magica: 0 }; // totale 0: la parte magica non può essere altro
  else if ((ar = valori.match(/\bAR\s+(\d+)(?![\d/])/)) && (valori.match(/magica\s+(\d+)/) || valori.match(/di cui\s+(\d+)\s*magic/) || valori.match(/(\d+)\s*magic[ao]/))) {
    // forme con varianti d'equipaggiamento («AR 2 con scudo, 1 senza», «AR 3 da Armatura media»): vale il primo numero, cioè la scheda col suo equipaggiamento
    const mg = valori.match(/magica\s+(\d+)/) || valori.match(/di cui\s+(\d+)\s*magic/) || valori.match(/(\d+)\s*magic[ao]/);
    o.ar = { totale: +ar[1], magica: +mg[1] };
    const somma = valori.match(/\bAR\s+\d+[^|•]*?=\s*(\d+)/); // «AR 1 biologica + 2 scudo = 3»: vale il totale scritto
    if (somma) o.ar.totale = +somma[1];
    const riga = valori.match(/\bAR\s+\d+[^|]*/)?.[0] ?? '';
    if (/\bsenza\b|\bcontro\b|\boppure\b|\ba riposo\b|\bda\s+armatura/i.test(riga)) nonCapito.push('AR con varianti o origine scritte («' + riga.trim().slice(0, 90) + '»): letto il primo valore come AR della scheda; da controllare');
  } else mancano.push('AR (totale e componente magica)');

  // Difese e Salvezze
  const dif = valori.match(/\bDifese\s+(\d+)/);
  const par = !dif && valori.match(/\bParata\s+(\d+)\s*•\s*Schivata[^0-9]*(\d+)/);
  if (dif) o.difese = +dif[1];
  else if (par) { o.difese = +par[1]; nonCapito.push('Due Difese scritte (Parata ' + par[1] + ', Schivata/Elusione ' + par[2] + '): il formato ha un solo valore, letto la Parata; da controllare'); }
  else mancano.push('Difese');
  const salv = {}; const senza = [];
  for (const [chiave, nomeS] of [['tempra', 'Tempra'], ['riflessi', 'Riflessi'], ['volonta', 'Volontà'], ['magia', 'Magia']]) {
    const m = valori.match(new RegExp(`${nomeS}\\s+(\\d+|—)`));
    if (!m) mancano.push(`Salvezza ${nomeS}`);
    else if (m[1] === '—') senza.push(chiave); else salv[chiave] = +m[1];
  }
  o.salvezze = salv;
  if (senza.length) o.senza_salvezza = senza;

  // Iniziativa e Azioni
  const ini = valori.match(/INI\s*([+−-]?\d+)/) || valori.match(/([+−-]\d+)\s*\+\s*1d10/) || valori.match(/1d10\s*\+\s*(\d+)/i) || (/1d10(?!\s*[+−-])/.test(valori) ? ['', '0'] : null);
  if (ini) {
    const v = parseInt(ini[1].replace('−', '-'), 10);
    o.iniziativa = iniziativaCreatura(v);
    if (v < 0) nonCapito.push(`Iniziativa ${v} nel manuale: portata a 0 (Iniziativa mai negativa, lotto 140)`);
    if (!/INI\s*[+−-]?\d+|1d10\s*\+\s*\d+/.test(valori)) nonCapito.push('Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)');
  } else mancano.push('Iniziativa');
  const az = valori.match(/(\d+)\s*AzP\s*(?:\+|e)\s*(\d+)\s*AzM/);
  if (az) o.azioni = { principali: +az[1], movimento: +az[2] };
  else nonCapito.push('Azioni (AzP/AzM) non scritte come «N AzP e M AzM»: campo azioni assente');

  // Movimento
  const mov = leggiMovimentoRighe(k.mov);
  if (mov.passo === undefined && mov.zero) {
    o.movimento = { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' };
    if (mov.volo !== undefined) o.movimento.volo = mov.volo;
    nonCapito.push('Terra 0 o «Immobile» scritto: Passo 0, Corsa e Scatto «non consentito», come nei blocchi già importati');
  } else if (mov.passo === undefined && mov.volo !== undefined) {
    o.movimento = { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: mov.volo };
    nonCapito.push('Solo movimento di volo scritto: Passo a terra 0, Corsa e Scatto «non consentito», volo come scritto');
  } else if (mov.passo === undefined && mov.extra.some((x) => /^Nuoto/i.test(x)) && !mov.extra.some((x) => /^(Terra|Movimento terrestre)/i.test(x))) {
    o.movimento = { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' };
    nonCapito.push('Solo movimento acquatico scritto (Nuoto): Passo 0, Corsa e Scatto «non consentito» a terra, come nei blocchi già importati');
  } else if (mov.passo === undefined) mancano.push('Passo (movimento a terra)');
  else {
    o.movimento = { passo: mov.passo, corsa: mov.corsa, scatto: mov.scatto };
    if (mov.volo !== undefined) o.movimento.volo = mov.volo;
  }
  if (mov.soloEtereo) nonCapito.push('Il solo movimento scritto è quello etereo / nella roccia: usato come Passo, Corsa e Scatto (da controllare)');
  if (mov.passo === undefined && mov.volo !== undefined && !o.movimento) o.movimento = { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: mov.volo };

  // Spazio
  const spT = [...k.spazio, ...k.mov.map(([, v]) => v).filter((v) => /spazio|pedina/i.test(v))].join(' | ');
  const sp = leggiSpazio(spT);
  if (k.completo) nonCapito.push('Due ingombri nel manuale (parziale e completo): scelto il completo per il campo spazio; il parziale resta nella nota (da confermare, A.203)');
  if (sp.spazio) o.spazio = sp.spazio;
  if (sp.oltre) nonCapito.push(`Ingombro ${sp.oltre}: oltre ${LATO_MAX} Q per lato (A.167, domanda A.198): fuori dal campo spazio, nella capacità «Dimensioni e scale»`);
  if (!sp.spazio && !sp.oltre) nonCapito.push('Ingombro non letto: campo spazio assente (vale la Taglia)');
  if (sp.grande) o.taglia = 'grande';

  // Abilità
  const abGrezze = [...k.abilCond];
  const abil = parteAbilita(k.abil.join(' • '), nonCapito, abGrezze);
  const abOk = abil.filter((a) => ABILITA.has(a.nome));
  const abKo = abil.filter((a) => !ABILITA.has(a.nome));
  if (abOk.length) o.abilita = abOk;
  if (abKo.length) nonCapito.push(`Abilità fuori elenco (tenute come testo nelle capacità): ${abKo.map((a) => `${a.nome} ${a.va}`).join(', ')}`);

  // GS e PX
  const gm = k.gs.match(/^(.+?)\s*•\s*(\d+)\s*PX(\s+provvisori)?/);
  let provvisorio = false;
  if (gm) {
    o.gs_px = { gs: gm[1].trim(), px: +gm[2], per_pg: 4 };
    if (gm[3]) { o.gs_px.provvisorio = true; provvisorio = true; }
  } else nonCapito.push(`GS e PX non letti («${k.gs}»): campo gs_px assente`);

  // Attacchi
  let inizioAtt = tab.fine;
  if (R[inizioAtt] && /^##\s*Attacchi$/.test(R[inizioAtt].t) && R[inizioAtt + 1] && R[inizioAtt + 1].t === 'Attacco') inizioAtt += 1;
  const att = leggiAttacchi(R, inizioAtt);
  o.attacchi = [];
  const cap = [];
  let moltiplicatore = false;
  const testoTutto = R.map((x) => x.t).join(' ');
  const testoConComuni = `${testoTutto} ${comuni.map((c) => c.effetto).join(' ')}`;
  const mAc = testoConComuni.match(RE_AC_ATTACCHI);
  let acComune = mAc ? mAc.slice(1).find((x) => x !== undefined) : undefined;
  if (acComune === undefined && blocco) { acComune = blocco.ac; nonCapito.push('AC ' + blocco.ac + ' degli attacchi presa dalla pagina del blocco «' + blocco.titolo + '» (non dalla scheda)'); }
  if (att.attacchi) {
    for (const riga of att.attacchi.righe) {
      const r = leggiAttacco(att.attacchi.intest, riga, nonCapito, acComune);
      if (r.attacco) {
        if (r.attacco.portata_q === null) delete r.attacco.portata_q;
        o.attacchi.push(r.attacco);
        if (/×/.test(r.attacco.danno)) moltiplicatore = true;
      } else if (r.capacita) cap.push(r.capacita);
    }
  } else if (tab.colonne.length && (() => { const nasc = []; const aa = attacchiAColonne(R, tab.colonne, colonna, nonCapito, acComune, nasc); for (const n of nasc) cap.push({ nome: n.nome, effetto: 'VA ' + n.va + '. Danno: ' + n.danno + ' ' + n.natura + '. Portata non scritta nel manuale per questo attacco.' }); if (aa.length) { o.attacchi.push(...aa); return true; } return false; })()) {
    // letti dalla tabella a colonne
  } else if (!/Attacchi?:\s*nessuno|Attacchi efficaci:\s*nessuno|non possiede attacchi/i.test(testoTutto)) {
    nonCapito.push('Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità');
  }

  // Resto: capacità
  const { cap: capR, notaDescr } = paragrafiESezioni(R, att.attacchi ? att.fine : tab.fine, nonCapito);
  for (const c of capR) {
    if (!att.attacchi) {
      const a = attaccoInProsa(c.nome, c.effetto, nonCapito, acComune);
      if (a) { o.attacchi.push(a); continue; }
    }
    const voce = { nome: c.nome, effetto: c.effetto };
    if (/^Soffio/.test(c.nome) || /^Soffio\b/.test(c.effetto)) {
      const m = c.effetto.match(/(\d+)\s*AzP\s*e\s*(\d+)\s*PM/);
      if (m) { voce.azioni = { principali: +m[1] }; voce.risorsa = `${m[2]} PM`; }
      const lim = c.effetto.match(/ogni\s+(\d+)\s+Round/);
      if (lim) voce.limiti = `ogni ${lim[1]} Round`;
    }
    cap.push(voce);
  }
  for (const c of comuni) cap.push(c);
  if (mov.extra.length) cap.push({ nome: 'Altri movimenti', effetto: mov.extra.join('; ') });
  if (sp.oltre) cap.push({ nome: 'Dimensioni e scale', effetto: `Ingombro del corpo ${sp.oltre}, come scritto nel manuale («${spT}»). Oltre il limite di ${LATO_MAX} Q per lato della mappa (A.167): il campo Spazio non è impostato e il master regola la pedina a mano. Domanda A.198.` });
  if (abKo.length || abGrezze.length) cap.push({ nome: 'Abilità particolari', effetto: [...abKo.map((a) => `${a.nome} ${a.va}`), ...abGrezze].join('; ') });
  if (cap.length) o.capacita = cap;

  // nota: sottotitolo, descrizioni, campi non strutturati (sensi, protezioni specifiche…), piè di tabella
  const nota = [];
  const chiudi = (x) => (/[.!?]$/.test(x) ? x : `${x}.`);
  if (sottotitolo) nota.push(chiudi(sottotitolo));
  for (const [e, v] of k.altri) nota.push(`${e}: ${v}.`.replace(/\.\.$/, '.'));
  for (const n of notaDescr) nota.push(n);
  for (const x of att.note) nota.push(x);
  const pvParti = valori.match(/Corpo:[^|;]*?(?= • PM|$)/);
  if (pvParti) nota.push(`Risorse nel manuale: ${pvParti[0].trim()}.`);
  if (moltiplicatore) nota.push('Il danno «NdM × k» è il risultato dei dadi moltiplicato per k; il dado non si tira da solo (A.199).');
  if (provvisorio) nota.push('GS e PX provvisori nel manuale: da verificare al tavolo (Davide li confermerà).');
  if (nota.length) o.note = nota.join(' ');

  if (mancano.length) nonCapito.push(`MANCANO campi obbligatori: ${mancano.join(', ')}`);
  const esclusa = NON_CREATURE[baseNome] ?? (mancano.length ? `mancano nel manuale o non sono leggibili: ${mancano.join(', ')}` : null);
  return {
    id: o.id, nome, json: esclusa ? null : o, anteprima: o, nonCapito, esclusa, provvisorio, oltre12: sp.oltre ?? null, moltiplicatore, riga: sch.riga,
    testo: R.map((x) => x.t).join(' | '),
  };
}

function nomeColonna(base, col) {
  if (/^(giovane|adulto|adulta|cucciolo)$/i.test(col)) return `${base} ${col.toLowerCase()}`;
  // un nome di colonna d'una sola parola («Capobranco») si confonde con altre creature: si aggiunge il nome della scheda
  if (!/\s/.test(col)) return `${col} (${base})`;
  return col;
}

// ---------- il lavoro sul testo intero ----------
export function importa(testo) {
  const R = leggiRighe(testo);
  const { schede, pagine } = dividi(R);
  const comuniPer = (nome) => {
    const out = [];
    for (const g of GRUPPI_COMUNI) {
      if (!g.per.test(nome)) continue;
      for (const p of pagine) {
        if (!g.pagine.test(p.titolo)) continue;
        let corrente = { nome: p.titolo, corpo: [] };
        const sezioni = [];
        for (const r of p.righe.slice(1)) {
          if (/^##\s/.test(r.t)) { sezioni.push(corrente); corrente = { nome: r.t.replace(/^##\s*/, ''), corpo: [] }; } else corrente.corpo.push(r.t);
        }
        sezioni.push(corrente);
        for (const s of sezioni) {
          if (SEZIONI_NON_REGOLE.test(s.nome)) continue;
          const prosa = s.corpo.filter((x) => x.length > 60 || /[.:;]$/.test(x)).join(' ');
          const celle = s.corpo.filter((x) => !(x.length > 60 || /[.:;]$/.test(x)));
          // le colonne non si ricostruiscono: le celle restano come testo, in ordine di lettura (forme umanoidi, movimento…)
          const testoSez = [prosa, celle.length ? `Tabella (celle in ordine di lettura): ${celle.join(' | ')}.` : ''].filter(Boolean).join(' ');
          if (testoSez) out.push({ nome: s.nome, effetto: testoSez });
        }
      }
    }
    return out;
  };
  const risultati = [];
  for (const s of schede) {
    const base = titolo(s.righe[0].t);
    const tab = leggiTabella(s.righe);
    const colonne = tab && tab.colonne.length ? [0, 1] : [null];
    for (const c of colonne) {
      const nomeFinale = c === null ? base : nomeColonna(base, tab.colonne[c]);
      const comuni = comuniPer(nomeFinale);
      const r = leggiScheda(s, comuni, c, acDelBlocco(pagine, s.riga));
      if (comuni.length) r.nonCapito.push(`Pagine comuni del blocco: ${comuni.length} sezioni aggiunte alle capacità; le tabelle delle pagine comuni non sono importate (i valori per creatura sono nella scheda)`);
      risultati.push(r);
    }
  }
  return { risultati, pagine };
}

// ---------- confronto con quanto c'è già ----------
export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function leggiEsistenti(radiceEsempi = join(RADICE, 'esempi/nemici')) {
  const m = new Map();
  const visita = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) visita(join(d, f.name));
      else if (f.name.endsWith('.json')) { const n = JSON.parse(readFileSync(join(d, f.name), 'utf8')); m.set(norm(n.nome), { file: join(d, f.name), nemico: n }); }
    }
  };
  visita(radiceEsempi);
  return m;
}
export function differenze(nuovo, vecchio) {
  const d = [];
  for (const k of ['pv', 'pm', 'difese', 'iniziativa']) if (nuovo[k] !== vecchio[k]) d.push(`${k}: ${vecchio[k]} → ${nuovo[k]}`);
  if (JSON.stringify(nuovo.ar) !== JSON.stringify(vecchio.ar)) d.push(`ar: ${JSON.stringify(vecchio.ar)} → ${JSON.stringify(nuovo.ar)}`);
  for (const s of SIGLE) if (nuovo.caratteristiche?.[s] !== vecchio.caratteristiche?.[s]) d.push(`${s}: ${vecchio.caratteristiche?.[s]} → ${nuovo.caratteristiche?.[s]}`);
  for (const s of ['tempra', 'riflessi', 'volonta', 'magia']) if (nuovo.salvezze?.[s] !== vecchio.salvezze?.[s]) d.push(`salvezza ${s}: ${vecchio.salvezze?.[s]} → ${nuovo.salvezze?.[s]}`);
  for (const k of ['passo', 'corsa', 'scatto', 'volo']) if (nuovo.movimento?.[k] !== vecchio.movimento?.[k]) d.push(`movimento ${k}: ${vecchio.movimento?.[k]} → ${nuovo.movimento?.[k]}`);
  if ((nuovo.gs_px?.gs) !== (vecchio.gs_px?.gs) || nuovo.gs_px?.px !== vecchio.gs_px?.px) d.push(`GS/PX: ${vecchio.gs_px?.gs} ${vecchio.gs_px?.px} → ${nuovo.gs_px?.gs} ${nuovo.gs_px?.px}`);
  if ((nuovo.spazio ?? null) !== (vecchio.spazio ?? null)) d.push(`spazio: ${vecchio.spazio ?? '—'} → ${nuovo.spazio ?? '—'}`);
  const aV = (n) => (n.attacchi ?? []).map((a) => `${a.nome}:${a.va}:${a.danno}:${a.natura ?? '-'}:AC${a.ac ?? '-'}:${a.portata_q ?? a.gittata_q ?? '-'}`).join(',');
  // l'AC che il manuale non scrive per la scheda non è una differenza: l'app tratta l'assenza come AC 1 (src/attacco.js, crea-nemico.js)
  const nuovoAc = { ...nuovo, attacchi: (nuovo.attacchi ?? []).map((a, i) => (a.ac === undefined && vecchio.attacchi?.[i]?.nome === a.nome ? { ...a, ac: vecchio.attacchi[i].ac } : a)) };
  if (aV(nuovoAc) !== aV(vecchio)) d.push(`attacchi: ${aV(vecchio)} → ${aV(nuovo)}`);
  const ab = (n) => (n.abilita ?? []).map((a) => `${a.nome} ${a.va}`).sort().join(',');
  if (ab(nuovo) !== ab(vecchio)) d.push(`abilità: ${ab(vecchio)} → ${ab(nuovo)}`);
  return d;
}

// Controllo incrociato (lotto 143): per ciò che il parser non sa leggere (attacchi d'arma senza natura, Abilità con condizione)
// si cerca nel testo della scheda il VA e il danno di ogni attacco e il VA di ogni Abilità della scheda già presente.
// Non legge il significato: dice soltanto se il numero scritto nella scheda esiste nel manuale accanto al nome.
export function controlloIncrociato(testo, esistenti) {
  const R = leggiRighe(testo);
  const { schede } = dividi(R);
  const problemi = [];
  const senzaSpazi = (x) => x.replace(/\s+/g, '').replace(/−/g, '-');
  for (const sch of schede) {
    const base = titolo(sch.righe[0].t);
    const e = esistenti.get(norm(base));
    if (!e) continue;
    const t = sch.righe.map((r) => r.t);
    const n = e.nemico;
    for (const a of n.attacchi ?? []) {
      const primo = norm(a.nome.split(/\s\(|\scon PV/)[0]).split(' ')[0];
      let ok = false;
      for (let i = 0; i < t.length && !ok; i += 1) {
        if (!norm(t[i]).startsWith(primo)) continue;
        const vicino = t.slice(i, i + 4);
        if (vicino.slice(1).some((x) => x === String(a.va) || new RegExp('(^|\\D)' + a.va + '(\\D|$)').test(x)) && senzaSpazi(vicino.join('|')).includes(senzaSpazi(a.danno))) ok = true;
      }
      if (!ok) problemi.push({ id: n.id, campo: 'attacco ' + a.nome, detto: 'VA ' + a.va + ', ' + a.danno, perche: 'VA e danno non si trovano accanto al nome nel manuale' });
    }
    const abTesto = t.join(' | ');
    for (const ab of n.abilita ?? []) {
      const nomi = [ab.nome, ...Object.entries(ALIAS_ABILITA).filter(([, v]) => v === ab.nome).map(([k]) => k)];
      const ok = nomi.some((nm) => new RegExp(nm + '[^•|]*?(^|\\D)' + ab.va + '(\\D|$)').test(abTesto));
      if (!ok) problemi.push({ id: n.id, campo: 'abilità ' + ab.nome, detto: String(ab.va), perche: 'il valore non compare accanto al nome nel manuale' });
    }
  }
  return problemi;
}

function argomenti(argv) {
  const a = { scrivi: false };
  for (const x of argv) {
    if (x === '--scrivi') a.scrivi = true;
    else if (x === '--verifica') a.verifica = true;
    else if (x.startsWith('--testo=')) a.testo = x.slice(8);
    else if (x.startsWith('--dest=')) a.dest = x.slice(7);
    else if (x.startsWith('--aggiorna=')) a.aggiorna = x.slice(11).split(',');
    else if (x.startsWith('--json=')) a.json = x.slice(7);
  }
  return a;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = argomenti(process.argv.slice(2));
  const testo = readFileSync(a.testo ?? TESTO_PREDEFINITO, 'utf8');
  const dest = a.dest ?? DEST_PREDEFINITA;
  const { risultati } = importa(testo);
  const esist = leggiEsistenti();
  if (a.verifica) { const p = controlloIncrociato(testo, esist); console.log(p.length ? p.map((x) => x.id + ' — ' + x.campo + ' (' + x.detto + '): ' + x.perche).join(String.fromCharCode(10)) : 'Controllo incrociato: nessuna discordanza.'); process.exit(0); }
  const nuovi = []; const presenti = []; const cambiate = []; const escluse = [];
  for (const r of risultati) {
    const e = esist.get(norm(r.nome));
    if (e) {
      presenti.push(r);
      const d = r.anteprima ? differenze(r.anteprima, e.nemico) : [];
      if (d.length) cambiate.push({ r, d, file: e.file });
    } else if (r.esclusa) escluse.push(r);
    else nuovi.push(r);
  }
  const out = [];
  out.push(`Schede lette: ${risultati.length}. Nuove: ${nuovi.length}. Già nel Bestiario: ${presenti.length} (con differenze sui numeri: ${cambiate.length}). Escluse: ${escluse.length}.`);
  out.push('', '== NUOVE ==', ...nuovi.map((r) => `  ${r.id} — ${r.nome}${r.provvisorio ? ' [PX provvisori]' : ''}${r.oltre12 ? ` [oltre 12 Q: ${r.oltre12}]` : ''}${r.moltiplicatore ? ' [moltiplicatore]' : ''}`));
  out.push('', '== ESCLUSE (non scritte) ==', ...escluse.map((r) => `  ${r.nome}: ${r.esclusa}`));
  out.push('', '== GIÀ PRESENTI CON DIFFERENZE (non si toccano senza --aggiorna=<id>) ==', ...cambiate.map((c) => `  ${c.r.id}: ${c.d.join('; ')}`));
  out.push('', '== NON CAPITO (schede nuove ed escluse) ==');
  for (const r of [...nuovi, ...escluse]) for (const n of r.nonCapito) if (!/^Pagine comuni del blocco/.test(n)) out.push(`  [${r.id}] ${n}`);
  console.log(out.join('\n'));
  if (a.json) writeFileSync(a.json, JSON.stringify({ nuovi: nuovi.map((r) => r.json), escluse: escluse.map((r) => ({ nome: r.nome, motivo: r.esclusa })), cambiate: cambiate.map((c) => ({ id: c.r.id, d: c.d })) }, null, 2));
  if (a.scrivi || a.aggiorna) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    let n = 0;
    for (const r of risultati) {
      if (!r.json) continue;
      const e = esist.get(norm(r.nome));
      if (e && !(a.aggiorna ?? []).includes(r.id)) continue;
      if (!e && !a.scrivi) continue;
      writeFileSync(e ? e.file : join(dest, `${r.id}.json`), JSON.stringify(r.json, null, 2) + '\n');
      n += 1;
    }
    console.log(`\nScritte ${n} schede in ${dest}.`);
  } else console.log('\n(Nessun file scritto: usa --scrivi per scrivere le schede nuove.)');
}
