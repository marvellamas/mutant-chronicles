// Lotto 251, parte A — **i presupposti del ripasso, costruiti usando l'app.**
//
// Il lotto 250 ha lasciato 7 casi su 14 non provati perché mancava il presupposto, non il comando: nessuno scontro
// aperto, nessuna arma a caricatore, nessuno Stato, nessun mezzo con conducente. Qui i presupposti si costruiscono
// **premendo i pulsanti**, non scrivendo i file: se la preparazione scrivesse uno stato che l'app non produrrebbe mai,
// il ripasso proverebbe un mondo che non esiste — la stessa trappola del verde-per-la-ragione-sbagliata, spostata
// nella preparazione.
//
// Tutto su copie, in una cartella temporanea nata nella prova (`cartelleDiProva`): i PG reali e le istantanee non si
// toccano, e la guardia del lotto 161 lo impedirebbe comunque.
//
// Quello che ogni passo usa è scritto accanto, con il nome del pulsante che preme.
const dormi = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Preme il primo pulsante che corrisponde, dentro `dove`; torna la sua etichetta, o false. */
export const clic = (p, re, dove = 'body') => p.valuta(`const c = document.querySelector(${JSON.stringify(dove)}); if (!c) return false;`
  + ` const b = [...c.querySelectorAll('button')].find((x) => ${re}.test(x.textContent.trim()) && !(x.disabled || x.getAttribute('aria-disabled') === 'true'));`
  + ` if (!b) return false; b.click(); return b.textContent.trim()`);

/** Le etichette dei pulsanti dentro `dove`: serve ai messaggi quando un passo non trova quello che cerca. */
export const etichette = (p, dove = 'body') => p.valuta(`const c = document.querySelector(${JSON.stringify(dove)}); if (!c) return [];`
  + ` return [...c.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 30)).filter(Boolean).slice(0, 30)`);

/** Apre la scheda di un personaggio dalla pagina iniziale (il nome come lo scrive la carta: «Rhea Valdis»). */
export async function apriScheda(p, nome) {
  await p.valuta(`location.hash = '#/'; return 1`);
  await dormi(600);
  await p.attendi(`return [...document.querySelectorAll('button')].some((x) => /^Apri$/.test(x.textContent.trim()))`, 'la lista dei personaggi');
  const ok = await p.valuta(`const nome = ${JSON.stringify(nome.toUpperCase())};`
    + ` const c = [...document.querySelectorAll('article,li')].find((x) => x.textContent.trim().toUpperCase().startsWith(nome));`
    + ` const b = c ? [...c.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Apri') : null;`
    + ` if (!b) return false; b.click(); return true`);
  if (!ok) throw new Error(`la scheda di ${nome} non si apre dalla lista`);
  await p.attendi(`return location.hash.indexOf('#/p/') === 0`, 'la scheda aperta');
  await dormi(700);
}

/** Va su una tab della scheda (identita, abilita, combattimento, poteri, artefatti, cibernetica, inventario, veicoli). */
export async function vaiTab(p, id) {
  await p.valuta(`location.hash = location.hash.replace(/\\/t\\/.*$/, '') + '/t/${id}'; return 1`);
  await dormi(700);
}

/**
 * Aggiunge un oggetto del catalogo dalla tab Inventario: si scrive il nome in «Cerca per nome» del pannello
 * «Aggiungi oggetto», si tocca il risultato e si preme «Aggiungi <nome>» (non «Compra»: i crediti del PG d'esempio
 * non bastano per tutto, e il regalo del Direttore è un'altra strada con un'altra riga nel registro).
 */
export async function aggiungiDalCatalogo(p, nome) {
  await vaiTab(p, 'inventario');
  const cercato = await p.valuta(`const i = document.querySelector('.aggiungi-equip input[type=search]'); if (!i) return false;`
    + ` i.value = ${JSON.stringify(nome)}; i.dispatchEvent(new Event('input', { bubbles: true })); return true`);
  if (!cercato) throw new Error('il pannello «Aggiungi oggetto» non ha il campo di ricerca');
  await dormi(600);
  const scelto = await p.valuta(`const b = [...document.querySelectorAll('.risultati-ricerca button')][0]; if (!b) return false; b.click(); return b.textContent.trim()`);
  if (!scelto) throw new Error(`«${nome}» non si trova nel catalogo`);
  await dormi(700);
  const aggiunto = await clic(p, '/^Aggiungi /', '.profilo-scelto');
  if (!aggiunto) throw new Error(`«${nome}»: nessun pulsante «Aggiungi» nel profilo scelto`);
  await dormi(900);
  return aggiunto;
}

/** Impugna un'arma dalla tab Combattimento («Impugna» nella riga delle armi disponibili). */
export async function impugna(p, nomeArma) {
  await vaiTab(p, 'combattimento');
  const ok = await p.valuta(`const nome = ${JSON.stringify(nomeArma)};`
    + ` const riga = [...document.querySelectorAll('li, tr, .riga-oggetto, .voce-equip')].find((x) => x.textContent.includes(nome) && [...x.querySelectorAll('button')].some((b) => /Impugna/.test(b.textContent)));`
    + ` const b = riga ? [...riga.querySelectorAll('button')].find((x) => /Impugna/.test(x.textContent)) : null;`
    + ` if (!b) return false; b.click(); return true`);
  if (!ok) throw new Error(`«${nomeArma}»: nessun «Impugna» nella tab Combattimento`);
  await dormi(900);
}

/** Accende uno Stato dalla tab Combattimento (le caselle di «Stati (§5.18)»). */
export async function accendiStato(p, nomeStato) {
  await vaiTab(p, 'combattimento');
  const ok = await p.valuta(`const nome = ${JSON.stringify(nomeStato)};`
    + ` const l = [...document.querySelectorAll('.stati-compatti label')].find((x) => x.textContent.includes(nome));`
    + ` const c = l ? l.querySelector('input[type=checkbox]') : null;`
    + ` if (!c) return false; c.click(); return c.checked`);
  if (!ok) throw new Error(`lo Stato «${nomeStato}» non si accende dalla scheda`);
  await dormi(900);
}

/**
 * Aggiunge un veicolo dalla tab Veicoli e si mette alla guida: «Aggiungi veicolo» apre il pannello, si scegle il
 * profilo dal catalogo, «Aggiungi» lo registra (col server va nel registro unico, veicoli/) e la casella «Lo guido
 * io» mette il PG come conducente — che è il presupposto del caso «muovi il mezzo» del ripasso.
 */
export async function aggiungiVeicolo(p, { profilo = 'Autovettura' } = {}) {
  await vaiTab(p, 'veicoli');
  if (!await clic(p, '/^Aggiungi veicolo$/', 'main')) return { fatto: false, perche: 'nessun «Aggiungi veicolo» nella tab Veicoli' };
  await dormi(900);
  // il profilo: `rigaScelte` del pannello (radio o pulsanti, si prova l'uno e l'altro)
  const scelto = await p.valuta(`const n = ${JSON.stringify(profilo)}; const pan = document.querySelector('.pannello-veicolo'); if (!pan) return 'nessun pannello';`
    + ` const et = [...pan.querySelectorAll('label')].find((l) => l.textContent.includes(n));`
    + ` const r = et ? et.querySelector('input') : null; if (r) { r.click(); return 'radio ' + n; }`
    + ` const b = [...pan.querySelectorAll('button')].find((x) => x.textContent.includes(n)); if (b) { b.click(); return 'pulsante ' + n; }`
    + ` const s = [...pan.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.textContent.includes(n)));`
    + ` if (s) { s.value = [...s.options].find((o) => o.textContent.includes(n)).value; s.dispatchEvent(new Event('change', { bubbles: true })); return 'select ' + n; }`
    + ` return 'profilo non trovato'`);
  await dormi(700);
  const registrato = await clic(p, '/^Aggiungi$/', '.pannello-veicolo');
  await dormi(1800);
  // «Lo guido io»: il conducente del record (col server è il registro unico che cambia)
  const guida = await p.valuta(`const l = [...document.querySelectorAll('label')].find((x) => /Lo guido io/.test(x.textContent));`
    + ` const c = l ? l.querySelector('input[type=checkbox]') : null; if (!c) return 'nessuna casella «Lo guido io»';`
    + ` if (!c.checked) c.click(); return 'alla guida'`);
  await dormi(1500);
  return { fatto: !!registrato, scelto, registrato, guida };
}
/**
 * Mette al tavolo i personaggi indicati, per nome («Chi è al tavolo» della plancia). **Il nome conta**: il PG
 * preparato è quello che ha l'arma, lo Stato e il mezzo, e uno scontro con altri due non proverebbe niente di lui.
 */
export async function alTavolo(p, { nomi = [], esempi = true } = {}) {
  await p.valuta(`location.hash = '#/tavolo'; return 1`);
  await dormi(1400);
  if (esempi) {
    // «Carica esempi»: porta i nemici d'esempio nelle cartelle del server (non sovrascrive niente)
    await clic(p, '/^Carica esempi$/');
    await dormi(2500);
  }
  await clic(p, '/^Chi è al tavolo$/');
  await dormi(700);
  const esito = await p.valuta(`const nomi = ${JSON.stringify(nomi.map((x) => x.toUpperCase()))};`
    + ` const voci = [...document.querySelectorAll('.plancia-scelta-elenco li')];`
    + ` const scelti = [];`
    + ` for (const li of voci) {`
    + `   const t = li.textContent.trim().toUpperCase();`
    + `   if (!nomi.some((n) => t.startsWith(n))) continue;`
    + `   const c = li.querySelector('input[type=checkbox]');`
    + `   if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }`
    + `   scelti.push(li.textContent.trim().split(' ').slice(0, 2).join(' '));`
    + ` }`
    + ` return { voci: voci.length, scelti }`);
  await dormi(1800);
  if (!esito.scelti.length) throw new Error(`nessuno dei nomi ${nomi.join(', ')} è nell'elenco «Chi è al tavolo» (${esito.voci} voci)`);
  return esito;
}
/**
 * «Crea nemico» → «Tutto a caso» → «Salva nel bestiario», e **con uno scontro aperto** anche «Aggiungi allo
 * scontro»: è il presupposto del danno applicato, perché «Colpito» ha bisogno di un bersaglio in campo.
 */
export async function creaNemico(p, { nelloScontro = false } = {}) {
  if (!await clic(p, '/^Crea nemico$/')) return { fatto: false, perche: 'nessun «Crea nemico» nella plancia' };
  await dormi(1200);
  await clic(p, '/^Tutto a caso$/', 'dialog[open]');
  await dormi(1800);
  const salvato = await clic(p, '/^Salva nel bestiario$/', 'dialog[open]');
  await dormi(1500);
  let inCampo = null;
  if (nelloScontro) {
    await attendiFinestra(p, '/^Aggiungi/');
    inCampo = await clic(p, '/^Aggiungi allo scontro$/', 'dialog[open]') || await clic(p, '/^Aggiungi$/', 'dialog[open]');
    await dormi(1500);
  }
  // la finestra resta aperta per il prossimo: si chiude
  await p.valuta(`const d = document.querySelector('dialog[open]'); const x = d ? [...d.querySelectorAll('button')].find((b) => /^(×|Chiudi)$/.test(b.textContent.trim())) : null; if (x) x.click(); return 1`);
  await dormi(1200);
  // a chi entra dopo l'app chiede l'Iniziativa: si tira (è la strada vera, non una scrittura a mano)
  const ini = await tiraIniziative(p);
  return { fatto: !!salvato, salvato, inCampo, iniziativa: ini };
}

/** Aspetta una finestra aperta che contenga un pulsante che corrisponde (le finestre dell’app arrivano dopo un
    salvataggio o una lettura dal server: un’occhiata sola a volte le manca). Torna true/false. */
export async function attendiFinestra(p, re, volte = 12) {
  for (let i = 0; i < volte; i += 1) {
    const c = await p.valuta(`const d = document.querySelector('dialog[open]'); if (!d) return false;`
      + ` return [...d.querySelectorAll('button')].some((b) => ${re}.test(b.textContent.trim()))`);
    if (c) return true;
    await dormi(600);
  }
  return false;
}

/** La finestra «Iniziativa»: tira per tutti con l'app e registra. Torna che cosa ha fatto, o 'nessuna finestra'. */
export async function tiraIniziative(p) {
  if (!await attendiFinestra(p, '/^Tira/')) return 'nessuna finestra';
  const tirate = await p.valuta(`const d = document.querySelector('dialog[open]'); if (!d) return 'nessuna finestra';`
    + ` const tutte = [...d.querySelectorAll('button')].find((b) => /Tira tutt/i.test(b.textContent)); if (tutte) { tutte.click(); return 'Tira tutte'; }`
    + ` const uno = [...d.querySelectorAll('button')].filter((b) => /^Tira/.test(b.textContent.trim())); uno.forEach((b) => b.click()); return uno.length + ' tiri'`);
  if (tirate === 'nessuna finestra') return tirate;
  await dormi(1200);
  const conferma = await clic(p, '/^(Conferma|Registra|Inizia|Salva)/', 'dialog[open]');
  await dormi(1500);
  return `${tirate} · ${conferma || 'nessuna conferma'}`;
}

/** «Nuovo scontro al volo» e la finestra «Iniziativa». */
export async function apriScontro(p) {
  const apre = await clic(p, '/^Nuovo scontro al volo$/');
  if (!apre) return { fatto: false, perche: 'nessun «Nuovo scontro al volo»' };
  await dormi(2000);
  return { fatto: true, iniziativa: await tiraIniziative(p) };
}

/**
 * **Tutti i presupposti in una volta**, nell'ordine in cui l'app li produce: la scheda del PG (arma a caricatore in
 * mano, munizioni, uno Stato, un mezzo di cui è conducente), poi la plancia (PG al tavolo, scontro aperto con le
 * Iniziative tirate, un nemico in campo). Torna il rapporto di ogni passo: un passo che non si è potuto fare lo dice,
 * invece di lasciar credere che il presupposto ci sia.
 */
export async function preparaTutto(p, { pg = 'Rhea Valdis', arma = 'Pistola semiautomatica', munizioni = 'Proiettili da pistola', stato = 'Accecato', profiloVeicolo = 'Autovettura' } = {}) {
  const esito = {};
  const passo = async (nome, fn) => { try { esito[nome] = (await fn()) ?? 'fatto'; } catch (e) { esito[nome] = `NON FATTO: ${e.message}`; } };
  await passo('scheda', () => apriScheda(p, pg));
  await passo('arma', () => aggiungiDalCatalogo(p, arma));
  await passo('munizioni', () => aggiungiDalCatalogo(p, munizioni));
  await passo('inMano', () => impugna(p, arma));
  await passo('stato', () => accendiStato(p, stato));
  await passo('veicolo', () => aggiungiVeicolo(p, { profilo: profiloVeicolo }));
  await passo('alTavolo', () => alTavolo(p, { nomi: [pg] }));
  await passo('scontro', () => apriScontro(p));
  await passo('nemico', () => creaNemico(p, { nelloScontro: true }));
  return esito;
}
