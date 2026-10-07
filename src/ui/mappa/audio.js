// Lettore dei suoni della mappa (richiesta di Marcello del 07/10/2026): effetti degli eventi (data/mappa.json →
// audio.effetti) con il volume «Effetti» del PC. Regole e impostazioni in src/mappa/audio.js.
// I browser bloccano l'audio finché la pagina non ha ricevuto un clic (autoplay): se un suono viene rifiutato compare
// l'avviso «Clic per attivare l'audio»; al primo clic sulla pagina l'audio si sblocca. Un effetto perso intanto non si
// recupera (suonerebbe in ritardo).
import { CHIAVE_AUDIO, effettoDi, impostazioniAudio, volumeDi } from '../../mappa/audio.js';
import { avviso } from '../avvisi.js';

const leggi = () => { try { return JSON.parse(localStorage.getItem(CHIAVE_AUDIO) ?? 'null'); } catch { return null; } };
const scrivi = (v) => { try { localStorage.setItem(CHIAVE_AUDIO, JSON.stringify(v)); } catch { /* solo per questa volta */ } };

/**
 * @param o { attivo(): false per non suonare (vista giocatori senza «suona anche qui») }
 * @returns { effetto(evento), impostazioni(), imposta(modifica), sbloccato(), chiudi() }
 */
export function creaAudio(dati, { attivo = () => true } = {}) {
  let imp = impostazioniAudio(leggi(), dati);
  let sbloccato = false;
  const ascoltatori = new Set();
  const avvisaBlocco = () => avviso('Il browser blocca l’audio finché non tocchi la pagina: clic per attivare l’audio.', {
    tipo: 'info', chiave: 'audio-bloccato', durata: 15000, azioni: [{ testo: 'Attiva l’audio', fai: () => sblocca() }],
  });
  const sblocca = () => {
    if (sbloccato) return;
    sbloccato = true;
    for (const f of ascoltatori) f();
  };
  const alClic = () => { sblocca(); document.removeEventListener('pointerdown', alClic, true); document.removeEventListener('keydown', alClic, true); };
  document.addEventListener('pointerdown', alClic, true);
  document.addEventListener('keydown', alClic, true);
  /** Prova a suonare un elemento audio; se il browser lo rifiuta, l'avviso dello sblocco. */
  const prova = (el) => el.play().then(() => { sbloccato = true; }).catch((e) => { if (e?.name === 'NotAllowedError') avvisaBlocco(); });
  return {
    effetto(evento) {
      const file = effettoDi(evento, dati);
      const v = volumeDi(imp, 'effetti');
      if (!file || !attivo() || v <= 0) return false;
      const el = new Audio(file);
      el.volume = v;
      prova(el);
      return true;
    },
    impostazioni: () => imp,
    imposta(modifica) { imp = impostazioniAudio({ ...imp, ...modifica }, dati); scrivi(imp); for (const f of ascoltatori) f(); return imp; },
    sbloccato: () => sbloccato,
    /** f() a ogni cambio di impostazioni e allo sblocco (per la musica di fondo). */
    ascolta(f) { ascoltatori.add(f); return () => ascoltatori.delete(f); },
    prova,
    avvisaBlocco,
    chiudi() { document.removeEventListener('pointerdown', alClic, true); document.removeEventListener('keydown', alClic, true); ascoltatori.clear(); },
  };
}
