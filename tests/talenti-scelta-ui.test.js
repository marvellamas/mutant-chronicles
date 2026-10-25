// Talenti v1.0 (lotto 2, 25/10/2026): il riquadro «Da scegliere» della scheda, con il DOM finto. I posti vengono da
// postiTalenti (il conto unico); qui si prova che cosa si vede e che cosa fa ogni pulsante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';
import { postiTalenti, applicaSceltaTalento, scelteSuccessive, applicaSceltaSuccessiva, adattaScelteSuccessive, erroriScelteSuccessive } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';

installaDomFinto();
const { riquadroTalenti, testoDaScegliere, rigaEffetto } = await import('../src/ui/talenti-scelta.js');
const { dati } = await datiReali();

/** Dimitri dopo il passaggio: regime nuovo, posti vuoti. */
function dimitri() {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2 };
  return { creazione, livelli: p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; return x; }) };
}

const tutti = (el) => [el, ...el.tutti()];
const testo = (el) => el.textContent;
const pulsante = (el, t) => tutti(el).find((x) => x.tagName === 'BUTTON' && x.textContent.trim() === t);
const clic = (b) => { for (const f of b.ascolti.click ?? []) f({ target: b }); };

/** Un banco di prova: il personaggio, le azioni che cambiano il personaggio come fa app.js, e il riquadro ridisegnato. */
function banco({ master = false, bloccato = null, p = dimitri() } = {}) {
  const b = { p, ui: { aperto: false, posto: null, filtro: '' }, scelte: [], el: null };
  const disegna = () => {
    b.el = riquadroTalenti({
      posti: postiTalenti(b.p, dati), successive: scelteSuccessive(b.p, dati), dati, ui: b.ui, master, bloccato,
      azioni: {
        ridisegna: disegna,
        // come app.js: se il Talento apre una scelta, è il passo seguente
        scegli: (posto, scelta, o = {}) => {
          b.scelte.push({ posto, scelta, ...o }); b.p = applicaSceltaTalento(b.p, posto, scelta);
          const aperta = scelteSuccessive(b.p, dati, { opzioni: false }).find((x) => x.livello === posto.livello);
          b.ui.posto = aperta ? `succ:${aperta.tipo}:${aperta.livello}` : null; disegna();
        },
        scegliSuccessiva: (x, id, o = {}) => { b.scelte.push({ successiva: x, id, ...o }); b.p = applicaSceltaSuccessiva(b.p, x, id); if (x.quanti === 1) b.ui.posto = null; disegna(); },
        svuota: (posto) => { b.p = adattaScelteSuccessive(applicaSceltaTalento(b.p, posto, null), posto.livello, dati).personaggio; b.ui.posto = `${posto.categoria}:${posto.livello}`; disegna(); },
        chiudi: () => { b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: 6 } }; disegna(); },
        riapri: () => { b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: null } }; disegna(); },
      },
    });
    return b.el;
  };
  b.apri = (posto = null) => { b.ui.aperto = true; b.ui.posto = posto; return disegna(); };
  disegna();
  return b;
}

test('«Da scegliere» dice quanti per categoria e che la scheda è incompleta', () => {
  const b = banco();
  assert.match(testo(b.el), /Da scegliere: 2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni/);
  assert.match(testo(b.el), /La scheda è incompleta finché non scegli i Talenti/);
  assert.equal(testoDaScegliere({ talento_libero: { mancanti: 1 }, maestria: { mancanti: 2 }, specializzazione: { mancanti: 1 } }), '1 Talento Libero, 2 Maestrie, 1 Specializzazione');
  // un personaggio con i Talenti di prima non ha il riquadro
  const vecchio = dimitri();
  vecchio.creazione = { ...vecchio.creazione, regimeTalenti: null };
  assert.equal(riquadroTalenti({ posti: postiTalenti(vecchio, dati), dati, ui: {}, azioni: {} }), null);
});

test('aperto, mostra il primo posto vuoto; scelto un Talento passa al successivo', () => {
  const b = banco();
  clic(pulsante(b.el, 'Scegli'));
  assert.match(testo(b.el), /Specializzazione del 1° livello · elenco del Tecnomante/);
  // le opzioni ammesse con una riga d'effetto; Spade non c'è fra le ammesse
  const opzioni = b.el.querySelectorAll('.opzione-talento').filter((x) => !x.className.includes('bloccato'));
  assert.equal(opzioni.length, dati.specializzazioni.per_classe.Tecnomante.length);
  const info = opzioni.find((x) => /Specializzazione in Informatica/.test(testo(x)));
  assert.match(testo(info), /\+2 VA/);
  clic(tutti(info).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Scegli'));
  assert.deepEqual(b.scelte.at(-1).scelta, { id: 'specializzazione-informatica' });
  // il posto successivo è la Maestria del 2° livello
  assert.match(testo(b.el), /Maestria del 2° livello/);
  assert.match(testo(b.el), /Da scegliere: 2 Talenti Liberi, 2 Maestrie, 1 Specializzazione/);
});

test('un’opzione non ammessa: il giocatore non la può prendere, il Direttore la forza con una conferma', async () => {
  const g = banco();
  g.apri('maestria:2');
  const rm = g.el.querySelectorAll('.opzione-talento').find((x) => /Ritualista Maggiore/.test(testo(x)));
  assert.ok(rm.className.includes('bloccato'));
  assert.match(testo(rm), /richiede Ritualista Minore/);
  assert.equal(tutti(rm).filter((x) => x.tagName === 'BUTTON' && x.className !== 'nome-talento').length, 0, 'il giocatore non ha un pulsante per sceglierla (il nome si tocca solo per leggere)');
  // il Direttore: «Forza…» chiede conferma (finestrella) e poi sceglie, con il motivo
  const m = banco({ master: true });
  m.apri('maestria:2');
  const rmM = m.el.querySelectorAll('.opzione-talento').find((x) => /Ritualista Maggiore/.test(testo(x)));
  clic(tutti(rmM).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Forza…'));
  await new Promise((r) => setTimeout(r, 0));
  const conferma = tutti(document.body).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Forza la scelta');
  assert.ok(conferma, 'la conferma c’è');
  clic(conferma);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(m.scelte.at(-1).scelta.id, 'ritualista-maggiore');
  assert.match(m.scelte.at(-1).forzata, /richiede Ritualista Minore/);
});

test('una scelta si cambia finché il Direttore non chiude; dopo, il giocatore non la cambia più', () => {
  const b = banco();
  b.p = applicaSceltaTalento(b.p, { categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-informatica' });
  b.apri('specializzazione:1');
  assert.match(testo(b.el), /Specializzazione in Informatica|Informatica/);
  clic(pulsante(b.el, 'Cambia questa scelta'));
  assert.equal(b.p.creazione.specializzazioneIniziale, null, 'svuotato: si risceglie');
  assert.match(testo(b.el), /Specializzazione del 1° livello/);
  // chiuso dal Direttore: niente «Cambia»
  b.p = applicaSceltaTalento(b.p, { categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-laboratorio' });
  b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: 6 } };
  b.apri('specializzazione:1');
  assert.equal(pulsante(b.el, 'Cambia questa scelta'), undefined);
  assert.match(testo(b.el), /Il Direttore ha chiuso questa scelta/);
});

test('senza connessione nessuna scelta: il riquadro lo dice e non offre «Scegli»', () => {
  const b = banco({ bloccato: 'Per scegliere i Talenti serve la connessione con il PC del Direttore: adesso il tablet è offline.' });
  assert.match(testo(b.el), /serve la connessione/);
  assert.equal(pulsante(b.el, 'Scegli'), undefined);
  b.ui.aperto = true;
  const di_nuovo = banco({ bloccato: 'offline' });
  di_nuovo.ui.aperto = true;
  assert.equal(di_nuovo.el.querySelectorAll('.opzione-talento').length, 0);
});

test('la riga d’effetto: sintesi o prima frase utile; Specializzazioni con il bonus', () => {
  assert.equal(rigaEffetto('specializzazione-pistole', dati), '+1 VA e +1 danno: Armi della categoria Pistole.');
  assert.equal(rigaEffetto('buona-costituzione', dati), 'Aumenta di 5 i PV massimi del personaggio.');
  // «Sostituisce …» non dice che cosa fa: la riga è la frase dopo
  assert.match(rigaEffetto('raffiche-migliorate', dati), /^Migliora di 2 VA la modalità impiegata/);
  // 25/10 sera: la sintesi è un oggetto { testo, rif, stato }: la riga è il suo testo, non «[object Object]»
  assert.match(rigaEffetto('sempre-allerta', dati), /^\+3 VA a Percezione contro imboscate/);
  // i Talenti di magia cominciano con «Passivo. Requisito: …»: la riga è la frase che dice che cosa fanno
  assert.equal(rigaEffetto('potere-mistico', dati), 'Aumenta permanentemente i PM Massimi di 5 per acquisizione, fino a +15.');
});

test('25/10 notte: il nome dell’opzione si tocca, apre sotto la scheda intera del manuale e la richiude; niente «Dettagli»', () => {
  const b = banco();
  b.apri('talento_libero:3');
  const voce = (re) => b.el.querySelectorAll('.opzione-talento').find((x) => re.test(testo(x)));
  const inc = voce(/Incrementare Incantesimi/);
  assert.match(testo(inc), /· Talento Libero/);
  assert.match(testo(inc), /Ogni acquisizione permette di apprendere automaticamente due nuovi Incantesimi/);
  assert.match(testo(inc), /Requisiti: la capacità personale di lanciare Incantesimi/);
  assert.match(testo(inc), /Poi: 2 Incantesimi da scegliere/);
  assert.equal(tutti(inc).find((x) => x.tagName === 'DETAILS'), undefined, '«Dettagli» non c’è più: lo fa il nome');
  const nome = inc.querySelector('.nome-talento');
  const scheda = inc.querySelector('.scheda-talento');
  assert.equal(nome.tagName, 'BUTTON');
  assert.match(testo(nome), /^▸ Incrementare Incantesimi/, 'il segno ▸ dice che si tocca');
  assert.equal(scheda.hidden, true, 'chiusa all’inizio');
  // la scheda sta dentro l'opzione, sotto il nome: non è una finestra sopra la lista
  assert.ok(tutti(inc).includes(scheda));
  clic(nome);
  assert.equal(scheda.hidden, false);
  assert.equal(nome.getAttribute('aria-expanded'), 'true');
  assert.match(testo(nome), /^▾ /);
  // tutto il paragrafo del manuale, con l'intestazione (tipo, requisito, quante volte)
  assert.match(testo(scheda), /Tipo: Passivo\. Prerequisito: possedere la capacità personale di lanciare Incantesimi\. Acquisizione: fino a cinque volte\./);
  assert.match(testo(scheda), /Il Talento non aumenta il livello massimo degli Incantesimi accessibili e non concede PM aggiuntivi\./);
  clic(nome);
  assert.equal(scheda.hidden, true, 'si richiude toccando di nuovo il nome');
  assert.equal(nome.getAttribute('aria-expanded'), 'false');
  // nessuna opzione con un oggetto stampato come testo o una riga vuota, in nessun posto
  for (const posto of postiTalenti(b.p, dati).posti) {
    b.apri(`${posto.categoria}:${posto.livello}`);
    for (const o of b.el.querySelectorAll('.opzione-talento')) {
      assert.doesNotMatch(testo(o), /\[object|undefined|NaN/, testo(o).slice(0, 80));
      const riga = tutti(o).find((x) => x.className === 'riga-talento');
      assert.ok(riga && testo(riga).trim().length > 10, `riga vuota: ${testo(o).slice(0, 60)}`);
    }
  }
});

test('25/10 notte: in alto l’elenco di tutti i posti in ordine, l’attuale «← adesso», gli scelti con il nome; un posto scelto si tocca e si cambia', () => {
  const b = banco();
  clic(pulsante(b.el, 'Scegli'));
  const posti = () => b.el.querySelectorAll('.posto-talento').map((x) => testo(x));
  assert.deepEqual(posti(), [
    '1° Specializzazione ← adesso', '2° Maestria', '3° Talento Libero', '4° Specializzazione', '5° Talento Libero', '6° Maestria',
  ]);
  assert.match(testo(b.el), /I tuoi posti, in ordine/);
  // scelto il primo, l'elenco si aggiorna: il 1° ha il nome, l'attuale passa al 2°
  const info = b.el.querySelectorAll('.opzione-talento').find((x) => /Specializzazione in Informatica/.test(testo(x)));
  clic(tutti(info).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Scegli'));
  assert.deepEqual(posti().slice(0, 2), ['1° Specializzazione: Informatica', '2° Maestria ← adesso']);
  assert.equal(b.el.querySelectorAll('.posto-talento').filter((x) => x.className.split(' ').includes('attuale')).length, 1, 'uno solo evidenziato');
  // toccando il posto già scelto si torna lì, con il nome che apre la scheda e «Cambia questa scelta»
  clic(b.el.querySelectorAll('.posto-talento').find((x) => /^1°/.test(testo(x))));
  assert.match(posti()[0], /← adesso$/);
  assert.match(testo(b.el), /Specializzazione del 1° livello/);
  assert.ok(b.el.querySelector('.posto-attivo').querySelector('.nome-talento'), 'anche la scelta fatta si legge toccando il nome');
  clic(pulsante(b.el, 'Cambia questa scelta'));
  assert.equal(b.p.creazione.specializzazioneIniziale, null);
  assert.equal(posti()[0], '1° Specializzazione ← adesso');
});

test('25/10 notte: l’elenco dei Talenti della scheda usa lo stesso tocco sul nome', () => {
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /nomeCheSiApre\(t\.nome, schedaTalento\(t\.id, ctx\.dati\)\)/);
  assert.match(tab, /nomeCheSiApre\(x\.nome, schedaTalento\(x\.id, ctx\.dati\)\)/);
});

test('app.js: la scelta passa dal salvataggio normale; offline e coda bloccano; i PG nuovi nascono nei Talenti v1.0', () => {
  const a = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(a, /function talentiBloccati\(\)[\s\S]*eOffline\(\)[\s\S]*inCoda\(/);
  assert.match(a, /scegli: \(posto, scelta[\s\S]*if \(talentiBloccati\(\)\)[\s\S]*persisti\(\)/);
  assert.match(a, /scelte: \{ \.\.\.nuoveScelte\(\), regimeTalenti: 2 \}/);
  assert.match(readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8'), /ctx\.talenti \? ctx\.talenti\.disegna\(ctx\.talenti\)/);
});

test('25/10 sera: Incrementare Incantesimi apre i 2 incantesimi come passo seguente; rimandati restano con «Scegli»', () => {
  const b = banco();
  b.apri('talento_libero:3');
  const inc = b.el.querySelectorAll('.opzione-talento').find((x) => /Incrementare Incantesimi/.test(testo(x)));
  clic(tutti(inc).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Scegli'));
  // subito il passo seguente: gli incantesimi del 3° livello, già filtrati (livello massimo, già conosciuti)
  assert.match(testo(b.el), /Incantesimi del 3° livello/);
  assert.match(testo(b.el), /Da Incrementare Incantesimi: ne restano 2. Livello massimo degli incantesimi: 3/);
  assert.match(testo(b.el), /2 Incantesimi/, 'il conto in testa');
  const noti = new Set(b.p.livelli.flatMap((v) => v.incantesimi ?? []));
  const ammessi = b.el.querySelectorAll('.opzione-talento').filter((x) => !x.className.includes('bloccato') && x.parentNode?.parentNode?.tagName !== 'DETAILS');
  assert.ok(ammessi.length > 10);
  for (const o of ammessi) {
    const nome = tutti(o).find((x) => x.tagName === 'STRONG').textContent;
    assert.ok(!noti.has(nome), `${nome} è già conosciuto`);
    const i = dati.incantesimi.incantesimi.find((x) => x.nome === nome);
    assert.ok(i.livello_base <= 3, `${nome}: livello base ${i.livello_base}`);
    assert.doesNotMatch(testo(o), /\[object|undefined|NaN/);
  }
  // «Più tardi»: si chiude, e il riquadro lo ricorda con il suo «Scegli»
  clic(pulsante(b.el, 'Più tardi'));
  assert.match(testo(b.el), /Da scegliere: .*2 Incantesimi/);
  assert.ok(pulsante(b.el, 'Scegli'), 'il pulsante per risolverlo');
  clic(pulsante(b.el, 'Scegli'));
  clic(tutti(b.el).find((x) => x.tagName === 'BUTTON' && /^3° Incantesimi: 2 da scegliere/.test(x.textContent)));
  for (let k = 0; k < 2; k++) {
    const primo = b.el.querySelectorAll('.opzione-talento').find((x) => !x.className.includes('bloccato'));
    clic(tutti(primo).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Scegli'));
  }
  assert.equal(scelteSuccessive(b.p, dati).length, 0, 'scelti tutti e due');
  assert.equal(b.p.livelli[1].incantesimi.length, (dimitri().livelli[1].incantesimi ?? []).length + 2, 'nella voce del 3° livello');
  assert.deepEqual(erroriScelteSuccessive(b.p, dati).filter((e) => e.livello === 3), [], 'niente «restano N incantesimi»');
  assert.match(testo(b.el), /Da scegliere: 1 Talento Libero, 2 Maestrie, 2 SpecializzazioniLa scheda/, 'niente più Incantesimi in testa');
  // cambiando il Talento, gli incantesimi che dava si tolgono
  b.apri('talento_libero:3');
  clic(pulsante(b.el, 'Cambia questa scelta'));
  assert.equal(b.p.livelli[1].incantesimi?.length ?? 0, (dimitri().livelli[1].incantesimi ?? []).length);
});

test('25/10 sera: Oshi riprende Risorse Interiori: le Tecniche rimaste dal passaggio contano e non si offrono di nuovo', () => {
  const p0 = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/OSHI-NAGATA_liv6_2026-10-07.json', import.meta.url), 'utf8'));
  const oshi = { creazione: { ...normalizza(p0.creazione, dati).scelte, regimeTalenti: 2 }, livelli: p0.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; return x; }) };
  const vecchie = oshi.livelli.flatMap((v) => v.tecniche ?? []);
  assert.ok(vecchie.length > 0, 'Oshi ha Tecniche dal passaggio');
  // ripresa al 3° livello (prima del livello in cui stanno le Tecniche): niente da scegliere in più
  const al3 = applicaSceltaTalento(oshi, { categoria: 'talento_libero', livello: 3 }, { id: 'risorse-interiori' });
  assert.deepEqual(scelteSuccessive(al3, dati).filter((s) => s.tipo === 'tecniche'), []);
  assert.deepEqual(erroriScelteSuccessive(al3, dati).filter((e) => e.tipo === 'violazione'), [], 'niente «già conosciuta» né oltre la quota');
  // con Tecniche Interiori Supplementari si scelgono 3 Tecniche in più, nessuna fra quelle già conosciute
  const sup = applicaSceltaTalento(al3, { categoria: 'talento_libero', livello: 5 }, { id: 'tecniche-interiori-supplementari' });
  const s = scelteSuccessive(sup, dati).find((x) => x.tipo === 'tecniche');
  assert.equal(s?.quanti, 3);
  assert.ok(s.opzioni.every((o) => !vecchie.includes(o.id)));
});

test('25/10 sera: app.js mette le scelte successive nel riquadro e toglie dagli errori il loro «restano N … da scegliere»', () => {
  const a = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.ok(a.includes('successive = scelteSuccessive(personaggio(), stato.dati)'));
  assert.match(a, /scegliSuccessiva: \(s, id[\s\S]*if \(talentiBloccati\(\)\)[\s\S]*applicaSceltaSuccessiva[\s\S]*persisti\(\)/);
  assert.match(a, /const eSceltaSuccessivaVuota = /);
  assert.ok(a.includes('tab.errori.filter((e) => !eSceltaTalento(e) && !eSceltaSuccessivaVuota(e))'));
});
