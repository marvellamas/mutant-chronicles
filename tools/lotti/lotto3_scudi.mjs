// Lotto 3 del catalogo dell'equipaggiamento: scudi (Manuale degli Armamenti v0.50, §7.4, pp. 23–30).
//   node tools/lotti/lotto3_scudi.mjs            prova a vuoto
//   node tools/lotti/lotto3_scudi.mjs --scrivi   scrive pulito/scudi.csv e data/equipaggiamento/scudi.json
//
// Fonti del lotto (docs/lotti/lotto3-scudi/):
// - grezzo/: CSV di tools/estrai_manuali.py --tabelle, pp. 23–30. Servono le tabelle §7.4.2
//   «Protezione requisiti e Integrità» (pp. 24–25), «Qualità reperibilità e costi» (pp. 25–26) e
//   §7.4.11 «Modificatori alle Parate» (p. 30);
// - prosa/: testo del §7.4 da tools/estrai_manuali.py --prosa, per le schede in prosa §7.4.4–7.4.10
//   (proprietà, note) e §7.4.1 (attacco dello Scudo Punisher).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: via righe e celle vuote; si leggono solo le sottotabelle con intestazione
//    «Catalogo e modello | Taglia …» e «Catalogo e modello | Qualità …», anche spezzate fra due
//    pagine; i record si riuniscono sulla cella «Catalogo — Modello».
// 2. Modificatori alle Parate (§7.4.11): la tabella raggruppa i modelli per nome breve («BLEU e
//    CSS», «Scudi Cybertronic senza SIN»…); l'assegnazione ai modelli è scritta qui sotto a mano e
//    il generatore controlla che ogni scudo ne abbia una e che i valori coincidano con la tabella.
// 3. Proprietà: dalle schede in prosa, trascritte a mano (PROPRIETA); i testi delle proprietà sono
//    quelli del §7.4.3, parola per parola.
// 4. Note: il primo paragrafo della scheda di ogni scudo, preso dal testo in prosa. Un paragrafo
//    finisce con una riga corta (meno di 90 caratteri) chiusa da un punto. Per l'ultimo scudo di
//    ogni sezione i paragrafi successivi sono note della sezione (note_per_catalogo), salvo lo
//    Scudo delle Guardie Sacre, che ha più paragrafi propri.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto3-scudi/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

// ---------------------------------------------------------------------------
// 1. grezzo → pulito

function leggiCsv(testo) {
  const righe = [];
  for (const linea of testo.split('\n')) {
    if (!linea || linea.startsWith('#')) continue;
    const celle = [];
    let c = '';
    let virgolette = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (virgolette) {
        if (ch === '"' && linea[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') virgolette = false; else c += ch;
      } else if (ch === '"') virgolette = true;
      else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
    }
    celle.push(c);
    righe.push(celle);
  }
  return righe;
}

const cartella = new URL('grezzo/', LOTTO);
const blocchi = readdirSync(cartella).filter((f) => f.endsWith('.csv')).sort()
  .map((f) => leggiCsv(readFileSync(new URL(f, cartella), 'utf8')).map((r) => r.map((c) => c.trim()).filter(Boolean)).filter((r) => r.length));

const record = new Map();
const parateTabella = [];
for (const righe of blocchi) {
  let intestazione = null;
  for (const r of righe) {
    if (r[0] === 'Catalogo e modello' || r[0] === 'Modelli o condizione') { intestazione = r; continue; }
    if (!intestazione) continue; // tabelle del lotto che non diventano dati (§7.4, §7.4.1)
    if (r.length !== intestazione.length) throw new Error(`Celle ${r.length} invece di ${intestazione.length}: ${r.join(' | ')}`);
    if (intestazione[0] === 'Modelli o condizione') { parateTabella.push(r); continue; }
    const rec = record.get(r[0]) ?? { 'Catalogo e modello': r[0] };
    intestazione.forEach((k, i) => { if (i) rec[k] = r[i]; });
    record.set(r[0], rec);
  }
}
const COLONNE = ['Catalogo e modello', 'Taglia', 'AR', 'FOR', 'PI', 'MOV', 'Qualità', 'PS INT', 'REP', 'Costo'];
const pulito = [...record.values()];
for (const r of pulito) for (const c of COLONNE) if (r[c] === undefined) throw new Error(`${r['Catalogo e modello']}: manca ${c}`);
if (pulito.length !== 26) throw new Error(`Trovati ${pulito.length} scudi, il §7.4.2 ne dichiara 26`);
const testoCsv = [COLONNE.join(','), ...pulito.map((r) => COLONNE.map((c) => r[c]).join(','))].join('\n') + '\n';

// ---------------------------------------------------------------------------
// 2. Modificatori alle Parate (§7.4.11): riga della tabella → modelli

const vaNum = (s) => Number(String(s).replace(/\s*VA$/, '').replace('−', '-').replace('+', ''));
const PARATE = {
  Commerciali: ['Scudo piccolo', 'Scudo medio', 'Scudo enorme'],
  'BLEU e CSS': ['Scudo d’ordinanza BLEU', 'Scudo antisommossa CSS'],
  'Blitzer, Clan, Samurai e Pellegrino': ['Scudo d’assalto Blitzer', 'Scudo d’assalto dei Clan', 'Scudo da duello Samurai', 'Scudo del Pellegrino'],
  'Guardie Ducali e Young Guard': ['Scudo delle Guardie Ducali', 'Scudo della Young Guard'],
  'Dragoni e Free Marines': ['Scudo da breccia dei Dragoni', 'Scudo da breccia Free Marines'],
  'Compatto ASA aperto': ['Scudo compatto ASA'],
  Punisher: ['Scudo Punisher'],
  'Bastion, Hatamoto e Sacri Guerrieri': ['Scudo da sfondamento Bastion', 'Scudo pesante Hatamoto', 'Scudo dei Sacri Guerrieri'],
  'Alpha e Sentinella': ['Scudo tattico Alpha', 'Scudo della Sentinella'],
  'Scudi Cybertronic senza SIN': ['Scudo della Sicurezza', 'Scudo d’assalto Chasseur', 'Scudo pesante Reaver'],
  'Trencher e Ashigaru': ['Scudo da trincea Trencher', 'Scudo da campo Ashigaru'],
  'Guardie Sacre a riposo': ['Scudo delle Guardie Sacre'],
};
// righe della tabella che descrivono una condizione alternativa del modello
const ALTERNATIVE = {
  'Sicurezza Cybertronic con SIN 1': ['Scudo della Sicurezza', 'con SIN collegato (Innesto di Interfaccia Neurale attivo)'],
  'Chasseur con SIN 2': ['Scudo d’assalto Chasseur', 'con SIN collegato (Innesto di Interfaccia Neurale attivo)'],
  'Reaver con SIN 1': ['Scudo pesante Reaver', 'con SIN collegato (Innesto di Interfaccia Neurale attivo)'],
  'Guardie Sacre con Scudo Magico': ['Scudo delle Guardie Sacre', 'con Scudo Magico attivo (1 AzP e 1 PM della riserva, 5 Round)'],
};
const parataDi = new Map();
const alternativeDi = new Map();
for (const [etichetta, ravv, dist] of parateTabella) {
  if (etichetta === 'BLEU e CSS') {
    // «+1 VA contro Corpo a corpo; altrimenti 0» (Contenimento 1)
    if (!/^\+1 VA contro Corpo a corpo; altrimenti 0$/.test(ravv)) throw new Error(`BLEU e CSS: «${ravv}» non previsto`);
    for (const m of PARATE[etichetta]) {
      parataDi.set(m, { ravvicinata: 0, distanza: vaNum(dist) });
      alternativeDi.set(m, [{ condizione: 'contro attacchi di Corpo a corpo (Contenimento 1)', parata: { ravvicinata: 1, distanza: vaNum(dist) } }]);
    }
    continue;
  }
  if (PARATE[etichetta]) { for (const m of PARATE[etichetta]) parataDi.set(m, { ravvicinata: vaNum(ravv), distanza: vaNum(dist) }); continue; }
  if (ALTERNATIVE[etichetta]) {
    const [m, condizione] = ALTERNATIVE[etichetta];
    alternativeDi.set(m, [...(alternativeDi.get(m) ?? []), { condizione, parata: { ravvicinata: vaNum(ravv), distanza: vaNum(dist) } }]);
    continue;
  }
  throw new Error(`Riga del §7.4.11 non assegnata: ${etichetta}`);
}
// §7.4.4, §7.4.6: Antiesplosione 1 porta l'AR a +4 contro esplosioni Naturali o Magiche
for (const m of ['Scudo da breccia dei Dragoni', 'Scudo da breccia Free Marines']) {
  alternativeDi.set(m, [...(alternativeDi.get(m) ?? []), { condizione: 'contro danni Naturali o Magici da esplosione (Antiesplosione 1)', ar: { totale: 4, magica: 0 } }]);
}
// §7.4.10: con Scudo Magico il contributo dello Scudo diventa AR +4, di cui 2 magica
const gs = alternativeDi.get('Scudo delle Guardie Sacre');
gs[0].ar = { totale: 4, magica: 2 };

// ---------------------------------------------------------------------------
// 3. Proprietà (§7.4.3, testo parola per parola) e assegnazione dalle schede in prosa

const DEF = {
  'Struttura robusta': 'Aggiunge 2 PI massimi, già compresi nei valori del catalogo. Il beneficio non aumenta la PS Integrità e non va conteggiato di nuovo.',
  'Difensiva 1': 'Negli scudi che la indicano come ravvicinata, concede +1 VA esclusivamente alle Parate ravvicinate effettuate con quello Scudo. Il Punisher la applica espressamente sia alle Parate ravvicinate sia a quelle a distanza. Il bonus non si trasferisce a una Parata effettuata con un’altra arma.',
  'Contenimento 1': 'Concede +1 VA alle Parate ravvicinate effettuate con lo Scudo contro attacchi di Corpo a corpo. Non si applica contro Armi da Mischia o da Guerra e non concede bonus alle Prove per afferrare o Immobilizzare.',
  'Intercettazione balistica 1': 'Riduce di 1 la penalità alla Parata contro attacchi a distanza: il −4 dello Scudo diventa −3 VA. Non aumenta l’AR, non modifica la Parata ravvicinata e non rende parabile un attacco che normalmente non lo è.',
  'Antiesplosione 1': 'Contro danni Naturali o Magici da esplosione aggiunge 1 all’AR applicabile: su uno Scudo enorme il contributo passa da +3 a +4. Non protegge dai danni Eterei. Antiesplosione di scudo e armatura non si sommano; si usa soltanto il valore maggiore, mentre le rispettive AR ordinarie continuano a sommarsi.',
  'Stabile 1': 'Concede +1 VA alle Prove di Forza o Destrezza richieste per resistere a Sbilanciante mentre lo Scudo è impugnato e utilizzabile. Più proprietà Stabile applicabili alla stessa Prova, comprese quelle di scudo e armatura, usano soltanto il valore maggiore. Non modifica le Prove Salvezza e non annulla Sbalzante.',
  'Manutenzione semplice': 'Concede +1 VA alle Prove di Tecnologia per riparare questo Scudo, disponendo di strumenti e materiali necessari. Non riduce automaticamente tempi o costi e non ripristina PI senza una riparazione.',
  Ingombrante: 'Gli Scudi enormi impongono −1 Q a Passo, Corsa e Scatto mentre sono impugnati. La penalità si somma a quelle pertinenti di armatura e arma e non viene eliminata soddisfacendo il requisito di FOR.',
  SIN: 'SIN 1 concede +1 VA e SIN 2 concede +2 VA alle Prove di Parata effettuate con lo Scudo, ravvicinate e a distanza. Il beneficio richiede un Innesto di Interfaccia Neurale compatibile e attivo; gli innesti Cybertronic si abbinano automaticamente, quelli di altre marche seguono la configurazione con Tecnologia del §7.15.1. Senza collegamento lo Scudo mantiene AR e funzionamento ordinari, ma non il bonus SIN.',
};
const p = (nome, testo = DEF[nome]) => ({ nome, testo });
const DIF_RAVV = p('Difensiva 1 (ravvicinata)', DEF['Difensiva 1']);
const PROPRIETA = {
  'Scudo piccolo': [],
  'Scudo medio': [],
  'Scudo enorme': [p('Ingombrante')],
  'Scudo d’ordinanza BLEU': [p('Contenimento 1')],
  'Scudo d’assalto Blitzer': [p('Struttura robusta'), DIF_RAVV],
  'Scudo da breccia dei Dragoni': [p('Struttura robusta'), p('Antiesplosione 1'), p('Ingombrante')],
  'Scudo delle Guardie Ducali': [p('Struttura robusta'), DIF_RAVV],
  'Scudo compatto ASA': [p('Ripiegabile', 'Aprire o richiudere lo Scudo già pronto richiede 1 AzP. Chiuso non concede AR e non consente Parate. Aperto occupa una mano, è riconoscibile e fornisce AR +1, Parata ravvicinata 0 e a distanza −4 VA (§7.4.5).')],
  'Scudo Punisher': [p('Difensiva 1 (ravvicinata e a distanza)', DEF['Difensiva 1'])],
  'Scudo da sfondamento Bastion': [p('Struttura robusta'), p('Stabile 1'), p('Ingombrante')],
  'Scudo antisommossa CSS': [p('Contenimento 1')],
  'Scudo tattico Alpha': [p('Intercettazione balistica 1')],
  'Scudo da breccia Free Marines': [p('Struttura robusta'), p('Antiesplosione 1'), p('Ingombrante')],
  'Scudo della Sicurezza': [p('SIN 1', DEF.SIN)],
  'Scudo d’assalto Chasseur': [p('Struttura robusta'), p('SIN 2', DEF.SIN)],
  'Scudo pesante Reaver': [p('Struttura robusta'), p('SIN 1', DEF.SIN), p('Ingombrante')],
  'Scudo da trincea Trencher': [p('Struttura robusta'), p('Manutenzione semplice'), p('Ingombrante')],
  'Scudo d’assalto dei Clan': [p('Struttura robusta'), DIF_RAVV],
  'Scudo della Young Guard': [p('Struttura robusta'), DIF_RAVV],
  'Scudo da campo Ashigaru': [p('Manutenzione semplice')],
  'Scudo da duello Samurai': [p('Struttura robusta'), DIF_RAVV],
  'Scudo pesante Hatamoto': [p('Struttura robusta'), p('Stabile 1'), p('Ingombrante')],
  'Scudo del Pellegrino': [p('Struttura robusta'), DIF_RAVV],
  'Scudo della Sentinella': [p('Intercettazione balistica 1')],
  'Scudo dei Sacri Guerrieri': [p('Struttura robusta'), p('Stabile 1'), p('Ingombrante')],
  'Scudo delle Guardie Sacre': [
    p('Lama retrattile', 'Estrarre o ritrarre la lama richiede 1 AzP. Con lama estratta gli attacchi usano Armi da Guerra, una mano, portata 1 Q e danno 1d6+1d4 Naturale; la lama non consuma cariche per colpo e non richiede Sintonizzazione (§7.4.10, §7.1.9).'),
    p('Scudo Magico', 'Dopo Sintonizzazione, 1 AzP e 1 PM della riserva attivano Scudo Magico per 5 Round: il contributo dello Scudo diventa AR +4, di cui 2 magica, e concede +2 VA alla Parata ravvicinata e +1 VA a quella a distanza, che passa a −3 VA complessivo. La riserva è un Chroma Rosso da 5 PM; la potenza è Rara e il costo totale di Sintonizzazione è 3, riserva compresa (§7.4.10).'),
  ],
};

// Attacchi con lo scudo (§7.4.1, §7.4.10)
const ATTACCHI = {
  'Scudo Punisher': { abilita: 'Armi da guerra', mani: 1, danno: '1d6+1', portata_q: 1, condizione: null, note: 'Sono compatibili le Manovre generali pertinenti e Stordire (§7.4.1).' },
  'Scudo delle Guardie Sacre': { abilita: 'Armi da guerra', mani: 1, danno: '1d6+1d4', portata_q: 1, condizione: 'con la lama estratta (1 AzP)', note: 'Requisiti e regole offensive complete nel §7.1.9.' },
};

// ---------------------------------------------------------------------------
// 4. Note dalle schede in prosa

const prosa = readFileSync(new URL('prosa/7.4 Scudi e protezioni.txt', LOTTO), 'utf8').split('\n');
const nomi = pulito.map((r) => r['Catalogo e modello'].split(' — ')[1]);
function paragrafi(righe) {
  const out = [];
  let cur = [];
  for (const r of righe) {
    cur.push(r);
    if (/\.$/.test(r) && r.length < 90) { out.push(cur.join(' ')); cur = []; }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
const inizioSchede = prosa.findIndex((r) => r.startsWith('7.4.4 '));
const fineSchede = prosa.findIndex((r) => r.startsWith('7.4.11 '));
const note = {};
const notePerCatalogo = {};
let sezione = null;
let ultimo = null;
let blocco = [];
const chiudi = () => {
  if (!ultimo) return;
  const par = paragrafi(blocco);
  const tutti = ultimo === 'Scudo delle Guardie Sacre';
  note[ultimo] = tutti ? par.join(' ') : par[0];
  if (!tutti && par.length > 1) notePerCatalogo[sezione] = [...(notePerCatalogo[sezione] ?? []), ...par.slice(1)];
  blocco = [];
};
for (const r of prosa.slice(inizioSchede, fineSchede)) {
  const titolo = /^7\.4\.\d+ Scudi (?:della |dell’|)(.+)$/.exec(r);
  if (titolo) { chiudi(); ultimo = null; sezione = titolo[1] === 'Fratellanza' ? 'Fratellanza' : titolo[1]; continue; }
  if (nomi.includes(r)) { chiudi(); ultimo = r; continue; }
  if (r === 'Rainy Dayer e cavalieri Fenris') { chiudi(); ultimo = null; blocco = []; continue; }
  if (ultimo) blocco.push(r); else if (sezione) notePerCatalogo[sezione] = [...(notePerCatalogo[sezione] ?? []), r];
}
chiudi();
// il blocco «Rainy Dayer e cavalieri Fenris» (§7.4.8) è una nota del catalogo Imperial
notePerCatalogo.Imperial = [paragrafi(notePerCatalogo.Imperial ?? []).join(' ')].filter(Boolean);
// §7.4.1: scheda del Punisher
const i41 = prosa.findIndex((r) => r.startsWith('7.4.1 '));
const i42 = prosa.findIndex((r) => r.startsWith('7.4.2 '));
// (le righe 1–4 dopo il titolo sono la tabella; il paragrafo «Le armature, i rinforzi…» è generale)
const fine41 = prosa.findIndex((r, i) => i > i41 && r.startsWith('Le armature, i rinforzi'));
const punisher = prosa.slice(i41 + 5, fine41 > 0 ? fine41 : i42).join(' ');

// ---------------------------------------------------------------------------
// 5. JSON

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numero = (s) => Number(String(s).replace(/\./g, ''));
const FAMIGLIA = { Piccolo: 'Scudi piccoli', Medio: 'Scudi medi', Enorme: 'Scudi enormi' };

const oggetti = pulito.map((r) => {
  const [catalogo, nome] = r['Catalogo e modello'].split(' — ');
  if (!parataDi.has(nome)) throw new Error(`${nome}: modificatori alle Parate non assegnati (§7.4.11)`);
  if (!PROPRIETA[nome]) throw new Error(`${nome}: proprietà non trascritte`);
  if (catalogo !== 'Commerciale' && !note[nome]) throw new Error(`${nome}: scheda in prosa non trovata`);
  const nota = catalogo === 'Commerciale'
    ? 'Scudo Standard commerciale: protezione passiva per taglia, nessuna proprietà propria (§7.4, §7.4.2).'
    : nome === 'Scudo Punisher' ? `${note[nome]} ${punisher}` : note[nome];
  return {
    id: idDa(nome),
    nome,
    tipo: 'scudo',
    catalogo,
    famiglia: FAMIGLIA[r.Taglia],
    nomi_alternativi: [],
    note_manuale: nota,
    paragrafo: catalogo === 'Commerciale' ? '§7.4.2' : '§7.4.2, §7.4.4–7.4.10',
    versione_manuale: VERSIONE,
    taglia: r.Taglia,
    mani: 1, // §7.4: «Tutti gli scudi del catalogo richiedono una mano»
    ar: { totale: Number(r.AR.replace('+', '')), magica: 0 }, // §7.4.2: componente magica passiva 0
    for_richiesta: Number(r.FOR),
    pi: Number(r.PI),
    mov: r.MOV === '—' ? 0 : -Number(r.MOV.replace(/[^\d]/g, '')),
    parata: parataDi.get(nome),
    profili_alternativi: alternativeDi.get(nome) ?? [],
    ...(ATTACCHI[nome] ? { attacco: ATTACCHI[nome] } : {}),
    qualita: r['Qualità'],
    ps_int: Number(r['PS INT']),
    reperibilita: r.REP,
    costo: numero(r.Costo),
    proprieta: PROPRIETA[nome],
  };
});

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.4 Scudi e protezioni (pp. 23–30): tabelle §7.4.2 e §7.4.11, schede in prosa §7.4.1, §7.4.4–7.4.10, proprietà §7.4.3; lotto 3',
  _nota: 'Generato da tools/lotti/lotto3_scudi.mjs; da qui in poi si modifica questo file. «parata» sono i modificatori propri dello Scudo alle Parate (§7.4.11), prima di armatura, FOR insufficiente e altri effetti; «profili_alternativi» sono le condizioni che li cambiano (SIN collegato, Scudo Magico, Contenimento, Antiesplosione). Le proprietà e le note delle schede corporative sono trascritte dal testo in prosa.',
  regole: [
    'La protezione passiva dello Scudo si aggiunge all’AR dell’armatura mentre è impugnato e utilizzabile. Due scudi non sommano la protezione: si utilizza soltanto il contributo maggiore (§7.4).',
    'Il requisito FOR segue il §7.1.6 per le Parate e gli attacchi effettuati con lo Scudo (§7.4).',
    'L’AR dello Scudo resta applicabile senza Parata, con Parata fallita o parando con un’altra arma, purché lo Scudo sia impugnato e utilizzabile (§7.4).',
  ],
  note_per_catalogo: notePerCatalogo,
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  writeFileSync(new URL('pulito/scudi.csv', LOTTO), testoCsv);
  writeFileSync(new URL('scudi.json', DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti docs/lotti/lotto3-scudi/pulito/scudi.csv e data/equipaggiamento/scudi.json (${oggetti.length} scudi)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.nome} · AR ${o.ar.totale} · Parata ${o.parata.ravvicinata}/${o.parata.distanza}${o.profili_alternativi.length ? ` · alt ${o.profili_alternativi.length}` : ''} · ${o.proprieta.map((x) => x.nome).join(', ')}`);
  console.log('note per catalogo:', JSON.stringify(notePerCatalogo, null, 1));
}
