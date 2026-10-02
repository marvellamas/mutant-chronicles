// Rimandi «verranno integrati successivamente» nei testi dei dati (docs/diff-manuali-2026-10-02.md, lotto 1):
// restano solo quelli che il manuale corrente contiene ancora; i paragrafi integrati il 01/10 sera
// (creazione degli Artefatti, Rituali, Batteria Mistica) sono il testo nuovo, verificabile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, testoManuali } from '../tools/verifica_frasi.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const manuali = testoManuali();
const RIMANDO = /integrat[ae] successivamente|verranno integrat|sarà integrat|saranno integrat/;
// la scheda 21.10 si aggiorna con la procedura della sez. 25 (lotto 3)
const DA_FARE = new Set(['incantesimi:Rigenerazione']);

function testiConRimandi() {
  const out = [];
  const visita = (v, dove) => {
    if (typeof v === 'string') {
      for (const frase of v.split('\n').flatMap((r) => r.split(/(?<=\.)\s+/)).filter((x) => RIMANDO.test(x))) out.push({ dove, frase });
    } else if (Array.isArray(v)) v.forEach((x) => visita(x, dove));
    else if (v && typeof v === 'object') for (const x of Object.values(v)) visita(x, v.nome ? `${dove.split(':')[0]}:${v.nome}` : dove);
  };
  for (const f of ['abilita', 'classi', 'incantesimi']) visita(dati[f], `${f}:`);
  return out;
}

test('ogni rimando «verrà integrato» rimasto nei dati c’è ancora nel manuale corrente', () => {
  const superati = testiConRimandi().filter((x) => !DA_FARE.has(x.dove) && !manuali.includes(normalizza(x.frase)));
  assert.deepEqual(superati, []);
});

test('paragrafi integrati il 01/10 sera: testo del manuale', () => {
  const ultimo = (t) => t.split('\n').at(-1);
  const abilita = (n) => dati.abilita.abilita.find((a) => a.nome === n).descrizione;
  const prove = [
    ultimo(abilita('Artefatti')),
    ultimo(abilita('Rituali')),
    ultimo(dati.classi.classi.find((c) => c.nome === 'Tecnomante').talenti_fissi.find((t) => t.nome === 'Architetto TecnoMistico').testo),
    dati.incantesimi.incantesimi.find((i) => i.nome === 'Batteria Mistica').descrizione,
  ];
  for (const p of prove) assert.ok(manuali.includes(normalizza(p)), p.slice(0, 80));
  assert.match(prove[0], /Magia, sezione 24/);
});

test('fasce di potenza (Magia sez. 22): Epico e Leggendario, niente «Unico»', () => {
  const testo = JSON.stringify(dati.incantesimi);
  assert.doesNotMatch(testo, /\bUnico\b/);
  const ip = dati.incantesimi.incantesimi.find((i) => i.nome === 'Identificare Potere');
  assert.match(JSON.stringify(ip), /"Rarità massima":"Epico".*"Rarità massima":"Leggendario"/);
});
