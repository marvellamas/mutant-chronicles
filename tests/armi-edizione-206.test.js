import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 206 (16/11/2026) — **le armi del catalogo passano al Manuale degli Armamenti corrente.**
//
// Le regole che questo test difende, in ordine di quanto costerebbe romperle:
//
//  1. **Un'arma non è una creatura.** Rigenerare il Bestiario non cambia un nemico salvato (provato nel 203);
//     rigenerare `armi.json` cambia la scheda dei sette, perché la voce dell'inventario rimanda al catalogo e i
//     valori si ricalcolano. Quindi: nessun campo cambia senza che sia dichiarato, e i campi che si vedono in
//     combattimento si contano a parte.
//  2. **Una lettura parziale non si scrive sopra un valore buono** (la regola del 204, stretta due volte nel 205).
//     Qui il caso pericoloso sono le **proprietà**: il manuale ne dà il solo nome, il catalogo tiene nome e testo,
//     e scrivere i nomi letti butterebbe le regole che «Attacca!» e la stampa leggono.
//  3. **Due profili dello stesso nome non si fondono.** Il Pugnale sta nel manuale due volte — da mischia e da
//     lancio — e il catalogo tiene due voci: fondendoli, il pugnale da mischia si trovava l'Abilità «Armi da
//     lancio», un valore sbagliato scritto con la provenienza dell'edizione corrente addosso.
//  4. **Il segno si spegne da sé.** Una voce tutta all'edizione corrente non scrive niente nella scheda; una che
//     resta indietro dice quali campi e perché.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registro, testoManuale } from '../tools/manuali.mjs';
import {
  profiliArmi, profiloDi, chiaveNome, dannoDiCella, risolviDanno, maniDiCella, modalitaDiCella,
  numeroDiCella, valoriDalTitolo, valoriComuni, titoloCombacia, specializzazioniDaProsa,
  etichetteNonRiconosciute, ramoDiTabella, tabelleDelTesto, leggiRighe, eTabellaDArma,
} from '../tools/importa-armi.mjs';
import { piano, quadro, confronta, appaia, stessaFormaAltroNome, FILE_ARMI } from '../tools/lotti/lotto_206_armi.mjs';
import {
  CAMPI, CAMPI_NOSTRI, CAMPI_DI_COMBATTIMENTO, provenienzaVoce, voceMista, rigaProvenienzaVoce,
  campiNonCorrenti, quadroCatalogo,
} from '../src/provenienza-catalogo.js';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const leggiFile = (f) => JSON.parse(readFileSync(join(RADICE, f), 'utf8'));
const ED = `Armamenti ${registro().manuali.find((m) => m.id === 'armamenti').versione}`;
const tutte = () => FILE_ARMI.flatMap((f) => leggiFile(f).oggetti ?? []);
const voce = (id) => tutte().find((o) => o.id === id);

test('l’edizione non è scritta nel test: la dà il registro, e i file la dichiarano', () => {
  assert.match(ED, /^Armamenti \d+\.\d+$/);
  for (const f of FILE_ARMI) assert.equal(leggiFile(f).versione_manuale, ED, `${f} dichiara l’edizione corrente`);
});

test('il lettore legge tutte le colonne che le tabelle d’arma dichiarano', () => {
  // **il controllo che il Bestiario ci ha insegnato a fare**: nel 204 una sola colonna rinominata faceva cadere
  // 149 schede, e ce ne siamo accorti solo contandole. Qui le etichette non riconosciute si elencano, e quelle
  // che restano sono di tabelle che non sono d'arma (sanitario, armature, pacchetti corporativi)
  const ignote = etichetteNonRiconosciute(testoManuale('armamenti')).map((x) => x.etichetta);
  for (const x of ignote) {
    assert.ok(
      ['Categoria', 'Cartucce', 'Costo vuoto', 'Vantaggi compresi', 'Descrizione', 'Compatibilità', 'Tipo', 'Proprietà comprese oltre al profilo'].includes(x),
      `etichetta non riconosciuta e non dichiarata: «${x}» — va letta o messa fra quelle che non sono d’arma`,
    );
  }
});

test('nessun campo resta non letto senza il suo motivo', () => {
  const regole = leggiFile('data/regole.json');
  const p = profiliArmi(testoManuale('armamenti'), { modalitaRegole: regole.modalita_di_fuoco });
  assert.ok(p.size > 300, `modelli letti: ${p.size}`);
  for (const v of p.values()) {
    for (const [campo, motivo] of Object.entries(v.nonLetti)) {
      assert.equal(typeof motivo, 'string', `${v.nome}/${campo}: il motivo deve essere scritto`);
      assert.ok(motivo.length > 20, `${v.nome}/${campo}: «${motivo}» non dice perché`);
    }
    for (const motivo of Object.values(v.riserve)) assert.ok(String(motivo).length > 20);
  }
});

test('le forme vere delle celle si leggono: danno a due impugnature, danno fisso, munizione, mani, numeri', () => {
  // le cinque forme che il confronto col catalogo ha fatto emergere, una per una
  assert.deepEqual(dannoDiCella('1d8+1 / 2d6'), { una_mano: '1d8+1', due_mani: '2d6' });
  assert.deepEqual(dannoDiCella('1d6+1 / 1d6+3'), { una_mano: '1d6+1', due_mani: '1d6+3' });
  assert.deepEqual(risolviDanno(dannoDiCella('1d6'), 1), { una_mano: '1d6', due_mani: null });
  // un'arma **solo** a due mani tiene il danno in due_mani: è la forma del catalogo (Lanciafiamme Purifier)
  assert.deepEqual(risolviDanno(dannoDiCella('1d10+2'), 2), { una_mano: null, due_mani: '1d10+2' });
  assert.deepEqual(risolviDanno(dannoDiCella('1'), 1), { una_mano: '1', due_mani: null }); // Tirapugni
  assert.deepEqual(dannoDiCella('Munizione'), { daMunizione: true });
  assert.deepEqual(dannoDiCella('Mun.'), { daMunizione: true });
  assert.equal(dannoDiCella('Per Grado, vedi tabella dei cristalli'), null);
  assert.equal(maniDiCella('1 / 2'), '1/2');
  assert.equal(maniDiCella('1/2'), '1/2');
  assert.equal(maniDiCella('2'), 2);
  assert.equal(numeroDiCella('2.350'), 2350);
  assert.equal(numeroDiCella('\\+1'), 1);
  assert.equal(numeroDiCella('−3'), -3);
  assert.equal(numeroDiCella('—'), null);
});

test('le Modalità di fuoco si leggono nelle due forme del manuale, e una voce non capita rende la cella parziale', () => {
  const regole = leggiFile('data/regole.json');
  const M = regole.modalita_di_fuoco;
  assert.deepEqual(modalitaDiCella('S RB TR', M).codici, ['S', 'RB', 'TR']);
  // la forma per esteso: i nomi li dà regole.json, quindi un nome nuovo entra da sé
  assert.deepEqual(modalitaDiCella('Colpo Singolo, Tiro Rapido', M).codici, ['S', 'TR']);
  // **tre su cinque è una lettura parziale, non un elenco corto** (la regola del 205 applicata alle modalità)
  const mista = modalitaDiCella('S RB ZZ', M);
  assert.deepEqual(mista.nonCapite, ['ZZ']);
});

test('i valori comuni di un blocco si leggono dal titolo e dalla prosa', () => {
  // §7.22.2: «Carabine — FOR 4, AC 1» e «Tutti i profili seguenti usano Armi Medie, richiedono due mani, hanno
  // 6 PI, Qualità Comune, PS Integrità 10 e MOV 0» — lo stesso caso delle regole comuni di blocco del 205
  assert.deepEqual(valoriDalTitolo('Carabine — FOR 4, AC 1'), { for_richiesta: 4, ac: 1 });
  const p = valoriDalTitolo('Fucili a pompa — FOR 4, AC 2, Sbilanciante');
  assert.deepEqual([p.for_richiesta, p.ac, p.proprieta], [4, 2, ['Sbilanciante']]);
  const c = valoriComuni('Tutti i profili seguenti usano **Armi Medie (INT)**, richiedono **due mani**, hanno **6 PI**, **Qualità Comune**, **PS Integrità 10** e **MOV 0**.');
  assert.deepEqual([c.abilita, c.mani, c.pi, c.qualita, c.ps_int, c.mov], ['Armi medie', 2, 6, 'Comune', 10, 0]);
  // una prosa che non parla di tutti i profili non detta niente a nessuno
  assert.deepEqual(valoriComuni('La Mushashi ha Precisa 2.'), {});
});

test('famiglia e catalogo si VERIFICANO sui titoli, non si estraggono da essi', () => {
  // il difetto che questo controllo impedisce: nel §7.8 il sottotitolo è la famiglia («Alleanza › Armi leggere»),
  // nel §7.1.9 è la corporazione («Cataloghi delle Corporazioni › Bauhaus»), e dal titolo non si capisce quale
  // sia quale. Estraendolo, la Baionetta Ussara si trovava famiglia «Bauhaus»
  const sez = ['Capitolo 7 — Armamenti › 7.8 Cataloghi corporativi delle armi a distanza › Alleanza › Armi leggere'];
  assert.equal(titoloCombacia(sez, 'Armi leggere'), true);
  assert.equal(titoloCombacia(sez, 'Alleanza'), true);
  assert.equal(titoloCombacia(sez, 'Coltelli e pugnali'), false);
  // «7.13 Catalogo Capitol» e «7.1.1 Catalogo Commerciale delle armi ravvicinate»: il nome sta dentro il titolo
  assert.equal(titoloCombacia(['7.13 Catalogo Capitol › Pistole'], 'Capitol'), true);
  assert.equal(titoloCombacia(['7.1.1 Catalogo Commerciale delle armi ravvicinate'], 'Commerciale'), true);
  // e la Baionetta Ussara tiene la sua famiglia, dichiarata
  const b = voce('baionetta-ussara');
  if (b) {
    assert.equal(b.famiglia, 'Armi inastate', 'la famiglia non è diventata il nome della corporazione');
    assert.equal(provenienzaVoce(b).famiglia, 'Armamenti 0.74', 'e si dichiara da quale edizione viene');
  }
});

test('due profili dello stesso nome non si fondono: il Pugnale da mischia e quello da lancio restano due', () => {
  const regole = leggiFile('data/regole.json');
  const p = profiliArmi(testoManuale('armamenti'), { modalitaRegole: regole.modalita_di_fuoco });
  const mischia = profiloDi(p, 'Pugnale', ['ravvicinata']);
  const lancio = profiloDi(p, 'Pugnale', ['lancio']);
  assert.ok(mischia && lancio, 'il manuale dà il Pugnale in entrambi i rami');
  assert.equal(mischia.letti.abilita, 'Armi da mischia');
  assert.equal(lancio.letti.abilita, 'Armi da lancio');
  assert.notEqual(mischia, lancio, 'e non sono lo stesso profilo');
  // nel catalogo le due voci tengono ciascuna la propria Abilità
  const r = voce('pugnale');
  assert.equal(r.abilita, 'Armi da mischia', 'il pugnale ravvicinato non prende l’Abilità del profilo da lancio');
  assert.equal(ramoDiTabella({ sezione: ['7.7 Catalogo Commerciale', 'Armi da lancio'] }), 'lancio');
});

test('LA REGOLA: una lettura parziale non si scrive sopra un valore buono — le proprietà tengono i loro testi', () => {
  // **il controllo che deve restare verde sempre.** Il manuale dà il nome di una proprietà, il catalogo tiene
  // nome e testo: il testo è la regola che «Attacca!» e la stampa leggono. Scrivere i nomi letti la butterebbe.
  assert.ok(CAMPI_NOSTRI.includes('proprieta'), 'le proprietà non portano una provenienza per voce');
  assert.ok(!CAMPI.includes('proprieta'), 'e non si scrivono dalla lettura');
  const conTesti = tutte().filter((o) => (o.proprieta ?? []).some((x) => x && typeof x === 'object' && x.testo));
  assert.ok(conTesti.length >= 10, `voci con il testo delle proprietà: ${conTesti.length}`);
  for (const o of conTesti) {
    for (const pr of o.proprieta) {
      assert.equal(typeof pr, 'object', `${o.nome}: una proprietà ridotta al solo nome ha perso la sua regola`);
      assert.ok(pr.nome, `${o.nome}: proprietà senza nome`);
    }
  }
  // il Judicator 100 è il caso che l'ha dimostrato: il titolo del suo blocco dice «Sbilanciante», la prosa gli dà
  // anche Purificatrice 1, e scrivere il titolo gliela toglieva
  const j = voce('judicator-100');
  if (j) assert.ok(j.proprieta.some((x) => /Purificatrice/.test(x.nome)), 'il Judicator 100 tiene Purificatrice 1');
});

test('LA REGOLA, provata al contrario: un campo dichiarato non letto non entra nel json', () => {
  const vecchia = { id: 'x', nome: 'X', danno: { una_mano: '1d6', due_mani: null }, inc: 7, versione_manuale: 'Armamenti 0.74' };
  const profilo = { nome: 'X', sezioni: [], letti: { danno: { una_mano: '9d9', due_mani: null }, inc: 3 }, nonLetti: { danno: 'il danno è scritto «1d6 oppure 2d4»' }, riserve: {} };
  const e = confronta(vecchia, profilo, { edizione: ED, edizionePrima: 'Armamenti 0.74' });
  assert.deepEqual(e.json.danno, { una_mano: '1d6', due_mani: null }, 'il danno non letto per intero non si scrive');
  assert.equal(e.json.inc, 3, 'quello letto sì');
  assert.equal(provenienzaVoce(e.json).danno, 'Armamenti 0.74');
  assert.equal(provenienzaVoce(e.json).inc, ED);
  assert.deepEqual(e.differenze.map((d) => d.campo), ['inc'], 'e fra le differenze c’è solo quello scritto');
});

test('la stessa forma scritta in un altro modo non è una differenza', () => {
  // le modalità sono un insieme: «S RB TR» e «S TR RB» sono lo stesso dato (la Bolter 13 le ha nei due ordini)
  assert.equal(stessaFormaAltroNome('modalita', ['S', 'RB', 'TR'], ['S', 'TR', 'RB']), true);
  assert.equal(stessaFormaAltroNome('modalita', ['S', 'RB'], ['S', 'TR']), false);
  // «Imperial» e «Imperiali» sono il nome di una corporazione in due forme: riscriverne 4 su 25 spaccherebbe in
  // due il gruppo Imperial dell'Inventario
  assert.equal(stessaFormaAltroNome('catalogo', 'Imperial', 'Imperiali'), true);
  assert.equal(stessaFormaAltroNome('catalogo', 'Capitol', 'Mishima'), false);
  // sulla famiglia la tolleranza **non** vale: «Armi» e «Armi leggere» non sono la stessa famiglia
  assert.equal(stessaFormaAltroNome('famiglia', 'Armi', 'Armi leggere'), false);
  const imperiali = tutte().filter((o) => o.catalogo === 'Imperial');
  assert.equal(imperiali.length, 25, 'le voci Imperial restano tutte sotto lo stesso nome');
});

test('le Specializzazioni del manuale non contraddicono le nostre: nessuno cambia il +1 VA', () => {
  // la Specializzazione dà +1 VA e +1 danno: una famiglia che si sposta si vede al tavolo subito
  const sp = leggiFile('data/specializzazioni.json');
  const nomi = new Map((sp.specializzazioni ?? []).map((x) => [x.nome, x.id]));
  const m = specializzazioniDaProsa(testoManuale('armamenti'), nomi);
  assert.ok(m.size >= 35, `modelli con la Specializzazione nella prosa: ${m.size}`);
  const diverse = [];
  for (const o of tutte()) {
    const letta = m.get(chiaveNome(o.nome));
    if (letta && letta.id !== o.specializzazione) diverse.push(`${o.nome}: ${o.specializzazione} ≠ ${letta.id}`);
  }
  assert.deepEqual(diverse, [], 'una Specializzazione diversa da quella del manuale va dichiarata, non lasciata');
});

test('il segno si spegne da sé: una voce tutta all’edizione corrente non scrive niente nella scheda', () => {
  const a = voce('axis-227');
  assert.equal(voceMista(a, ED), false);
  assert.equal(rigaProvenienzaVoce(a, ED), null, 'niente da dire: la riga non c’è');
  assert.equal(a.versione_manuale, ED);
  // e una che resta indietro lo dice, nominando i campi
  const kr = voce('kr10');
  assert.equal(voceMista(kr, ED), true);
  const riga = rigaProvenienzaVoce(kr, ED);
  assert.match(riga, /Armamenti 0\.74/);
  assert.match(riga, /Famiglia|Modalità/);
  assert.ok(!riga.includes('**'), 'niente marcatori sullo schermo');
  assert.ok(campiNonCorrenti(kr, ED).length >= 1);
});

test('il conto del catalogo torna coi file, e ogni campo rimasto indietro ha il motivo scritto', () => {
  const C = leggiFile('data/equipaggiamento/index.json').catalogo_armi;
  assert.ok(C, 'il conto è dichiarato in index.json');
  assert.equal(C.edizione, ED);
  assert.equal(C.voci, tutte().length, 'le voci dichiarate sono quelle dei file');
  assert.equal(C.dalla_edizione + C.miste + C.non_nel_manuale, C.voci, 'il conto deve tornare');
  const q = quadroCatalogo(tutte(), ED);
  assert.equal(C.miste, q.miste.length);
  assert.equal(C.campi.letti, q.letti);
  assert.equal(C.campi.ereditati, q.ereditati);
  assert.deepEqual(C.campi.per_campo, q.perCampo);
  for (const k of Object.keys(C.campi.per_campo)) assert.equal(typeof C.motivi?.[k], 'string', `manca il motivo di «${k}»`);
});

test('le differenze del lotto sono cinque, tutte dichiarate, e si vedono in combattimento', () => {
  // il piano rigirato sui dati di adesso: dopo la scrittura non deve restare niente da cambiare
  const p = piano(RADICE);
  const q = quadro(p);
  assert.equal(q.differenze, 0, 'applicato il lotto, il manuale e il catalogo dicono la stessa cosa');
  assert.equal(q.diCombattimento, 0);
  // e i cinque valori sono quelli del manuale, verificati a mano riga per riga
  assert.equal(voce('colt-hammershot').munizioni.capacita, 4, '§7.8: tamburo fisso da quattro colpi');
  assert.equal(voce('bolter-13').gittata_q, 20);
  assert.equal(voce('bolter-20').munizioni.capacita, 30);
  assert.equal(voce('lanciagranate-deathlock-drum').mov, -3);
  assert.equal(voce('lanciafiamme-purifier').mov, -3);
});

test('le voci che il manuale non ha col loro nome restano come stavano, e nessuna è stata appaiata a caso', () => {
  // **il lettore propone i candidati, non li scegli**: appaiare «Jemson 45» a «Colt Jamson 45» per somiglianza
  // scriverebbe i valori di un modello su un altro, con la provenienza dell'edizione corrente addosso
  const p = piano(RADICE);
  const non = p.esiti.filter((e) => !e.trovata);
  // Lotto 218 (A.278): le quattro voci che Davide ha indicato con nome nuovo sono state rinominate in luogo e ora si
  // trovano; restano le tre CyberArma (il §7.25 non è una tabella d'arma) e i due profili superati, archiviati
  assert.equal(non.length, 5);
  assert.deepEqual(non.map((e) => e.id).sort(), ['bolter-09', 'cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec', 'lanciagranate-bolter-20']);
  for (const e of non) {
    const v = voce(e.id);
    assert.equal(provenienzaVoce(v).danno, undefined, `${e.nome}: nessuna provenienza inventata`);
    assert.ok(Array.isArray(e.candidati), 'i candidati si elencano');
  }
  // le tre CyberArma restano all'edizione da cui vengono (0.83, lotto 195): il §7.25 non è una tabella d'arma
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    assert.match(voce(id).versione_manuale, /0\.83/);
  }
});

test('i campi che si vedono in combattimento sono dichiarati, non dedotti', () => {
  for (const k of ['danno', 'modalita', 'gittata_q', 'munizioni', 'for_richiesta', 'abilita']) {
    assert.ok(CAMPI_DI_COMBATTIMENTO.includes(k), `«${k}» cambia quello che si tira al tavolo`);
  }
  for (const k of CAMPI_DI_COMBATTIMENTO) {
    assert.ok(CAMPI.includes(k) || CAMPI_NOSTRI.includes(k), `«${k}» non è un campo di una voce d’arma`);
  }
});

test('le tabelle d’arma si riconoscono dal contenuto, non da un elenco di paragrafi', () => {
  const t = tabelleDelTesto(leggiRighe(testoManuale('armamenti')));
  const arma = t.filter(eTabellaDArma);
  // 178 delle 319 tabelle con intestazione del manuale sono d'arma; le altre sono protezioni, elmetti, munizioni,
  // sanitario e i pacchetti corporativi, che questo lotto non tocca
  assert.ok(arma.length > 150, `tabelle d’arma: ${arma.length}`);
  // una tabella senza Modello non è d'arma, qualunque cosa contenga
  assert.equal(eTabellaDArma({ intestazione: ['Qualità', 'PS Integrità'], sezione: [] }), false);
  assert.equal(eTabellaDArma({ intestazione: ['Modello', 'Danno'], sezione: [] }), true);
});
