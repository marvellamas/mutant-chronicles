// I cinque bonus dell'equipaggiamento rimasti fuori dai dati (censimento degli impianti del 04/10/2026, sezione «Stesso
// rischio altrove»; docs/censimento-impianti.md).
//   node tools/lotti/lotto_bonus_equipaggiamento.mjs            prova a vuoto
//   node tools/lotti/lotto_bonus_equipaggiamento.mjs --scrivi   scrive i JSON (idempotente)
// - Martello Spaccateste a due mani: +1 VA alla Manovra Stordire (proprietà «Stordire +1», Armamenti §7.1.9), solo
//   con quell'arma e quella Manovra: «manovra» dell'effetto, applicato da «Attacca!» senza casella;
// - IAS3200 Imbracatura antigravità: Pilotare −2 in Corsa e −4 in Scatto in volo (valori d'uso);
// - IAS3100 Generatore Blink: SIN 2, +2 a Pilotare per Power Blink, solo con l'Interfaccia neurale
//   («richiede_innesto» dell'effetto, Equipaggiamento §7.3: «Un oggetto privo di SIN non riceve il bonus»);
// - APE Capitol: Schivare usa Pilotare −1 VA (valore d'uso);
// - Utensile multiuso: strumento Improvvisato −2 VA per i lavori specialistici (valore d'uso di Tecnologia).
// Le frasi in «condizione» sono quelle del manuale (tools/verifica_frasi.mjs).
import { readFileSync, writeFileSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');

const EFFETTI = {
  armi_corporative: {
    'martello-spaccateste-a-due-mani': [{
      tipo: 'attacco', attacchi: 'ravvicinati', valore: 1, ambito: 'situazionale', manovra: 'stordire', se: 'con la Manovra Stordire',
      condizione: 'Stordire +1 del Martello Spaccateste a due mani concede +1 VA alla Manovra Stordire: la penalità ordinaria diventa −5 VA, quella di Stordire Migliorato −3 VA.',
      proprieta: 'Stordire +1', fonte: 'Armamenti §7.1.9',
    }],
  },
  corredi_dispositivi: {
    'ias3200-imbracatura-antigravita': [-2, -4].map((valore, i) => ({
      abilita: 'Pilotare', valore, ambito: 'uso_specifico', uso: i ? 'volo in Scatto' : 'volo in Corsa', se: i ? 'in volo, in Scatto' : 'in volo, in Corsa',
      condizione: 'Pilotare sostituisce Atletica: automatico al Passo in condizioni ordinarie, −2 VA in Corsa, −4 VA in Scatto.', fonte: 'Armamenti §7.15.4',
    })),
    'ias3100-generatore-blink': [{
      abilita: 'Pilotare', valore: 2, ambito: 'uso_specifico', uso: 'Power Blink', se: 'Power Blink, con l’Interfaccia neurale', richiede_innesto: 'interfaccia_neurale',
      condizione: 'SIN 2 concede +2 VA alle Prove di Pilotare del dispositivo, compensando la penalità di Power Blink; non aumenta il Blink ordinario, che è automatico.',
      fonte: 'Armamenti §7.15.4; Equipaggiamento §7.3',
    }],
    'ape-capitol': [{
      abilita: 'Pilotare', valore: -1, ambito: 'uso_specifico', uso: 'Schivare con l’APE', se: 'per Schivare con l’APE',
      condizione: 'Schivare usa Pilotare −1 VA.', fonte: 'Armamenti §7.13.6',
    }],
  },
  dotazioni_personali: {
    'utensile-multiuso': [{
      abilita: 'Tecnologia', valore: -2, ambito: 'uso_specifico', uso: 'lavori specialistici', se: 'come strumento Improvvisato',
      condizione: 'Per lavori specialistici l’utensile multiuso vale come strumento Improvvisato (−2 VA) solo se concretamente adeguato.', fonte: 'Equipaggiamento §2.5',
    }],
  },
};

for (const [file, voci] of Object.entries(EFFETTI)) {
  const p = new URL(`data/equipaggiamento/${file}.json`, RADICE);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  for (const [id, effetti] of Object.entries(voci)) {
    const o = j.oggetti.find((x) => x.id === id);
    if (!o) throw new Error(`${file}: ${id} non trovato`);
    o.effetti = effetti;
    console.log(`${file}:${id}: ${effetti.length} effetti`);
  }
  if (scrivi) writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}
console.log(scrivi ? 'scritto' : 'prova a vuoto: --scrivi per scrivere');
