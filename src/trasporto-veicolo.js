// Trasporto di un veicolo a bordo di una nave (lotto 238, 23/11/2026). Funzioni pure.
//
// **La domanda a cui serve rispondere** è una che al tavolo si fa davvero: «ci sta nella stiva della Neverlost?».
// Tre numeri scritti sulla scheda non rispondono: il Direttore riaprirebbe il manuale per confrontarli col vano.
// Quindi l'app confronta, e quando non ci sta **dice quale misura sfora**: non «non ci sta», ma «l'altezza è
// 4,5 m, il vano è 3,5 m». È la differenza fra un avviso utile e un avviso che fa riaprire il manuale.
//
// **Segnala, non blocca** (CLAUDE.md): il Direttore ha la parola finale, e se dice che ci sta, ci sta. Qui non
// c'è nessuna funzione che impedisca un carico: `ciSta` torna un referto, e chi lo mostra scrive un avviso.
//
// **Dove il dato manca, manca** (A.296, le capienze): un'altezza che il manuale non dà **non si ricava** dalla
// massa, dai posti, dalla taglia o dall'ingombro sulla mappa. `ciSta` dice «non si sa», elenca che cosa manca e
// lascia decidere. Un tentativo di dedurla sarebbe un numero inventato che sembra un dato.
//
// **Le due altezze.** Dove il manuale ne dà due — il Bastion TC ha «3,3 m allo scafo; 4,5 m alla postazione più
// alta» — si tengono entrambe e **quale conta lo dichiara il manuale**, non noi: l'«ingombro di trasporto» dello
// stesso mezzo è «12 × 6 × 4,5 m», cioè la **più alta**. `altezzaDiTrasporto` legge quella dichiarazione e dice
// da dove viene; se un profilo avesse due altezze e nessun ingombro di trasporto, lo direbbe invece di scegliere.
//
// Fonti: Veicoli 0.23 §11 (le stive della Neverlost: «apertura utile di 4,5 m di larghezza e 3,5 m di altezza»,
// rampa «larga 4,5 m» con «portata di 10 t») e la nota «Trasporto» del §16 («gli ingombri di trasporto si
// riferiscono all'assetto specificato nella scheda, con antenne ed eventuali parti mobili ripiegate. Le piazzole
// consigliate escludono i corridoi comuni. La massa a pieno carico indicata serve al dimensionamento della stiva
// e delle rampe»). Tutti i numeri stanno in `data/veicoli.json` → `trasporto` e nei profili.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Il blocco delle regole del trasporto, dai dati. */
export const regoleTrasporto = (dati) => (isOggetto(dati?.veicoli?.trasporto) ? dati.veicoli.trasporto : null);

/**
 * L'altezza che conta per il trasporto, con la sua provenienza.
 *
 * @returns {{ m, da, scafo, massima, dichiarata }} oppure null se il profilo non dà nessuna altezza.
 *   `dichiarata` è vero quando è il manuale a dire quale conta (l'ingombro di trasporto la ripete);
 *   quando è falso e le altezze sono due, `m` resta **null**: non si scegle la più comoda.
 */
export function altezzaDiTrasporto(profilo) {
  const a = profilo?.altezza;
  if (!isOggetto(a)) return null;
  const scafo = numero(a.scafo_m);
  const massima = numero(a.massima_m);
  const sola = numero(a.m);
  const diIngombro = numero(profilo?.ingombro_trasporto?.altezza_m);
  if (sola !== null && scafo === null && massima === null) {
    return { m: sola, da: 'l’unica altezza che il manuale dà', scafo: null, massima: null, dichiarata: true };
  }
  if (diIngombro !== null) {
    const quale = diIngombro === massima ? 'la postazione più alta' : diIngombro === scafo ? 'lo scafo' : 'l’assetto di trasporto della scheda';
    return { m: diIngombro, da: `l’ingombro di trasporto della scheda: ${quale}`, scafo, massima, dichiarata: true };
  }
  if (scafo !== null && massima === null) return { m: scafo, da: 'l’altezza allo scafo, la sola che il manuale dà', scafo, massima: null, dichiarata: true };
  if (massima !== null && scafo === null) return { m: massima, da: 'l’altezza massima, la sola che il manuale dà', scafo: null, massima, dichiarata: true };
  // due altezze e nessun ingombro di trasporto: quale conti non lo dice nessuno, e non lo decidiamo noi
  return { m: null, da: null, scafo, massima, dichiarata: false };
}

/**
 * L'ingombro di trasporto di un mezzo: lunghezza × larghezza × altezza, come la scheda lo scrive.
 * @returns {{ lunghezza_m, larghezza_m, altezza_m, mancanti: string[] }} — `mancanti` nomina le misure che il
 *   manuale non dà. Nessuna si ricava da un'altra.
 */
export function ingombroTrasporto(profilo) {
  const i = isOggetto(profilo?.ingombro_trasporto) ? profilo.ingombro_trasporto : null;
  const alt = altezzaDiTrasporto(profilo);
  // le dimensioni valgono come ingombro di trasporto solo se la scheda parla di trasporto (un ingombro o
  // un’altezza dichiarati): altrimenti sono un’altra cosa — per la Neverlost il «perimetro esterno di riferimento».
  const parla = isOggetto(i) || isOggetto(profilo?.altezza);
  const dim = parla ? profilo?.dimensioni : null;
  const fuori = {
    lunghezza_m: numero(i?.lunghezza_m) ?? numero(dim?.lunghezza_m),
    larghezza_m: numero(i?.larghezza_m) ?? numero(dim?.larghezza_m),
    altezza_m: numero(i?.altezza_m) ?? alt?.m ?? null,
  };
  fuori.mancanti = Object.entries({ lunghezza: fuori.lunghezza_m, larghezza: fuori.larghezza_m, altezza: fuori.altezza_m })
    .filter(([, v]) => v === null).map(([k]) => k);
  fuori.altezza = alt;
  return fuori;
}

/** La piazzola di parcheggio a bordo, come la scheda la scrive: è lo stesso tipo di dato dell'ingombro. */
export function piazzola(profilo) {
  const p = isOggetto(profilo?.piazzola) ? profilo.piazzola : null;
  if (!p) return null;
  return { lunghezza_m: numero(p.lunghezza_m), larghezza_m: numero(p.larghezza_m), nota: p.nota ?? null };
}

/**
 * Il vano di carico di una nave, come il manuale lo scrive: non un volume, ma **l'apertura utile** del portellone
 * e la **portata della rampa**. Sono le due cose che dicono se un mezzo entra e se la rampa lo regge.
 */
export function vanoDiCarico(profiloNave) {
  const s = isOggetto(profiloNave?.stiva) ? profiloNave.stiva : null;
  if (!s) return null;
  return {
    nome: s.nome ?? 'Stiva',
    larghezza_m: numero(s.apertura?.larghezza_m),
    altezza_m: numero(s.apertura?.altezza_m),
    rampa_larghezza_m: numero(s.rampa?.larghezza_m),
    portata_kg: numero(s.rampa?.portata_kg),
    quante: numero(s.quante),
    nota: s.nota ?? null,
    paragrafo: s.paragrafo ?? null,
  };
}

/** La massa a pieno carico: massa a vuoto + carico utile. Se una delle due manca, **manca** (non si stima). */
export function massaAPienoCarico(profilo) {
  const vuoto = numero(profilo?.massa_kg);
  const carico = numero(profilo?.carico_kg);
  if (vuoto === null || carico === null) {
    return { kg: null, mancanti: [vuoto === null ? 'massa a vuoto' : null, carico === null ? 'carico utile' : null].filter(Boolean) };
  }
  return { kg: vuoto + carico, mancanti: [], vuoto, carico };
}

/**
 * **Ci sta?** Confronta un mezzo col vano di carico di una nave.
 *
 * @returns {{ esito: 'ci sta' | 'non ci sta' | 'non si sa', sfori, mancanti, misure, vano, frase }}
 *   `sfori` è l'elenco delle misure che non entrano, ciascuna col suo valore e col limite del vano: è quello che
 *   si scrive, perché «non ci sta» da solo fa riaprire il manuale. `mancanti` sono le misure che il manuale non
 *   dà: con una di quelle l'esito è «non si sa», mai «ci sta» e mai «non ci sta».
 *   **Nessun esito blocca niente:** decide il Direttore.
 */
export function ciSta(profilo, profiloNave, dati = null) {
  const vano = vanoDiCarico(profiloNave);
  const i = ingombroTrasporto(profilo);
  const massa = massaAPienoCarico(profilo);
  const R = regoleTrasporto(dati);
  if (!vano) return { esito: 'non si sa', sfori: [], mancanti: ['il vano di carico della nave'], misure: i, vano: null, frase: 'Di questa nave il manuale non dà l’apertura della stiva: lo giudica il Direttore.' };

  const confronti = [
    { misura: 'larghezza', valore: i.larghezza_m, limite: vano.larghezza_m, limiteNome: 'l’apertura del portellone' },
    { misura: 'altezza', valore: i.altezza_m, limite: vano.altezza_m, limiteNome: 'l’apertura del portellone' },
    { misura: 'massa a pieno carico', valore: massa.kg, limite: vano.portata_kg, limiteNome: 'la portata della rampa', unita: 'kg' },
  ];
  const met = (x) => String(x).replace('.', ',');
  const sfori = [];
  const mancanti = [...i.mancanti.filter((m) => m !== 'lunghezza')];
  if (massa.kg === null) mancanti.push(...massa.mancanti);
  for (const c of confronti) {
    if (c.valore === null || c.limite === null) continue;
    if (c.valore > c.limite) sfori.push({ ...c });
  }
  // la lunghezza non si confronta con l'apertura: una stiva è più lunga del suo portellone, e il manuale non dà
  // la profondità. Resta scritta nell'ingombro, e la giudica il Direttore.
  // i numeri si scrivono come si leggono in italiano: 2,6 m, non 2.6 m (`met`, definita sopra)
  const unita = (c) => (c.unita === 'kg' ? `${numero(c.valore).toLocaleString('it-IT')} kg` : `${met(c.valore)} m`);
  const lim = (c) => (c.unita === 'kg' ? `${numero(c.limite).toLocaleString('it-IT')} kg` : `${met(c.limite)} m`);
  if (mancanti.length) {
    return {
      esito: 'non si sa', sfori, mancanti, misure: i, vano, massa,
      frase: `Non si sa: il manuale non dà ${mancanti.join(' né ')} di questo mezzo. ${R?.manca ?? 'Il dato manca e non si ricava da massa, posti o taglia: lo giudica il Direttore.'}`,
    };
  }
  if (sfori.length) {
    return {
      esito: 'non ci sta', sfori, mancanti, misure: i, vano, massa,
      frase: `Non ci sta: ${sfori.map((c) => `${c.misura} ${unita(c)}, ${c.limiteNome} è ${lim(c)}`).join('; ')}. ${R?.segnala ?? 'È un avviso, non un divieto: decide il Direttore.'}`,
    };
  }
  return {
    esito: 'ci sta', sfori: [], mancanti: [], misure: i, vano, massa,
    frase: `Ci sta: larghezza ${met(i.larghezza_m)} m e altezza ${met(i.altezza_m)} m entro l’apertura di ${met(vano.larghezza_m)} × ${met(vano.altezza_m)} m, massa a pieno carico ${numero(massa.kg).toLocaleString('it-IT')} kg entro la portata di ${numero(vano.portata_kg).toLocaleString('it-IT')} kg.`,
  };
}

/**
 * Le navi del catalogo che hanno una stiva: servono alla scheda per offrire il confronto senza che l'utente
 * debba sapere quale profilo guardare.
 */
export const naviConStiva = (dati) => (dati?.veicoli?.profili ?? []).filter((p) => isOggetto(p.stiva));

/** Il quadro del trasporto di un mezzo, per la scheda: le misure, la piazzola e il confronto con ogni nave. */
export function quadroTrasporto(profilo, dati) {
  const i = ingombroTrasporto(profilo);
  // Niente da dire, e si tace: **la prova nel browser del lotto 238** mostrava alla Neverlost un riquadro
  // «Trasporto a bordo di una nave» con «51 m × 30 m × non dato» e «manca massa a vuoto». Due cose sbagliate:
  // la Neverlost è la nave che trasporta, non un mezzo da caricare; e i suoi 51 × 30 sono il «perimetro esterno
  // di riferimento», non un ingombro di trasporto. Un riquadro che dice due «non dato» è solo spazio in meno
  // per il resto della scheda (CLAUDE.md, «in alto nella scheda il minimo spazio possibile»).
  if (isOggetto(profilo?.stiva)) return null; // chi ha una stiva trasporta, non si fa trasportare
  if (!isOggetto(profilo?.ingombro_trasporto) && !isOggetto(profilo?.altezza) && !piazzola(profilo)) return null;
  return {
    ingombro: i,
    altezza: i.altezza,
    piazzola: piazzola(profilo),
    massa: massaAPienoCarico(profilo),
    navi: naviConStiva(dati).filter((n) => n.id !== profilo.id).map((n) => ({ id: n.id, nome: n.nome, esito: ciSta(profilo, n, dati) })),
  };
}

/**
 * **I quattro dati che si mostrano e non calcolano niente** (lotto 238, punto C): i tre volumi del bagagliaio e
 * il passaggio libero consigliato. Non entrano in nessun confronto — il bagagliaio è un volume in litri che il
 * manuale dà per sé, e il passaggio libero è una condizione che giudica il Direttore — quindi sono righe di
 * testo. Quali siano lo dicono i dati (`trasporto.da_mostrare`), non questo codice: quando i mezzi dei capitoli
 * 16, 17 e 18 entreranno nel catalogo (A.304), i loro valori compariranno senza toccare una riga qui.
 *
 * @returns {{ campo, nome, valore, unita }[]} — solo i campi che il profilo ha davvero.
 */
export function datiDaMostrare(profilo, dati) {
  const elenco = regoleTrasporto(dati)?.da_mostrare;
  if (!Array.isArray(elenco)) return [];
  return elenco
    .map((d) => ({ campo: d.campo, nome: d.nome, unita: d.unita ?? null, valore: profilo?.[d.campo] ?? null }))
    .filter((d) => d.valore !== null && d.valore !== undefined);
}
