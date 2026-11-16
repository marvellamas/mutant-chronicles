import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { quadroProvenienza } from './src/provenienza-bestiario.js';
const tutte = [];
(function v(d){ for(const f of readdirSync(d,{withFileTypes:true})){ const p=join(d,f.name); if(f.isDirectory()) v(p); else if(f.name.endsWith('.json')){ const j=JSON.parse(readFileSync(p,'utf8')); if(j?.nome) tutte.push(j);} } })('esempi/nemici');
const q = quadroProvenienza(tutte, 'Mostri 0.69');
const perCampo={}; for(const m of q.miste) for(const c of m.campi) perCampo[c.campo]=(perCampo[c.campo]??0)+1;
console.log(JSON.stringify({schede:q.schede, letti:q.letti, ereditati:q.ereditati, senza:q.senzaProvenienza, miste:q.miste.length, dichiarano069: tutte.filter(n=>n._bestiario?.edizione==='Mostri 0.69').length, perCampo}, null, 1));
