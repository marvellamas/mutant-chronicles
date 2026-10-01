// Lotto elmetti: Manuale degli Armamenti v0.52 §7.21 (Google Doc, testo in docs/manuali-txt/armamenti.md).
// Scrive data/equipaggiamento/elmetti.json: l'elmetto standard di ricambio (§7.21.4), le 15 modifiche
// commerciali (accessori che si montano sull'elmetto o sull'elmetto standard dell'armatura) e i 15
// elmetti corporativi (§7.21.5, Commando §7.21.6). Effetti tipizzati per le proprietà con un numero
// (docs/effetti-oggetti.md); le altre restano testo. Nessun peso: il manuale non lo dà (A.30).
// Uso: node tools/lotti/lotto_elmetti.mjs
import fs from 'node:fs';
import { bloccaRiscrittura } from './superato.mjs';
bloccaRiscrittura('lotto_elmetti');

const V = 'Armamenti 0.52';
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const P = 'Armamenti §7.21.2';

// §7.21.2: testo delle proprietà (copiato dal Doc)
const TESTI = {
  'Antibagliore 2': '+2 alla PS già prevista contro Accecamento provocato da lampi o luce intensa. Non introduce una PS se l’effetto non la prevede e non protegge dagli altri tipi di Accecamento.',
  'Protezione acustica 2': '+2 alla PS già prevista contro un effetto sonoro o un rumore dannoso, come nel §7.11.4. Non è una protezione generale contro esplosioni o danni.',
  'Filtro respiratorio 2': '+2 alla PS Tempra contro veleni e agenti patogeni inalati, con maschera indossata. Richiede aria respirabile; non fornisce ossigeno né tenuta per immersione o vuoto.',
  Sensori: '+X VA a Percezione per vista e/o udito, come indicato nella scheda. Non concede Prove o osservazioni gratuite, non individua automaticamente creature nascoste e non supera ostacoli che impediscono al sensore di rilevare il bersaglio.',
  'Visione notturna': 'Entro 80 Q ignora le penalità per scarsa illuminazione. Richiede luce ambientale residua e non funziona nel buio completo. Fumo, nebbia e ostacoli mantengono i loro effetti.',
  'Visione termica': 'Entro 40 Q permette di osservare e prendere di mira bersagli con sufficiente contrasto termico, anche nel buio naturale completo. Ignora il −4 VA della Fumogena standard se il bersaglio è distinguibile termicamente.',
  'Interfaccia di pilotaggio 1': '+1 VA alle Prove di Pilotare per la conduzione di un mezzo con comandi compatibili, alimentati e collegati. Non si applica al tiro con le armi, ai paracadute o ai propulsori personali. Non si somma alle interfacce equivalenti dell’armatura.',
  'Assistenza offensiva 1': '+1 VA alle Prove per colpire ravvicinate e a distanza, comprese armi da lancio e attacchi senz’armi. Comprende l’eventuale Prova per colpire separata richiesta da un Incantesimo; non modifica la Prova di Potere per lanciarlo. Non aumenta danni, numero di attacchi o Azioni.',
  'Assistenza difensiva 1': '+1 VA alle Prove di Difese per Parata e Schivata, anche contro attacchi a distanza; inoltre +1 alla PS di Riflessi quando viene usata per Elusione. Non modifica le altre PS di Riflessi.',
  'Allerta tattica 1': '+1 Iniziativa. Il bonus si applica quando si determina l’Iniziativa; attivare o cambiare elmetto dopo non permette di ritirarla o riordinare i turni già stabiliti. Non impedisce automaticamente la Sorpresa.',
  SIN: 'Il SIN conserva la propria regola: è distinto dal bonus ordinario dello strumento, ma si applica un solo SIN pertinente, fino a +2. I moduli neurali percettivi degli elmetti riguardano soltanto Percezione, non attacco o Difese.',
};

// effetti di una proprietà (null = solo testo, promemoria)
const e = (x) => ({ ...x, fonte: P });
function effetti(nome) {
  const pr = { proprieta: nome };
  if (nome === 'Antibagliore 2') return [e({ tipo: 'salvezza', salvezza: null, valore: 2, ambito: 'uso_specifico', uso: 'contro Accecamento da lampi o luce intensa', beneficio: 'antibagliore', condizione: '+2 alla PS già prevista contro Accecamento provocato da lampi o luce intensa.', ...pr })];
  if (nome === 'Protezione acustica 2') return [e({ tipo: 'salvezza', salvezza: null, valore: 2, ambito: 'uso_specifico', uso: 'contro effetti sonori o rumori dannosi', beneficio: 'protezione_acustica', condizione: '+2 alla PS già prevista contro un effetto sonoro o un rumore dannoso, come nel §7.11.4.', ...pr })];
  if (nome === 'Filtro respiratorio 2') return [e({ tipo: 'salvezza', salvezza: 'tempra', valore: 2, ambito: 'uso_specifico', uso: 'contro veleni e agenti patogeni inalati', beneficio: 'filtro_respiratorio', condizione: '+2 alla PS Tempra contro veleni e agenti patogeni inalati, con maschera indossata.', ...pr })];
  if (nome === 'Interfaccia di pilotaggio 1') return [e({ abilita: 'Pilotare', valore: 1, ambito: 'uso_specifico', uso: 'conduzione di mezzi compatibili', beneficio: 'interfaccia_pilotaggio', condizione: '+1 VA alle Prove di Pilotare per la conduzione di un mezzo con comandi compatibili, alimentati e collegati.', ...pr })];
  if (nome === 'Assistenza offensiva 1') return [e({ tipo: 'attacco', attacchi: 'tutti', valore: 1, ambito: 'generale', beneficio: 'assistenza_offensiva', condizione: '+1 VA alle Prove per colpire ravvicinate e a distanza, comprese armi da lancio e attacchi senz’armi.', ...pr })];
  if (nome === 'Assistenza difensiva 1') {
    const c = '+1 VA alle Prove di Difese per Parata e Schivata, anche contro attacchi a distanza; inoltre +1 alla PS di Riflessi quando viene usata per Elusione.';
    return [e({ abilita: 'Difese', valore: 1, ambito: 'generale', beneficio: 'assistenza_difensiva', condizione: c, ...pr }),
      e({ tipo: 'salvezza', salvezza: 'riflessi', valore: 1, ambito: 'uso_specifico', uso: 'Elusione', beneficio: 'assistenza_difensiva_elusione', condizione: c, ...pr })];
  }
  if (nome === 'Allerta tattica 1') return [e({ tipo: 'iniziativa', valore: 1, ambito: 'generale', beneficio: 'allerta_tattica', condizione: '+1 Iniziativa.', ...pr })];
  // Sensori X alla vista, all'udito o a entrambi: situazionali (valgono «soltanto quando quel canale
  // può contribuire»), un solo grado per senso; fra i sensi non si sommano (§7.21.4)
  const s = /^Sensori (\d) (alla vista|all’udito|a vista e udito)$/.exec(nome);
  if (s) {
    const senso = { 'alla vista': 'vista', 'all’udito': 'udito', 'a vista e udito': 'vista_udito' }[s[2]];
    return [e({ abilita: 'Percezione', valore: Number(s[1]), ambito: 'situazionale', beneficio: `sensori_${senso}`, condizione: '+X VA a Percezione per vista e/o udito, come indicato nella scheda.', ...pr })];
  }
  return [];
}
const testoDi = (nome) => TESTI[nome] ?? (nome.startsWith('Sensori') ? TESTI.Sensori : nome.startsWith('SIN') ? TESTI.SIN : null);
const proprieta = (nomi) => nomi.map((n) => ({ nome: n, testo: testoDi(n) }));

const oggetti = [];
// §7.21.4: «l’eventuale ricambio privo di modifiche costa 200, Reperibilità Comune»
oggetti.push({
  id: 'elmetto-standard', nome: 'Elmetto standard (ricambio)', tipo: 'elmetto', catalogo: 'Commerciale', famiglia: 'Elmetti',
  nomi_alternativi: ['Elmetto standard'], note_manuale: 'Ogni armatura comprende nel proprio prezzo un elmetto standard abbinato: questo è il ricambio privo di modifiche. Non fornisce AR. Può ricevere le modifiche commerciali (§7.21.1, §7.21.4).',
  paragrafo: '§7.21.4', versione_manuale: V, ar: { totale: 0, magica: 0 }, pi: 4, qualita: 'Comune', ps_int: 10, reperibilita: 'CO', costo: 200, proprieta: [], effetti: [],
});

// §7.21.4: modifiche commerciali [nome, proprietà, modulo (alternative dello stesso modulo), REP, costo]
const MODIFICHE = [
  ['Visiera antibagliore', 'Antibagliore 2', 'antibagliore', 'CO', 500],
  ['Protezione acustica', 'Protezione acustica 2', 'protezione_acustica', 'NC', 600],
  ['Maschera filtrante', 'Filtro respiratorio 2', 'filtro_respiratorio', 'NC', 700],
  ['Sensori visivi 1', 'Sensori 1 alla vista', 'sensori_vista', 'NC', 700],
  ['Sensori visivi 2', 'Sensori 2 alla vista', 'sensori_vista', 'RA', 2200],
  ['Sensori acustici 1', 'Sensori 1 all’udito', 'sensori_udito', 'NC', 700],
  ['Sensori acustici 2', 'Sensori 2 all’udito', 'sensori_udito', 'RA', 2200],
  ['Interfaccia di pilotaggio', 'Interfaccia di pilotaggio 1', 'interfaccia_pilotaggio', 'NC', 1200],
  ['Visore notturno', 'Visione notturna', 'visore_notturno', 'RA', 2600],
  ['Visore termico', 'Visione termica', 'visore_termico', 'MR', 4800],
  ['Assistenza offensiva', 'Assistenza offensiva 1', 'assistenza_offensiva', 'RA', 4000],
  ['Assistenza difensiva', 'Assistenza difensiva 1', 'assistenza_difensiva', 'RA', 4000],
  ['Allerta tattica', 'Allerta tattica 1', 'allerta_tattica', 'RA', 2000],
  ['Interfaccia neurale percettiva 1', 'SIN 1 a Percezione', 'interfaccia_neurale', 'RA', 1500],
  ['Interfaccia neurale percettiva 2', 'SIN 2 a Percezione', 'interfaccia_neurale', 'MR', 3000],
];
for (const [nome, prop, modulo, rep, costo] of MODIFICHE) {
  oggetti.push({
    id: slug(nome), nome, tipo: 'accessorio', catalogo: 'Commerciale', famiglia: 'Modifiche per elmetti', nomi_alternativi: [],
    note_manuale: `Modifica per elmetto (§7.21.4): ${prop}. Si monta sull’elmetto indossato o sull’elmetto standard compreso nell’armatura; condivide l’Integrità dell’elmetto. I gradi dello stesso modulo sono alternative, non si sommano.${modulo === 'interfaccia_neurale' ? ' Richiede sensori o visori elettronici installati e un Innesto di Interfaccia Neurale compatibile (§7.15.1).' : ''}`,
    paragrafo: '§7.21.4', versione_manuale: V, si_monta_su: ['elmetto', 'armatura'], modifica_elmetto: { modulo },
    reperibilita: rep, costo, proprieta: proprieta([prop]), effetti: effetti(prop),
  });
}

// §7.21.5: elmetti corporativi [catalogo, modello, proprietà, REP, costo]
const CATALOGO = { Imperiali: 'Imperial' };
const CORPORATIVI = [
  ['Bauhaus', 'Wacht', ['Antibagliore 2', 'Protezione acustica 2', 'Assistenza difensiva 1'], 'RA', 6000],
  ['Bauhaus', 'Venus-Scout', ['Visione notturna', 'Filtro respiratorio 2', 'Allerta tattica 1'], 'RA', 6200],
  ['Capitol', 'Ranger Scout', ['Visione notturna', 'Sensori 1 alla vista', 'Assistenza offensiva 1'], 'RA', 8200],
  ['Capitol', 'Airborne HUD', ['Interfaccia di pilotaggio 1', 'Antibagliore 2', 'Allerta tattica 1'], 'RA', 4600],
  ['Cybertronic', 'CS-100', ['Sensori 1 a vista e udito', 'SIN 1 a Percezione visiva e uditiva', 'Allerta tattica 1'], 'RA', 5500],
  ['Cybertronic', 'CS-400', ['Visione termica', 'SIN 2 a Percezione termica', 'Assistenza offensiva 1'], 'MR', 11500],
  ['Imperiali', 'Trencher Mk II', ['Filtro respiratorio 2', 'Protezione acustica 2', 'Assistenza difensiva 1'], 'RA', 6200],
  ['Imperiali', 'Pathfinder Recon', ['Visione notturna', 'Sensori 1 all’udito', 'Allerta tattica 1'], 'RA', 6200],
  ['Mishima', 'Kabuto Senshi', ['Sensori 2 alla vista', 'Antibagliore 2', 'Assistenza offensiva 1', 'Assistenza difensiva 1'], 'RA', 11500],
  ['Mishima', 'Maschera Kage', ['Visione notturna', 'Sensori 2 all’udito', 'Allerta tattica 1'], 'RA', 7200],
  ['Fratellanza', 'Custode', ['Antibagliore 2', 'Protezione acustica 2', 'Filtro respiratorio 2', 'Assistenza difensiva 1'], 'RA', 7200],
  ['Fratellanza', 'Scrutatore', ['Visione termica', 'Sensori 1 alla vista', 'Assistenza offensiva 1'], 'MR', 10500],
  ['Alleanza', 'ASA Recon', ['Visione notturna', 'Sensori 1 a vista e udito', 'Filtro respiratorio 2', 'Allerta tattica 1'], 'RA', 7500],
  ['Alleanza', 'Doomtrooper Assault', ['Visione termica', 'Antibagliore 2', 'Protezione acustica 2', 'Assistenza offensiva 1', 'Assistenza difensiva 1'], 'MR', 15000],
  ['Alleanza', 'Commando', ['Allerta tattica 1', 'Assistenza offensiva 1', 'Assistenza difensiva 1'], 'MR', 12000],
];
for (const [corp, modello, props, rep, costo] of CORPORATIVI) {
  const commando = modello === 'Commando';
  oggetti.push({
    id: slug(`elmetto ${modello}`), nome: commando ? 'Elmetto Commando' : `Elmetto ${modello}`, tipo: 'elmetto', catalogo: CATALOGO[corp] ?? corp, famiglia: 'Elmetti',
    nomi_alternativi: [modello],
    note_manuale: `Elmetto specialistico (§7.21.5${commando ? ', §7.21.6' : ''}): ${props.join('; ')}. Non fornisce AR; sostituisce l’elmetto standard e si acquista per intero. Può ricevere modifiche aggiuntive compatibili.${commando ? ' Non richiede un innesto neurale; i suoi bonus ad attacco, Difese/Elusione e Iniziativa sono già +1: un secondo modulo equivalente non li porta a +2.' : ''}${props.some((p) => p.startsWith('SIN')) ? ' Il SIN richiede un Innesto di Interfaccia Neurale compatibile (§7.15.1).' : ''}`,
    paragrafo: commando ? '§7.21.6' : '§7.21.5', versione_manuale: V, ar: { totale: 0, magica: 0 }, pi: 4, qualita: 'Non comune', ps_int: 12,
    reperibilita: rep, costo, proprieta: proprieta(props), effetti: props.flatMap(effetti),
  });
}

const file = {
  versione_manuale: V,
  fonte: 'Manuale degli Armamenti v0.52 (Google Doc), §7.21 «Elmetti e modifiche»: testo in docs/manuali-txt/armamenti.md.',
  _nota: 'Generato da tools/lotti/lotto_elmetti.mjs. Gli elmetti non forniscono AR (§7.21.1): «ar» vale 0. Le modifiche sono accessori che si montano sull’elmetto indossato o sull’armatura indossata (per il suo elmetto standard) e contano solo montate. Nessun peso: il manuale non lo dà (A.30). Le regole d’uso sono in regole.json → elmetti.',
  oggetti,
};
fs.writeFileSync('data/equipaggiamento/elmetti.json', JSON.stringify(file, null, 2) + '\n');
console.log(`${oggetti.length} oggetti: ${oggetti.filter((o) => o.tipo === 'elmetto').length} elmetti, ${oggetti.filter((o) => o.tipo === 'accessorio').length} modifiche`);
