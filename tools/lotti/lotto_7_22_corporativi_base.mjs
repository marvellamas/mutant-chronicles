// Armamenti v0.52 §7.22 (E&L A.5.30): modelli corporativi di base di fucili, armature e scudi.
// Aggiunge al catalogo i 41 profili nuovi; i 7 già presenti (Milizia Ducale, Freedom Brigades,
// Tortoise Mk I, Armatura Ashigaru, M516S, Scudo antisommossa CSS, Scudo da campo Ashigaru)
// conservano i propri valori. Riempie data/dotazioni.json → corporativi.abbinamenti (§2.16.27).
// Idempotente: i modelli già presenti non si toccano. Uso: node tools/lotti/lotto_7_22_corporativi_base.mjs
import fs from 'node:fs';

const V = 'Armamenti 0.52';
const leggi = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const scrivi = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// §7.22.5 Proprietà utilizzate; Purificatrice 1 dal §7.22.2
const PROP = {
  'Manutenzione semplice': '+1 VA a Tecnologia per riparare quell’oggetto, con strumenti e materiali necessari. Non ripristina PI automaticamente e non riduce da sola tempi o costi (§7.22.5).',
  'Manutenzione agevolata': '+1 VA a Tecnologia per riparare quell’oggetto, con strumenti e materiali necessari. Non ripristina PI automaticamente e non riduce da sola tempi o costi. Non si somma a Manutenzione semplice (§7.22.5).',
  'Struttura robusta': '+2 PI massimi, già inclusi nella tabella del modello; nessun incremento della PS Integrità (§7.22.5).',
  'Imbottita 1': 'Contromisura di soglia 1 contro l’effetto aggiuntivo Concussivo; non riduce ulteriormente il danno (§7.22.5).',
  'Isolante 1': 'Contromisura di soglia 1 contro l’effetto aggiuntivo Elettricità; non riduce ulteriormente il danno (§7.22.5).',
  'Contenimento 1': '+1 VA alle Parate ravvicinate effettuate con quello Scudo contro Corpo a corpo; non contro Armi da Mischia o da Guerra (§7.22.5).',
  'Purificatrice 1': 'Si applica secondo il §7.1.3 contro i bersagli validi dell’Oscura Simmetria. Non trasforma il danno in Magico, non richiede PM o Sintonizzazione e non considera automaticamente valida la sola Corruzione. Il bonus non è incluso nei danni tabellari (§7.22.2).',
  'Sbilanciante': 'Dopo due colpi penetranti dello stesso attacco: Prova di Forza o Destrezza; fallimento A Terra. Prova immediata; A Terra fino a quando si rialza (Giocatore §5.24).',
};
const prop = (nomi) => nomi.map((n) => ({ nome: n, testo: PROP[n] }));

const CORP = ['Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperiali', 'Mishima'];
const CATALOGO = { Imperiali: 'Imperial' };
const cat = (c) => CATALOGO[c] ?? c;

// §7.22.2: [modello, danno, VA, Max Q, CC, INC, REP, crediti] nell'ordine di CORP
const FUCILI = {
  carabina: { rif: 'armi_distanza:carabina', tipo: 'Carabina', for: 4, ac: 1, modalita: ['S', 'TR'], spec: 'specializzazione-carabine', righe: [
    ['KR10', '1d6+1', 1, 60, 10, 7, 'CO', 2000], ['CAR10', '1d6+1', 0, 80, 15, 6, 'CO', 1600], ['CAW1000', '1d6+1', 0, 80, 15, 8, 'NC', 2100],
    ['Nemesis 11', '1d6+1', 0, 60, 15, 7, 'NC', 2100], ['Defender', '1d6+2', -1, 60, 10, 6, 'CO', 1800], ['Ashigaru R1', '1d6+1', 0, 60, 20, 5, 'CO', 1500]] },
  assalto: { rif: 'armi_distanza:fucile-d-assalto', tipo: 'Fucile d’assalto', for: 5, ac: 1, modalita: ['S', 'RB', 'RM', 'RL', 'TR', 'FS'], spec: 'specializzazione-fucili-d-assalto', righe: [
    ['STG10', '1d6+2', 1, 120, 20, 6, 'NC', 4400], ['M40', '1d6+2', 0, 160, 30, 5, 'CO', 3500], ['AR2000', '1d6+2', 0, 160, 30, 7, 'NC', 4400],
    ['Volcano 100', '1d6+2', 0, 120, 30, 6, 'NC', 4600], ['Conqueror 10', '1d6+3', -1, 120, 20, 5, 'NC', 4000], ['Shogun 10', '1d6+2', 0, 120, 40, 4, 'NC', 3500]] },
  precisione: { rif: 'armi_distanza:fucile-di-precisione', tipo: 'Fucile di precisione', for: 5, ac: 1, modalita: ['S', 'TR'], spec: 'specializzazione-fucili-di-precisione', righe: [
    ['PSG50', '1d6+3', 1, 800, 4, 7, 'NC', 6000], ['SR20', '1d6+3', 0, 1000, 5, 6, 'CO', 4800], ['SR1500', '1d6+3', 0, 1000, 5, 8, 'NC', 6000],
    ['Mefisto 100', '1d6+3', 0, 800, 5, 7, 'NC', 6200], ['Marksman', '1d6+4', -1, 800, 4, 6, 'NC', 5500], ['Archer 10', '1d6+3', 0, 800, 8, 5, 'NC', 4800]] },
  pompa: { rif: 'armi_distanza:fucile-a-pompa', tipo: 'Fucile a pompa', for: 4, ac: 2, modalita: ['S'], spec: 'specializzazione-fucili-a-pompa-e-doppiette', righe: [
    ['HD10', '1d6', 1, 20, 4, 6, 'CO', 1400], ['M516S', null], ['SA SG1000', '1d6', 0, 30, 6, 7, 'NC', 1400],
    ['Judicator 100', '1d6', 0, 20, 6, 6, 'NC', 1400], ['Breacher', '1d6+1', -1, 20, 4, 5, 'CO', 1300], ['Kaze 10', '1d6', 0, 20, 8, 4, 'CO', 1000]] },
};
const ESISTENTI = { 'M516S': 'armi_distanza_corporative:m516s' };

// §7.22.3: [modello, PI, proprietà, REP, crediti]; null = modello già presente (rif)
const ARMATURE = {
  leggera: { rif: 'armature:armatura-civile-leggera', categoria: 'Leggera', ar: 1, for: 3, rinforzi: ['Leggero', 'Pesante'],
    penalita: { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: 0, lancio_potere: -1 }, righe: [
      'armature_corporative:armatura-della-milizia-ducale', 'armature_corporative:armatura-freedom-brigades',
      ['Giubba di servizio C100', 6, 'Isolante 1', 'NC', 1700], ['Veste protettiva dell’Accolito', 6, 'Imbottita 1', 'NC', 1700],
      ['Giubba territoriale dei Clan', 8, 'Struttura robusta', 'CO', 1800], 'armature_corporative:armatura-ashigaru'] },
  media: { rif: 'armature:armatura-civile-media', categoria: 'Media', ar: 3, for: 5, rinforzi: ['Leggero'],
    penalita: { attacchi_distanza: -1, attacchi_ravvicinati: -1, agilita: -1, movimento_q: -1, lancio_potere: -3 }, righe: [
      ['Corazza Ussara R0', 8, 'Imbottita 1', 'NC', 4000], 'armature_corporative:corazza-tortoise-mk-i',
      ['Corazza di servizio C200', 8, 'Isolante 1', 'NC', 4000], ['Corazza del Novizio', 8, 'Imbottita 1', 'NC', 4000],
      ['Corazza territoriale dei Clan', 10, 'Struttura robusta', 'NC', 4200], ['Corazza Ashigaru', 8, 'Manutenzione agevolata', 'NC', 3800]] },
};

// §7.22.4
const SCUDI = {
  piccolo: { rif: 'scudi:scudo-piccolo', taglia: 'Piccolo', famiglia: 'Scudi piccoli', ar: 1, for: 3, righe: [
    ['Scudo leggero di servizio B10', 4, 'Manutenzione semplice', 'CO', 600], ['Scudo compatto CSS', 4, 'Contenimento 1', 'CO', 700],
    ['Scudo di servizio S100', 4, 'Isolante 1', 'NC', 650], ['Scudo dell’Accolito', 4, 'Imbottita 1', 'NC', 650],
    ['Scudo leggero territoriale dei Clan', 6, 'Struttura robusta', 'CO', 800], ['Scudo leggero Ashigaru', 4, 'Manutenzione semplice', 'CO', 600]] },
  medio: { rif: 'scudi:scudo-medio', taglia: 'Medio', famiglia: 'Scudi medi', ar: 2, for: 5, righe: [
    ['Scudo di servizio B20', 6, 'Manutenzione semplice', 'NC', 1800], 'scudi:scudo-antisommossa-css',
    ['Scudo di servizio S200', 6, 'Isolante 1', 'NC', 1900], ['Scudo del Novizio', 6, 'Imbottita 1', 'NC', 1900],
    ['Scudo medio territoriale dei Clan', 8, 'Struttura robusta', 'NC', 2100], 'scudi:scudo-da-campo-ashigaru'] },
};

const NOTA = 'Modello corporativo di base (§7.22, E&L A.5.30).';
const aggiungi = (d, o) => { if (!d.oggetti.some((x) => x.id === o.id)) d.oggetti.push(o); };
const abbinamenti = Object.fromEntries(CORP.map((c) => [c, {}]));

const pDist = 'data/equipaggiamento/armi_distanza_corporative.json';
const dist = leggi(pDist);
for (const f of Object.values(FUCILI)) {
  f.righe.forEach((r, i) => {
    const corp = CORP[i];
    if (r[1] === null) { abbinamenti[corp][f.rif] = { rif: ESISTENTI[r[0]] }; return; }
    const [nome, danno, va, maxq, cc, inc, rep, costo] = r;
    const props = [...(corp === 'Fratellanza' ? ['Purificatrice 1'] : []), ...(f.tipo === 'Fucile a pompa' ? ['Sbilanciante'] : [])];
    const o = {
      id: slug(nome), nome, tipo: 'arma_distanza', catalogo: cat(corp), famiglia: f.tipo === 'Fucile a pompa' ? 'Fucili a pompa' : 'Fucili di base',
      nomi_alternativi: [],
      note_manuale: `${NOTA} ${f.tipo}${f.tipo === 'Fucile a pompa' ? ' con serbatoio fisso della capacità CC: non riceve caricatori estraibili' : ''}.${props.length ? ` Proprietà: ${props.join(', ')}.` : ''}`,
      paragrafo: '§7.22.2', versione_manuale: V, abilita: 'Armi medie', specializzazione: f.spec, mani: 2,
      danno: { una_mano: null, due_mani: danno }, ac: f.ac, modificatore_va: va, portata_q: null, gittata_q: maxq,
      munizioni: { capacita: cc, unita: 'colpi', ricarica: null, consumo: null, riferimento: null },
      inc, mov: 0, modalita: f.modalita, for_richiesta: f.for, pi: 6, qualita: 'Comune', ps_int: 10, reperibilita: rep, costo,
      proprieta: prop(props),
    };
    aggiungi(dist, o);
    abbinamenti[corp][f.rif] = { rif: `armi_distanza_corporative:${o.id}` };
  });
}
dist.versione_manuale = V;
scrivi(pDist, dist);

const pArm = 'data/equipaggiamento/armature_corporative.json';
const arm = leggi(pArm);
for (const a of Object.values(ARMATURE)) {
  a.righe.forEach((r, i) => {
    const corp = CORP[i];
    if (typeof r === 'string') { abbinamenti[corp][a.rif] = { rif: r }; return; }
    const [nome, pi, p, rep, costo] = r;
    const o = {
      id: slug(nome), nome, tipo: 'armatura', catalogo: cat(corp), famiglia: 'Armature di base', nomi_alternativi: [],
      note_manuale: `${NOTA} Comprende l’elmetto standard, senza AR aggiuntiva. Proprietà: ${p}. Accetta un Rinforzo ${a.rinforzi.join(' oppure ')} (§7.11.2); il rinforzo non fa parte della dotazione iniziale gratuita.`,
      paragrafo: '§7.22.3', versione_manuale: V, categoria: a.categoria, ar: { totale: a.ar, magica: 0 }, for_richiesta: a.for,
      pi, qualita: 'Comune', ps_int: 10, reperibilita: rep, costo, rinforzi_ammessi: a.rinforzi, penalita: a.penalita, proprieta: prop([p]),
    };
    aggiungi(arm, o);
    abbinamenti[corp][a.rif] = { rif: `armature_corporative:${o.id}` };
  });
}
arm.versione_manuale = V;
scrivi(pArm, arm);

const pSc = 'data/equipaggiamento/scudi.json';
const sc = leggi(pSc);
for (const s of Object.values(SCUDI)) {
  s.righe.forEach((r, i) => {
    const corp = CORP[i];
    if (typeof r === 'string') { abbinamenti[corp][s.rif] = { rif: r }; return; }
    const [nome, pi, p, rep, costo] = r;
    const cont = p === 'Contenimento 1';
    const o = {
      id: slug(nome), nome, tipo: 'scudo', catalogo: cat(corp), famiglia: s.famiglia, nomi_alternativi: [],
      note_manuale: `${NOTA} Scudo ${s.taglia} con ${p}: Parata ravvicinata 0 e a distanza −4 VA${cont ? '; +1 VA alle Parate ravvicinate contro Corpo a corpo' : ''}.`,
      paragrafo: '§7.22.4', versione_manuale: V, taglia: s.taglia, mani: 1, ar: { totale: s.ar, magica: 0 }, for_richiesta: s.for,
      pi, mov: 0, parata: { ravvicinata: 0, distanza: -4 },
      profili_alternativi: cont ? [{ condizione: 'contro attacchi di Corpo a corpo (Contenimento 1)', parata: { ravvicinata: 1, distanza: -4 } }] : [],
      qualita: 'Comune', ps_int: 10, reperibilita: rep, costo, proprieta: prop([p]),
    };
    aggiungi(sc, o);
    abbinamenti[corp][s.rif] = { rif: `scudi:${o.id}` };
  });
}
sc.versione_manuale = V;
scrivi(pSc, sc);

const pDot = 'data/dotazioni.json';
const dot = leggi(pDot);
dot.corporativi.abbinamenti = abbinamenti;
scrivi(pDot, dot);
console.log(Object.entries(abbinamenti).map(([c, a]) => `${c}: ${Object.keys(a).length}`).join(', '));
