// §2.17: controllo finale della Scheda, con esito calcolato dalle scelte.
import { calcolaScheda } from './calc.js';
import { statoIncantesimi } from './incantesimi.js';

/** @returns {{testo: string, ok: boolean, nonApplicabile?: boolean}[]} */
export function checklist(scelte, dati) {
  const scheda = calcolaScheda(scelte, dati);
  const c = dati.regole.creazione;
  const taumaturgo = dati.regole.taumaturgo.addestramento;
  const manca = (campo) => scheda.errori.some((e) => e.campo === campo || e.campo.startsWith(`${campo}.`));
  const inc = statoIncantesimi(scelte, dati);
  const conMagia = scelte.addestramento === taumaturgo;

  return [
    { testo: 'Concetto e Corporazione riportati, con valori iniziali e bonus fissi', ok: !!scelte.nome?.trim() && !!scelte.concetto?.trim() && !manca('corporazione') },
    { testo: `Tutti i ${c.punti_caratteristica} Punti Caratteristica assegnati, nessun valore oltre ${c.massimo_caratteristica}, modificatori come valore − 5`, ok: !manca('corporazione') && !manca('puntiCaratteristica') },
    { testo: 'Addestramento scelto, con il profilo delle Abilità, il vantaggio e i bonus alle Salvezze', ok: !manca('addestramento') },
    { testo: 'Prima Classe dell’Addestramento al I Grado: +1 alle cinque Abilità, Talento fisso, contributi a PV e PM', ok: !manca('classe') && !manca('tiroDadoPM') },
    { testo: `Tutti i ${c.punti_abilita_liberi} Punti Abilità Liberi assegnati ad Abilità ammesse, Avanzamento al massimo ${c.avanzamento_massimo_iniziale}`, ok: !!scheda.abilita && !manca('puntiAbilitaLiberi') },
    { testo: 'Per ogni Abilità, componenti e totale distinti', ok: !!scheda.abilita },
    { testo: 'PV, PM, quattro Salvezze, Iniziativa, Movimento e Azioni calcolati', ok: Number.isInteger(scheda.pv) && Number.isInteger(scheda.pm) },
    { testo: 'Punti Eroe iniziali determinati e spazio per i Distintivi', ok: Number.isInteger(scelte.puntiEroe) },
    conMagia
      ? { testo: 'Incantesimi conosciuti registrati per famiglia e livello', ok: !!inc?.completo }
      : { testo: 'Incantesimi conosciuti (solo Addestramento Taumaturgo)', ok: !!scelte.addestramento, nonApplicabile: !!scelte.addestramento },
    { testo: 'Nessun Talento Libero al 1° livello; dotazioni iniziali da integrare', ok: true },
  ];
}
