// Schede delle creature pronte (docs/bestiario/bestiario.md, cap. 5) ricalcolate dal motore (src/crea-nemico.js):
// PV, AR, attacchi (VA e danno), Difese, PS, Iniziativa, AzP, Immunità e Round dell'ultima riga, per ogni colonna.
// Serve quando cambiano le regole del Bestiario (A.79, A.95–A.97 del 05/10/2026): il documento resta allineato ai
// dati e tests/crea-nemico.test.js lo controlla. Il testo descrittivo e le capacità non si toccano.
//   node tools/aggiorna_creature_bestiario.mjs          → elenca le celle che cambierebbero
//   node tools/aggiorna_creature_bestiario.mjs --scrivi → aggiorna il documento
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const R = new URL('../', import.meta.url);
const { datiReali } = await import(new URL('tests/helpers.js', R).href);
const { profiloNemico, scelteCreatura } = await import(new URL('src/crea-nemico.js', R).href);
const T = await import(new URL('tools/taratura_bestiario.mjs', R).href);
const { dati } = await datiReali();
const scrivi = process.argv.includes('--scrivi');
const umani = Object.fromEntries(readdirSync(new URL('esempi/nemici/umani/', R)).filter((x) => x.endsWith('.json'))
  .map((x) => [x.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(`esempi/nemici/umani/${x}`, R), 'utf8'))]));
const righeT = T.taratura(dati);
const pgDi = Object.fromEntries(righeT.map((r) => [r.livello, r.archetipi]));
const misure = T.creaturePronte(dati, pgDi, umani);
const uno = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',');

const file = new URL('docs/bestiario/bestiario.md', R);
const md = readFileSync(file, 'utf8').split(/\r?\n/);
const pulisci = (t) => String(t).replace(/\*\*/g, '').replace(/\\/g, '').trim();
const celle = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((x) => x.trim());
const B = dati.bestiario;
const nomeStato = (id) => dati.regole.stati.elenco.find((s) => s.id === id)?.nome ?? id;
const cambi = [];
for (const c of B.creature) {
  const titolo = `${c.paragrafo.slice(1)} ${c.nome}`;
  const h = md.findIndex((r) => /^#+\s/.test(r) && pulisci(r.replace(/^#+\s*/, '')) === titolo);
  if (h < 0) throw new Error(`scheda mancante: ${titolo}`);
  const t0 = md.findIndex((r, k) => k > h && r.startsWith('|'));
  const testa = celle(md[t0]);
  const colonne = testa.slice(1);
  const profili = colonne.map((col) => {
    const boss = col.startsWith('Boss');
    const nomeGrado = boss ? /\((.+?)(,|\))/.exec(col)[1] : col.replace(/\s*\(.*$/, '');
    const g = B.gradi.find((x) => x.nome === nomeGrado);
    const r = profiloNemico(scelteCreatura(c.id, g.id, { boss }, dati), dati, { umani });
    if (r.errori.length) throw new Error(`${titolo}, ${col}: ${r.errori.join('; ')}`);
    const m = misure.find((x) => x.id === c.id && x.colonna === (boss ? `Boss ${g.nome}` : g.nome));
    return { n: r.nemico, m };
  });
  for (let k = t0 + 2; md[k]?.startsWith('|'); k++) {
    const riga = celle(md[k]);
    const nome = pulisci(riga[0]);
    const nuove = riga.slice(1).map((vecchia, i) => {
      const { n, m } = profili[i];
      if (nome === 'PV') return String(n.pv);
      if (nome === 'AR (di cui magica)') return `${n.ar.totale} (${n.ar.magica ?? 0})`;
      if (nome === 'VA Difese') return String(n.difese);
      if (nome === 'Iniziativa') return String(n.iniziativa);
      if (nome === 'PS Tempra · Riflessi · Volontà · Magia') return [n.salvezze.tempra, n.salvezze.riflessi, n.salvezze.volonta, n.salvezze.magia].join(' · ');
      if (nome === 'Azioni') return vecchia.replace(/^\d+ AzP/, `${n.azioni.principali} AzP`);
      if (nome === 'Immunità') {
        const nuovi = (n.immunita ?? []).map(nomeStato);
        const prima = vecchia === '—' ? [] : vecchia.split(', ');
        return [...nuovi].sort().join() === [...prima].sort().join() ? vecchia : (nuovi.length ? nuovi.join(', ') : '—');
      }
      if (nome.startsWith('Round di resistenza') && m) return `${uno(m.resistenza)} · ${uno(m.abbatte)}`;
      const att = /^(.+): VA, danno(, gittata)?$/.exec(nome);
      if (att) {
        const a = n.attacchi.find((x) => x.nome === att[1]);
        if (!a || vecchia === '—') return vecchia;
        const [, dannoVecchio = '', ...resto] = vecchia.split(', ');
        const conNatura = /\s/.test(dannoVecchio.trim());
        return [String(a.va), `${a.danno}${conNatura ? ` ${a.natura}` : ''}`, ...resto].join(', ');
      }
      return vecchia;
    });
    const testo = `| ${riga[0]} | ${nuove.join(' | ')} |`;
    if (testo !== md[k]) { cambi.push(`${titolo} · ${nome}: ${riga.slice(1).join(' / ')} → ${nuove.join(' / ')}`); md[k] = testo; }
  }
}
for (const x of cambi) console.log(x);
console.log(`${cambi.length} righe ${scrivi ? 'aggiornate' : 'da aggiornare'}`);
if (scrivi) writeFileSync(file, md.join('\n'));
