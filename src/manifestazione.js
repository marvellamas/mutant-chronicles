// Manifestazioni della CyberArma (A.166, risposta di Davide approvata il 16/10/2026). Funzioni pure.
//
// «In tutti i casi la CyberArma si utilizza con Armi da mischia, indipendentemente dalla forma manifestata»:
// l'Abilità è fissa. Dalla **manifestazione** dipendono invece famiglia, Specializzazione pertinente e
// Manovre compatibili: spada o lama lunga → Spade; frusta → Armi flessibili; ascia → Asce; lancia → Armi
// inastate; per le altre forme la famiglia corrispondente del catalogo.
//
// Chi sceglie: il Custode può manifestare qualsiasi forma (menu nella scheda dell'arma). Il Tecnomante e
// gli altri utilizzatori ammessi usano la forma del progetto — lama lunga nel modello base —; cambiarla è
// una modifica del manufatto, non una facoltà di cambio forma (nell'app si cambia in «Modifica master»).
//
// Una sola Specializzazione pertinente alla forma, mai cumulata con quelle di altre forme (§8.8.1).
// La forma attiva sta nella voce dell'inventario: `voce.manifestazione` (id dell'elenco dei dati).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Il blocco `manifestazioni` della voce di catalogo, o null se l'arma non ne ha. */
export const bloccoManifestazioni = (def) => (isOggetto(def?.manifestazioni) ? def.manifestazioni : null);

/** Le forme possibili dell'arma (elenco dei dati). */
export const manifestazioniDi = (def) => bloccoManifestazioni(def)?.elenco ?? [];

/** La forma del progetto base (lama lunga per la CyberArma). */
export function manifestazioneProgetto(def) {
  const b = bloccoManifestazioni(def);
  if (!b) return null;
  return b.elenco.find((m) => m.id === b.progetto) ?? b.elenco[0] ?? null;
}

/**
 * Chi impugna l'arma sceglie liberamente la forma? (A.166: il Custode sì; Tecnomante e altri no)
 * @param classi nomi delle Classi del personaggio
 */
export function sceltaLibera(def, classi = []) {
  const b = bloccoManifestazioni(def);
  if (!b) return false;
  const chi = new Set(b.scelta_libera ?? []);
  return (classi ?? []).some((c) => chi.has(c));
}

/**
 * La forma attiva: quella scelta nella voce se c'è (e se chi la impugna può sceglierla, o se l'ha
 * cambiata il Direttore modificando il manufatto), altrimenti quella del progetto.
 */
export function manifestazioneAttiva(def, voce, classi = []) {
  const b = bloccoManifestazioni(def);
  if (!b) return null;
  const scelta = typeof voce?.manifestazione === 'string' ? b.elenco.find((m) => m.id === voce.manifestazione) : null;
  return scelta ?? manifestazioneProgetto(def);
}

/**
 * La voce di catalogo «manifestata»: Abilità fissa, e famiglia, Specializzazione e Manovre della forma.
 * Torna la voce di partenza se l'arma non ha manifestazioni.
 */
export function conManifestazione(def, voce, classi = []) {
  const b = bloccoManifestazioni(def);
  const m = manifestazioneAttiva(def, voce, classi);
  if (!b || !m) return def;
  return {
    ...def,
    abilita: b.abilita ?? def.abilita,
    famiglia: m.famiglia ?? def.famiglia,
    specializzazione: m.specializzazione ?? null,
    manovre: Array.isArray(m.manovre) ? m.manovre : def.manovre,
    manifestazione: m,
  };
}

/** Testo da mostrare accanto all'arma: «Lama lunga · Spade · Affondo, Spazzata». */
export function testoManifestazione(m) {
  if (!m) return null;
  const manovre = (m.manovre ?? []).filter((x) => x !== 'generali');
  return [m.nome, m.famiglia, manovre.length ? manovre.join(', ') : 'solo Manovre generali'].filter(Boolean).join(' · ');
}
