// Manuale del Giocatore 0.49 (21/10/2026), applicato il 22/10. Vale la regola di sempre: l'app segue l'ultima
// versione del manuale. La A.178 resta aperta nel Doc solo come conferma a Davide, non come blocco.
//
// Questo file prova le due cose che contano più dei singoli numeri:
//   1. i valori vengono dai DATI, e i dati vengono dal MANUALE — niente numeri scritti nel codice;
//   2. un personaggio già salvato prende i valori nuovi da solo, perché nella sua scheda ci sono solo gli
//      identificativi delle Tecniche, non una copia dei loro valori. È la domanda che Marcello ha posto per
//      prima, e la risposta è nei fatti: nessuna migrazione da fare, nessun PG rimasto indietro in silenzio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { costoEffettivo, costoTecnica } from '../src/tecniche.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const tecnica = (id) => dati.tecniche_interiori.tecniche.find((t) => t.id === id);
const manuale = readFileSync(new URL('../docs/manuali-txt/giocatore.md', import.meta.url), 'utf8');

test('la versione dichiarata nei dati è quella del manuale applicato', () => {
  assert.equal(dati.tecniche_interiori.versione_manuale, 'Giocatore 0.49');
});

test('0.49: le undici Tecniche riequilibrate hanno i valori del manuale', () => {
  // i valori attesi sono quelli della 0.49; il controllo che vengano DAVVERO dal manuale è la prova dopo
  const attesi = {
    'aura-di-resistenza': { pm: 3, round: 5 },
    'salto-della-tigre': { pm: 4 },
    'pelle-di-rinoceronte': { pm: 4, round: 5 },
    'vipera-dal-cappuccio': { pm: 5 },
    'passo-dell-ombra': { pm: 5, round: 5 },
    'corsa-di-nomura': { pm: 6, round: 5 },
    'illusione-lunare': { pm: 3, round: 5 },
    'mani-di-yorama': { pm: 3 },
    'radici-della-montagna': { pm: 2, round: 5 },
    'onda-interiore': { pm: 3 },
    'corpo-infrangibile': { pm: 3 },
  };
  for (const [id, a] of Object.entries(attesi)) {
    const t = tecnica(id);
    assert.ok(t, id);
    assert.equal(t.costo_pm, a.pm, `${id}: costo`);
    if (a.round !== undefined) assert.equal(t.durata_round, a.round, `${id}: durata`);
  }
});

test('0.49: costo e durata di OGNI Tecnica combaciano con la sua scheda nel manuale', () => {
  // la garanzia vera: non si fida dell'elenco qui sopra, rilegge il manuale salvato scheda per scheda
  const righe = manuale.split('\n');
  const scheda = (nome) => {
    const i = righe.findIndex((r) => r.trim().toLowerCase() === `#### ${nome}`.toLowerCase());
    if (i < 0) return null;
    let fine = righe.length;
    for (let k = i + 1; k < righe.length; k++) if (/^#{1,4} /.test(righe[k])) { fine = k; break; }
    return righe.slice(i + 1, fine).join('\n');
  };
  const numero = (s) => (s ? Number(String(s).replace(/[^\d]/g, '')) : null);
  let controllate = 0;
  for (const t of dati.tecniche_interiori.tecniche) {
    const s = scheda(t.nome);
    if (!s) continue;
    controllate++;
    if (!Array.isArray(t.opzioni_costo)) {
      const costo = /\*\*Costo:\*\*\s*([^.]*)\./.exec(s)?.[1]?.trim();
      if (costo && !/variabil/i.test(costo)) {
        const n = /gratuit|nessun costo/i.test(costo) ? 0 : numero(costo);
        if (Number.isInteger(n)) assert.equal(t.costo_pm, n, `${t.id}: il manuale dice ${n} PM`);
      }
    }
    const durata = /\*\*Durata:\*\*\s*([^.]*)\./.exec(s)?.[1]?.trim();
    if (durata && /round/i.test(durata)) assert.equal(t.durata_round, numero(durata), `${t.id}: il manuale dice ${durata}`);
  }
  assert.ok(controllate >= 25, `schede controllate nel manuale: ${controllate}`);
});

test('0.49: la tabella di Imposizione della Mano Curativa è 1/2/2/4, come nel manuale', () => {
  const t = tecnica('imposizione-della-mano-curativa');
  assert.deepEqual(t.opzioni_costo.map((o) => o.pm), [1, 2, 2, 4]);
  // e i quattro usi restano quattro alternative, con il loro tempo
  assert.deepEqual(t.opzioni_costo.map((o) => o.tempo), ['1 AzP', '1 AzP', '1 AzP', '5 minuti']);
  assert.match(t.opzioni_costo[3].effetto, /Migliora di uno stato la Ferita/);
});

test('0.49: il limite di una riduzione di Ferita ogni 24 ore è registrato (regola nuova)', () => {
  const t = tecnica('imposizione-della-mano-curativa');
  const frase = (t.effetti.promemoria ?? []).find((f) => /24 ore per beneficiario/.test(f));
  assert.ok(frase, 'il limite delle 24 ore è fra i promemoria');
  assert.match(frase, /condiviso con Guarigione/, 'e dice che è condiviso con Guarigione');
  // l'app lo ricorda, non lo conta: è un limite che tiene il tavolo (nessun contatore nella sessione)
});

test('0.49: la Meditazione Profonda recupera 1d6 + Mod COS PV, 3 PM e 2 punti di Affaticamento', () => {
  const t = tecnica('meditazione-profonda');
  const frase = t.effetti.promemoria[0];
  assert.match(frase, /1d6 \+ Mod COS PV/);
  assert.match(frase, /3 PM/);
  assert.match(frase, /2 punti di recupero dell’Affaticamento/);
  // la riga di consultazione della tab Poteri legge «breve»: deve dire la stessa cosa
  assert.match(t.effetti.breve, /1d6 \+ Mod COS PV/);
  assert.match(t.effetti.breve, /3 PM/);
  assert.match(t.effetti.breve, /2 rec\. Aff\./);
  // e il costo della Tecnica resta 0 PM
  assert.equal(t.costo_pm, 0);
});

test('0.49: l’Aura di Resistenza dà +2 AR magica, e il cumulo del §5.13 segue', () => {
  const aura = dati.regole.ar.tecniche.find((t) => t.tecnica === 'aura-di-resistenza');
  assert.equal(aura.totale, 2);
  assert.equal(aura.magica, 2);
  assert.equal(aura.durata, '5 Round');
  const pelle = dati.regole.ar.tecniche.find((t) => t.tecnica === 'pelle-di-rinoceronte');
  assert.equal(pelle.totale, 1, 'Pelle di Rinoceronte resta +1');
  assert.equal(pelle.durata, '5 Round', 'ma la sua durata passa a 5 Round');
  // §5.13: «Insieme concedono +4 contro il Ravvicinato Naturale o Magico, +3 contro gli altri danni Naturali o
  // Magici e +3 contro l'Etereo» — l'app non tiene quei totali, li somma: qui si controlla che tornino
  const corazza = 1; // Corazza Potenziata, +1 AR magica (Talento)
  assert.equal(corazza + aura.totale + pelle.totale, 4, 'ravvicinato Naturale o Magico');
  assert.equal(corazza + aura.totale, 3, 'altri danni Naturali o Magici');
  assert.equal(corazza + aura.magica, 3, 'Etereo');
  // il testo mostrato nella scheda non può restare al +1
  assert.equal(tecnica('aura-di-resistenza').effetti.breve, '+2 AR magica');
  assert.match(tecnica('aura-di-resistenza').testo, /\+2 AR di natura magica/);
});

test('0.49: Visione del Vero dà anche +5 alle PS Magia sulle illusioni visive', () => {
  const t = tecnica('visione-del-vero');
  const sal = (t.effetti.valori ?? []).find((v) => v.tipo === 'salvezza');
  assert.ok(sal, 'l’effetto sulle Prove Salvezza c’è');
  assert.equal(sal.salvezza, 'magia');
  assert.equal(sal.valore, 5);
  assert.equal(sal.ambito, 'uso_specifico');
  // il +5 a Percezione che aveva già resta
  assert.ok((t.effetti.valori ?? []).some((v) => v.abilita === 'Percezione' && v.valore === 5));
});

test('la riga di consultazione della tab Poteri non può contraddire i numeri: testo e dati concordano', () => {
  // la tab Poteri stampa «t.costo · t.azione · t.bersaglio · t.durata»: se quei testi restano alla 0.48, la
  // scheda dice «4 PM» accanto a un costo di 3. È successo davvero applicando questo lotto.
  for (const t of dati.tecniche_interiori.tecniche) {
    const pm = /(\d+)\s*PM/.exec(String(t.costo ?? ''))?.[1];
    if (pm !== undefined) assert.equal(Number(pm), t.costo_pm, `${t.id}: «${t.costo}» contro costo_pm ${t.costo_pm}`);
    const round = /(\d+)\s*Round/.exec(String(t.durata ?? ''))?.[1];
    if (round !== undefined) assert.equal(Number(round), t.durata_round, `${t.id}: «${t.durata}» contro durata_round ${t.durata_round}`);
  }
});

// --- i personaggi già esistenti ------------------------------------------------------------------------------

test('un PG già salvato prende i valori nuovi da solo: nella scheda ci sono gli id, non una copia dei valori', () => {
  // Aiko Tenzan ha otto Tecniche Interiori prese ai livelli 4 e 5, salvate il 02/10 (quindi con la 0.45)
  const testo = readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(testo);
  const salvate = (p.livelli ?? []).flatMap((l) => l.tecniche ?? []);
  assert.ok(salvate.includes('aura-di-resistenza'), 'il PG ha l’Aura di Resistenza');
  // nel file ci sono SOLO gli identificativi: nessun costo, nessuna durata, nessun effetto copiato
  assert.ok(salvate.every((x) => typeof x === 'string'), 'le Tecniche salvate sono identificativi, non oggetti');
  assert.ok(!/costo_pm|durata_round/.test(testo), 'il file del PG non contiene valori delle Tecniche');

  // e la scheda calcolata legge i valori dal catalogo di oggi
  const { scelte } = normalizza(p.creazione, dati);
  const scheda = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
  const aura = (scheda.tecniche ?? []).find((t) => t.id === 'aura-di-resistenza');
  assert.ok(aura, 'l’Aura di Resistenza è nella scheda calcolata');
  assert.equal(costoTecnica(tecnica('aura-di-resistenza')), 3, 'costa 3 PM, non più 4');
  assert.equal(costoEffettivo(scheda, tecnica('aura-di-resistenza')).costo, 3);
});

test('con l’Hachimaki i quattro usi della Mano Curativa escono 1/1/1/3 dal calcolo', () => {
  const con = { equipaggiamento: { scontoTecniche: { pm: 1, minimo: 1, nome: 'Hachimaki della Disciplina Interiore' } } };
  const t = tecnica('imposizione-della-mano-curativa');
  assert.deepEqual(t.opzioni_costo.map((_, i) => costoEffettivo(con, t, i).costo), [1, 1, 1, 3]);
  // e il calcolo mostra sempre la base accanto al finale (è quello che la scheda stampa)
  const dettaglio = t.opzioni_costo.map((_, i) => costoEffettivo(con, t, i));
  assert.deepEqual(dettaglio.map((d) => d.base), [1, 2, 2, 4]);
});
