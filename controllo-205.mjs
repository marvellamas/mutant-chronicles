// Controllo di non-regressione del lotto 205, contro lo stato precedente al 204 (1a0c4c5) e contro il 204 (HEAD).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const CAMPI = ['pv', 'pm', 'caratteristiche', 'ar', 'difese', 'salvezze', 'iniziativa', 'azioni', 'movimento', 'spazio', 'abilita', 'attacchi', 'capacita', 'note', 'gs_px'];
const BASE = process.argv[2] ?? '1a0c4c5';
const files = execSync(`git ls-tree -r --name-only ${BASE} -- esempi/nemici`, { encoding: 'utf8' }).trim().split('\n').filter((f) => f.endsWith('.json'));
const reg = [];
let numeri = 0;
for (const f of files) {
  if (!existsSync(f)) { reg.push(`${f}: sparito`); continue; }
  const v = JSON.parse(execSync(`git show ${BASE}:${f}`, { encoding: 'utf8', maxBuffer: 1e8 }));
  const n = JSON.parse(readFileSync(f, 'utf8'));
  if (v.id !== n.id) reg.push(`${v.nome}: id cambiato`);
  if (v.nome !== n.nome) reg.push(`${v.nome}: nome cambiato`);
  if (v.taglia !== n.taglia) reg.push(`${v.nome}: taglia ${v.taglia} -> ${n.taglia}`);
  for (const k of CAMPI) {
    const a = v[k] !== undefined && v[k] !== null && !(Array.isArray(v[k]) && !v[k].length);
    const b = n[k] !== undefined && n[k] !== null && !(Array.isArray(n[k]) && !n[k].length);
    if (a && !b) reg.push(`${v.nome}: ${k} sparito`);
    if (a && b && Array.isArray(v[k]) && n[k].length < v[k].length) reg.push(`${v.nome}: ${k} ${v[k].length} -> ${n[k].length}`);
  }
  const testo = JSON.stringify(n);
  for (const c of v.capacita ?? []) {
    for (const m of String(c.effetto ?? '').matchAll(/\b\d+(?:d\d+)?(?:\+\d+)?\b/g)) {
      if (m[0] !== '1d10' && !testo.includes(m[0])) { numeri += 1; if (reg.length < 30) reg.push(`${v.nome}: numero ${m[0]} di «${c.nome}» sparito`); }
    }
  }
  for (const a of n.attacchi ?? []) if ((a.proprieta ?? []).some((x) => /^AC\s*\d+$/i.test(x))) reg.push(`${n.nome}: AC fra le proprietà`);
  if (n._bestiario?.edizione && !n._bestiario?.campi) reg.push(`${n.nome}: senza provenienza`);
}
console.log(`confronto con ${BASE}: ${files.length} schede · numeri delle capacità spariti: ${numeri}`);
console.log(reg.length ? `REGRESSIONI (${reg.length}):\n  ${reg.slice(0, 12).join('\n  ')}` : 'REGRESSIONI: nessuna');
