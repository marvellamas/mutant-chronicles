// «Crea nemico» del Tavolo del Master (richiesta di Marcello del 03/10/2026): il profilo di un nemico costruito
// con il Bestiario proposto (docs/bestiario/bestiario.md, dati in data/bestiario.json). Funzioni pure, senza
// interfaccia (la procedura guidata sta in src/ui/crea-nemico.js; test in tests/crea-nemico.test.js).
// - profiloNemico: base + grado + moduli (+ etichetta Boss) → nemico nel formato di data/formato_nemici.json (A.73),
//   con la provenienza di ogni valore. A.95–A.97 (E&L del 05/10/2026): niente ±2 VA per volo e taglia, Boss solo
//   etichetta (PV e Azioni del profilo), nessun costo universale dei moduli né grado effettivo;
// - aCaso / ritiraPasso: la procedura in 5 passi del §6.6 con un seme, ripetibile, con un passo ritirabile;
// - frazioneScontro / difficolta: stima sperimentale della difficoltà contro 7 PG (§2.3), da verificare al tavolo.
// TODO(Davide): il Bestiario è una proposta in attesa di Davide (data/bestiario.json → «TODO(Davide)»).
import { aggiungiDanno, catalogo } from './equipaggiamento.js';

const riga = (fonte, valore, nota) => ({ fonte, valore, ...(nota ? { nota } : {}) });
const clona = (x) => JSON.parse(JSON.stringify(x));
export const idDaNome = (n) => String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Gradi del bestiario umano (§3.2): file esempi/nemici/umani/<tipo>-<suffisso>.json. */
export const SUFFISSO_UMANO = { minore: 'recluta', semplice: 'veterano', medio: 'elite' };
export const fileUmano = (tipo, grado) => (SUFFISSO_UMANO[grado] ? `${tipo}-${SUFFISSO_UMANO[grado]}` : null);

const B = (dati) => dati.bestiario;
const indiceGrado = (dati, id) => B(dati).gradi.findIndex((g) => g.id === id);

/** Ricetta di una creatura pronta (cap. 5) → scelte complete. */
export function scelteCreatura(id, grado, { boss = false } = {}, dati) {
  const c = B(dati).creature.find((x) => x.id === id);
  if (!c) return null;
  const g = boss ? c.boss?.grado ?? grado : grado;
  const moduli = clona((boss ? c.boss?.moduli : null) ?? c.moduli_per_grado?.[g] ?? c.moduli);
  return {
    creatura: id, base: c.base, ...(c.tipo_umano ? { tipoUmano: c.tipo_umano } : {}), grado: g, boss: Boolean(boss && c.boss),
    mutazioni: moduli.mutazioni ?? [], corrotto: moduli.corrotto ?? null, equipaggiamento: moduli.equipaggiamento ?? null,
  };
}

/** Moduli ammessi: Mutazioni per base, livello di Corruzione, Equipaggiamento per Umano e Umanoide (§4.3, §4.4). */
export function mutazioniAmmesse(base, dati) {
  return B(dati).moduli.mutazioni.filter((m) => m.basi.includes(base));
}

/** Round di resistenza del grado contro 7 PG del suo livello (§2.1): stima sperimentale, da verificare al tavolo. */
export function roundResistenza(grado, dati) {
  return B(dati).gradi.find((g) => g.id === grado)?.round_resistenza ?? null;
}

/** «Attacchi naturali» (§4.2.4): per un umano gli attacchi in mischia. */
const naturali = (n, umano) => n.attacchi.filter((a) => (umano ? a.tipo === 'ravvicinato' : !a.rif));
const aggiungiProprieta = (a, p) => {
  const nome = p.replace(/\s+\d+$/, '');
  const lista = (a.proprieta ?? []).filter((x) => x.replace(/\s+\d+$/, '') !== nome || Number(/\d+$/.exec(x)?.[0] ?? 0) > Number(/\d+$/.exec(p)?.[0] ?? 0));
  if (!lista.some((x) => x.replace(/\s+\d+$/, '') === nome)) lista.push(p);
  a.proprieta = lista;
};

/**
 * Profilo di un nemico dalle scelte.
 * @param scelte { base, tipoUmano?, grado, boss?, mutazioni: [id], corrotto: { livello, minori, maggiori, etereo? } | null,
 *   equipaggiamento: { fascia, armi?: [rif], armatura?: rif } | null, creatura?, nome?, descrizione?, id? }
 * @param opzioni { umani: { '<tipo>-<recluta|veterano|elite>': nemico } } per la base Umano
 * @returns {{ nemico, provenienza, round, avvisi: string[], errori: string[] }}
 */
export function profiloNemico(scelte, dati, { umani = {} } = {}) {
  const BE = B(dati);
  const avvisi = [];
  const errori = [];
  const base = BE.basi[scelte.base];
  const g = BE.gradi.find((x) => x.id === scelte.grado);
  if (!base) errori.push(`base sconosciuta: ${scelte.base}`);
  if (!g) errori.push(`grado sconosciuto: ${scelte.grado}`);
  if (errori.length) return { nemico: null, provenienza: {}, round: null, avvisi, errori };
  const umano = Boolean(base.umano);
  const P = {}; // provenienza: campo → righe
  const prov = (campo, fonte, valore, nota) => { (P[campo] ??= []).push(riga(fonte, valore, nota)); };
  const fonteBase = `${base.nome} ${g.nome} (${base.paragrafo})`;
  let n;
  if (umano) {
    const tipo = scelte.tipoUmano ?? base.tipi[0];
    const chiave = fileUmano(tipo, g.id);
    const u = chiave ? umani[chiave] : null;
    if (!chiave) { errori.push(`${base.nome} ${g.nome}: ${BE.basi.umano.per_grado[g.id].tipo} da preparare (§3.2), non c'è ancora nel bestiario umano.`); return { nemico: null, provenienza: {}, round: null, avvisi, errori }; }
    if (!u) { errori.push(`bestiario umano: manca ${chiave}.json`); return { nemico: null, provenienza: {}, round: null, avvisi, errori }; }
    // A.79 (E&L del 05/10/2026): il profilo del convertitore vale com'è; il grado non dà PV, AzP né danni
    n = clona(u);
    delete n.stati;
    const fonteU = `${u.nome} (bestiario umano)`;
    for (const k of ['pv', 'ar', 'difese', 'iniziativa', 'passo']) prov(k, fonteU, k === 'ar' ? n.ar.totale : k === 'passo' ? n.movimento.passo : n[k]);
    for (const k of Object.keys(n.salvezze)) prov(`salvezze.${k}`, fonteU, n.salvezze[k]);
    prov('azioni', fonteU, n.azioni?.principali ?? 1);
    n.attacchi.forEach((a, i) => {
      prov(`attacchi.${i}.va`, fonteU, a.va);
      prov(`attacchi.${i}.danno`, fonteU, a.danno);
    });
  } else {
    const c = base.per_grado[g.id];
    n = {
      formato: 'mutant-nemico', versione: 1, id: 'x', nome: 'x',
      caratteristiche: clona(c.caratteristiche),
      pv: c.pv, ar: { totale: c.ar, magica: 0 }, difese: c.difese, iniziativa: c.iniziativa,
      movimento: { passo: c.passo, corsa: c.passo * 2, scatto: c.passo * 3, ...(c.volo ? { volo: c.volo } : {}) },
      // §3.1.1 del Bestiario: taglia Grande (proposta), nel formato dei nemici
      ...(c.taglia && c.taglia !== 'normale' ? { taglia: c.taglia } : {}),
      salvezze: clona(c.salvezze),
      azioni: { principali: c.azp, movimento: 1 },
      attacchi: c.attacchi.map((a) => ({ nome: a.nome, tipo: 'ravvicinato', va: a.va, danno: a.danno, natura: a.natura, portata_q: a.portata_q, ac: a.ac })),
      abilita: clona(c.abilita),
      capacita: [],
    };
    prov('pv', fonteBase, c.pv);
    prov('ar', fonteBase, c.ar);
    prov('difese', fonteBase, c.difese);
    prov('iniziativa', fonteBase, c.iniziativa);
    prov('passo', fonteBase, c.passo);
    if (c.volo) prov('volo', fonteBase, c.volo);
    prov('azioni', fonteBase, c.azp);
    for (const k of Object.keys(c.salvezze)) prov(`salvezze.${k}`, fonteBase, c.salvezze[k]);
    n.attacchi.forEach((a, i) => { prov(`attacchi.${i}.va`, fonteBase, a.va); prov(`attacchi.${i}.danno`, fonteBase, a.danno); });
    if (c.ragnatela) n.capacita.push({ nome: 'Ragnatela', effetto: `VA ${c.ragnatela.va}, gittata ${c.ragnatela.gittata_q} Q. ${base.capacita.find((x) => x.nome === 'Ragnatela')?.effetto ?? ''}`.trim() });
    for (const x of base.capacita) if (x.nome !== 'Ragnatela') n.capacita.push(clona(x));
    n.immunita = [...(base.immunita ?? [])];
    if (c.spazio && c.spazio !== '1 Q') n.capacita.push({ nome: 'Spazio', effetto: `Occupa ${c.spazio}.` });
  }
  n.immunita ??= [];
  n.capacita ??= [];
  const capacita = (nome, effetto) => { if (!n.capacita.some((x) => x.nome === nome)) n.capacita.push({ nome, effetto }); };
  const ar = (fonte, totale, magica = 0) => { n.ar.totale += totale; n.ar.magica += magica; prov('ar', fonte, totale, magica ? `di cui ${magica} magica` : null); };
  const iG = indiceGrado(dati, g.id);
  const natura = ['Comune'];

  // §4.4 Equipaggiamento (prima delle Mutazioni: il Carapace si somma all'AR che risulta)
  if (scelte.equipaggiamento?.fascia) {
    const E = BE.moduli.equipaggiamento;
    if (!E.basi.includes(scelte.base)) avvisi.push(`Equipaggiamento: solo per ${E.basi.map((b) => BE.basi[b].nome).join(' e ')} (§4.4); non applicato.`);
    else {
      const fascia = E.fasce.find((f) => f.id === scelte.equipaggiamento.fascia);
      const gE = BE.gradi[Math.min(BE.gradi.length - 1, iG + (fascia?.salto ?? 0))];
      const dot = E.per_grado[gE.id];
      const cat = catalogo(dati);
      const armi = (scelte.equipaggiamento.armi ?? predefiniteArmi(dot.armi, cat)).map((r) => cat.perRif.get(r)).filter(Boolean);
      const fonteE = `Equipaggiamento ${gE.nome} (§4.4)`;
      // A.79: gli umani non hanno bonus di grado; l'Umanoide sì (§4.4, ultima colonna)
      const bonus = umano ? 0 : E.per_grado[g.id].bonus_danno ?? 0;
      // §4.4: l'Umanoide usa le armi ravvicinate con il VA degli Artigli, a distanza −2; danno + bonus di grado
      const vaDi = (tipo) => {
        if (!umano) return n.attacchi.find((a) => !a.rif)?.va ?? g.va;
        const stessi = n.attacchi.filter((a) => a.tipo === tipo);
        return stessi.length ? Math.max(...stessi.map((a) => a.va)) : Math.max(...n.attacchi.map((a) => a.va));
      };
      for (const o of armi) {
        const tipo = o.tipo === 'arma_distanza' ? 'distanza' : 'ravvicinato';
        const danno = o.danno?.una_mano ?? o.danno?.due_mani;
        const va = vaDi(tipo) + (!umano && tipo === 'distanza' ? E.distanza_va : 0);
        if (umano) n.attacchi = n.attacchi.filter((a) => a.tipo !== tipo || a.rif === o.rif);
        const a = { nome: o.nome, tipo, va, danno: aggiungiDanno(danno, bonus), natura: 'Naturale', ...(o.proprieta?.length ? { proprieta: [...o.proprieta] } : {}),
          ...(tipo === 'ravvicinato' ? { portata_q: o.portata_q ?? 1 } : { gittata_q: o.gittata_q ?? 1, modalita: o.modalita?.length ? [...o.modalita] : ['S'], ac: o.ac ?? 1 }), rif: o.rif };
        n.attacchi.push(a);
        const i = n.attacchi.length - 1;
        prov(`attacchi.${i}.va`, umano ? 'VA dell’arma dello stesso tipo' : 'VA degli Artigli (§4.4)', vaDi(tipo));
        if (!umano && tipo === 'distanza') prov(`attacchi.${i}.va`, 'arma a distanza (§4.4)', E.distanza_va);
        prov(`attacchi.${i}.danno`, `${o.nome} (catalogo)`, danno);
        prov(`attacchi.${i}.danno`, `${g.nome}: bonus di grado al danno (§3.2)`, bonus);
      }
      // armatura: sostituisce l'AR naturale se è maggiore, altrimenti AR +1 (§4.4); per gli umani la maggiore
      const arE = dot.ar;
      const nonMagica = n.ar.totale - n.ar.magica;
      if (arE > nonMagica) { prov('ar', `${dot.protezione} (${fonteE})`, arE - nonMagica, umano ? 'sostituisce l’armatura' : 'sostituisce l’AR naturale'); n.ar.totale += arE - nonMagica; }
      else if (!umano) ar(`${dot.protezione}, non maggiore dell’AR naturale (§4.4)`, 1);
      capacita('Equipaggiamento', `${dot.protezione}; ${armi.map((o) => o.nome).join(', ')} (${fascia.nome.toLowerCase()}, §4.4).`);
    }
  }

  // §4.3 Mutazioni
  const presi = new Set();
  for (const id of scelte.mutazioni ?? []) {
    const m = BE.moduli.mutazioni.find((x) => x.id === id);
    if (!m) { avvisi.push(`Mutazione sconosciuta: ${id}`); continue; }
    if (presi.has(id)) { avvisi.push(`${m.nome}: una sola volta (§4.1).`); continue; }
    if (!m.basi.includes(scelte.base)) { avvisi.push(`${m.nome}: non ammessa per ${base.nome} (§4.3).`); continue; }
    presi.add(id);
    const e = m.effetti ?? {};
    const fonte = `${m.nome} (§4.3)`;
    const ecc = (m.eccezioni ?? []).find((x) => x.base === scelte.base && x.gradi.includes(g.id));
    if (e.ar) ar(fonte, e.ar);
    if (e.passo_da_8 && n.movimento.passo === 8) { prov('passo', fonte, e.passo_da_8 - 8); n.movimento = { ...n.movimento, passo: e.passo_da_8, corsa: e.passo_da_8 * 2, scatto: e.passo_da_8 * 3 }; }
    if (e.pv_molt) {
      const pv = Math.round(n.pv * e.pv_molt);
      prov('pv', `${fonte}: PV × ${String(e.pv_molt).replace('.', ',')}`, pv - n.pv);
      n.pv = pv;
    }
    if (e.difese && !ecc?.senza?.includes('difese')) { n.difese += e.difese; prov('difese', fonte, e.difese); }
    if (e.portata_q) for (const a of naturali(n, umano)) if ((a.portata_q ?? 1) < e.portata_q) a.portata_q = e.portata_q;
    // Ali membranose: Passo in volo (Giocatore §5.2.3), nel campo del formato
    if (e.volo_q && !n.movimento.volo) { n.movimento.volo = e.volo_q; prov('volo', fonte, e.volo_q); }
    if (e.spazio && !ecc?.senza?.includes('spazio')) { n.capacita = n.capacita.filter((x) => x.nome !== 'Spazio'); capacita('Spazio', `Occupa ${e.spazio}.`); }
    if (e.proprieta_naturali) for (const a of naturali(n, umano)) for (const p of e.proprieta_naturali) aggiungiProprieta(a, p);
    if (e.abilita) for (const [nome, v] of Object.entries(e.abilita)) {
      const ab = n.abilita?.find((x) => x.nome === nome);
      if (ab) { prov(`abilita.${nome}`, 'valore della base', ab.va); ab.va += v; prov(`abilita.${nome}`, fonte, v); }
      else avvisi.push(`${m.nome}: ${nome} non c'è fra le Abilità; il +${v} va applicato a mano.`);
    }
    let testo = m.effetto;
    if (e.recupero_pv) testo = `${e.recupero_pv[g.id]} PV all’inizio della propria Iniziativa, se ha almeno 1 PV. ${m.effetto}`;
    if (e.veleno) {
      const bersaglio = naturali(n, umano)[0];
      if (bersaglio) bersaglio.note = [bersaglio.note, 'applica il Veleno quando ferisce'].filter(Boolean).join('; ');
      testo = `Attacco: ${bersaglio?.nome ?? 'il primo attacco naturale'}, quando infligge almeno 1 danno dopo l’Armatura. Avvelenato per 1+1d3 Round, ${e.veleno[g.id]} danni all’Iniziativa della creatura che ignorano l’Armatura; PS di Tempra ${iG >= indiceGrado(dati, 'potente') ? 'con −2' : 'senza modificatori'}: con successo dimezza per eccesso il danno periodico. Antidoto: kit di pronto soccorso e Prova di Medicina con 1 AzP (§4.3).`;
    }
    capacita(e.recupero_pv ? `${m.nome} ${e.recupero_pv[g.id]}` : m.nome, testo);
  }

  // §4.2 Corrotto dall'Oscura Simmetria
  const C = scelte.corrotto;
  if (C?.livello) {
    const K = BE.moduli.corrotto;
    const l = K.livelli.find((x) => x.id === C.livello);
    if (!l) avvisi.push(`livello di Corruzione sconosciuto: ${C.livello}`);
    else {
      const fonte = `Corrotto, ${l.nome} (§4.2)`;
      const e = l.effetti;
      natura.splice(0, 1, e.natura);
      n.salvezze.volonta += e.volonta;
      prov('salvezze.volonta', fonte, e.volonta);
      if (e.ar_magica) ar(fonte, e.ar_magica, e.ar_magica);
      const nat = naturali(n, umano);
      if (e.attacchi_naturali) for (const a of nat) a.natura = e.attacchi_naturali;
      if (e.attacco_etereo) {
        const a = nat.find((x) => x.nome === C.etereo) ?? nat[0] ?? n.attacchi[0];
        if (a) a.natura = 'Etereo';
      }
      for (const s of e.immunita ?? []) if (!n.immunita.includes(s)) n.immunita.push(s);
      if (e.capacita?.includes('Presenza terrificante')) capacita('Presenza terrificante', K.presenza_terrificante);
      const m = K.manifestazioni_minori.filter((x) => (C.minori ?? []).includes(x.id));
      const M = K.manifestazioni_maggiori.filter((x) => (C.maggiori ?? []).includes(x.id));
      if (m.length !== l.manifestazioni.minori || M.length !== l.manifestazioni.maggiori) avvisi.push(`${l.nome}: ${l.manifestazioni.minori} Manifestazione minore e ${l.manifestazioni.maggiori} maggiori (§4.2); scelte ${m.length} e ${M.length}.`);
      for (const x of [...m, ...M]) {
        const f = x.effetti ?? {};
        const fx = `${x.nome} (§4.2.4)`;
        if (f.ar_magica) ar(fx, f.ar_magica, f.ar_magica);
        for (const s of f.immunita ?? []) if (!n.immunita.includes(s)) n.immunita.push(s);
        const pr = iG >= indiceGrado(dati, 'potente') && f.dal_potente?.proprieta_naturali ? f.dal_potente.proprieta_naturali : f.proprieta_naturali;
        for (const p of pr ?? []) for (const a of naturali(n, umano)) aggiungiProprieta(a, p);
        if (f.recupero_pv) {
          // §4.3: Carne che ricorda non si somma con la Rigenerazione: si usa la maggiore
          const rig = n.capacita.find((c) => c.nome.startsWith('Rigenerazione'));
          capacita(`${x.nome} ${f.recupero_pv[g.id]}`, x.effetto + (rig ? ' Non si somma con la Rigenerazione: vale la maggiore.' : ''));
        } else capacita(x.nome, x.effetto);
      }
      capacita('Esposizione alla Corruzione', `${l.esposizione.nome} (PS di Magia ${l.esposizione.modificatore === '0' ? 'senza modificatori' : l.esposizione.modificatore}, intensità ${l.esposizione.intensita}): chi ne è ferito, una volta per Scena (§4.2.5).`);
    }
  }

  // A.96 (E&L del 05/10/2026): Boss è una classificazione, non un moltiplicatore: PV e Azioni restano quelli del
  // profilo; vale soltanto la capacità propria della creatura pronta, se la scheda la dichiara
  if (scelte.boss) {
    const ricettaBoss = scelte.creatura ? BE.creature.find((x) => x.id === scelte.creatura) : null;
    if (ricettaBoss?.boss?.capacita) capacita(`${ricettaBoss.boss.capacita.nome} (Boss)`, ricettaBoss.boss.capacita.effetto);
  }

  // valori finali
  if (!n.immunita.length) delete n.immunita;
  const ricetta = scelte.creatura ? BE.creature.find((x) => x.id === scelte.creatura) : null;
  n.nome = String(scelte.nome ?? '').trim() || proponiNome(scelte, dati);
  n.id = scelte.id ?? idDaNome(n.nome);
  n.fonte = `Bestiario, proposta: ${ricetta ? `${ricetta.nome} (${ricetta.paragrafo}), ` : ''}${base.nome} ${scelte.boss ? `Boss ${g.nome}` : g.nome}${moduliTesto(scelte, dati)}`;
  const descr = String(scelte.descrizione ?? '').trim() || proponiDescrizione(scelte, dati);
  n.note = [descr, `Natura: ${natura[0]}.`, ricetta?.comportamento ? `Comportamento: ${ricetta.comportamento}` : null,
    'Bestiario proposto, da validare con Davide (TODO(Davide)).'].filter(Boolean).join(' ');
  for (const k of Object.keys(P)) if (k.startsWith('salvezze.') || k === 'pv' || k === 'ar' || k === 'difese' || k === 'iniziativa' || k === 'passo') P[k].totale = valoreCampo(n, k);
  n._bestiario = {
    scelte: clona({ ...scelte, nome: undefined, descrizione: undefined, id: undefined }),
    grado: g.id, boss: Boolean(scelte.boss),
  };
  return { nemico: n, provenienza: P, round: { grado: g.round_resistenza }, avvisi, errori };
}

/** I moduli scelti, per la fonte del nemico: «, Carapace, Veleno, Corrotto (Posseduto)». */
function moduliTesto(scelte, dati) {
  const BE = B(dati);
  const nomi = [
    ...(scelte.mutazioni ?? []).map((id) => BE.moduli.mutazioni.find((m) => m.id === id)?.nome ?? id),
    ...(scelte.corrotto?.livello ? [`Corrotto (${BE.moduli.corrotto.livelli.find((l) => l.id === scelte.corrotto.livello)?.nome ?? scelte.corrotto.livello})`] : []),
    ...(scelte.equipaggiamento?.fascia ? [`Equipaggiamento (${BE.moduli.equipaggiamento.fasce.find((f) => f.id === scelte.equipaggiamento.fascia)?.nome.toLowerCase() ?? scelte.equipaggiamento.fascia})`] : []),
  ];
  return nomi.length ? `, ${nomi.join(', ')}` : '';
}

const valoreCampo = (n, k) => (k === 'ar' ? n.ar.totale : k === 'passo' ? n.movimento.passo : k.startsWith('salvezze.') ? n.salvezze[k.slice(9)] : n[k]);

/** Armi predefinite della fascia (§6.4.4: la scelta è del Direttore): una ravvicinata e una a distanza. */
function predefiniteArmi(rifs, cat) {
  const voci = rifs.map((r) => cat.perRif.get(r)).filter(Boolean);
  const r = voci.find((o) => o.tipo === 'arma_ravvicinata');
  const d = voci.find((o) => o.tipo === 'arma_distanza');
  return [r, d].filter(Boolean).map((o) => o.rif);
}

/** Nome proposto: «Insettoide posseduto Medio», «Boss Aracnoide Potente», «Scavafosse Semplice» (le copie nello scontro aggiungono il numero). */
export function proponiNome(scelte, dati) {
  const BE = B(dati);
  const g = BE.gradi.find((x) => x.id === scelte.grado);
  const ricetta = scelte.creatura ? BE.creature.find((x) => x.id === scelte.creatura) : null;
  if (ricetta) return `${scelte.boss ? 'Boss ' : ''}${ricetta.nome} ${g?.nome ?? ''}`.trim();
  const base = BE.basi[scelte.base];
  const nomeBase = base?.umano ? base.nomi_tipi?.[scelte.tipoUmano] ?? base.nome : base?.nome ?? '';
  const corr = BE.moduli.corrotto.livelli.find((x) => x.id === scelte.corrotto?.livello);
  const aggettivo = corr ? ` ${corr.nome.toLowerCase()}` : '';
  return `${scelte.boss ? 'Boss ' : ''}${nomeBase}${aggettivo} ${g?.nome ?? ''}`.trim();
}

/** Descrizione proposta: la prima frase della base (o la creatura pronta) e i moduli. */
export function proponiDescrizione(scelte, dati) {
  const BE = B(dati);
  const ricetta = scelte.creatura ? BE.creature.find((x) => x.id === scelte.creatura) : null;
  if (ricetta) return ricetta.descrizione;
  const base = BE.basi[scelte.base];
  const mut = (scelte.mutazioni ?? []).map((id) => BE.moduli.mutazioni.find((m) => m.id === id)).filter(Boolean);
  const corr = BE.moduli.corrotto.livelli.find((x) => x.id === scelte.corrotto?.livello);
  const parti = [`${base?.nome ?? ''}${scelte.tipoUmano ? ` (${base.nomi_tipi?.[scelte.tipoUmano] ?? scelte.tipoUmano})` : ''}.`];
  if (mut.length) parti.push(`Mutazioni: ${mut.map((m) => `${m.nome} (${m.breve.replace(/\.$/, '')})`).join('; ')}.`);
  if (corr) parti.push(`Toccato dall’Oscura Simmetria (${corr.nome}).`);
  if (scelte.equipaggiamento?.fascia) parti.push('Armato con equipaggiamento dei cataloghi.');
  return parti.join(' ');
}

// --- generazione casuale (cap. 6) -----------------------------------------------------------------------------

/** Generatore ripetibile (mulberry32). */
export function generatore(seme) {
  let a = (Number(seme) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (...parti) => { let h = 2166136261; for (const c of parti.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const tira = (rng, facce) => 1 + Math.floor(rng() * facce);
const leggi = (t, v) => t.righe.find((r) => v >= r.da && v <= r.a);

/** Grado del gruppo per il livello dei PG (§2.1). */
export function gradoDelGruppo(livello, dati) {
  const gradi = B(dati).gradi;
  return [...gradi].reverse().find((g) => livello >= Number(String(g.livelli).split('–')[0])) ?? gradi[0];
}

/**
 * Nemico tutto a caso (§6.6) con un seme: ogni passo ha il suo seme, così un passo si ritira da solo.
 * @param opzioni { seme, livello: livello dei PG, contesto: 'pattuglia' | 'scontro' | 'tana', semi?: { passo: seme },
 *   fissa?: { base, tipoUmano, grado, boss }: passi già scelti nella procedura guidata, che non si tirano («A caso» di un passo) }
 * @returns {{ scelte, passi: [{ id, titolo, tiri: [{ tabella, dado, valore, risultato }] }], difficolta, numero, semi }}
 */
export function aCaso({ seme = 1, livello = 8, contesto = 'scontro', semi = {}, fissa = {} } = {}, dati) {
  const BE = B(dati);
  const T = BE.tabelle;
  const S = (id) => semi[id] ?? hash(seme, id);
  const passi = [];
  const passo = (id, titolo) => { const p = { id, titolo, tiri: [] }; passi.push(p); return { p, rng: generatore(S(id)) }; };
  const tiro = (p, rng, chiave, nome, ammesso = () => true) => {
    const t = T[chiave];
    const facce = Number(t.dado.slice(1));
    for (let i = 0; i < 50; i++) {
      const v = tira(rng, facce);
      const r = leggi(t, v);
      const ok = ammesso(r);
      p.tiri.push({ tabella: nome, dado: t.dado, valore: v, risultato: r.nome, id: r.id, ...(ok ? {} : { ritirato: true }) });
      if (ok) return r;
    }
    return null;
  };
  // 1. Grado e difficoltà
  const gruppo = gradoDelGruppo(livello, dati);
  const iGruppo = BE.gradi.indexOf(gruppo);
  const { p: p1, rng: r1 } = passo('grado', 'Grado e difficoltà');
  const rg = fissa.grado ? null : tiro(p1, r1, `grado_${contesto}`, `Grado (${contesto})`);
  let iG = fissa.grado ? indiceGrado(dati, fissa.grado) : Math.max(0, Math.min(BE.gradi.length - 1, iGruppo + rg.scarto));
  const boss = fissa.grado ? Boolean(fissa.boss) : rg.id === 'boss';
  // un umano scelto prima del grado: oltre il Medio il bestiario umano non c'è (§3.2), si resta al Medio
  if (!fissa.grado && BE.basi[fissa.base]?.umano && !SUFFISSO_UMANO[BE.gradi[iG].id]) { iG = indiceGrado(dati, 'medio'); p1.tiri.at(-1).nota = 'umano: al massimo Medio (§3.2)'; }
  const rd = tiro(p1, r1, 'difficolta', 'Difficoltà');
  // 2. Base (un umano oltre il Medio non c'è nel bestiario umano: si ritira; il tipo con un d10)
  const { p: p2, rng: r2 } = passo('base', 'Base');
  const rb = fissa.base ? { id: fissa.base } : tiro(p2, r2, 'base', 'Base', (r) => !(BE.basi[r.id].umano && !SUFFISSO_UMANO[BE.gradi[iG].id]));
  const scelte = { base: rb.id, grado: BE.gradi[iG].id, boss, mutazioni: [], corrotto: null, equipaggiamento: null };
  if (BE.basi[rb.id].umano && fissa.tipoUmano) scelte.tipoUmano = fissa.tipoUmano;
  else if (BE.basi[rb.id].umano) {
    const tipi = BE.basi.umano.tipi;
    const v = tira(r2, tipi.length);
    scelte.tipoUmano = tipi[v - 1];
    p2.tiri.push({ tabella: 'Tipo umano', dado: `d${tipi.length}`, valore: v, risultato: BE.basi.umano.nomi_tipi?.[tipi[v - 1]] ?? tipi[v - 1], id: tipi[v - 1] });
  }
  // 3. Moduli: numero, poi uno alla volta (ognuno un passo ritirabile)
  const { p: p3, rng: r3 } = passo('moduli', 'Moduli');
  const rn = tiro(p3, r3, 'numero_moduli', 'Numero di moduli');
  for (let k = 1; k <= rn.numero; k++) {
    const { p, rng } = passo(`modulo-${k}`, `Modulo ${k}`);
    let tipo = tiro(p, rng, 'tipo_modulo', 'Tipo di modulo').id;
    // §6.4.2: Corrotto una sola volta; Equipaggiamento solo per Umano e Umanoide; altrimenti Mutazione
    if (tipo === 'corrotto' && scelte.corrotto) tipo = 'mutazione';
    if (tipo === 'equipaggiamento' && (!BE.moduli.equipaggiamento.basi.includes(scelte.base) || scelte.equipaggiamento)) tipo = 'mutazione';
    if (tipo !== p.tiri.at(-1).id) p.tiri.at(-1).nota = 'vale Mutazione (§6.4.2)';
    let fermo = false;
    if (tipo === 'mutazione') {
      const ammesse = mutazioniAmmesse(scelte.base, dati).filter((m) => !scelte.mutazioni.includes(m.id));
      if (!ammesse.length) { p.tiri.push({ tabella: 'Mutazione', risultato: 'nessuna ammessa', id: null }); continue; }
      const r = tiro(p, rng, 'mutazione', 'Mutazione', (x) => ammesse.some((m) => m.id === x.id));
      scelte.mutazioni.push(r.id);
    } else if (tipo === 'equipaggiamento') {
      const r = tiro(p, rng, 'equipaggiamento', 'Equipaggiamento');
      scelte.equipaggiamento = { fascia: r.id };
    } else {
      // 4. Corruzione (§6.5): livello che ci sta, poi le Manifestazioni
      const { p: p4, rng: r4 } = passo('corruzione', 'Corruzione');
      const livelli = BE.moduli.corrotto.livelli;
      const r = tiro(p4, r4, 'corruzione', 'Livello di Corruzione');
      const i = livelli.findIndex((l) => l.id === r.id);
      {
        const l = livelli[i];
        const C = { livello: l.id, minori: [], maggiori: [] };
        // §6.5.2: una Manifestazione che la base ha già come capacità si ritira (Occhi senza luce e Visione al buio)
        const giaBase = (x) => x.id === 'occhi-senza-luce' && (BE.basi[scelte.base].capacita ?? []).some((c) => c.nome === 'Visione al buio');
        for (let j = 0; j < l.manifestazioni.minori; j++) {
          const m = tiro(p4, r4, 'manifestazione_minore', 'Manifestazione minore', (x) => !C.minori.includes(x.id) && !giaBase(x));
          if (m) C.minori.push(m.id);
        }
        for (let j = 0; j < l.manifestazioni.maggiori; j++) {
          const m = tiro(p4, r4, 'manifestazione_maggiore', 'Manifestazione maggiore', (x) => !C.maggiori.includes(x.id));
          if (m) C.maggiori.push(m.id);
        }
        scelte.corrotto = C;
      }
    }
    if (fermo) break;
  }
  // 5. Scheda e numero (§2.3 con il fattore della difficoltà, stima sperimentale; con l'etichetta Boss uno solo)
  const fr = frazioneScontro({ grado: scelte.grado }, livello, dati);
  let numero = scelte.boss ? 1 : Math.max(1, Math.round((1 / fr.frazione) * rd.fattore));
  // §3.9: una base rara (il Gigante) è una sola per scontro sotto il grado indicato nei dati
  const raro = BE.basi[scelte.base]?.massimo_per_scontro;
  if (raro && indiceGrado(dati, scelte.grado) < indiceGrado(dati, raro.sotto)) numero = Math.min(numero, raro.numero);
  return { scelte, passi, difficolta: rd.id, numero, livello, contesto, seme, fissa, semi: Object.fromEntries(passi.map((p) => [p.id, S(p.id)])) };
}

/** Ritira un passo (§6.6, «ritira la Mutazione»): nuovo seme per quel passo, gli altri restano. */
export function ritiraPasso(esito, idPasso, dati, { nuovoSeme = null } = {}) {
  const semi = { ...esito.semi, [idPasso]: nuovoSeme ?? hash(esito.semi?.[idPasso] ?? 0, 'ritira', Object.keys(esito.semi ?? {}).length) };
  // i passi che non ci sono più (moduli in meno) non restano fra i semi
  return aCaso({ seme: esito.seme, livello: esito.livello, contesto: esito.contesto, semi, fissa: esito.fissa ?? {} }, dati);
}

// --- difficoltà dello scontro (§2.3, solo informativa) --------------------------------------------------------

/** Riga dei gruppi misti più vicina al livello dei PG. */
const rigaMisti = (livello, dati) => B(dati).equilibrato.gruppi_misti.reduce((m, r) => (Math.abs(r.livello - livello) < Math.abs(m.livello - livello) ? r : m));

/** Stima del grado di un nemico senza dati del Bestiario: il grado con i PV più vicini (§2.1). */
export function stimaGrado(nemico, dati) {
  const gradi = B(dati).gradi;
  return gradi.reduce((m, g) => (Math.abs(g.pv - (nemico?.pv ?? 0)) < Math.abs(m.pv - (nemico?.pv ?? 0)) ? g : m)).id;
}

/** Dati del bilancio di un nemico: dal blocco _bestiario se c'è, altrimenti una stima. */
export function infoBilancio(nemico, dati) {
  const b = nemico?._bestiario;
  if (b?.grado) return { grado: b.grado, boss: Boolean(b.boss), stima: false };
  const g = stimaGrado(nemico, dati);
  return { grado: g, boss: false, stima: true };
}

/**
 * Frazione dello scontro normale di una creatura contro 7 PG del livello dato (§2.3): 1 / numero della tabella dei
 * gruppi misti per il suo grado. A.97 (E&L del 05/10/2026): stima sperimentale, da verificare al tavolo; il Boss è
 * un'etichetta e conta come il suo grado; nessun grado effettivo dei moduli.
 */
export function frazioneScontro(info, livello, dati) {
  const BE = B(dati);
  const riga = rigaMisti(livello, dati);
  const i = Math.max(0, indiceGrado(dati, info.grado));
  const numero = riga[BE.gradi[i].id];
  return { frazione: numero ? 1 / numero : 1, livello: riga.livello };
}

/** Difficoltà di un elenco di nemici ({ nemico, quanti }) contro 7 PG del livello dato: somma delle frazioni. */
export function difficolta(voci, livello, dati) {
  const BE = B(dati);
  let somma = 0;
  let stime = 0;
  for (const v of voci) {
    const info = infoBilancio(v.nemico, dati);
    if (info.stima) stime += 1;
    somma += frazioneScontro(info, livello, dati).frazione * (v.quanti ?? 1);
  }
  const s = BE.equilibrato.soglie.find((x) => x.fino_a === null || somma <= x.fino_a);
  return { somma: Math.round(somma * 100) / 100, id: s.id, nome: s.nome, stime, livello: rigaMisti(livello, dati).livello, pg: BE.gruppo_pg, etichetta: BE.equilibrato.etichetta ?? null };
}
