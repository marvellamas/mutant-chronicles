// Lotto 197 (E): i venticinque modelli PNG generici Classe / Grado / EQ dal JSON di Davide (Mostri 0.67,
// Direttore 0.51 §§9.6–9.6.2). Sostituisce `tests/png-generici.test.js` del lotto 143, che ne provava dieci letti
// dal Word.
//
// I due controlli che devono restare verdi sempre:
//
//   1. **il validatore dei profili deve vedere tutte e 3.600 le voci.** 25 modelli × 6 Gradi × 24 Abilità. Un
//      invariante verde su zero voci è il difetto che ci ha ingannato tre volte: nel lotto 189 un controllo delle
//      Tecniche Interiori leggeva zero schede e diceva verde, nel 191 tre controlli passavano a vuoto perché
//      tarati su una sola forma di esportazione, nel 192 un profilo di Classe senza `competenze_precedenti`
//      avrebbe fatto ripiegare in silenzio. Qui il conto è parte dell'invariante.
//   2. **il beneficio di una Specializzazione posseduta dal livello 1 non si conta due volte.** È la cosa che il
//      Doc E&L ripete profilo per profilo («Pistole è già posseduta al livello 1: ricalcolare l'attacco e il danno
//      iniziali includendone il beneficio una sola volta»). L'Agente di I Grado ha Armi leggere VA personale 11 e
//      attacca con la Pistola a 12: quel 12 è già il valore finale. Se qualcuno ricominciasse a sommare +1 per la
//      Specializzazione d'arma, il modello attaccherebbe a 13.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testoManuale, fonteDati, voceDati } from '../tools/manuali.mjs';
import { datiReali } from './helpers.js';
import { validaNemico, validaDati } from '../src/validate.js';
import { profiloPng, classiPng, pxPng, sommaEqDanno, acquisizioniPng, armamentoPng } from '../src/png-generici.js';
import { profiloNemico, proponiNome, proponiDescrizione } from '../src/crea-nemico.js';
import { importaPng, verificaFonte, profiloSiAccorda, VOCI_ATTESE, RIGHE_DI_GRADO, ACQUISIZIONI_ATTESE, CATEGORIE } from '../tools/importa-png-generici.mjs';

const { dati } = await datiReali();
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const P = dati.png_generici;
const fonte = fonteDati('png-abilita');

test('venticinque modelli in cinque categorie, centocinquanta righe di Grado, 24 Abilità ciascuna', () => {
  const classi = classiPng(dati);
  assert.equal(classi.length, 25);
  assert.deepEqual([...new Set(classi.map((c) => c.categoria))], Object.keys(CATEGORIE));
  for (const [categoria, nomi] of Object.entries(CATEGORIE)) {
    assert.deepEqual(classi.filter((c) => c.categoria === categoria).map((c) => c.nome), nomi, categoria);
  }
  let righe = 0;
  for (const [id, c] of Object.entries(P.classi)) {
    for (const sez of ['caratteristiche', 'risorse', 'salvezze', 'attacchi', 'acquisizioni_per_grado']) assert.deepEqual(Object.keys(c[sez]), GRADI, `${id}.${sez}`);
    assert.equal(Object.keys(c.abilita).length, 24, `${id}: le 24 Abilità`);
    righe += GRADI.length;
  }
  assert.equal(righe, RIGHE_DI_GRADO);
  assert.deepEqual(validaDati(dati), []);
});

// ---------- 1. il controllo che pretende le 3.600 voci ----------

test('IL CONTROLLO CHE NON DEVE SPEGNERSI: il validatore dei profili vede tutte e 3.600 le voci, e si accorge se ne vede meno', () => {
  // la fonte: 3.600 voci contate, zero incoerenze
  const esito = verificaFonte(fonte, { sha256: voceDati('png-abilita').sha256_manuale });
  assert.equal(esito.voci, VOCI_ATTESE, 'le voci della fonte');
  assert.deepEqual(esito.incoerenze, []);
  assert.equal(esito.impronta, true, 'lo sha256 del Word dichiarato dal JSON è quello dell’edizione recepita');
  assert.deepEqual(esito.numeri.filter((x) => !x.ok), [], 'i numeri di controllo del Doc E&L');
  assert.deepEqual(esito.acquisizioni, ACQUISIZIONI_ATTESE);
  assert.deepEqual(esito.profili, { '4/7/9/4': 25 }, 'il profilo del lotto 192 su tutti e venticinque');
  assert.deepEqual(profiloSiAccorda(fonte, dati.regole), [], 'basi, limiti e numero per categoria d’accordo con regole.json');

  // e il validatore dei dati conta: con ventiquattro modelli su venticinque deve diventare rosso
  const meno = structuredClone(dati);
  delete meno.png_generici.classi.tecnomante;
  const e1 = validaDati(meno).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e1, /24 modelli: il Mostri 0\.67 ne ha venticinque/);
  assert.match(e1, /144 righe di Grado/);
  assert.match(e1, /voci di Abilità: ne servono 3600/);

  // una voce in meno dentro un modello: lo stesso
  const meno2 = structuredClone(dati);
  delete meno2.png_generici.classi.agente.abilita.Atletica;
  const e2 = validaDati(meno2).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e2, /manca l’Abilità «Atletica»/);
  assert.match(e2, /voci di Abilità: ne servono 3600/);

  // e una fonte dimezzata non passa il controllo della fonte
  const dimezzata = structuredClone(fonte);
  dimezzata.modelli = dimezzata.modelli.slice(0, 12);
  assert.equal(verificaFonte(dimezzata).voci, 12 * 6 * 24);
  assert.notEqual(verificaFonte(dimezzata).voci, VOCI_ATTESE);
});

// ---------- 2. il beneficio contato una volta sola ----------

/**
 * L'Abilità di ogni arma astratta (tabella degli armamenti: la colonna «Abilità» dice «leggere», «mischia», …).
 * Serve a confrontare il VA pronto di un attacco con il VA personale dell'Abilità che lo governa.
 */
const ABILITA_ARMA = {
  leggere: 'Armi leggere', mischia: 'Armi da mischia', medie: 'Armi medie', pesanti: 'Armi pesanti',
  guerra: 'Armi da guerra', 'Corpo a corpo': 'Corpo a corpo', lancio: 'Armi da lancio',
};

test('IL CONTROLLO CHE NON DEVE SPEGNERSI: il beneficio di una Specializzazione posseduta dal livello 1 è contato una volta sola', () => {
  // l'Agente: Pistole dal livello 1, Armi leggere personale 11, Pistola pronta 12. Né 11 (beneficio perso) né 13.
  const ag = P.classi.agente;
  assert.deepEqual(ag.acquisizioni.specializzazioni[0], { livello: 1, nome: 'Pistole' });
  assert.equal(ag.abilita['Armi leggere'][0], 11, 'VA personale, senza Specializzazione');
  assert.equal(ag.attacchi.I[0].va, 12, 'VA pronto, con la Specializzazione dentro una volta');
  const n = profiloPng({ classe: 'agente', grado: 'I', eq: 0 }, dati).nemico;
  assert.equal(n.attacchi[0].va, 12, 'il profilo non risomma e non perde il beneficio');
  assert.equal(n.attacchi[0].danno, '1d6+2');
  assert.equal(n.abilita.find((a) => a.nome === 'Armi leggere').va, 11, 'nelle Abilità resta il VA personale');

  // con EQ il VA pronto sale di EQ e di nient'altro
  for (const eq of [1, 2, 5]) assert.equal(profiloPng({ classe: 'agente', grado: 'I', eq }, dati).nemico.attacchi[0].va, 12 + eq);

  // su tutti e venticinque i modelli, a tutti i Gradi: il VA di un attacco è esattamente quello della tabella
  // pronta più EQ. Nessun ricalcolo, nessuna somma di Specializzazione: è la regola del §9.6.2.
  let provati = 0;
  for (const cl of classiPng(dati)) {
    const c = P.classi[cl.id];
    for (const g of GRADI) {
      for (const eq of [0, 3]) {
        const r = profiloPng({ classe: cl.id, grado: g, eq }, dati).nemico;
        r.attacchi.forEach((a, i) => {
          assert.equal(a.va, c.attacchi[g][i].va + eq, `${cl.id} ${g} EQ ${eq}: ${a.nome} VA`);
          assert.equal(a.danno, sommaEqDanno(c.attacchi[g][i].danno, eq), `${cl.id} ${g} EQ ${eq}: ${a.nome} danno`);
          provati += 1;
        });
      }
    }
  }
  assert.equal(provati, 25 * 6 * 2 * 2, 'due armi per modello, sei Gradi, due valori di EQ');

  // la differenza fra VA pronto e VA personale sta fra −1 e +2, e ogni valore si spiega: +1 Specializzazione
  // d'arma, −1 Protezione Media già inclusa, +1 ulteriore per il Lottatore con Arti Marziali Migliorate.
  const fuoriScala = [];
  for (const cl of classiPng(dati)) {
    const c = P.classi[cl.id];
    for (const [i, g] of GRADI.entries()) {
      for (const a of c.attacchi[g]) {
        const arma = armamentoPng(a.arma, dati);
        const ab = ABILITA_ARMA[arma.abilita];
        const d = a.va - c.abilita[ab][i];
        if (d < -1 || d > 2) fuoriScala.push(`${cl.nome} ${g} ${a.arma}: VA pronto ${a.va}, ${ab} personale ${c.abilita[ab][i]} (differenza ${d})`);
      }
    }
  }
  assert.deepEqual(fuoriScala, [], 'una differenza oltre +2 vorrebbe dire un beneficio contato due volte');
});

test('le tre progressioni sono separate e cumulative, e al Grado si vedono solo quelle raggiunte (Direttore §9.6.2)', () => {
  assert.deepEqual(P.livelli_acquisizioni, { specializzazioni: [1, 4, 8, 12, 16, 20], maestrie: [2, 6, 10, 14, 18], talenti_liberi: [3, 5, 7, 9, 11, 13, 15, 17, 19] });
  let s = 0; let m = 0; let t = 0;
  for (const [id, c] of Object.entries(P.classi)) {
    s += c.acquisizioni.specializzazioni.length; m += c.acquisizioni.maestrie.length; t += c.acquisizioni.talenti_liberi.length;
    for (const g of GRADI) {
      const liv = c.caratteristiche[g].livello;
      const a = acquisizioniPng(id, g, dati);
      for (const k of ['specializzazioni', 'maestrie', 'talenti_liberi']) {
        assert.deepEqual(a[k], c.acquisizioni[k].filter((x) => x.livello <= liv).map((x) => x.nome), `${id} ${g} ${k}`);
      }
      // cumulative: quelle del Grado precedente ci sono ancora
      if (g !== 'I') {
        const prima = acquisizioniPng(id, GRADI[GRADI.indexOf(g) - 1], dati);
        for (const k of ['specializzazioni', 'maestrie', 'talenti_liberi']) for (const x of prima[k]) assert.ok(a[k].includes(x), `${id} ${g}: ${x} si è perso`);
      }
    }
  }
  assert.deepEqual({ specializzazioni: s, maestrie: m, talenti_liberi: t }, ACQUISIZIONI_ATTESE);
  // al VI Grado (livello 20) il modello ha tutto: 6 + 5 + 9
  const vi = acquisizioniPng('agente', 'VI', dati);
  assert.deepEqual([vi.specializzazioni.length, vi.maestrie.length, vi.talenti_liberi.length], [6, 5, 9]);
  // e le capacità del nemico le scrivono, dicendo che i benefici fissi sono già compresi
  const n = profiloPng({ classe: 'agente', grado: 'III', eq: 0 }, dati).nemico;
  const spec = n.capacita.find((c) => c.nome.startsWith('Specializzazioni'));
  assert.match(spec.nome, /livello 8/);
  assert.match(spec.effetto, /1° Pistole; 4° Spionaggio; 8° Ricercare/);
  assert.match(spec.effetto, /già compresi nelle tabelle pronte, una volta sola/);
  assert.ok(n.capacita.some((c) => c.nome.startsWith('Maestrie')));
  assert.ok(n.capacita.some((c) => c.nome.startsWith('Talenti Liberi')));
});

test('esempio del manuale: Assaltatore III Grado con EQ Rara (Mostri 0.67, «Esempio pronto»)', () => {
  const { nemico: n, errori } = profiloPng({ classe: 'assaltatore', grado: 'III', eq: 2 }, dati);
  assert.deepEqual(errori, []);
  assert.equal(n.pv, 39); assert.equal(n.pm, 9);
  assert.equal(n.azioni.principali, 1); assert.equal(n.azioni.movimento, 1);
  assert.equal(n.iniziativa, 8); // 1d10+8 (Iniziativa Migliorata dal livello 3, già inclusa)
  assert.equal(n.ar.totale, 7); assert.equal(n.ar.magica, 0);
  assert.equal(n.attacchi[0].va, 18); assert.equal(n.attacchi[0].danno, '1d8+5');
  assert.equal(n.difese, 17); // Parata 17, Schivata 16
  assert.deepEqual(n.salvezze, { tempra: 13, riflessi: 14, volonta: 11, magia: 12 });
  assert.deepEqual([n.movimento.passo, n.movimento.corsa, n.movimento.scatto], [6, 12, 18]);
  assert.equal(pxPng('III', 2, dati), 60);
  assert.match(n.note, /PX pronti per quattro PG: 60/);
});

test('EQ (Direttore §9.6.1): una volta su Iniziativa, VA e danno, Difese, AR ordinaria e le quattro Salvezze; niente su Caratteristiche, PV, PM, Azioni, Movimento, Abilità e AR magica', () => {
  for (const id of Object.keys(P.classi)) {
    for (const g of GRADI) {
      const a = profiloPng({ classe: id, grado: g, eq: 0 }, dati).nemico;
      for (const eq of [1, 3, 5]) {
        const b = profiloPng({ classe: id, grado: g, eq }, dati).nemico;
        assert.equal(b.iniziativa, a.iniziativa + eq, `${id} ${g}: iniziativa`);
        assert.equal(b.ar.totale, a.ar.totale + eq);
        assert.equal(b.ar.magica, a.ar.magica, `${id} ${g}: EQ non tocca l’AR magica`);
        assert.equal(b.difese, a.difese + eq);
        for (const k of ['tempra', 'riflessi', 'volonta', 'magia']) assert.equal(b.salvezze[k], a.salvezze[k] + eq);
        b.attacchi.forEach((x, i) => { assert.equal(x.va, a.attacchi[i].va + eq); assert.equal(x.danno, sommaEqDanno(a.attacchi[i].danno, eq)); });
        for (const k of ['pv', 'pm', 'caratteristiche', 'azioni', 'movimento', 'abilita']) assert.deepEqual(b[k], a[k], `${id} ${g}: ${k} non cambia con EQ`);
      }
    }
  }
  assert.equal(sommaEqDanno('1d6', 2), '1d6+2');
  assert.equal(sommaEqDanno('1d8+3', 2), '1d8+5');
});

test('PX: la tabella del manuale coincide con PX base × (1 + 0,50 × EQ) per tutte le 36 combinazioni (Direttore §9.6)', () => {
  const base = { I: 10, II: 20, III: 30, IV: 50, V: 70, VI: 100 };
  for (const g of GRADI) for (let eq = 0; eq <= 5; eq += 1) assert.equal(pxPng(g, eq, dati), base[g] * (1 + 0.5 * eq), `${g} EQ ${eq}`);
  assert.equal(pxPng('III', 2, dati), 60);
  assert.equal(pxPng('VI', 5, dati), 350);
});

test('tutte le 900 combinazioni Classe × Grado × EQ passano il validatore dei nemici, con Iniziativa mai negativa e id unici', () => {
  const visti = new Set();
  let n = 0;
  for (const id of Object.keys(P.classi)) for (const g of GRADI) for (let eq = 0; eq <= 5; eq += 1) {
    const r = profiloNemico({ png: { classe: id, grado: g, eq } }, dati);
    assert.deepEqual(r.errori, []);
    assert.deepEqual(validaNemico(r.nemico, dati, ''), [], `${id} ${g} EQ ${eq}`);
    assert.ok(r.nemico.iniziativa >= 0);
    assert.ok(!visti.has(r.nemico.id), `id duplicato ${r.nemico.id}`);
    visti.add(r.nemico.id); n += 1;
    assert.equal(r.nemico.gs_px, undefined, 'il manuale non assegna un GS al Grado: nessun GS inventato');
    assert.deepEqual(r.nemico._bestiario.scelte, { png: { classe: id, grado: g, eq } });
  }
  assert.equal(n, 900);
});

test('i modelli generici tengono PV e Ferite ordinari, senza il +30% dei mostri (Direttore §§9.6.2, 9.9)', () => {
  for (const c of Object.values(P.classi)) assert.equal(c.sistema_salute, 'PV_e_Ferite', c.nome);
  // la verifica chiesta dal blocco E&L del 12/11: l'Agente di I Grado resta a 16 PV
  assert.equal(profiloPng({ classe: 'agente', grado: 'I', eq: 0 }, dati).nemico.pv, 16);
  for (const eq of [0, 5]) assert.equal(profiloPng({ classe: 'agente', grado: 'I', eq }, dati).nemico.pv, 16, 'EQ non tocca i PV');
  const n = profiloPng({ classe: 'soldato', grado: 'II', eq: 1 }, dati).nemico;
  assert.equal(n._bestiario.sistema_salute, 'PV_e_Ferite');
  assert.match(n.note, /PV e Ferite ordinari, senza il \+30%/);
  // il fattore della conversione è dichiarato nei dati, non scritto in un controllo, e gli esempi tornano
  const S = dati.formato_nemici.sistema_salute;
  assert.equal(S.predefinito, 'PV_e_Ferite');
  assert.equal(S.conversione_pv.fattore, 1.3);
  for (const [nome, [prima, dopo]] of Object.entries(S.conversione_pv.esempi)) assert.equal(dopo, Math.ceil(prima * 1.3), nome);
  // nessuno strumento dell'app moltiplica i PV di una scheda: la conversione la fa Davide nel manuale
  assert.deepEqual(S.sistemi.PV_e_Ferite.conversione_pv, null);
  assert.equal(S.sistemi.solo_PV.conversione_pv, '1,30');
  assert.ok(S.da_fare.length >= 3, 'che cosa del sistema ridotto manca ancora, scritto');
});

test('Taumaturghi: AR magica, «Difese» invece di Parata e Schivata, e la tabella delle azioni magiche pronte', () => {
  for (const id of ['arcanista', 'custode', 'invocatore', 'mistico', 'tecnomante']) {
    const c = P.classi[id];
    assert.equal(c.categoria, 'Taumaturghi');
    assert.ok(c.magia_pronta, `${id}: la tabella delle azioni magiche pronte`);
    for (const g of GRADI) {
      assert.equal(c.risorse[g].difese_da, 'difese', `${id} ${g}`);
      assert.equal(c.risorse[g].parata, null);
      assert.equal(c.risorse[g].schivata, null);
    }
    const n = profiloPng({ classe: id, grado: 'IV', eq: 1 }, dati).nemico;
    assert.equal(n.difese, c.risorse.IV.difese + 1);
    assert.equal(n.ar.magica, c.risorse.IV.ar_magica);
    const m = n.capacita.find((x) => x.nome === 'Azione magica pronta');
    assert.ok(m, `${id}: l’azione magica pronta fra le capacità`);
    assert.match(m.effetto, /benefici fissi raggiunti/);
  }
  assert.equal(P.classi.tecnomante.risorse.IV.ar_magica, 2);
});

test('A.270: il Lottatore di I Grado non ha Parata («—»), la Difesa che resta è la Schivata, e il profilo lo dice', () => {
  const l = P.classi.lottatore;
  assert.deepEqual(GRADI.map((g) => l.risorse[g].parata), [null, 15, 18, 21, 24, 26]);
  assert.deepEqual(GRADI.map((g) => l.risorse[g].schivata), [13, 15, 18, 21, 24, 26]);
  assert.deepEqual(GRADI.map((g) => l.risorse[g].difese_da), ['schivata', 'parata', 'parata', 'parata', 'parata', 'parata']);
  const r = profiloPng({ classe: 'lottatore', grado: 'I', eq: 0 }, dati);
  assert.equal(r.nemico.difese, 13);
  assert.match(r.avvisi.join(' '), /A\.270/, 'il caso è dichiarato, non silenzioso');
  assert.match(r.avvisi.join(' '), /para a mani nude dal II Grado/);
  // dal II Grado la Difesa è la Parata e nessun avviso
  const due = profiloPng({ classe: 'lottatore', grado: 'II', eq: 2 }, dati);
  assert.equal(due.nemico.difese, 15 + 2);
  assert.deepEqual(due.avvisi, []);
  // Combattimento Senz'Armi dal livello 1 e Arti Marziali Migliorate dal 2: +1 e +1, ciascuno una volta
  assert.equal(l.acquisizioni.specializzazioni[0].nome, 'Combattimento Senz’Armi');
  assert.equal(l.acquisizioni.maestrie[0].nome, 'Arti Marziali Migliorate');
  assert.equal(l.attacchi.I[0].va - l.abilita['Corpo a corpo'][0], 1, 'al I Grado solo la Specializzazione');
  assert.equal(l.attacchi.II[0].va - l.abilita['Corpo a corpo'][1], 2, 'dal II anche la Maestria, una volta');
});

test('A.269: «Spada» è un alias dichiarato della riga «Arma da guerra», con il motivo e il numero della domanda', () => {
  assert.equal(P.alias_armi.Spada.riga, 'Arma da guerra');
  assert.equal(P.alias_armi.Spada.domanda, 'A.269');
  assert.ok(P.alias_armi.Spada.motivo.length > 30);
  const arma = armamentoPng('Spada', dati);
  assert.equal(arma.dado, '1d8'); assert.equal(arma.mani, 1); assert.equal(arma.q, 1);
  assert.equal(profiloPng({ classe: 'assaltatore', grado: 'I', eq: 0 }, dati).nemico.attacchi[0].nome, 'Spada');
  // un alias senza motivo o senza domanda non passa il validatore
  const x = structuredClone(dati);
  x.png_generici.alias_armi.Spada = { riga: 'Arma da guerra' };
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /alias_armi\.Spada\.motivo/);
  assert.match(e, /alias_armi\.Spada\.domanda/);
  // e un'arma sconosciuta che non è un alias resta un errore
  const y = structuredClone(dati);
  y.png_generici.classi.agente.attacchi.I[0].arma = 'Cannone';
  assert.match(validaDati(y).map((z) => `${z.chiave}: ${z.problema}`).join('\n'), /l’arma «Cannone» non è nella tabella degli armamenti né fra gli alias dichiarati/);
});

test('armi e capacità: portata e modalità dagli armamenti astratti; Talenti di Classe fino al Grado; Pronto Soccorso solo al Paramedico', () => {
  const art = profiloPng({ classe: 'artigliere', grado: 'IV', eq: 0 }, dati).nemico;
  const mitra = art.attacchi.find((a) => a.nome === 'Mitragliatore');
  assert.equal(mitra.tipo, 'distanza'); assert.equal(mitra.gittata_q, 200);
  assert.deepEqual(mitra.modalita, ['S', 'RB', 'RM', 'RL', 'FS']);
  assert.equal(art.attacchi.find((a) => a.nome === 'Lama leggera').portata_q, 1);
  const talenti = (n) => n.capacita.filter((c) => /\((I|II|III|IV|V|VI) Grado\)/.test(c.nome)).length;
  assert.equal(talenti(profiloPng({ classe: 'agente', grado: 'I', eq: 0 }, dati).nemico), 1);
  assert.equal(talenti(profiloPng({ classe: 'agente', grado: 'VI', eq: 0 }, dati).nemico), 6);
  const par = profiloPng({ classe: 'paramedico', grado: 'II', eq: 0 }, dati).nemico;
  assert.ok(par.capacita.some((c) => c.nome === 'Pronto Soccorso'));
  assert.ok(!profiloPng({ classe: 'soldato', grado: 'II', eq: 0 }, dati).nemico.capacita.some((c) => c.nome === 'Pronto Soccorso'));
  // i modelli nuovi hanno i loro sei Talenti di Classe
  for (const id of ['agricoltore', 'medico', 'custode']) assert.equal(talenti(profiloPng({ classe: id, grado: 'VI', eq: 0 }, dati).nemico), 6, id);
});

test('«Crea nemico»: nome e descrizione proposti, nome e id scelti dal master vincono, errori chiari', () => {
  assert.equal(proponiNome({ png: { classe: 'soldato', grado: 'III', eq: 2 } }, dati), 'Soldato PNG III Grado EQ 2 Rara');
  assert.match(proponiDescrizione({ png: { classe: 'tecnomante', grado: 'III', eq: 2 } }, dati), /./);
  const r = profiloNemico({ png: { classe: 'soldato', grado: 'III', eq: 2 }, nome: 'Guardia del cancello', id: 'guardia-cancello', descrizione: 'Guardia di turno.' }, dati);
  assert.equal(r.nemico.nome, 'Guardia del cancello'); assert.equal(r.nemico.id, 'guardia-cancello');
  assert.match(r.nemico.note, /^Guardia di turno\./);
  const male = profiloNemico({ png: { classe: 'mago', grado: 'VII', eq: 9 } }, dati);
  assert.equal(male.nemico, null);
  assert.equal(male.errori.length, 3);
});

test('i dati coincidono con la fonte: rimontare il JSON e il Word dà esattamente data/png_generici.json', () => {
  const letto = importaPng(testoManuale('mostri'), fonte);
  assert.deepEqual(JSON.parse(JSON.stringify(letto)), P);
});
