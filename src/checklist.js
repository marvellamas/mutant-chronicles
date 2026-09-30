// §2.17: controllo finale della Scheda, con esito calcolato dalle scelte.
import { calcolaScheda } from './calc.js';
import { statoIncantesimi } from './incantesimi.js';
import { valoreTiro } from './tiri.js';
import { dotazioneApplicata } from './dotazioni.js';

/** @returns {{testo: string, ok: boolean, nonApplicabile?: boolean}[]} */
export function checklist(scelte, dati) {
  const scheda = calcolaScheda(scelte, dati);
  const c = dati.regole.creazione;
  const taumaturgo = dati.regole.taumaturgo.addestramento;
  const manca = (campo) => scheda.errori.some((e) => e.campo === campo || e.campo.startsWith(`${campo}.`));
  const inc = statoIncantesimi(scelte, dati);
  const conMagia = scelte.addestramento === taumaturgo;

  return [
    { testo: 'Background e Corporazione riportati, con valori iniziali e bonus fissi', ok: !!scelte.nome?.trim() && !!scelte.concetto?.trim() && !manca('corporazione') },
    { testo: `Tutti i ${c.punti_caratteristica} Punti Caratteristica assegnati, nessun valore oltre ${c.massimo_caratteristica}, modificatori come valore − 5`, ok: !manca('corporazione') && !manca('puntiCaratteristica') },
    { testo: 'Addestramento scelto, con il vantaggio e i bonus alle Salvezze', ok: !manca('addestramento') },
    { testo: 'Prima Classe dell’Addestramento al I Grado: profilo 2 S / 6 P / 12 G / 4 N con basi 7 / 6 / 5 / 3, +1 alle cinque Abilità di Classe, Talento fisso, contributi a PV e PM', ok: !manca('classe') && !manca('tiroDadoPM') },
    { testo: `Tutti i ${c.punti_abilita_liberi} Punti Abilità Liberi assegnati ad Abilità ammesse, aumentando il VA personale entro i limiti del I Grado`, ok: !!scheda.abilita && !manca('puntiAbilitaLiberi') },
    { testo: 'Per ogni Abilità, componenti e totale distinti, con il limite della categoria applicato', ok: !!scheda.abilita },
    { testo: 'PV, PM, quattro Salvezze, Iniziativa, Movimento e Azioni calcolati', ok: Number.isInteger(scheda.pv) && Number.isInteger(scheda.pm) },
    { testo: 'Punti Eroe iniziali determinati e spazio per i Distintivi', ok: Number.isInteger(valoreTiro(scelte.puntiEroe)) },
    conMagia
      ? { testo: 'Incantesimi conosciuti registrati per famiglia e livello', ok: !!inc?.completo }
      : { testo: 'Incantesimi conosciuti (solo Addestramento Taumaturgo)', ok: !!scelte.addestramento, nonApplicabile: !!scelte.addestramento },
    { testo: 'Nessun Talento Libero al 1° livello; equipaggiamento iniziale e crediti residui registrati, con modello effettivo, componenti compatibili ed eventuali conguagli del §2.16', ok: dotazioneApplicata(scelte.equipaggiamento) },
  ];
}
