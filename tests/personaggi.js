// Personaggi di esempio per i test dell'avanzamento.
import { nuoveScelte } from '../src/character.js';

export const tiro = (valore, origine = 'manuale') => ({ valore, origine });

/** Mishima Avventuriero Agente del manuale (§2.1, §2.13, §2.14). */
export const MISHIMA_AGENTE = {
  ...nuoveScelte(),
  nome: 'Kenji',
  concetto: 'Agente Mishima',
  corporazione: 'Mishima',
  puntiCaratteristica: { FOR: 1, COS: 2, DES: 1, SAG: 1 },
  addestramento: 'Avventuriero',
  classe: 'Agente',
  // §2.13 del Giocatore del 29/09: esempio dell'Agente (Percezione 2, Tecnologia 2, Cultura 2, Raggirare 4),
  // ridotto ai 5 punti della correzione di Davide del 03/10/2026 (E&L): Percezione 2, Raggirare 3
  puntiAbilitaLiberi: {
    'Percezione': 2, 'Raggirare': 3,
  },
  puntiEroe: tiro(5),
};

/** Arcanista della Fratellanza con l'Addestramento Taumaturgo. */
export const ARCANISTA = {
  ...nuoveScelte(),
  nome: 'Ada',
  concetto: 'Arcanista',
  corporazione: 'Fratellanza',
  puntiCaratteristica: { INT: 2, SAG: 1, COS: 2 },
  addestramento: 'Taumaturgo',
  classe: 'Arcanista',
  // limiti del I Grado (§2.13 del 29/09): ogni punto aumenta il VA personale
  puntiAbilitaLiberi: { 'Potere': 2, 'Rituali': 2, 'Cultura': 1 },
  puntiEroe: tiro(6),
  incantesimi: ['Colpo Elementale', 'Controllo Elementale', 'Muro Elementale', 'Ampliare Sensi', 'Barriera Mentale',
    'Biomanipolazione', 'Cura Ferite', 'Cura Malattie', 'Cura Avvelenamenti', 'Dardo Psichico', 'Scudo',
    'Telecinesi', 'Luce Mistica'],
};

/**
 * Il Mishima Agente portato a mano dal 1° al 20° livello, sempre Agente fino al VI Grado,
 * con tiri dei PV fissati. Ogni voce è quella del livello indicato.
 */
export const LIVELLI_AGENTE = [
  { livello: 2, caratteristiche: { DES: 2 } }, // DES 7 → 9 (massimo 9 ai livelli 2–5)
  { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
  {
    livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa',
    // limiti del VA personale del Grado II (§8.3 del 29/09): ogni punto aumenta il VA
    puntiAbilita: { 'Medicina': 1, 'Sopravvivenza': 2, 'Atletica': 2 },
  },
  { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
  { livello: 6, caratteristiche: { DES: 1, COS: 1 } }, // DES 10; il secondo punto va altrove
  { livello: 7, talentoLibero: { id: 'buona-costituzione' } },
  {
    livello: 8, grado: { classe: 'Agente' }, tiroPV: tiro(3, 'app'),
    puntiAbilita: { 'Sopravvivenza': 1, 'Atletica': 2, 'Pilotare': 2 },
  },
  { livello: 9, talentoLibero: { id: 'sempre-allerta' } },
  { livello: 10, caratteristiche: { SAG: 2 } },
  { livello: 11, talentoLibero: { id: 'specializzazione-spionaggio' } },
  {
    livello: 12, grado: { classe: 'Agente' }, tiroPV: tiro(5), talentoClasse: 'Analisi Rapida',
    puntiAbilita: { 'Pilotare': 2, 'Tecnologia': 2, 'Difese': 1 },
  },
  { livello: 13, talentoLibero: { id: 'schivata-istintiva' } },
  { livello: 14, caratteristiche: { SAG: 1, INT: 1 } },
  { livello: 15, talentoLibero: { id: 'schivata-multipla' } },
  {
    livello: 16, grado: { classe: 'Agente' }, tiroPV: tiro(6),
    puntiAbilita: { 'Atletica': 2, 'Pilotare': 2, 'Difese': 1 },
  },
  { livello: 17, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
  { livello: 18, caratteristiche: { FOR: 2 } },
  { livello: 19, talentoLibero: { id: 'duro-a-morire' } },
  {
    livello: 20, grado: { classe: 'Agente' }, tiroPV: tiro(2), talentoClasse: 'Doppia Identità',
    puntiAbilita: { 'Tecnologia': 2, 'Difese': 1, 'Armi medie': 2 },
  },
];
