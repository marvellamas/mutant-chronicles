// Tavolo del Master, pezzo 3 (docs/tavolo-direttore.md): bestiario (src/nemici.js, server.mjs → /api/nemici)
// e nemici nello scontro (src/scontro.js): copie con etichette, PV e Stati propri, Iniziativa con le parità.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  nuovoScontro, aggiungiNemici, variaPvNemico, cambiaStatoNemico, registraTiro, registraDurata, ordineIniziativa,
  avanti, diTurno, togliPartecipante, validaScontro,
} from '../src/scontro.js';
import { vociBestiario, nemicoVuoto, pulisciNemico, idDaNome, voceVuota } from '../src/nemici.js';
import { validaNemico } from '../src/validate.js';
import { creaServer } from '../server.mjs';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date(2026, 9, 1, 21, 0, 0);
const vivo = (valore) => ({ valore, origine: 'manuale' });
const legionario = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
const stato = (id) => dati.regole.stati.elenco.find((s) => s.id === id);
const conPg = () => nuovoScontro({ id: 'scontro-nemici', adesso: T0, pg: [{ chiave: 'Ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 }] });
const nemici = (s) => s.partecipanti.filter((p) => p.tipo === 'nemico');

test('copie di un tipo: etichette numerate, PV propri, numerazione che continua', () => {
  let s = aggiungiNemici(conPg(), legionario, 3, {}, T0);
  assert.deepEqual(nemici(s).map((p) => [p.id, p.nome, p.lato, p.base, p.pv.attuali]), [
    ['nem:legionario-non-morto:1', 'Legionario Non Morto 1', 'avversario', 1, 22],
    ['nem:legionario-non-morto:2', 'Legionario Non Morto 2', 'avversario', 1, 22],
    ['nem:legionario-non-morto:3', 'Legionario Non Morto 3', 'avversario', 1, 22],
  ]);
  assert.match(s.registro.at(-1).testo, /Entrano Legionario Non Morto 1 … Legionario Non Morto 3 \(Legionario Non Morto, 3 copie, avversario, Iniziativa 1, PV 22\)/);
  // PV indipendenti; fra 0 e il massimo
  s = variaPvNemico(s, 'nem:legionario-non-morto:2', -5, T0);
  assert.deepEqual(nemici(s).map((p) => p.pv.attuali), [22, 17, 22]);
  s = variaPvNemico(s, 'nem:legionario-non-morto:2', -40, T0);
  s = variaPvNemico(s, 'nem:legionario-non-morto:1', 3, T0);
  assert.deepEqual(nemici(s).map((p) => p.pv.attuali), [22, 0, 22]);
  // dopo averne tolto uno, i nuovi continuano la numerazione
  s = togliPartecipante(s, 'nem:legionario-non-morto:3', T0);
  s = aggiungiNemici(s, legionario, 2, { lato: 'alleato' }, T0);
  assert.deepEqual(nemici(s).map((p) => `${p.nome} (${p.lato})`), ['Legionario Non Morto 1 (avversario)', 'Legionario Non Morto 2 (avversario)', 'Legionario Non Morto 4 (alleato)', 'Legionario Non Morto 5 (alleato)']);
  // la copia è una fotografia del tipo: cambiare il tipo non cambia lo scontro
  const tipo = copia(legionario);
  const t = aggiungiNemici(conPg(), tipo, 1, {}, T0);
  tipo.pv = 99;
  assert.equal(nemici(t)[0].scheda.pv, 22);
  assert.equal(validaScontro(s), null);
  assert.throws(() => aggiungiNemici(conPg(), legionario, 0), /da 1 a 30/);
});

test('PV a mano: clic di fila sullo stesso nemico fanno una riga di registro', () => {
  let s = aggiungiNemici(conPg(), legionario, 2, {}, T0);
  const n = s.registro.length;
  for (let i = 0; i < 4; i++) s = variaPvNemico(s, 'nem:legionario-non-morto:1', -1, T0);
  s = variaPvNemico(s, 'nem:legionario-non-morto:1', 1, T0);
  assert.equal(s.registro.length, n + 1);
  assert.match(s.registro.at(-1).testo, /Legionario Non Morto 1: PV 22 → 19 \(−3\)/);
  s = variaPvNemico(s, 'nem:legionario-non-morto:2', -2, T0);
  assert.equal(s.registro.length, n + 2);
  // tornati al valore di partenza: la riga sparisce
  s = variaPvNemico(s, 'nem:legionario-non-morto:2', 2, T0);
  assert.equal(s.registro.length, n + 1);
  assert.equal(variaPvNemico(s, 'nem:legionario-non-morto:2', 1, T0), s); // già al massimo
});

test('Iniziativa dei nemici: valore del tipo + d10, nell’ordine con le parità del §5.1', () => {
  // Ada 3 + 5 = 8 (DES 7); Legionario 1 + 7 = 8 (DES 4) → Ada prima per Destrezza
  let s = aggiungiNemici(conPg(), legionario, 2, {}, T0);
  s = registraTiro(s, 'pg:Ada', 'd10', vivo(5), dati, T0);
  s = registraTiro(s, 'nem:legionario-non-morto:1', 'd10', vivo(7), dati, T0);
  assert.deepEqual(ordineIniziativa(s).daTirare.map((p) => p.nome), ['Legionario Non Morto 2']);
  s = registraTiro(s, 'nem:legionario-non-morto:2', 'd10', vivo(7), dati, T0);
  // le due copie: stessi totale, DES e INT, entrambe avversarie → spareggio con il dado
  const o = ordineIniziativa(s);
  assert.equal(o.ordinati[0].nome, 'Ada');
  assert.deepEqual(o.spareggi, [['nem:legionario-non-morto:1', 'nem:legionario-non-morto:2']]);
  s = registraTiro(s, 'nem:legionario-non-morto:1', 'spareggio', vivo(2), dati, T0);
  s = registraTiro(s, 'nem:legionario-non-morto:2', 'spareggio', vivo(6), dati, T0);
  assert.deepEqual(ordineIniziativa(s).ordinati.map((p) => p.nome), ['Ada', 'Legionario Non Morto 2', 'Legionario Non Morto 1']);
  assert.deepEqual(ordineIniziativa(s).spareggi, []);
  // un tipo senza Caratteristiche alla pari con un PG: DES e INT ignote, spareggio
  const senza = copia(legionario);
  delete senza.caratteristiche;
  senza.id = 'sgherro'; senza.nome = 'Sgherro';
  let t = aggiungiNemici(conPg(), senza, 1, {}, T0);
  t = registraTiro(registraTiro(t, 'pg:Ada', 'd10', vivo(5), dati, T0), 'nem:sgherro:1', 'd10', vivo(7), dati, T0);
  assert.deepEqual(ordineIniziativa(t).spareggi.map((g) => g.sort()), [['nem:sgherro:1', 'pg:Ada']]);
  // un nemico alleato pari con un PG su tutto: scelgono loro (↑ ↓)
  const amico = { ...copia(legionario), id: 'amico', nome: 'Amico', iniziativa: 3, caratteristiche: { DES: 7, INT: 5 } };
  let u = aggiungiNemici(conPg(), amico, 1, { lato: 'alleato' }, T0);
  u = registraTiro(registraTiro(u, 'pg:Ada', 'd10', vivo(5), dati, T0), 'nem:amico:1', 'd10', vivo(5), dati, T0);
  assert.equal(ordineIniziativa(u).scelteAlleati.length, 1);
  assert.equal(ordineIniziativa(u).spareggi.length, 0);
  // il turno scorre anche sui nemici
  s = avanti(s, T0);
  assert.equal(diTurno(s).nome, 'Legionario Non Morto 2');
});

test('Stati dei nemici: immunità, durata in Round che finisce da sé', () => {
  let s = aggiungiNemici(conPg(), legionario, 1, {}, T0);
  const id = 'nem:legionario-non-morto:1';
  assert.throws(() => cambiaStatoNemico(s, id, stato('terrorizzato'), true, T0), /immune a Terrorizzato/);
  s = cambiaStatoNemico(s, id, stato('stordito'), true, T0);
  s = registraTiro(registraTiro(s, 'pg:Ada', 'd10', vivo(5), dati, T0), id, 'd10', vivo(1), dati, T0);
  s = registraDurata(s, id, stato('stordito'), vivo(2), T0);
  s = avanti(avanti(s, T0), T0); // Round 2
  assert.deepEqual([s.round, nemici(s)[0].stati], [2, ['stordito']]);
  s = avanti(avanti(s, T0), T0); // Round 3: ancora (fine del Round R + N = 3, §5.18)
  assert.deepEqual(nemici(s)[0].stati, ['stordito']);
  s = avanti(avanti(s, T0), T0); // Round 4: finito
  assert.deepEqual(nemici(s)[0].stati, []);
  assert.ok(s.registro.some((r) => r.testo === 'Stordito di Legionario Non Morto 1 è finito.'));
  // spegnere uno Stato toglie la sua durata
  s = cambiaStatoNemico(s, id, stato('rallentato'), true, T0);
  s = registraDurata(s, id, stato('rallentato'), vivo(3), T0);
  s = cambiaStatoNemico(s, id, stato('rallentato'), false, T0);
  assert.deepEqual(s.durate, []);
});

test('bestiario: file validi, JSON rotto, campi sbagliati, id diverso dal file', () => {
  const rotto = copia(legionario);
  rotto.id = 'rotto'; rotto.nome = 'Rotto';
  delete rotto.pv;
  const voci = vociBestiario([
    { file: 'legionario-non-morto.json', mtime: 1, nemico: legionario },
    { file: 'guasto.json', mtime: 1, errore: 'JSON non valido: Unexpected token' },
    { file: 'rotto.json', mtime: 1, nemico: rotto },
    { file: 'altro-nome.json', mtime: 1, nemico: legionario },
  ], dati);
  const per = Object.fromEntries(voci.map((v) => [v.file, v]));
  assert.equal(per['legionario-non-morto.json'].nemico, legionario);
  assert.deepEqual(per['legionario-non-morto.json'].errori, []);
  assert.equal(per['guasto.json'].nemico, null);
  assert.deepEqual(per['rotto.json'].errori, ['nemici/rotto.json › pv: mancante']);
  assert.match(per['altro-nome.json'].errori.join(), /non corrisponde al nome del file/);
});

test('editor: bozza vuota dal formato, pulizia dei campi vuoti e non ammessi, identificativo dal nome', () => {
  const b = nemicoVuoto(dati);
  assert.deepEqual(Object.keys(b).sort(), ['ar', 'attacchi', 'formato', 'movimento', 'salvezze', 'versione']);
  assert.ok(validaNemico(pulisciNemico(b, dati), dati).length > 0);
  Object.assign(b, { id: idDaNome('Cultista Èretico'), nome: 'Cultista Èretico', pv: 9, difese: 7, iniziativa: 2, note: '  ' });
  Object.assign(b.ar, { totale: 1, magica: 0 });
  b.movimento.passo = 6;
  Object.assign(b.salvezze, { tempra: 9, riflessi: 9, volonta: 10, magia: 11 });
  const att = voceVuota(dati.formato_nemici.campi.attacchi);
  Object.assign(att, { nome: 'Pugnale', tipo: 'ravvicinato', va: 8, danno: '1d4', natura: 'Naturale', portata_q: 1, gittata_q: 20, proprieta: [] });
  b.attacchi.push(att);
  b.immunita = [];
  const n = pulisciNemico(b, dati);
  assert.equal(n.id, 'cultista-eretico');
  assert.equal(n.note, undefined);
  assert.equal(n.immunita, undefined);
  assert.equal(n.attacchi[0].gittata_q, undefined); // solo per gli attacchi a distanza
  assert.equal(n.attacchi[0].proprieta, undefined);
  assert.deepEqual(validaNemico(n, dati), []);
});

const cartelle = ['nemici', 'scontri', 'personaggi', 'tavolo'].map((x) => mkdtempSync(join(tmpdir(), `mutant-${x}-`)));
const [cNemici, cScontri, cPersonaggi, cTavolo] = cartelle;
let server;
let base;
before(async () => {
  server = creaServer({ cartella: cPersonaggi, tavolo: cTavolo, scontri: cScontri, nemici: cNemici });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

test('server: salva un tipo valido in nemici/, rifiuta quello non valido, elenca anche i file rotti', async () => {
  const put = (id, n) => fetch(`${base}/api/nemici/${id}`, { method: 'PUT', body: JSON.stringify(n) });
  assert.equal((await put('legionario-non-morto', legionario)).status, 200);
  assert.ok(existsSync(join(cNemici, 'legionario-non-morto.json')));
  const rotto = { ...copia(legionario), pv: 0 };
  const r = await put('legionario-non-morto', rotto);
  assert.equal(r.status, 400);
  assert.match((await r.json()).errore, /pv: almeno 1/);
  assert.equal(JSON.parse(readFileSync(join(cNemici, 'legionario-non-morto.json'), 'utf8')).pv, 22); // il file resta quello buono
  assert.equal((await put('altro', legionario)).status, 400); // id diverso dal file
  assert.equal((await put('Con_Maiuscole', legionario)).status, 400);
  writeFileSync(join(cNemici, 'guasto.json'), '{ non è JSON');
  writeFileSync(join(cNemici, 'LEGGIMI.txt'), 'non si elenca');
  const elenco = await (await fetch(`${base}/api/nemici`)).json();
  assert.deepEqual(elenco.map((x) => [x.file, !!x.nemico, !!x.errore]), [['guasto.json', false, true], ['legionario-non-morto.json', true, false]]);
  assert.equal((await fetch(`${base}/nemici/legionario-non-morto.json`)).status, 404); // solo dall'API
});
