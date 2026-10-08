// Lettore dei suoni della mappa (richiesta di Marcello del 07/10/2026): effetti degli eventi (data/mappa.json →
// audio.effetti) con il volume «Effetti» del PC; musica di fondo dello scontro (cartella musica/ del server), ripetuta
// di continuo, con il volume «Musica»: parte quando lo scontro ha una musica (o con ▶) e si ferma alla chiusura. Regole e impostazioni in src/mappa/audio.js.
// I browser bloccano l'audio finché la pagina non ha ricevuto un clic (autoplay): se un suono viene rifiutato compare
// l'avviso «Clic per attivare l'audio»; al primo clic sulla pagina l'audio si sblocca. Un effetto perso intanto non si
// recupera (suonerebbe in ritardo).
import { CHIAVE_AUDIO, effettoDi, impostazioniAudio, volumeDi, urlMusica } from '../../mappa/audio.js';
import { avviso } from '../avvisi.js';

const leggi = () => { try { return JSON.parse(localStorage.getItem(CHIAVE_AUDIO) ?? 'null'); } catch { return null; } };
const scrivi = (v) => { try { localStorage.setItem(CHIAVE_AUDIO, JSON.stringify(v)); } catch { /* solo per questa volta */ } };

/**
 * @param o { attivo(): false per non suonare (vista giocatori senza «suona anche qui»), avvisa?(sblocca): l'avviso del
 *   blocco dell'autoplay (di solito quello qui sotto) }
 * @returns { effetto(evento), musica(file|null), pausa(sì/no), statoMusica(), impostazioni(), imposta(modifica), sbloccato(), chiudi() }
 */
export function creaAudio(dati, { attivo = () => true, avvisa = null } = {}) {
  let imp = impostazioniAudio(leggi(), dati);
  let sbloccato = false;
  const ascoltatori = new Set();
  // musica di fondo: un solo elemento, ripetuto; `voluta` il file dello scontro, `pausa` il ⏸ del master
  const m = { el: null, file: null, voluta: null, pausa: false };
  const aggiornaMusica = () => {
    if (!m.voluta || m.pausa || !attivo()) { m.el?.pause(); return; }
    if (m.file !== m.voluta) {
      m.el?.pause();
      m.el = new Audio(urlMusica(m.voluta));
      m.el.loop = true;
      m.file = m.voluta;
    }
    m.el.volume = volumeDi(imp, 'musica');
    if (m.el.paused) prova(m.el);
  };
  const avvisaBlocco = () => (avvisa ? avvisa(() => sblocca()) : avviso('Il browser blocca l’audio finché non tocchi la pagina: clic per attivare l’audio.', {
    tipo: 'info', chiave: 'audio-bloccato', durata: 15000, azioni: [{ testo: 'Attiva l’audio', fai: () => sblocca() }],
  }));
  const sblocca = () => {
    if (sbloccato) return;
    sbloccato = true;
    aggiornaMusica();
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
    /** File della musica dello scontro (null: si ferma); se è lo stesso non riparte da capo. */
    musica(file) { m.voluta = file || null; if (!m.voluta) m.pausa = false; aggiornaMusica(); },
    /** ⏸ / ▶ del master. */
    pausa(v) { m.pausa = !!v; aggiornaMusica(); },
    statoMusica: () => ({ file: m.voluta, pausa: m.pausa, suona: !!m.el && !m.el.paused }),
    impostazioni: () => imp,
    imposta(modifica) { imp = impostazioniAudio({ ...imp, ...modifica }, dati); scrivi(imp); aggiornaMusica(); for (const f of ascoltatori) f(); return imp; },
    /** Da richiamare quando cambia attivo() (vista giocatori). */
    riprova: () => aggiornaMusica(),
    sbloccato: () => sbloccato,
    /** f() a ogni cambio di impostazioni e allo sblocco (per la musica di fondo). */
    ascolta(f) { ascoltatori.add(f); return () => ascoltatori.delete(f); },
    prova,
    avvisaBlocco,
    chiudi() { m.el?.pause(); m.el = null; document.removeEventListener('pointerdown', alClic, true); document.removeEventListener('keydown', alClic, true); ascoltatori.clear(); },
  };
}
