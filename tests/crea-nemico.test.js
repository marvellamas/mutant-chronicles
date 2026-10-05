// «Crea nemico» del Tavolo del Master (src/crea-nemico.js): profili dal Bestiario proposto (data/bestiario.json).
// Le creature pronte del cap. 5 calcolate dal motore coincidono con le tabelle del documento; i casi della richiesta
// di Marcello del 03/10: Insettoide Medio con 2 Mutazioni, Umano Corrotto di livello 2, «a caso» con un seme fisso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { profiloNemico, scelteCreatura, fileUmano, aCaso, ritiraPasso, difficolta, frazioneScontro } from '../src/crea-nemico.js';

const { dati } = await datiReali();
const md = readFileSync(new URL('../docs/bestiario/bestiario.md', import.meta.url), 'utf8').split(/\r?\n/);
const B = dati.bestiario;
const pulisci = (s) => s.replace(/\*\*/g, '').trim();
const celle = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(pulisci);
const numero = (s) => Number(String(s).replace(',', '.'));

/** Righe della prima tabella dopo il titolo che contiene `titolo`, come mappa prima colonna → celle. */
function tabella(titolo, n = 0) {
  let i = md.findIndex((r) => /^#+\s/.test(r) && pulisci(r).includes(titolo));
  assert.ok(i >= 0, titolo);
  const out = [];
  for (; out.length <= n && i < md.length; i++) {
    if (md[i].startsWith('|') && /^\|\s*:?-{3,}/.test(md[i + 1] ?? '')) {
      const righe = [];
      let j = i + 2;
      for (; md[j]?.startsWith('|'); j++) righe.push(celle(md[j]));
      out.push({ testa: celle(md[i]), righe });
      i = j;
    }
  }
  return out[n];
}
const perRiga = (t) => new Map(t.righe.map((r) => [r[0], r.slice(1)]));

// --- creature pronte: il motore contro le tabelle del cap. 5 ----------------------------------------------
const umani = Object.fromEntries(['recluta', 'veterano', 'elite'].map((s) => [`eretico-${s}`, JSON.parse(readFileSync(new URL(`../esempi/nemici/umani/eretico-${s}.json`, import.meta.url), 'utf8'))]));
// tutte le creature dei dati (cap. 5): il paragrafo e il primo attacco della scheda
const BE_ATTACCO = (c) => profiloNemico(scelteCreatura(c.id, c.gradi[0], {}, dati), dati, { umani }).nemico.attacchi[0].nome;
const ATTACCO = { 'eretico-corrotto': 'Pugnale da combattimento' };
const CREATURE = B.creature.map((c) => [c.id, `${c.paragrafo.slice(1)} ${c.nome}`, ATTACCO[c.id] ?? BE_ATTACCO(c)]);
test('creature pronte: tre per ogni base non umana, ruoli nel §5.1, almeno una Corrotta e una con il Boss', () => {
  const perBase = Object.groupBy(B.creature.filter((c) => c.base !== 'umano'), (c) => c.base);
  for (const [base, lista] of Object.entries(perBase)) {
    assert.ok(lista.length >= 3, base);
    assert.ok(lista.some((c) => c.moduli.corrotto || c.boss?.moduli?.corrotto), `${base}: Corrotta`);
    assert.ok(lista.some((c) => c.boss), `${base}: Boss`);
  }
  const ruoli = tabella('5.1 Lettura delle creature pronte');
  assert.deepEqual(ruoli.righe.map((r) => pulisci(r[0]).replace(/ \(§.*$/, '')), B.creature.map((c) => c.nome));
});
for (const [id, titolo, attacco] of CREATURE) {
  test(`creatura pronta: ${titolo} come la tabella del cap. 5 (PV, AR, attacco, Difese, PS, Iniziativa, AzP)`, () => {
    const t = tabella(titolo);
    const righe = perRiga(t);
    const colonne = t.testa.slice(1);
    colonne.forEach((col, i) => {
      const boss = col.startsWith('Boss');
      const nomeGrado = boss ? /\((.+?)(,|\))/.exec(col)[1] : col.replace(/\s*\(.*$/, '');
      const g = B.gradi.find((x) => x.nome === nomeGrado);
      const { nemico: n, errori: e, avvisi } = profiloNemico(scelteCreatura(id, g.id, { boss }, dati), dati, { umani });
      assert.deepEqual(e, [], col);
      assert.deepEqual(avvisi, [], col);
      assert.deepEqual(validaNemico(n, dati, id), [], col);
      const ar = /^(\d+) \((\d+)\)$/.exec(righe.get('AR (di cui magica)')[i]);
      const [va, danno] = righe.get(`${attacco}: VA, danno`)[i].split(', ');
      const a = n.attacchi.find((x) => x.nome === attacco);
      const ps = righe.get('PS Tempra · Riflessi · Volontà · Magia')[i].split(' · ').map(Number);
      const azp = Number(/^(\d+) AzP/.exec(righe.get('Azioni')[i])[1]);
      // natura dell'attacco: nella cella (Eretico) o nella nota sotto la tabella («Morso: natura **Etereo**»)
      const [dadi, naturaCella] = danno.split(' ');
      const nota = md.find((r) => r.startsWith(`${attacco}: natura`) && md.indexOf(r) > md.findIndex((x) => x.includes(titolo)));
      const natura = naturaCella ?? (nota ? pulisci(/natura ([^,(]+)/.exec(nota)[1]) : 'Naturale');
      assert.deepEqual(
        [n.pv, n.ar.totale, n.ar.magica, a.va, a.danno, a.natura, n.difese, [n.salvezze.tempra, n.salvezze.riflessi, n.salvezze.volonta, n.salvezze.magia], n.iniziativa, n.azioni.principali],
        [numero(righe.get('PV')[i]), Number(ar[1]), Number(ar[2]), Number(va), dadi, natura, numero(righe.get('VA Difese')[i]), ps, numero(righe.get('Iniziativa')[i]), azp],
        `${titolo}, ${col}`,
      );
      const immunita = righe.get('Immunità')[i];
      assert.deepEqual((n.immunita ?? []).map((s) => dati.regole.stati.elenco.find((x) => x.id === s).nome).sort(), immunita === '—' ? [] : immunita.split(', ').sort(), `${titolo}, ${col}: immunità`);
    });
  });
}

test('Eretico corrotto: file del bestiario umano per grado; Comandante e Campione da preparare', () => {
  assert.equal(fileUmano('eretico', 'medio'), 'eretico-elite');
  assert.equal(fileUmano('eretico', 'potente'), null);
  const r = profiloNemico({ base: 'umano', tipoUmano: 'eretico', grado: 'potente', mutazioni: [] }, dati, { umani });
  assert.equal(r.nemico, null);
  assert.match(r.errori[0], /Comandante da preparare/);
});

// --- casi della richiesta ----------------------------------------------------------------------------------
const umano = (id) => JSON.parse(readFileSync(new URL(`../esempi/nemici/umani/${id}.json`, import.meta.url), 'utf8'));

test('Insettoide Medio con 2 Mutazioni (Carapace, Veleno): valori e provenienza, senza costo né grado effettivo (A.97)', () => {
  const r = profiloNemico({ base: 'insettoide', grado: 'medio', mutazioni: ['carapace', 'veleno'] }, dati);
  const n = r.nemico;
  assert.deepEqual([r.errori, r.avvisi, validaNemico(n, dati)], [[], [], []]);
  assert.deepEqual([n.pv, n.ar, n.difese, n.movimento, n.azioni.principali], [59, { totale: 5, magica: 0 }, 13, { passo: 6, corsa: 12, scatto: 18 }, 2]);
  assert.deepEqual([n.attacchi[0].nome, n.attacchi[0].va, n.attacchi[0].danno, n.attacchi[0].natura], ['Mandibole', 15, '2d6+1', 'Naturale']);
  assert.match(n.capacita.find((c) => c.nome === 'Veleno').effetto, /1d6 danni .*PS di Tempra senza modificatori/);
  assert.ok(n.capacita.some((c) => c.nome === 'Carapace'));
  assert.deepEqual(n.immunita, ['terrorizzato']);
  // provenienza: base + modulo
  assert.deepEqual(r.provenienza.ar.map((x) => [x.fonte, x.valore]), [['Insettoide Medio (§3.3)', 4], ['Carapace (§4.3)', 1]]);
  assert.deepEqual(r.provenienza.passo.map((x) => x.valore), [8, -2]);
  // A.97 (E&L del 05/10/2026): nessun costo dei moduli né grado effettivo; Round di resistenza del grado (stima)
  assert.deepEqual([r.costo, r.effettivo, r.round.grado, n._bestiario.grado_effettivo], [undefined, undefined, 4.5, undefined]);
  assert.match(n.fonte, /^Bestiario, proposta: Insettoide Medio, Carapace, Veleno$/);
  // una Mutazione non ammessa per la base si segnala e non si applica
  const x = profiloNemico({ base: 'aracnoide', grado: 'medio', mutazioni: ['ali-membranose'] }, dati);
  assert.match(x.avvisi[0], /Ali membranose: non ammessa per Aracnoide/);
});

test('Umano Corrotto di livello 2 (Posseduto): il Fante Capitol Veterano con le Manifestazioni', () => {
  const u = umano('fante-capitol-veterano');
  const r = profiloNemico({ base: 'umano', tipoUmano: 'fante-capitol', grado: 'semplice', corrotto: { livello: 'posseduto', minori: ['sussurro-continuo'], maggiori: ['fiamma-nera'] } }, dati, { umani: { 'fante-capitol-veterano': u } });
  const n = r.nemico;
  assert.deepEqual([r.errori, r.avvisi, validaNemico(n, dati)], [[], [], []]);
  // A.79: PV, AzP e danni del convertitore; §4.2.2: +1 AR magica, +2 Volontà, mischia Magico; Fiamma nera: Fuoco in mischia
  assert.deepEqual([n.pv, n.azioni.principali, n.ar, n.salvezze.volonta], [u.pv, u.azioni.principali, { totale: u.ar.totale + 1, magica: 1 }, u.salvezze.volonta + 2]);
  const mischia = n.attacchi.find((a) => a.tipo === 'ravvicinato');
  const distanza = n.attacchi.find((a) => a.tipo === 'distanza');
  assert.deepEqual([mischia.natura, mischia.proprieta], ['Magico', ['Fuoco']]);
  assert.equal(distanza.natura, 'Naturale');
  assert.equal(distanza.danno, u.attacchi.find((a) => a.tipo === 'distanza').danno, 'nessun bonus di grado (A.79)');
  assert.deepEqual(['Presenza terrificante', 'Sussurro continuo', 'Fiamma nera', 'Esposizione alla Corruzione'].map((c) => n.capacita.some((x) => x.nome === c)), [true, true, true, true]);
  assert.match(n.capacita.find((x) => x.nome === 'Esposizione alla Corruzione').effetto, /^Debole \(PS di Magia \+2/);
  assert.deepEqual([r.costo, r.effettivo], [undefined, undefined]); // A.97: nessun costo dei moduli
  assert.equal(n.nome, 'Fante Capitol posseduto Semplice');
  assert.match(n.note, /Natura: Oscura Simmetria\./);
  // il file del grado manca: errore chiaro
  assert.match(profiloNemico({ base: 'umano', tipoUmano: 'fante-capitol', grado: 'medio' }, dati).errori[0], /manca fante-capitol-elite\.json/);
});

test('Equipaggiamento (§4.4): l’Umanoide Medio con la fascia successiva usa il VA degli Artigli', () => {
  const r = profiloNemico({ base: 'umanoide-mostruoso', grado: 'medio', equipaggiamento: { fascia: 'grado-successivo' } }, dati);
  const n = r.nemico;
  assert.deepEqual([r.avvisi, validaNemico(n, dati)], [[], []]);
  const per = Object.fromEntries(n.attacchi.map((a) => [a.nome, [a.va, a.danno]]));
  assert.deepEqual(per, { Artigli: [15, '2d6+3'], Spadone: [15, '2d6+4'], 'Mitragliatore leggero': [13, '1d8+5'] });
  assert.equal(n.ar.totale, 5); // l'armatura pesante (5) sostituisce l'AR naturale (2); A.97: nessun costo
  // non ammesso per le altre basi
  assert.match(profiloNemico({ base: 'insettoide', grado: 'medio', equipaggiamento: { fascia: 'del-grado' } }, dati).avvisi[0], /solo per Umano e Umanoide mostruoso/);
});

test('«a caso» con un seme fisso: sempre lo stesso nemico; ritirare un modulo cambia solo quel passo', () => {
  const a = aCaso({ seme: 1944, livello: 8 }, dati);
  assert.deepEqual(aCaso({ seme: 1944, livello: 8 }, dati), a);
  assert.deepEqual(a.scelte, { base: 'quadrupede', grado: 'potente', boss: false, mutazioni: ['mimetismo', 'rigenerazione', 'sensi-oscuri'], corrotto: null, equipaggiamento: null });
  assert.deepEqual(a.passi.map((p) => p.id), ['grado', 'base', 'moduli', 'modulo-1', 'modulo-2', 'modulo-3']);
  // §6.4.2: Equipaggiamento per un Quadrupede vale Mutazione; §6.4.3: una Mutazione già presa si ritira
  assert.equal(a.passi[3].tiri[0].nota, 'vale Mutazione (§6.4.2)');
  assert.ok(a.passi[4].tiri.some((t) => t.ritirato));
  const r = profiloNemico(a.scelte, dati);
  assert.deepEqual([r.errori, validaNemico(r.nemico, dati)], [[], []]);
  // «ritira la Mutazione» del modulo 1
  const b = ritiraPasso(a, 'modulo-1', dati);
  assert.deepEqual([b.scelte.base, b.scelte.grado, b.difficolta], [a.scelte.base, a.scelte.grado, a.difficolta]);
  assert.notEqual(b.scelte.mutazioni[0], a.scelte.mutazioni[0]);
  assert.deepEqual(ritiraPasso(a, 'modulo-1', dati), b); // anche il ritiro è ripetibile
  // cento semi: profili sempre validi, umani solo fino al Medio
  for (let s = 1; s <= 100; s++) {
    const x = aCaso({ seme: s, livello: 12, contesto: 'tana' }, dati);
    const id = x.scelte.base === 'umano' ? fileUmano(x.scelte.tipoUmano, x.scelte.grado) : null;
    const p = profiloNemico(x.scelte, dati, { umani: id ? { [id]: umano(id) } : {} });
    assert.deepEqual([p.errori, validaNemico(p.nemico, dati)], [[], []], `seme ${s}`);
    assert.ok(x.numero >= 1 && (!x.scelte.boss || x.numero === 1), `seme ${s}`);
  }
});

test('difficoltà per 7 PG (§2.3): stima sperimentale dal grado; i moduli non contano, il Boss è un’etichetta', () => {
  const medio2 = profiloNemico({ base: 'insettoide', grado: 'medio', mutazioni: ['carapace', 'veleno'] }, dati).nemico;
  assert.equal(frazioneScontro({ grado: 'medio' }, 8, dati).frazione, 1 / 2.1);
  assert.equal(frazioneScontro({ grado: 'medio', boss: true }, 8, dati).frazione, 1 / 2.1, 'Boss: come il suo grado (A.96)');
  assert.equal(difficolta([{ nemico: medio2, quanti: 1 }], 8, dati).id, 'facile');
  assert.equal(difficolta([{ nemico: medio2, quanti: 2 }], 8, dati).id, 'normale');
  assert.equal(difficolta([{ nemico: medio2, quanti: 2 }], 8, dati).etichetta, 'Stima sperimentale, da verificare al tavolo.');
  const medio = profiloNemico({ base: 'aracnoide', grado: 'medio' }, dati).nemico;
  assert.equal(difficolta([{ nemico: medio, quanti: 1 }], 8, dati).id, 'facile');
  // un nemico del bestiario senza _bestiario: grado stimato dai PV, segnalato
  const d = difficolta([{ nemico: umano('eretico-elite'), quanti: 3 }], 9, dati);
  assert.deepEqual([d.stime, d.livello], [1, 8]);
});

test('«a caso»: il Gigante è uno solo per scontro sotto il grado Potente (§3.9)', () => {
  let visti = 0;
  for (let s = 1; s <= 2000 && visti < 5; s++) {
    const x = aCaso({ seme: s, livello: 5, contesto: 'pattuglia' }, dati);
    if (x.scelte.base !== 'gigante') continue;
    visti++;
    if (!['potente', 'molto-potente'].includes(x.scelte.grado)) assert.equal(x.numero, 1, `seme ${s}`);
  }
  assert.ok(visti > 0);
});
