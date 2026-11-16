// Lotto 141 (Bestiario 0.46, parte 2): l'importatore dal Word (tools/importa-mostri.mjs) e le schede che ha prodotto.
// Il testo è docs/manuali-txt/mostri-0.47.md (Manuale dei Mostri 0.46). Controlli: completezza, nessun dato dedotto,
// PX provvisori segnati, nessun identificativo duplicato né nome che si confonde, regole comuni già approvate.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { testoManuale } from '../tools/manuali.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { importa, leggiEsistenti, leggiRighe, dividi, leggiScheda, norm, slug } from '../tools/importa-mostri.mjs';

const { dati } = await datiReali();
// lotto 203: il corpus viene dalla 0.69, quindi si confronta con quella (nona regola: si legge l'edizione da cui
// vengono i dati, e da questo lotto è la corrente)
const testo = testoManuale('mostri');
const { risultati } = importa(testo);
const esistenti = leggiEsistenti();
const dirMostri = new URL('../esempi/nemici/mostri/', import.meta.url);
const tutteLeSchede = readdirSync(dirMostri).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(readFileSync(new URL(f, dirMostri), 'utf8'))]);

test('completezza: niente di importabile manca dal Bestiario, e il conto del cap. 8 torna (lotto 203: sulla 0.69)', () => {
  const dichiarate = Number(testo.match(/Catalogo delle creature\s+•\s+(\d+)\s+creature/)?.[1]);
  // lotto 203: erano 285 nella 0.46; la 0.69 ne dichiara 424 (il testo porta anche i capitoli dei PNG generici)
  assert.equal(dichiarate, 424, 'il manuale dichiara 424 creature nel capitolo 8');
  // **Lotto 204.** Nel 203 restavano fuori 152 schede: una non è una creatura e 151 erano pagine che il lettore,
  // scritto sull'impaginazione della 0.46, non leggeva per intero sulla 0.69. Il 204 gli ha insegnato
  // l'impaginazione nuova — in sostanza una riga rinominata («Armatura e Difese» per «Protezioni e Difese») — e
  // adesso resta fuori **la sola scheda che non è una creatura**. L'invariante non cambia: **niente di importabile
  // manca**, e ogni scheda fuori dal Bestiario ha un motivo scritto.
  const fuori = risultati.filter((r) => !esistenti.has(norm(r.nome)));
  const senzaMotivo = fuori.filter((r) => !r.esclusa);
  assert.deepEqual(senzaMotivo.map((r) => r.nome), [], 'una scheda importabile che non è nel Bestiario sarebbe una creatura perduta');
  assert.equal(fuori.length, 1, 'dopo il lotto 204 resta fuori solo «Bozzoli di cristallo», che non è una creatura');
  assert.match(fuori[0].esclusa, /non è una creatura/);
  // lotto 204: nel 203 il Bestiario aveva 285 schede del cap. 8 contro le 424 dichiarate dal manuale, e la
  // differenza erano le 151 pagine che il lettore non leggeva. Adesso le legge: il conto deve **tornare**, cioè
  // non possiamo averne meno di quante il manuale ne dichiara meno quelle che restano fuori con un motivo.
  const cap8 = tutteLeSchede.filter(([, n]) => /cap\. 8/.test(n.fonte ?? ''));
  assert.ok(cap8.length >= 424, `le schede del cap. 8 nel Bestiario sono ${cap8.length}, il manuale ne dichiara ${dichiarate}`);
  // ogni scheda che viene dal manuale dichiara da quale edizione, e non una scritta a mano in uno strumento
  const dalWord = tutteLeSchede.filter(([, n]) => /dal Manuale dei Mostri v0\.\d+/.test(n.fonte ?? ''));
  assert.ok(dalWord.length >= 459, `schede con la riga di fonte: ${dalWord.length}`);
  assert.equal(tutteLeSchede.filter(([, n]) => /v0\.46/.test(n.fonte ?? '')).length, 0, 'nessuna scheda può dichiarare ancora la v0.46: l’edizione si chiede al registro');
});

test('validatore: le schede prodotte dall’importatore passano validaNemico e non hanno dati dedotti', () => {
  for (const r of risultati.filter((x) => x.json)) {
    assert.deepEqual(validaNemico(r.json, dati, r.id), [], r.id);
    assert.match(r.json.fonte, /^dal Manuale dei Mostri v0\.\d+/); // lotto 204: l’edizione viene dal registro
    // ogni numero principale della scheda è scritto nel blocco del manuale (niente di calcolato)
    const t = r.testo.replace(/(\d)\.(\d{3})/g, '$1$2');
    for (const k of ['pv', 'pm', 'difese']) if (r.json[k] !== undefined) assert.match(t, new RegExp(`\\b${r.json[k]}\\b`), `${r.id}: ${k} ${r.json[k]} non è nel manuale`);
    for (const [s, v] of Object.entries(r.json.caratteristiche ?? {})) assert.match(t, new RegExp(`\\b${v}\\b`), `${r.id}: ${s} ${v}`);
    for (const [s, v] of Object.entries(r.json.salvezze ?? {})) assert.match(t, new RegExp(`\\b${v}\\b`), `${r.id}: salvezza ${s} ${v}`);
    assert.ok(r.json.iniziativa >= 0, `${r.id}: Iniziativa mai negativa`);
  }
});

test('un dato assente resta assente: Volontà «—» è senza_salvezza, non 0; una Caratteristica assente non compare', () => {
  const blocco = ['# Cosa', 'Costrutto • Natura Comune', 'Campo', 'Valore pronto', 'Caratteristiche', 'FOR 6 • DES 4 • COS 5 • INT — • SAG — • CAR —',
    'Risorse', 'PV 20 • PM 0', 'Armatura', 'AR totale 2, di cui 0 magica', 'Difese e Salvezze', 'Difese 9 • Tempra 10 • Riflessi 8 • Volontà — • Magia 7',
    'Iniziativa e Azioni', '1d10 • 1 AzP e 1 AzM per Round', 'Movimento', 'Terra 4 / 8 / 12 Q Base', 'GS e PX per 4 PG', 'Principiante • 10 PX']
    .map((t, i) => ({ t, n: i + 1 }));
  const r = leggiScheda({ nome: 'Cosa', righe: blocco, riga: 1 }, []);
  assert.deepEqual(r.json.senza_salvezza, ['volonta']);
  assert.equal('volonta' in r.json.salvezze, false);
  assert.deepEqual(r.json.caratteristiche, { FOR: 6, DES: 4, COS: 5 });
  assert.equal(r.json.pm, 0, 'PM 0 scritto nel manuale resta 0');
  assert.equal(r.json.iniziativa, 0);
  assert.equal('spazio' in r.json, false, 'ingombro non scritto: nessun campo');
  assert.equal('azioni' in leggiScheda({ nome: 'Cosa', righe: blocco.map((b) => (/AzP/.test(b.t) ? { ...b, t: '1d10' } : b)), riga: 1 }, []).json, false, 'AzP/AzM non scritte: campo azioni assente');
  // senza un campo obbligatorio la scheda non si scrive
  const senzaPv = leggiScheda({ nome: 'Cosa', righe: blocco.filter((b) => !/^PV/.test(b.t)).map((b) => (b.t === 'Risorse' ? { ...b, t: 'Altro' } : b)), riga: 1 }, []);
  assert.equal(senzaPv.json, null);
  assert.match(senzaPv.esclusa, /PV/);
});

test('PX provvisori della fauna di Iris: segnati come nel manuale, e solo quelli', () => {
  const attesi = {
    lorath: ['Veterano', 50], 'piovra-gigante-di-iris': ['Eroe', 70], 'granchio-modificato': ['Inesperto', 20], 'raptor-di-fuoco-giovane': ['Inesperto', 20],
    'raptor-di-fuoco-adulto': ['Veterano', 50], turk: ['Inesperto', 20], 'vespe-del-deserto': ['Principiante', 10], 'iena-mutata': ['Esperto', 30],
    'capobranco-iene-del-deserto-mutate': ['Veterano', 50], 'murena-della-roccia-cucciolo': ['Inesperto', 20], 'murena-della-roccia-giovane': ['Inesperto', 20],
    'murena-della-roccia-adulta': ['Esperto', 30], 'madre-delle-murene-della-roccia': ['Veterano', 70],
  };
  const trovati = Object.fromEntries(tutteLeSchede.filter(([, n]) => n.gs_px?.provvisorio).map(([, n]) => [n.id, [n.gs_px.gs, n.gs_px.px]]));
  assert.deepEqual(trovati, attesi);
  for (const [, n] of tutteLeSchede.filter(([, x]) => x.gs_px?.provvisorio)) assert.match(n.note ?? '', /provvisori/, n.id);
  // il Lorath della 0.46 (era senza GS)
  assert.deepEqual(tutteLeSchede.find(([, n]) => n.id === 'lorath')[1].gs_px, { gs: 'Veterano', px: 50, per_pg: 4, provvisorio: true });
});

test('A.198 e A.204: i dieci draghi antichi (16 × 10 Q Base) entrano nel campo spazio come 10 × 16 (larghezza × lunghezza), con la pedina 2 × 2 in Q Tattici; nessuna creatura resta fuori dal campo', () => {
  assert.equal(risultati.filter((r) => r.oltre12).length, 0, 'il limite è 20: nessuna creatura oltre');
  const antichi = tutteLeSchede.filter(([, x]) => /^drago-.*-antico$/.test(x.id));
  assert.equal(antichi.length, 10);
  for (const [, n] of antichi) {
    assert.equal(n.spazio, '10 × 16 Q', n.id);
    assert.equal(n.pedina_tattica, '2 × 2 Q', n.id);
    assert.ok(!n.capacita.some((c) => c.nome === 'Dimensioni e scale'), n.id + ': la nota di ripiego se n’è andata');
    assert.equal(n.taglia, 'grande');
  }
  const molt = tutteLeSchede.filter(([, n]) => (n.attacchi ?? []).some((a) => /×/.test(a.danno)));
  assert.equal(molt.length, 38, 'draghi cromatici, metallici e d’ombra, Dracolich (36) e i due Dragomedusa');
  for (const [, n] of molt.filter(([, x]) => !/dragomedusa/.test(x.id))) assert.match(n.note ?? '', /A\.199/, n.id);
  // nessun lato oltre il limite in nessuna scheda nuova
  for (const [, n] of tutteLeSchede) if (n.spazio) for (const x of n.spazio.match(/\d+/g)) assert.ok(+x <= 20, `${n.id}: ${n.spazio}`);
});

test('regole comuni: Iniziativa non negativa, portata 0 Q nello spazio condiviso (A.171), draghi a Q Base e volo da Q Tattici', () => {
  const n = (id) => tutteLeSchede.find(([, x]) => x.id === id)[1];
  assert.equal(n('vespe-del-deserto').attacchi.find((a) => a.nome === 'Puntura').portata_q, 0);
  assert.deepEqual(n('drago-bianco-giovane').movimento, { passo: 8, corsa: 16, scatto: 24, volo: 80 }, '8 Q Tattici di volo = 80 Q Base');
  assert.equal(n('drago-bianco-giovane').spazio, '4 × 6 Q', 'A.204: corpo 6 × 4 (lunghezza × larghezza) = 4 × 6 nel campo (larghezza × lunghezza)');
  assert.equal(n('drago-rosso-adulto').attacchi[0].danno, '8d10×5');
  // lotto 203: 1.400 nella 0.46, 1.820 nella 0.69 — il +30% applicato **una volta** dal manuale (1400 × 1,30).
  // È un secondo caso di controllo del doppio aumento: 2.366 sarebbe il +30% applicato due volte.
  assert.equal(n('drago-rosso-adulto').pv, 1820);
  assert.notEqual(n('drago-rosso-adulto').pv, Math.ceil(1400 * 1.3 * 1.3), 'il doppio +30%');
  assert.equal(n('turk').iniziativa, 0, '«1d10» senza bonus: INI 0');
  // PV in più parti: il corpo e i tentacoli nella nota/capacità, mai sommati
  // lotto 203: 60 nella 0.46, 78 nella 0.69 (60 × 1,30, una volta sola)
  assert.equal(n('piovra-gigante-di-iris').pv, 78);
  // lotto 204: la 0.69 scrive «Corpo: 78 PV • ogni tentacolo: 39 PV» (i 60 e 30 della 0.46 col +30% del §4.2,
  // applicato **una volta** dal manuale). Si prende il numero stampato, non si rifà la moltiplicazione.
  assert.match(n('piovra-gigante-di-iris').note, /ogni tentacolo: 39 PV/);
});

test('identificativi unici e nomi che non si confondono (difetto trovato con gli incantesimi, lotto 131)', () => {
  const tutti = [];
  (function visita(d) {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) visita(new URL(`${f.name}/`, d)); else if (f.name.endsWith('.json')) tutti.push([f.name, JSON.parse(readFileSync(new URL(f.name, d), 'utf8'))]);
    }
  })(new URL('../esempi/nemici/', import.meta.url));
  const ids = new Map();
  for (const [file, n] of tutti) { assert.equal(`${n.id}.json`, file, `${file}: id uguale al nome del file`); assert.ok(!ids.has(n.id), `id duplicato ${n.id}`); ids.set(n.id, n.nome); }
  // chiave «morbida»: senza accenti, apostrofi, articoli e preposizioni («Drago di ottone» = «Drago d’ottone»)
  const chiave = (nome) => norm(nome).split(' ').filter((p) => !['di', 'd', 'del', 'della', 'dei', 'delle', 'dell', 'e', 'o'].includes(p)).join(' ');
  const viste = new Map();
  for (const [, n] of tutti) {
    const k = chiave(n.nome);
    assert.ok(!viste.has(k), `nomi che si confondono: «${n.nome}» e «${viste.get(k)}»`);
    viste.set(k, n.nome);
  }
  assert.equal(slug('Drago d’ottone cucciolo'), 'drago-di-ottone-cucciolo');
});

test('l’importatore legge come le schede già nel Bestiario: PV, PM, Difese, AR, Caratteristiche, Salvezze, GS e PX uguali per tutte', () => {
  let confrontate = 0;
  for (const r of risultati) {
    const e = esistenti.get(norm(r.nome));
    if (!e || !r.anteprima) continue;
    const a = r.anteprima; const v = e.nemico; confrontate += 1;
    for (const k of ['pv', 'pm', 'difese']) if (a[k] !== undefined) assert.equal(a[k], v[k], `${r.id}: ${k}`);
    if (a.ar) assert.deepEqual(a.ar, v.ar, `${r.id}: ar`);
    for (const s of Object.keys(a.caratteristiche ?? {})) assert.equal(a.caratteristiche[s], v.caratteristiche?.[s], `${r.id}: ${s}`);
    for (const s of Object.keys(a.salvezze ?? {})) assert.equal(a.salvezze[s], v.salvezze?.[s], `${r.id}: salvezza ${s}`);
    if (a.gs_px) assert.deepEqual([a.gs_px.gs, a.gs_px.px], [v.gs_px?.gs, v.gs_px?.px], `${r.id}: gs`);
  }
  assert.ok(confrontate >= 300, `confrontate ${confrontate}`);
});

test('il testo è diviso in schede e pagine: nessuna scheda perde il titolo', () => {
  const { schede } = dividi(leggiRighe(testo));
  // lotto 203: 306 nella 0.46, 458 nella 0.69
  assert.equal(schede.length, 458, 'le schede del testo della 0.69');
  for (const s of schede) assert.match(s.righe[0].t, /^# /);
});
