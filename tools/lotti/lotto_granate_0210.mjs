// Granate come munizioni dei lanciagranate (correzione segnalata da Davide il 02/10/2026: «Non ci sono le
// granate normali tra le riserve. Non riesco a dare le munizioni al lanciagranate della Carabina Punisher»).
// Armamenti §7.20.3 «Granate» e «Compatibilità del formato standard»; §7.14.7; munizioni di riferimento
// dei lanciatori nel §7.8.
//
// Modello dei dati: una granata è un oggetto solo. La standard, la Fumogena e l'Elettroshock restano le
// schede del catalogo con il profilo del lancio a mano (Armi da Lancio, VA 0, FOR 3, gittata FOR × 3 Q,
// INC 8) e ricevono:
// - «esplosivo»: danno, AC, RS e proprietà che la granata dà al lanciatore (§7.20.3: «la granata stabilisce
//   danno, AC, RS e proprietà»), come la pesante;
// - «compatibile_con»: i lanciatori della tabella «Compatibilità del formato standard»;
// - «confezione»: cinque granate, senza sconto.
// La pesante (munizioni) riceve la confezione; resta solo per il Deathlock Drum. La stessa voce
// dell'Inventario si lancia a mano o si carica in un lanciagranate (src/ricarica.js → eScorta).
//   node tools/lotti/lotto_granate_0210.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_granate_0210.mjs --scrivi  → scrive i JSON
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const leggi = (p) => readFileSync(new URL(p, R), 'utf8');
const pulisci = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').trim();
const scrivi = process.argv.includes('--scrivi');
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };

const arm = leggi('docs/manuali-txt/armamenti.md').split('\n');
/** Righe della tabella che segue il titolo indicato: [{ colonna: valore }]. */
function tabella(titolo) {
  const i = arm.findIndex((r) => pulisci(r).replace(/^#+\s*/, '') === titolo);
  verifica(i >= 0, `titolo «${titolo}»`);
  const j = arm.findIndex((r, k) => k > i && r.startsWith('|'));
  const celle = (r) => r.split('|').slice(1, -1).map(pulisci);
  const testa = celle(arm[j]);
  const out = [];
  for (let k = j + 2; arm[k]?.startsWith('|'); k++) out.push(Object.fromEntries(celle(arm[k]).map((c, n) => [testa[n], c])));
  return { righe: out, dopo: arm.slice(i, i + 60).map(pulisci) };
}

// --- §7.20.3: valori delle granate --------------------------------------------------------------------
const g = tabella('7.20.3 Granate');
const perNome = Object.fromEntries(g.righe.map((r) => [r.Granata, r]));
verifica(Object.keys(perNome).join() === 'Frammentazione standard,Frammentazione pesante,Fumogena,Elettroshock', 'quattro granate');
const testo = g.dopo.join(' ');
verifica(testo.includes('si acquistano singole o in confezioni da cinque, senza sconto'), 'confezioni da cinque senza sconto');
verifica(testo.includes('Le granate a frammentazione hanno Sbilanciante e Sbalzante 1; Elettroshock ha Elettricità'), 'proprietà');
verifica(testo.includes('La granata a frammentazione standard e la Fumogena hanno PI 4, Qualità Comune e PS Integrità 10; Elettroshock ha PI 4, Qualità Non comune e PS Integrità 12'), 'PI, Qualità e PS');
verifica(testo.includes('il lancio a mano usa Armi da Lancio, VA 0, FOR 3, gittata massima FOR × 3 Q e INC 8') || leggi('docs/manuali-txt/armamenti.md').includes('Il lancio a mano usa Armi da Lancio, VA 0, FOR 3, gittata massima FOR × 3 Q e INC 8'), 'lancio a mano');
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));
const rs = (s) => num(s);
const PROPRIETA = { 'Frammentazione standard': ['Sbilanciante', 'Sbalzante 1'], 'Frammentazione pesante': ['Sbilanciante', 'Sbalzante 1'], Fumogena: [], Elettroshock: ['Elettricità'] };
const esplosivo = (n) => {
  const r = perNome[n];
  return { danno: r.Danno === '—' ? null : r.Danno, ac: r.AC === '—' ? null : (/^\d+$/.test(r.AC) ? Number(r.AC) : r.AC), rs_q: rs(r.RS), proprieta: PROPRIETA[n] };
};

// --- compatibilità del formato standard -----------------------------------------------------------------
const c = tabella('Compatibilità del formato standard');
const pD = (file) => new URL(`data/equipaggiamento/${file}.json`, R);
const file = Object.fromEntries(['armi_distanza', 'armi_distanza_corporative', 'corredi_dispositivi', 'munizioni'].map((f) => [f, JSON.parse(readFileSync(pD(f), 'utf8'))]));
const tutti = Object.entries(file).flatMap(([f, j]) => j.oggetti.map((o) => ({ ...o, rif: `${f}:${o.id}` })));
const lanciatore = (nome) => {
  const n = nome.toLowerCase();
  const x = tutti.filter((o) => o.tipo === 'arma_distanza' && o.danno_da_munizione && (o.nome.toLowerCase() === n || o.nome.toLowerCase() === `lanciagranate ${n}`));
  verifica(x.length === 1, `lanciatore «${nome}»`);
  return x[0].rif;
};
// nomi della tabella → nomi del catalogo
const NOMI = { 'Lanciagranate commerciale': 'Lanciagranate', 'Lanciagranate dell’Alleanza': 'Lanciagranate Alleanza', 'modulo della Carabina Punisher': 'Carabina Punisher', 'CAR 24': 'CAR24' };
const standard = [];
for (const r of c.righe) {
  const voci = r['Lanciatori e moduli standard'].split(/;\s*/).flatMap((p) => {
    const senza = p.replace(/^moduli\s+/i, '');
    return senza.includes(' e ') || senza.includes(', ') ? senza.split(/,\s*|\s+e\s+/) : [senza];
  });
  for (const v of voci) standard.push(lanciatore(NOMI[v.trim()] ?? v.trim()));
}
verifica(standard.length === 18, `18 lanciatori standard (${standard.length})`);
verifica(c.dopo.join(' ').includes('Il modulo del Deathlock Drum usa esclusivamente il formato pesante'), 'Deathlock solo pesante');
const deathlock = lanciatore('Deathlock Drum');
verifica(!standard.includes(deathlock), 'Deathlock fuori dal formato standard');
// ogni lanciatore standard ha la standard come munizione di riferimento (§7.8)
for (const r of standard) verifica(tutti.find((o) => o.rif === r).munizioni?.riferimento === 'Granata standard a frammentazione', `${r}: munizione di riferimento`);

// --- dati -----------------------------------------------------------------------------------------------
const GRANATE = {
  'Frammentazione standard': ['armi_distanza', 'granata-a-frammentazione', ['Granata standard a frammentazione', 'Frammentazione standard']],
  Fumogena: ['corredi_dispositivi', 'granata-fumogena', []],
  Elettroshock: ['corredi_dispositivi', 'granata-elettroshock', []],
  'Frammentazione pesante': ['munizioni', 'granata-a-frammentazione-pesante', []],
};
const FONTE = 'Armamenti §7.20.3 (Granate; Compatibilità del formato standard), §7.14.7; correzione di Davide del 02/10/2026; lotto tools/lotti/lotto_granate_0210.mjs';
for (const [n, [f, id, alternativi]] of Object.entries(GRANATE)) {
  const o = file[f].oggetti.find((x) => x.id === id);
  verifica(o, `${f}:${id}`);
  const r = perNome[n];
  verifica(o.costo === num(r.Costo) && o.reperibilita === r.REP, `${n}: costo ${o.costo} e REP ${o.reperibilita}`);
  o.esplosivo = esplosivo(n);
  o.compatibile_con = n === 'Frammentazione pesante' ? [deathlock] : [...standard];
  o.confezione = { quantita: 5, costo: 5 * num(r.Costo) };
  for (const a of alternativi) if (!o.nomi_alternativi.includes(a)) o.nomi_alternativi.push(a);
  o.fonte_munizione = FONTE;
  if (o.tipo === 'arma_distanza') {
    // il lancio a mano resta quello della scheda: Armi da Lancio, VA 0, FOR 3, FOR × 3 Q, INC 8
    verifica(o.abilita === 'Armi da lancio' && o.modificatore_va === 0 && o.for_richiesta === 3 && o.gittata_per_for === 3 && o.inc === 8, `${n}: profilo del lancio a mano`);
    verifica(o.pi === 4 && o.ps_int === (n === 'Elettroshock' ? 12 : 10) && o.qualita === (n === 'Elettroshock' ? 'Non comune' : 'Comune'), `${n}: PI, PS, Qualità`);
    verifica(n === 'Fumogena' ? o.nessun_danno === true : o.danno.una_mano === o.esplosivo.danno, `${n}: danno del lancio a mano = danno della granata`);
  }
}
// la nota delle regole di ricarica dice delle granate
const ric = file.munizioni.ricarica;
const nota = ' Granate (§7.20.3): una granata è un oggetto solo, che si lancia a mano o si carica nei lanciagranate compatibili («compatibile_con», «esplosivo»); i lanciagranate e i moduli integrati (alimentazione distinta, §7.8) si ricaricano inserendo granate fino alla capacità, un tipo alla volta; cambiare tipo scarica il lanciatore e rimette le granate nell’Inventario.';
if (!ric._nota.includes('Granate (§7.20.3)')) ric._nota += nota;

console.log(`${controlli} controlli superati; ${standard.length} lanciatori standard, Deathlock Drum solo pesante`);
if (scrivi) {
  for (const [f, j] of Object.entries(file)) writeFileSync(pD(f), `${JSON.stringify(j, null, 2)}\n`);
  console.log('scritti armi_distanza.json, armi_distanza_corporative.json, corredi_dispositivi.json, munizioni.json');
}
