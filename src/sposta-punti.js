// Lotto 165 (02/11/2026, richiesta di Davide dal tavolo del 2/11): il Direttore corregge davvero gli avanzamenti. Se un
// giocatore ha speso male i Punti Abilità Liberi di un evento (la creazione o un livello), il Direttore li toglie da dove
// sono stati messi e li rimette altrove, invece di appiccicare una correzione a parte («✎», src/correzioni-master.js).
//
// Regole del lavoro:
//  - si lavora dentro l'evento in cui i punti sono stati spesi (Giocatore §2.13, §8.3: i punti appartengono al loro
//    evento, come per «Assegna», A.52, A.107); portarli in un altro livello si può, ma l'app avvisa e chiede conferma;
//  - mentre si sposta il totale dell'evento non cambia da solo: un punto tolto resta «da ricollocare» finché non lo si
//    mette altrove, e chiudere con punti in sospeso chiede conferma;
//  - i limiti delle regole (limite del VA personale della categoria, §8.3; VA minimo prima dei punti liberi, §2.13; i
//    livelli dopo che diventerebbero irregolari, A.107) sono avvisi con il motivo: il Direttore li forza con conferma e la
//    forzatura resta scritta nel livello (`puntiDirettore.forzati`), così la scheda non la segnala come errore;
//  - il giocatore non lo fa: né dalla scheda (il pannello c'è solo in modalità master) né dal tablet (il server rifiuta,
//    controllaPuntiDaTablet).
//
// Nel file, accanto ai punti dell'evento (creazione.puntiAbilitaLiberi, livelli[i].puntiAbilita), il blocco del Direttore:
//   puntiDirettore: { quando, motivo?, spostati?: { Abilità: netto }, totale?: n, forzati?: [Abilità] }
//   - spostati: quanti punti il Direttore ha messo (+) o tolto (−) per Abilità, sommando i suoi spostamenti: serve a far
//     capire che il numero viene da uno spostamento e non da una correzione a parte;
//   - totale: il totale dell'evento deciso da lui quando è diverso da quello delle regole (punti portati da un altro
//     livello, o uno in più): vale come previsto, quindi né «Assegna» né «Togli» lo rimettono a posto da soli;
//   - forzati: le Abilità in cui ha forzato un limite delle regole.
// Funzioni pure; l'interfaccia è in src/ui/sposta-punti.js.

import { migraPersonaggio, ricalcolaAvanzamento, calcolaSchedaPersonaggio, puntiDirettoreDi, eventiLivello } from './avanzamento.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const somma = (o) => Object.values(o ?? {}).reduce((s, v) => s + (Number.isInteger(v) ? v : 0), 0);
const pulisci = (o) => Object.fromEntries(Object.entries(isOggetto(o) ? o : {}).filter(([, v]) => Number.isInteger(v) && v > 0).sort(([a], [b]) => a.localeCompare(b)));
const uguali = (a, b) => JSON.stringify(pulisci(a)) === JSON.stringify(pulisci(b));

export const nomeEvento = (livello) => (livello === 1 ? 'creazione' : `${livello}° livello`);
export const nelEvento = (livello) => (livello === 1 ? 'nella creazione' : `nel ${livello}° livello`);
const punti = (n) => (n === 1 ? '1 punto' : `${n} punti`);
const a_ = (nome) => (/^[aA]/.test(nome) ? 'ad' : 'a');

/** Punti Abilità Liberi previsti dalle regole per l'evento (regole.json → creazione, avanzamento.eventi «punti_abilita:N»). */
export function puntiPrevisti(livello, dati) {
  if (livello === 1) return dati.regole.creazione.punti_abilita_liberi;
  for (const x of eventiLivello(livello, dati)) {
    const m = /^punti_abilita:\+?(\d+)$/.exec(x);
    if (m) return Number(m[1]);
  }
  return 0;
}

/** I Punti Abilità Liberi spesi nell'evento (1 = creazione), per Abilità. */
export function puntiDelLivello(personaggio, livello) {
  const p = migraPersonaggio(personaggio);
  return pulisci(livello === 1 ? p.creazione?.puntiAbilitaLiberi : p.livelli[livello - 2]?.puntiAbilita);
}

/** Gli eventi in cui si spendono Punti Abilità Liberi: la creazione e i livelli che ne danno (o ne hanno). */
export function eventiConPunti(personaggio, dati) {
  const p = migraPersonaggio(personaggio);
  const out = [];
  for (let livello = 1; livello <= 1 + p.livelli.length; livello++) {
    const previsti = puntiPrevisti(livello, dati);
    const spesi = puntiDelLivello(p, livello);
    if (!previsti && !somma(spesi)) continue;
    const dir = puntiDirettoreDi(p, livello);
    out.push({ livello, nome: nomeEvento(livello), previsti, totale: somma(spesi), punti: spesi, ...(dir ? { direttore: dir } : {}) });
  }
  return out;
}

/** I punti dell'evento nella bozza (quelli spostati finora) o, se l'evento non è stato toccato, quelli salvati. */
export const puntiInBozza = (personaggio, bozza, livello) => pulisci(bozza?.[livello] ?? puntiDelLivello(personaggio, livello));

/**
 * Toglie (delta < 0) o mette (delta > 0) punti di un'Abilità nella bozza dell'evento. Non tocca il personaggio: il totale
 * salvato resta quello e la differenza si legge come «da ricollocare» (o «in più»). Mai sotto zero.
 * @param bozza { [livello]: { Abilità: punti } } @returns la bozza nuova
 */
export function spostaInBozza(personaggio, bozza, livello, abilita, delta) {
  const attuali = { ...puntiInBozza(personaggio, bozza, livello) };
  attuali[abilita] = Math.max(0, (attuali[abilita] ?? 0) + delta);
  const nuova = { ...(bozza ?? {}), [livello]: pulisci(attuali) };
  // un evento tornato com'era esce dalla bozza
  if (uguali(nuova[livello], puntiDelLivello(personaggio, livello))) delete nuova[livello];
  return nuova;
}

/** Gli eventi cambiati nella bozza, con i totali: prima, adesso, differenza (negativa = punti da ricollocare). */
export function totaliBozza(personaggio, bozza) {
  return Object.keys(bozza ?? {}).map(Number).sort((a, b) => a - b).map((livello) => {
    const prima = puntiDelLivello(personaggio, livello);
    const ora = puntiInBozza(personaggio, bozza, livello);
    return { livello, prima: somma(prima), ora: somma(ora), differenza: somma(ora) - somma(prima) };
  }).filter((x) => !uguali(puntiDelLivello(personaggio, x.livello), puntiInBozza(personaggio, bozza, x.livello)));
}

/**
 * Il personaggio con i punti della bozza al loro posto, e il blocco del Direttore aggiornato in ogni evento cambiato.
 * @param opz { quando, motivo, forzati: { [livello]: [Abilità] }, totali: { [livello]: n } } (dalla conferma del Direttore)
 */
export function applicaSpostamento(personaggio, bozza, dati, { quando = new Date().toISOString(), motivo = '', forzati = {}, totali = {} } = {}) {
  const p = migraPersonaggio(personaggio);
  let creazione = p.creazione;
  const livelli = [...p.livelli];
  for (const livello of Object.keys(bozza ?? {}).map(Number)) {
    if (!(livello === 1 || (livello >= 2 && livello <= p.livelli.length + 1))) continue;
    const prima = puntiDelLivello(p, livello);
    const dopo = pulisci(bozza[livello]);
    if (uguali(prima, dopo)) continue;
    const dir0 = puntiDirettoreDi(p, livello) ?? {};
    const spostati = { ...(isOggetto(dir0.spostati) ? dir0.spostati : {}) };
    for (const a of new Set([...Object.keys(prima), ...Object.keys(dopo)])) {
      const d = (dopo[a] ?? 0) - (prima[a] ?? 0);
      if (!d) continue;
      spostati[a] = (spostati[a] ?? 0) + d;
      if (!spostati[a]) delete spostati[a];
    }
    const forz = [...new Set([...(Array.isArray(dir0.forzati) ? dir0.forzati : []), ...(forzati[livello] ?? [])])].filter((a) => (dopo[a] ?? 0) > 0).sort();
    let totale = Number.isInteger(totali[livello]) ? totali[livello] : dir0.totale;
    // un totale uguale a quello delle regole non serve più
    if (totale === puntiPrevisti(livello, dati)) totale = undefined;
    const dir = {
      quando, ...(String(motivo ?? '').trim() ? { motivo: String(motivo).trim().slice(0, 200) } : {}),
      ...(Object.keys(spostati).length ? { spostati: pulisciSegni(spostati) } : {}),
      ...(Number.isInteger(totale) ? { totale } : {}),
      ...(forz.length ? { forzati: forz } : {}),
    };
    const vuoto = !dir.spostati && dir.totale === undefined && !dir.forzati;
    if (livello === 1) {
      creazione = { ...creazione, puntiAbilitaLiberi: dopo, puntiDirettore: vuoto ? null : dir };
    } else {
      const v = { ...livelli[livello - 2], puntiAbilita: dopo };
      if (!Object.keys(dopo).length) delete v.puntiAbilita;
      if (vuoto) delete v.puntiDirettore; else v.puntiDirettore = dir;
      livelli[livello - 2] = v;
    }
  }
  return { ...p, creazione, livelli };
}

const pulisciSegni = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => Number.isInteger(v) && v !== 0).sort(([a], [b]) => a.localeCompare(b)));

/** «livello|Abilità» → punti inattivi (che non aumentano il VA personale, §8.3). */
function mappaInattivi(stato) {
  const m = new Map();
  for (const x of stato?.inattivi ?? []) m.set(`${x.livello}|${x.abilita}`, (m.get(`${x.livello}|${x.abilita}`) ?? 0) + x.punti);
  return m;
}

/** Il limite del VA personale di un'Abilità a quell'evento (dopo il Grado del livello): { valore, categoria }. */
function limiteAllEvento(p, livello, abilita, dati) {
  try {
    const a = calcolaSchedaPersonaggio({ creazione: p.creazione, livelli: p.livelli.slice(0, livello - 1) }, dati).abilita?.find((x) => x.nome === abilita);
    if (!a) return null;
    return { valore: a.limite, categoria: dati.regole.competenze.categorie[a.limiteCategoria]?.nome ?? a.limiteCategoria };
  } catch { return null; }
}

/**
 * Gli avvisi della bozza, ognuno con il motivo; il Direttore li può forzare tutti con una conferma.
 *   tipo 'sospesi'    punti tolti e non ancora rimessi (il livello resterebbe sotto i suoi punti);
 *   tipo 'in-piu'     punti messi oltre quelli che il livello aveva;
 *   tipo 'migrazione' punti che passano da un livello a un altro;
 *   tipo 'limite'     punti che non aumentano il VA personale (§8.3), nell'evento che si sta cambiando;
 *   tipo 'regola'     un'altra regola dell'evento (VA minimo prima dei punti liberi, §2.13…);
 *   tipo 'dopo'       un livello dopo che cambierebbe (punti da riassegnare, A.107, o una regola).
 * @returns {{ tipo, livello, abilita?, testo }[]}
 */
export function avvisiSpostamento(personaggio, bozza, dati) {
  const p = migraPersonaggio(personaggio);
  const totali = totaliBozza(p, bozza);
  if (!totali.length) return [];
  const avvisi = [];
  const toccati = new Set(totali.map((x) => x.livello));
  const meno = totali.filter((x) => x.differenza < 0);
  const piu = totali.filter((x) => x.differenza > 0);
  if (meno.length && piu.length) {
    const n = piu.reduce((s, x) => s + x.differenza, 0);
    avvisi.push({ tipo: 'migrazione', livello: piu[0].livello,
      testo: `${punti(n)} ${n === 1 ? 'passa' : 'passano'} ${meno.map((x) => `dal ${nomeEvento(x.livello)}`).join(', ').replace('dal creazione', 'dalla creazione')} ${piu.map((x) => `al ${nomeEvento(x.livello)}`).join(', ').replace('al creazione', 'alla creazione')}: di regola i punti restano nel livello in cui sono stati spesi (§8.3).` });
  }
  for (const x of meno) {
    if (piu.length) continue;
    avvisi.push({ tipo: 'sospesi', livello: x.livello, testo: `${punti(-x.differenza)} da ricollocare ${nelEvento(x.livello)}: il livello resterebbe con ${x.ora} punti su ${x.prima} e la scheda chiederebbe di assegnarli («Assegna»).` });
  }
  for (const x of piu) {
    if (meno.length) continue;
    avvisi.push({ tipo: 'in-piu', livello: x.livello, testo: `${punti(x.differenza)} in più ${nelEvento(x.livello)}: il livello avrebbe ${x.ora} punti invece di ${x.prima} (le regole ne danno ${puntiPrevisti(x.livello, dati)}).` });
  }
  const nuovo = applicaSpostamento(p, bozza, dati);
  const prima = ricalcolaAvanzamento(p, dati);
  const dopo = ricalcolaAvanzamento(nuovo, dati);
  const chiave = (e) => `${e.campo}|${e.problema}`;
  const giaPrima = new Set(prima.errori.map(chiave));
  for (const e of dopo.errori) {
    if (e.tipo !== 'violazione' || giaPrima.has(chiave(e))) continue;
    const m = /^(?:creazione\.puntiAbilitaLiberi|livelli\[(\d+)\]\.puntiAbilita)\.(.+)$/.exec(e.campo ?? '');
    const livello = m ? (m[1] === undefined ? 1 : Number(m[1]) + 2) : e.livello;
    if (toccati.has(livello) && m) avvisi.push({ tipo: 'regola', livello, abilita: m[2], testo: `${m[2]} ${nelEvento(livello)}: ${e.problema}` });
    else avvisi.push({ tipo: 'dopo', livello, ...(m ? { abilita: m[2] } : {}), testo: `${nomeEvento(livello).replace(/^c/, 'C')}: ${e.problema}` });
  }
  const iPrima = mappaInattivi(prima.stato);
  for (const [k, n] of mappaInattivi(dopo.stato)) {
    const diff = n - (iPrima.get(k) ?? 0);
    if (diff <= 0) continue;
    const [l, abilita] = k.split('|');
    const livello = Number(l);
    if (toccati.has(livello)) {
      // TODO(Davide) A.247: un punto forzato oltre il limite deve far salire il VA oltre il limite? Per ora resta registrato
      // e il VA si ferma al limite delle regole (§8.3)
      const lim = limiteAllEvento(nuovo, livello, abilita, dati);
      avvisi.push({ tipo: 'limite', livello, abilita,
        testo: `${abilita} ${nelEvento(livello)}: ${diff === 1 ? '1 punto non aumenta' : `${diff} punti non aumentano`} il VA personale${lim ? `, già al limite ${lim.valore} (${lim.categoria})` : ', già al limite'} (§8.3). Forzandolo il punto resta registrato ma il VA non supera il limite.` });
    } else {
      // TODO(Davide) A.248: questi punti li riassegna anche il giocatore («Assegna», A.107) o solo il Direttore? Per ora anche lui
      avvisi.push({ tipo: 'dopo', livello, abilita, testo: `${abilita} ${nelEvento(livello)}: ${diff === 1 ? '1 punto non aumenterebbe' : `${diff} punti non aumenterebbero`} più il VA e ${diff === 1 ? 'andrebbe riassegnato' : 'andrebbero riassegnati'} con «Assegna», nello stesso livello (A.107).` });
    }
  }
  return avvisi;
}

/**
 * Le decisioni che la conferma del Direttore scrive nel livello: le Abilità forzate (limite, regola) e i totali dei livelli
 * che cambiano per suo volere (migrazione o punti in più). I punti lasciati in sospeso non fissano un totale: il livello
 * resta da completare («Assegna»).
 */
export function decisioniConferma(personaggio, bozza, avvisi) {
  const forzati = {};
  for (const a of avvisi) if ((a.tipo === 'limite' || a.tipo === 'regola') && a.abilita) (forzati[a.livello] ??= []).push(a.abilita);
  const totali = {};
  const t = totaliBozza(personaggio, bozza);
  const conPiu = t.some((x) => x.differenza > 0);
  if (conPiu) for (const x of t) if (x.differenza) totali[x.livello] = x.ora;
  return { forzati, totali };
}

const due = (n) => String(n).padStart(2, '0');
/** «02/11 21:40» nell'ora locale. */
export const dataOra = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${due(d.getDate())}/${due(d.getMonth() + 1)} ${due(d.getHours())}:${due(d.getMinutes())}`; };

/**
 * La riga del registro, in italiano: «Spostati 2 punti da Atletica a Furtività nel 4° livello (PC, 02/11 21:40)».
 * Con più Abilità: «Spostati i punti nel 4° livello: tolti Atletica 2, Cultura 1; messi Furtività 3».
 */
export function descriviSpostamento(personaggio, bozza, { quando = new Date().toISOString(), dove = 'PC' } = {}) {
  const p = migraPersonaggio(personaggio);
  const parti = [];
  for (const { livello } of totaliBozza(p, bozza)) {
    const prima = puntiDelLivello(p, livello);
    const ora = puntiInBozza(p, bozza, livello);
    const tolti = [];
    const messi = [];
    for (const a of [...new Set([...Object.keys(prima), ...Object.keys(ora)])].sort((x, y) => x.localeCompare(y))) {
      const d = (ora[a] ?? 0) - (prima[a] ?? 0);
      if (d < 0) tolti.push([a, -d]);
      if (d > 0) messi.push([a, d]);
    }
    const nT = tolti.reduce((s, [, n]) => s + n, 0);
    const nM = messi.reduce((s, [, n]) => s + n, 0);
    if (tolti.length === 1 && messi.length === 1 && nT === nM) parti.push(`${nT === 1 ? 'Spostato 1 punto' : `Spostati ${nT} punti`} da ${tolti[0][0]} ${a_(messi[0][0])} ${messi[0][0]} ${nelEvento(livello)}`);
    else if (!messi.length) parti.push(`${nT === 1 ? 'Tolto 1 punto' : `Tolti ${nT} punti`} da ${tolti.map(([a, n]) => `${a}${tolti.length > 1 ? ` ${n}` : ''}`).join(', ')} ${nelEvento(livello)}, da ricollocare`);
    else if (!tolti.length) parti.push(`${nM === 1 ? 'Messo 1 punto' : `Messi ${nM} punti`} in ${messi.map(([a, n]) => `${a}${messi.length > 1 ? ` ${n}` : ''}`).join(', ')} ${nelEvento(livello)}`);
    else parti.push(`Spostati i punti ${nelEvento(livello)}: tolti ${tolti.map(([a, n]) => `${a} ${n}`).join(', ')}; messi ${messi.map(([a, n]) => `${a} ${n}`).join(', ')}`);
  }
  if (!parti.length) return '';
  return `${parti.join('; ')} (${dove}, ${dataOra(quando)})`;
}

/**
 * Dati del pannello per l'evento scelto: una riga per Abilità con punti (prima e adesso), il VA prima e dopo (ricalcolato
 * con tutto il personaggio), le correzioni a parte del Direttore sulla stessa Abilità (che restano, distinte), gli avvisi.
 */
export function statoPannello(personaggio, bozza, livello, dati, { aggiunte = [] } = {}) {
  const p = migraPersonaggio(personaggio);
  const eventi = eventiConPunti(p, dati).map((e) => {
    const ora = somma(puntiInBozza(p, bozza, e.livello));
    return { ...e, ora, differenza: ora - e.totale, cambiato: !uguali(e.punti, puntiInBozza(p, bozza, e.livello)) };
  });
  const ev = eventi.find((e) => e.livello === livello) ?? eventi[0] ?? null;
  if (!ev) return { eventi, evento: null, righe: [], altre: [], avvisi: [] };
  const avvisi = avvisiSpostamento(p, bozza, dati);
  const nuovo = applicaSpostamento(p, bozza, dati);
  const vaDi = (pers) => {
    try { return new Map((calcolaSchedaPersonaggio(pers, dati).abilita ?? []).map((a) => [a.nome, a])); } catch { return new Map(); }
  };
  const vaPrima = vaDi(p);
  const vaDopo = Object.keys(bozza ?? {}).length ? vaDi(nuovo) : vaPrima;
  const prima = puntiDelLivello(p, ev.livello);
  const ora = puntiInBozza(p, bozza, ev.livello);
  const dir = puntiDirettoreDi(p, ev.livello) ?? {};
  const toccate = new Set([...Object.keys(prima), ...Object.keys(ora), ...aggiunte]);
  const righe = dati.abilita.abilita.filter((a) => toccate.has(a.nome)).map(({ nome, caratteristica }) => {
    const a0 = vaPrima.get(nome);
    const a1 = vaDopo.get(nome);
    return {
      nome, caratteristica, prima: prima[nome] ?? 0, ora: ora[nome] ?? 0,
      vaPrima: a0?.totale ?? null, vaDopo: a1?.totale ?? null, limite: a1?.limite ?? null,
      // le correzioni a parte («✎») restano: si mostrano accanto, perché non si sommino in silenzio con lo spostamento
      correzioni: (a1?.correzioniMaster ?? []).map((r) => ({ valore: r.valore, nota: r.nota })),
      spostatiPrima: isOggetto(dir.spostati) ? dir.spostati[nome] ?? 0 : 0,
      forzato: Array.isArray(dir.forzati) && dir.forzati.includes(nome),
      avvisi: avvisi.filter((x) => x.livello === ev.livello && x.abilita === nome).map((x) => x.testo),
    };
  });
  const altre = dati.abilita.abilita.map((a) => a.nome).filter((n) => !toccate.has(n));
  return { eventi, evento: eventi.find((e) => e.livello === ev.livello), righe, altre, avvisi };
}

// ---------------------------------------------------------------------------
// Server: che cosa un tablet non può fare sui punti già spesi (server.mjs → PUT /api/personaggi/<file>)

const comePersonaggio = (o) => ({ creazione: o?.scelte ?? {}, livelli: Array.isArray(o?.livelli) ? o.livelli : [] });

/**
 * Un tablet (chi non è il PC del Direttore) non sposta i Punti Abilità di un evento già registrato e non tocca il blocco
 * del Direttore. Restano ammessi i due modi del giocatore che le regole già prevedono: «Assegna» (punti che mancano, o
 * punti che non aumentano più il VA da riassegnare nello stesso evento: A.52, A.107) e «Togli» (punti in eccesso, A.108).
 * La creazione ancora in corso (scelte mancanti) non si controlla: lì il giocatore sta ancora scegliendo.
 * @param nuovo, disco: file dei personaggi (formato 8: { scelte, livelli }) @returns { ok } | { ok:false, stato:403, errore }
 */
export function controllaPuntiDaTablet(nuovo, disco, dati) {
  if (!disco) return { ok: true };
  const pN = comePersonaggio(nuovo);
  const pD = comePersonaggio(disco);
  const n = 1 + Math.min(pN.livelli.length, pD.livelli.length);
  for (let livello = 1; livello <= n; livello++) {
    if (JSON.stringify(puntiDirettoreDi(pN, livello) ?? null) !== JSON.stringify(puntiDirettoreDi(pD, livello) ?? null)) {
      return { ok: false, stato: 403, errore: `I punti Abilità ${nelEvento(livello)} li ha sistemati il Direttore: li cambia solo lui (Modifica master).` };
    }
  }
  let ricD;
  try { ricD = ricalcolaAvanzamento(pD, dati); } catch { return { ok: true }; }
  if (!ricD.stato) return { ok: true };
  // la creazione è aperta se mancano scelte diverse dai punti liberi (lo stesso criterio di «Assegna»)
  const creazioneAperta = ricD.errori.some((e) => e.livello === 1 && e.campo !== 'creazione.puntiAbilitaLiberi' && !e.inattivi && e.tipo === 'incompleto');
  const inattivi = mappaInattivi(ricD.stato);
  for (let livello = creazioneAperta ? 2 : 1; livello <= n; livello++) {
    const prima = puntiDelLivello(pD, livello);
    const dopo = puntiDelLivello(pN, livello);
    if (uguali(prima, dopo)) continue;
    const tolti = Object.entries(prima).map(([a, v]) => [a, v - (dopo[a] ?? 0)]).filter(([, d]) => d > 0);
    if (!tolti.length) continue; // solo punti aggiunti: «Assegna» dei punti che mancano (l'eccesso lo segnala la scheda)
    // «Assegna» con punti da riassegnare: si tolgono solo punti che non aumentano più il VA
    const soloInattivi = tolti.every(([a, d]) => d <= (inattivi.get(`${livello}|${a}`) ?? 0));
    // «Togli» (A.108): solo punti tolti, al più l'eccesso dell'evento
    const ecc = ricD.eccessi.find((e) => e.livello === livello)?.eccesso ?? 0;
    const aggiunti = Object.entries(dopo).some(([a, v]) => v > (prima[a] ?? 0));
    const soloEccesso = !aggiunti && tolti.reduce((s, [, d]) => s + d, 0) <= ecc;
    if (soloInattivi || soloEccesso) continue;
    return { ok: false, stato: 403, errore: `Spostare i punti Abilità già spesi ${nelEvento(livello)} lo fa il Direttore (Modifica master → «Sposta i punti»).` };
  }
  return { ok: true };
}
