// Blocco «Melme funghi e imitatori» (cap. 8 del Manuale dei Mostri v0.18): dieci profili validi; «Volontà —» come
// assenza esplicita (`senza_salvezza`, mai uno 0), PM — senza campo pm, Fungo stridente immobile con 0 PX,
// acido senza Corrosivo, Scissione dei frammenti, Spazio quadrato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const MELME = ['melma-grigia', 'gelatina-ocra', 'budino-nero', 'cubo-gelatinoso', 'fungo-stridente', 'fungo-violetto',
  'spora-gassosa', 'miconide-germoglio', 'miconide-adulto', 'mimic'];
const SENZA_MENTE = MELME.slice(0, 7);

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of MELME) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(18|46).*Melme funghi e imitatori/);
  }
});

test('«Volontà —»: assenza esplicita in senza_salvezza, mai un 0; PM — senza campo pm', () => {
  for (const id of SENZA_MENTE) {
    const n = leggi(id);
    assert.deepEqual(n.senza_salvezza, ['volonta'], `${id} senza Volontà`);
    assert.equal(n.salvezze.volonta, undefined);
    assert.equal(n.pm, undefined, `${id} PM —`);
    assert.ok(n.immunita.includes('terrorizzato'), `${id} immune a Terrorizzato`);
  }
  // miconidi e Mimic hanno mente: Volontà e PM
  for (const id of ['miconide-germoglio', 'miconide-adulto', 'mimic']) {
    const n = leggi(id);
    assert.equal(n.senza_salvezza, undefined);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('il validatore accetta una Salvezza mancante solo se elencata, e rifiuta una elencata che ha un valore', () => {
  const base = leggi('melma-grigia');
  // mancante e non elencata → errore (chiave salvezze.volonta)
  const { senza_salvezza: _, ...nonElencata } = base;
  assert.deepEqual(validaNemico(nonElencata, dati, 'x').map((e) => e.chiave), ['salvezze.volonta']);
  // elencata ma con un valore → errore
  const conValore = { ...base, salvezze: { ...base.salvezze, volonta: 0 } };
  assert.deepEqual(validaNemico(conValore, dati, 'x').map((e) => e.chiave), ['salvezze.volonta']);
  // una Salvezza diversa mancante resta un errore anche con senza_salvezza
  const senzaMagia = { ...base, salvezze: { tempra: 12, riflessi: 6 } };
  assert.deepEqual(validaNemico(senzaMagia, dati, 'x').map((e) => e.chiave), ['salvezze.magia']);
  // una chiave sconosciuta in senza_salvezza è rifiutata
  assert.ok(validaNemico({ ...base, senza_salvezza: ['volonta', 'fortuna'] }, dati, 'x').length > 0);
});

test('Fungo stridente: immobile, AzM inutilizzabile, nessun attacco, GS «—» e 0 PX', () => {
  const f = leggi('fungo-stridente');
  assert.deepEqual(f.movimento, { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' });
  assert.equal(f.azioni.movimento, 0);
  assert.deepEqual(f.attacchi, []);
  assert.deepEqual(f.gs_px, { gs: '—', px: 0, per_pg: 4 });
  assert.ok(f.capacita.some((c) => c.nome.startsWith('Stridio')));
});

test('Corrosivo solo dove dichiarato (Melma grigia e Budino nero); l’acido senza Corrosivo nelle note', () => {
  for (const id of ['melma-grigia', 'budino-nero']) assert.ok(leggi(id).attacchi[0].proprieta.includes('Corrosivo'), id);
  for (const id of ['gelatina-ocra', 'cubo-gelatinoso']) {
    for (const a of leggi(id).attacchi) assert.equal(a.proprieta, undefined, `${id}/${a.nome} senza Corrosivo`);
    assert.match(leggi(id).attacchi[0].note, /acido/);
  }
});

test('Scissione di Gelatina ocra e Budino nero; il Frammento è un attacco con la condizione nella nota', () => {
  for (const id of ['gelatina-ocra', 'budino-nero']) {
    const n = leggi(id);
    assert.ok(n.capacita.some((c) => c.nome === 'Scissione'), `${id} Scissione`);
    const fr = n.attacchi.find((a) => a.nome === 'Frammento');
    assert.ok(fr && /dopo la Scissione/.test(fr.note), `${id} Frammento`);
  }
  assert.equal(leggi('gelatina-ocra').attacchi.find((a) => a.nome === 'Frammento').danno, '1d6+1');
  assert.equal(leggi('budino-nero').attacchi.find((a) => a.nome === 'Frammento').danno, '1d8+1');
  assert.ok(!leggi('melma-grigia').capacita.some((c) => c.nome === 'Scissione'));
});

test('Mimic: Morso con AC 2; Cubo: Inglobare e Digerire sono capacità', () => {
  const m = leggi('mimic').attacchi.find((a) => a.nome === 'Morso');
  assert.equal(m.ac, 2);
  assert.equal(m.danno, '1d8+1');
  const cubo = leggi('cubo-gelatinoso');
  assert.deepEqual(cubo.attacchi.map((a) => a.nome), ['Pseudopodo']);
  assert.ok(['Inglobare', 'Digerire'].every((x) => cubo.capacita.some((c) => c.nome === x)));
});

test('Spazio: 1 × 1 Q per funghi, germoglio, adulto, Mimic e Melma grigia; 2 × 2 Q Grandi per gli altri', () => {
  for (const id of ['melma-grigia', 'fungo-stridente', 'fungo-violetto', 'miconide-germoglio', 'miconide-adulto', 'mimic']) assert.equal(leggi(id).spazio, '1 Q', id);
  for (const id of ['gelatina-ocra', 'budino-nero', 'cubo-gelatinoso', 'spora-gassosa']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', id);
    assert.equal(leggi(id).taglia, undefined);
  }
});

test('Spora gassosa: volo fluttuante (nessun movimento a terra), Tocco infettivo di danno fisso 1, nube nelle capacità', () => {
  const s = leggi('spora-gassosa');
  assert.deepEqual(s.movimento, { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 2 });
  assert.equal(s.attacchi[0].danno, '1');
  assert.ok(s.capacita.some((c) => c.nome.startsWith('Sacco fragile')) && s.capacita.some((c) => c.nome === 'Micosi sporale'));
});

test('GS/PX informativo e non calcolato', () => {
  assert.deepEqual(leggi('budino-nero').gs_px, { gs: 'Veterano', px: 50, per_pg: 4 });
  assert.deepEqual(leggi('miconide-germoglio').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});

test('la pagina del bestiario online mostra «—» per la Volontà assente, mai «undefined»', () => {
  const pagina = readFileSync(new URL('../docs/bestiario/bestiario-online.html', import.meta.url), 'utf8');
  assert.ok(pagina.includes('Volontà — · Magia 9'), 'Melma grigia: Volontà —');
  assert.ok(!/undefined|NaN/.test(pagina), 'nessun undefined/NaN nella pagina');
});
