// Sintesi operative dei Talenti per la SS (decisione approvata del 05/10/2026, docs/risposte-master.md, decisione 112):
// effetto e valori, condizioni, costi in Azioni o PM, limiti di frequenza, riferimento al manuale. Scritte ora solo per
// i Talenti dei sette PG reali e dei PG d'esempio; tutte «da_verificare» finché Davide non le approva.
// Scrive il campo `sintesi` { testo, rif, stato } in data/classi.json (talenti_fissi e talenti_a_scelta) e
// data/talenti_liberi.json, poi l'elenco in docs/sintesi-talenti-da-approvare.md.
// Uso: node tools/lotti/lotto_sintesi_talenti.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
const scrivi = (p, j) => writeFileSync(new URL(p, RADICE), `${JSON.stringify(j, null, 2)}\n`);

// Talenti di Classe: «Classe|Nome»; rif dal paragrafo dei Talenti della Classe
const CLASSE = {
  'Agente|Fuoco Controllato': ['Sparando a un avversario in Ravvicinato, coperto da un alleato o che usa un ostaggio: niente penalità specifica né seconda Prova di controllo; un fallimento non colpisce l’alleato (Maldestro: complicazione). Distanza e Copertura restano.'],
  'Agente|Posizionamento Operativo': ['1 volta per combattimento, dopo l’Iniziativa e prima del Round 1: si sposta gratis fino a 3 Q, senza altre azioni (terreno e Attacchi di Opportunità normali). Non se Sorpreso.'],
  'Artigliere|Ottimizzare Gittata': ['Armi medie o pesanti: −2 alla penalità di distanza. Si cumula con mirini e Tiro a Lunga Distanza fino a 0, mai bonus; non estende la gittata né riduce le Azioni.'],
  'Artigliere|Bersaglio Designato': ['Ogni AzP di preparazione prima del tiro: +1 danno dopo l’AR, se almeno 1 danno l’ha superata, massimo +2. Solo Tiro Singolo o Raffica Breve.'],
  'Artigliere|Occhio del Tiratore': ['Se non usa l’Azione di Movimento e impiega un mirino: il mirino riduce di altri 2 la penalità di distanza.'],
  'Assaltatore|Mantenere la Posizione': ['+3 alle Prove e PS per resistere o liberarsi da sbilanciamenti, spinte, spostamenti forzati, immobilizzazioni e disarmi. Spostamento senza Prova: PS Tempra gratuita a +3 (evita solo lo spostamento).'],
  'Assaltatore|Carica Brutale': ['+2 al danno base della Carica, prima del moltiplicatore (si applica il più alto; ×2 diventa ×3 con un Magistrale, §1.6).'],
  'Assaltatore|Scudo Aggressivo': ['1 volta per Round, dopo un attacco con lo scudo a segno: il bersaglio ha −2 VA alla prossima Prova di Difese prima della successiva Iniziativa dell’Assaltatore. Non si cumula.'],
  'Incursore|Movimento Tattico': ['Sempre attivo: −2 (fino a 0) alle penalità delle proprie Prove dovute al tipo di Movimento (Passo 0, Corsa 0, Scatto −4). Restano le altre penalità e quelle degli avversari per colpirlo.'],
  'Incursore|Sabotaggio Rapido': ['+2 VA a Tecnologia per sabotare o disattivare dispositivi, allarmi, macchinari e sicurezza; tempo dimezzato (per eccesso, minimo 1 AzP). Servono accesso e strumenti.'],
  'Lottatore|Addestramento al Combattimento Senz’Armi': ['Disciplina permanente. Danno senz’armi ai Gradi I–II / III–IV / V–VI: Potenza 1d8/1d10/1d12 (−1 Difese dopo l’attacco, fino alla propria Iniziativa); Rapidità 1d4/1d6/1d8 (+3 Iniziativa, 1 Q gratis per Round); Controllo 1d4/1d6/1d8 (+2/+4/+6 VA alle Manovre); Guardia 1d6/1d8/1d10 (+1/+2/+3 Difese in mischia).'],
  'Lottatore|Risorse Interiori': ['Accesso alle Risorse Interiori: 2 + Mod SAG Tecniche (minimo 1), generiche, esclusive del Lottatore o di una Scuola Mishima accessibile. PM personali, non sono Incantesimi (§8.6.10, §8.9).'],
  'Pilota|Pilota Nato': ['1 volta per Round, 1 AzP di preparazione: +2 VA alla successiva Prova di Pilotare o Tecnologia per quella manovra, entro la fine della propria Iniziativa successiva. Una sola Prova; non sostituisce le Azioni della manovra.'],
  'Pilota|Meccanico di Bordo': ['Sul veicolo in cui si trova: +2 VA a Tecnologia per diagnosi e riparazioni, tempi dimezzati (riparazione di una struttura 30 minuti invece di 1 ora). Improvvisati a −2 VA; non sostituisce componenti mancanti (Veicoli §7.1).'],
  'Tecnico|Mani Esperte': ['+3 VA a Tecnologia per usare, diagnosticare, configurare o riparare macchinari, elettronica, impianti energetici, computer e dispositivi automatizzati.'],
  'Tecnico|Intrusione Rapida': ['1 volta per scena, 1 AzP: un’intrusione informatica da minuti, con Tecnologia −4 VA; un solo risultato (accesso, sicurezza, credenziali, un dato, un comando). Servono punto d’accesso e strumenti; mai un’intera rete.'],
  'Custode|Arma Astrale': ['1 AzP e 2 PM: Arma Astrale per 10 Round (Armi da mischia, danno Magico, senza Concentrazione); danno ai Gradi I–VI 1d6, 1d8, 1d10, 1d10+1, 1d10+2, 1d10+3. Evocazioni senza limite.'],
  'Invocatore|Incantesimi Aggressivi': ['Incantesimi offensivi: +1 danno ai Gradi I–II, +2 ai III–IV, +3 ai V–VI. Una volta per bersaglio, alla prima applicazione del danno; non nei Round successivi di un effetto persistente.'],
  'Invocatore|Canalizzazione Implacabile': ['1 volta per scena: ripete una Prova di Potere fallita di un Incantesimo offensivo, prima delle conseguenze, senza nuove Azioni o PM; vale il secondo risultato (un 20 naturale conserva il Distintivo). Non per gli attacchi con armi.'],
  'Tecnomante|Architetto TecnoMistico': ['Quattro benefici: Analisi avanzata (10 minuti e Prova di Artefatti: Struttura, Proprietà, Riserva; non sostituisce l’Identificazione); Sintonizzazione automatica senza Prova; +2 alla capacità di sintonizzazione, una volta; accesso alla Creazione TecnoMistica. Non si riassume senza perdere limiti: vedi il testo completo.'],
  'Tecnomante|Interfaccia Remota': ['Attiva a distanza (massimo 6 Q, percepito e con linea d’effetto libera) una proprietà di un Artefatto sintonizzato: stessa Azione, PM e Prove, energia dalla fonte normale. Non muove né impugna l’oggetto; niente attacchi ordinari.'],
};

// Talenti Liberi: id → testo; rif dalla sezione del Talento
const LIBERI = {
  'sempre-allerta': '+3 VA a Percezione contro imboscate, aggressori nascosti e pericoli improvvisi, anche senza cercare, se la minaccia è percepibile. Nessuna immunità alla Sorpresa.',
  'duro-a-morire': 'A 0 PV: +3 alle PS di Tempra contro nuove Ferite (da danno o Sanguinamento). Non sulla PS contro le Menomazioni.',
  'resistenza-alla-corruzione': '+2 alle PS per non acquisire Corruzione Oscura o limitarne il peggioramento (di norma Magia, §5.20).',
  duellante: 'Arma ravvicinata a una mano più Arma leggera a distanza: Combattere con due armi a −2 VA per attacco invece di −4. 1 AzP, Prove separate; Tiro Ravvicinato se impegnato; non si somma ad Ambidestro (§5.7).',
  'tiro-mirato-migliorato': 'Tiro Mirato a +4 VA e +4 danni invece di +2. Stesse Azioni e condizioni di Tiro Mirato (+1 AzP); solo Tiro Singolo o Raffica Breve (§5.10).',
  'tiro-a-lunga-distanza': 'Oltre 80 Q: −2 alla penalità di distanza. Si cumula con mirini e Ottimizzare Gittata fino a 0, mai bonus; non estende la gittata né riduce le Azioni (§5.11).',
  'mira-rapida': '−1 (minimo 1) alle AzP richieste da distanza e mirino; non tocca l’AzP di Tiro Mirato. Esempio: a 800 Q da 3 AzP a 2 (§5.11).',
  schermidore: 'Due armi ravvicinate a una mano: Combattere con due armi a −2 VA per attacco invece di −4. 1 AzP, Prove distinte; non si somma ad Ambidestro (§5.7).',
  'arti-marziali': 'Danno base senz’armi 1d6. Con la Disciplina del Lottatore si usa il dado più alto, senza sommarli.',
  'parata-istintiva': '1 volta per Round: una Parata senza spendere Azioni, anche fuori dalla propria Iniziativa. Restano Prova, requisiti, penalità e limiti della Parata.',
  'parata-migliorata': 'Dopo una Parata riuscita con un’arma: danno dimezzato per eccesso e −2 (minimo 0) prima dell’AR; il Magistrale annulla. Non con lo scudo.',
  hacker: '1 volta per sessione per sistema, dichiarato prima della Prova: +2 VA a Tecnologia per intrusione o sorveglianza elettronica (+4 con Informatica). Si consuma anche se fallisce.',
  'controllo-d-emergenza': '−2 complessivo per Prova (fino a 0) alle penalità a Pilotare da maltempo, turbolenze, visibilità, guasti, danni o perdita di controllo. Non sulle penalità di manovre e Talenti (Manovra Evasiva −4).',
  inseguimento: '+2 VA a Pilotare per inseguire o seminare un mezzo (+4 con la Specializzazione del veicolo). Solo le manovre dell’inseguimento; non cambia Movimento né Percezione (Veicoli §6.1).',
  'risorse-interiori': 'Apprende 2 + Mod SAG Tecniche Interiori (minimo 1, contate all’acquisizione), generiche o di Scuole Mishima accessibili. PM personali, la riserva non aumenta (§8.9); incompatibilità del §8.6.10.',
  'tecniche-interiori-supplementari': '+3 Tecniche Interiori accessibili, diverse a ogni acquisizione. Resta una sola attivazione di Tecnica per Round.',
  'ritualista-minore': 'Apprende ed esegue Rituali di Grado I–III come Officiante o Canale. Ogni procedura si apprende a parte (requisiti, tempi, materiali, costi); nessun Incantesimo, nessun bonus automatico del Canale.',
  'ritualista-maggiore': 'Estende Ritualista Minore ai Rituali di Grado IV–VI (Officiante o Canale). Procedure da apprendere una per una; nessun Incantesimo né bonus automatico.',
  'incantesimi-estesi': 'Anticipando la Durata non raddoppia il costo base in PM (uno scatto consentito). Prova di Potere obbligatoria e una categoria più difficile; non con Calcolo Arcano; niente su effetti istantanei.',
  'incantesimi-plurimi': 'Anticipando i Bersagli non raddoppia il costo base in PM (uno scatto consentito); non aumenta i Colpi. Prova di Potere obbligatoria e una categoria più difficile; non con Calcolo Arcano.',
};

const classi = leggi('data/classi.json');
const usati = new Set();
for (const cl of Object.values(classi.classi)) {
  const par = /Talenti (§[\d.]+)(?!.*Talenti §)/.exec(cl.fonte)?.[1] ?? '§3';
  for (const t of [...cl.talenti_fissi, ...(cl.talenti_a_scelta ?? [])]) {
    const k = `${cl.nome}|${t.nome}`;
    if (!CLASSE[k]) continue;
    t.sintesi = { testo: CLASSE[k][0], rif: `Giocatore ${par}`, stato: 'da_verificare' };
    usati.add(k);
  }
}
const liberi = leggi('data/talenti_liberi.json');
for (const t of liberi.talenti) {
  if (!LIBERI[t.id]) continue;
  t.sintesi = { testo: LIBERI[t.id], rif: t.sezione === 'magia' ? 'Magia, Talenti di magia' : `Giocatore §${t.sezione}`, stato: 'da_verificare' };
  usati.add(t.id);
}
const mancanti = [...Object.keys(CLASSE), ...Object.keys(LIBERI)].filter((k) => !usati.has(k));
if (mancanti.length) throw new Error(`Talenti non trovati nei dati: ${mancanti.join(', ')}`);
scrivi('data/classi.json', classi);
scrivi('data/talenti_liberi.json', liberi);

// elenco per Davide
const righe = [];
for (const cl of Object.values(classi.classi)) for (const t of [...cl.talenti_fissi, ...(cl.talenti_a_scelta ?? [])]) if (t.sintesi?.stato === 'da_verificare') righe.push(`| ${cl.nome}: ${t.nome} | ${t.sintesi.rif} | ${t.sintesi.testo} |`);
for (const t of liberi.talenti) if (t.sintesi?.stato === 'da_verificare') righe.push(`| ${t.nome} (Libero) | ${t.sintesi.rif} | ${t.sintesi.testo} |`);
writeFileSync(new URL('docs/sintesi-talenti-da-approvare.md', RADICE), `# Sintesi dei Talenti da approvare

Sintesi operative stampate nel foglio 2 della SS al posto della prima frase (decisione 112 in
\`docs/risposte-master.md\`). Scritte il 05/10/2026 per i Talenti dei sette PG reali e dei PG d'esempio
(\`tools/lotti/lotto_sintesi_talenti.mjs\`); tutte marcate «da verificare» (\`sintesi.stato: "da_verificare"\` in
\`data/classi.json\` e \`data/talenti_liberi.json\`). Davide le approva o le corregge; approvata una sintesi, lo stato
diventa \`approvata\` e in stampa sparisce l'asterisco. Gli altri Talenti stampano la prima frase con «sintesi da
redigere».

Totale: ${righe.length} sintesi.

| Talento | Riferimento | Sintesi |
|---|---|---|
${righe.join('\n')}
`);
console.log(`${righe.length} sintesi scritte`);
