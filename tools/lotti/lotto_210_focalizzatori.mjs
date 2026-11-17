// Lotto 210 (17/11/2026), parte A — **i focalizzatori della CyberArma: un bonus per colore, nei dati.**
//
// Il 209 ha lasciato una lacuna: il manuale dà al focalizzatore Verde +1 VA di Attacco, +1 VA di Parata e +1 al danno, e la
// scheda di Dimitri mostrava VA 9 senza niente. Non si sistema un colore: il manuale ne descrive **cinque** (i quattro di
// riferimento e il Viola eccezionale) e qui sono tutti, ciascuno con ciò che il manuale dice e basta.
//
// Fonte: Armamenti 0.86 §7.25 («Cristallo focalizzatore», tabella dei profili dei Custode) e §7.25.5 («Riferimento rapido»).
// Per il Tecnomante e per le conversioni a CM e NeC (§7.25: «Le proprietà cromatiche si applicano anche all'impiego del
// Tecnomante… Una conversione mantiene la proprietà del cristallo») il §7.25.5 dà il danno **senza** il cristallo e poi il
// cristallo a parte:
//   «Bianco 1d8+3 Magico (×2 al danno complessivo contro l'Oscura Simmetria), Rosso 1d8 Magico con Plasma, Blu 1d8 Magico
//    con Elettricità, Verde 1d8+1 Magico con +1 VA di Attacco e Parata».
// Quindi i numeri sono: Bianco +3 danno; Verde +1 VA di Attacco, +1 VA di Parata, +1 danno; Rosso e Blu nessun numero (una
// proprietà del danno, §5.24: la applica il Direttore sul bersaglio); Viola nessun numero («annotare il valore del singolo
// frammento»: la Corruzione). **Un valore che il manuale non dà non si inventa**: Rosso, Blu e Viola sono dichiarati senza
// numero, con il motivo.
//
// Il **Custode** non è qui: la sua tabella per Grado («sono già inclusi il +1 di Maestro d'Arma e i bonus fissi del cristallo»)
// ha il cristallo dentro, e sommarlo ancora lo conterebbe due volte. Quella tabella nell'app non c'è (lavoro a parte).
//
//   node tools/lotti/lotto_210_focalizzatori.mjs            — che cosa scriverebbe
//   node tools/lotti/lotto_210_focalizzatori.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/equipaggiamento/armi.json';

export const FOCALIZZATORI = {
  fonte: 'Armamenti 0.86 §7.25 (Cristallo focalizzatore; tabella dei profili) e §7.25.5 (Riferimento rapido); Equipaggiamento 0.41 §10.9 (esemplare di Dimitri)',
  _nota: 'Lotto 210: un bonus per colore, calcolato dove si calcola il VA (src/cyberarma.js → bonusFocalizzatore, src/equipaggiamento.js). Vale per il Tecnomante e per le conversioni a CM e NeC; il Custode usa la sua tabella per Grado, che il cristallo ce l\'ha già dentro (sommarlo lo conterebbe due volte). Un colore senza numero qui sotto non ha numero nel manuale: non si inventa.',
  si_applica_a: 'non_custode',
  elenco: [
    { id: 'bianco', nome: 'Bianco', va_attacco: 0, va_parata: 0, danno: 3, condizionale: { testo: 'Contro l’Oscura Simmetria ×2 al danno complessivo del colpo, +3 compreso', moltiplicatore_danno: 2, contro: 'Oscura Simmetria' }, paragrafo: '§7.25, §7.25.5' },
    { id: 'rosso', nome: 'Rosso', va_attacco: 0, va_parata: 0, danno: 0, proprieta_danno: 'Plasma', senza_numero: 'Plasma (§5.24): è un effetto sul bersaglio (PS Tempra, −2 VA), non un bonus al VA o al danno. «Nessun dado aggiuntivo»: lo applica il Direttore.', paragrafo: '§7.25, §7.25.5' },
    { id: 'blu', nome: 'Blu', va_attacco: 0, va_parata: 0, danno: 0, proprieta_danno: 'Elettricità', senza_numero: 'Elettricità (§5.24): è un effetto sul bersaglio (PS Tempra, niente Azioni fuori Iniziativa), non un bonus al VA o al danno. «Nessun dado aggiuntivo»: lo applica il Direttore.', paragrafo: '§7.25, §7.25.5' },
    { id: 'verde', nome: 'Verde', va_attacco: 1, va_parata: 1, danno: 1, paragrafo: '§7.25, §7.25.4, §7.25.5' },
    { id: 'viola', nome: 'Viola', va_attacco: 0, va_parata: 0, danno: 0, corruzione: true, senza_numero: 'Eccezionale: porta Corruzione, «annotare il valore del singolo frammento» (§7.25). Il manuale non dà un bonus numerico né il valore della Corruzione: sta nell’esemplare (A.246).', paragrafo: '§7.25' },
  ],
};

export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const v = (json.oggetti ?? []).find((o) => o.id === 'cyberarma');
  if (!v) throw new Error('voce «cyberarma» non trovata in armi.json');
  return { json, voce: v, giaScritto: JSON.stringify(v.focalizzatori ?? null) === JSON.stringify(FOCALIZZATORI) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_210_focalizzatori.mjs'], 'lotto_210_focalizzatori.mjs');
  const { json, voce, giaScritto } = piano();
  if (giaScritto) { console.log('Niente da cambiare: i focalizzatori sono già nei dati.'); process.exit(0); }
  for (const f of FOCALIZZATORI.elenco) console.log(`${f.nome}: VA attacco ${f.va_attacco >= 0 ? '+' : ''}${f.va_attacco}, Parata +${f.va_parata}, danno +${f.danno}${f.senza_numero ? ' — senza numero nel manuale' : ''}`);
  if (!argv.includes('--scrivi')) { console.log('\n(dry-run: --scrivi per applicare)'); process.exit(0); }
  voce.focalizzatori = FOCALIZZATORI;
  writeFileSync(FILE, `${JSON.stringify(json, null, 1)}\n`);
  console.log(`\nScritto ${FILE}.`);
}
