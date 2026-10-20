// Incantesimi che arrivano da un oggetto (richiesta del 20/10/2026, dal tavolo del 19/10): artefatti con un incantesimo
// infuso (Magia §24.2: proprietà ad attivazione; Pietra della Vigilanza e gli artefatti creati dal giocatore) e
// Consumabili con la versione infusa (§27: le pergamene). Sono sempre DERIVATI dall'Inventario: l'incantesimo resta
// legato all'oggetto, non entra fra quelli conosciuti dal personaggio e, se l'oggetto esce dall'Inventario, sparisce
// dalla scheda da sé (nessun dato salvato). Funzioni pure.
//
// Regole applicate (Magia):
// - §24.2: una proprietà ad attivazione conserva effetti, PM, tempo di esecuzione, gittata, bersagli, durata,
//   Concentrazione, Prove Salvezza, cumuli e limitazioni della versione infusa; dopo la Sintonizzazione l'attivazione è
//   automatica e non richiede Potere né Componenti. §26.2: una proprietà Esclusiva si paga solo con la riserva interna,
//   una Universale anche con PM personali (src/lancio.js → attivazioneInfusa).
// - §27.1: un Consumabile ha SnT 0, Cariche Esclusive sigillate (non sono una riserva del personaggio); si consuma al
//   completamento dell'attivazione; restano tempo, gittata, bersagli, durata, Concentrazione, Prove per colpire, Difese
//   e Salvezze dell'Incantesimo infuso.
// - Armamenti §7.24, Magia §26.6.2: i Guanti da Combattimento Mistico hanno una proprietà attiva Esclusiva (3 PM, 1 AzP,
//   5 RND) che i manuali non legano a un Incantesimo: compare nello stesso elenco, con la sua attivazione.
import { catalogo, risolvi, normalizzaEquipaggiamento, infoArtefattoVoce, infusiDi } from './equipaggiamento.js';
import { consumabiliMistici, motivoNonUsabile } from './consumabili-mistici.js';
import { attivazioneInfusa } from './lancio.js';

const incantesimoPerNome = (nome, dati) => (dati?.incantesimi?.incantesimi ?? []).find((i) => i.nome === nome) ?? null;

/**
 * Le voci dell'Inventario che portano un incantesimo (o, per i Guanti, una proprietà attiva):
 * [{ chiave, origine: 'artefatto'|'consumabile'|'proprieta', uid, oggetto, incantesimo?, livello?, infuso?, riserva?,
 *    sintonizzato?, deposito, quantita?, consumabile?, attivazione?, trovato }]
 * `chiave` identifica la riga (uid della voce + posizione): il pannello «Lancia!» la usa per ritrovarla.
 */
export function incantesimiDaOggetti({ voci, scheda }, dati) {
  const cat = catalogo(dati);
  const eq = scheda?.equipaggiamento;
  const sint = new Map((eq?.sintonizzazione?.artefatti ?? []).map((x) => [x.uid, x]));
  const contenitori = eq?.contenitori ?? [];
  const out = [];
  for (const v of normalizzaEquipaggiamento(voci ?? [])) {
    const r = risolvi(v, cat);
    const info = infoArtefattoVoce(r, dati);
    const riserva = contenitori.find((c) => c.uid === r.uid && c.integrato) ?? null;
    const base = { uid: r.uid, oggetto: r.nome, deposito: !!r.deposito, sintonizzato: sint.get(r.uid)?.sintonizzato === true, riserva };
    infusiDi(info).forEach((infuso, i) => out.push({
      ...base, chiave: `${r.uid}#${i}`, origine: 'artefatto', infuso, incantesimo: infuso.incantesimo, livello: infuso.livello,
      trovato: !!incantesimoPerNome(infuso.incantesimo, dati),
    }));
    const at = r.def?.attivazione_artefatto;
    if (at) out.push({ ...base, chiave: `${r.uid}#p`, origine: 'proprieta', proprieta: at, trovato: true });
  }
  for (const x of consumabiliMistici(voci ?? [], dati)) {
    out.push({
      chiave: `${x.uid}#c`, origine: 'consumabile', uid: x.uid, oggetto: x.nome, deposito: x.deposito, quantita: x.quantita, consumabile: x.consumabile,
      attivazione: x.attivazione, incantesimo: x.consumabile.incantesimo, livello: x.consumabile.livello, voce: x, trovato: !!incantesimoPerNome(x.consumabile.incantesimo, dati),
    });
  }
  return out;
}

/** La riga con questa chiave, o null (l'oggetto è uscito dall'Inventario o il consumabile è finito). */
export const trovaIncantesimoOggetto = (elenco, chiave) => elenco.find((e) => e.chiave === chiave) ?? null;

/** La voce di incantesimi.json dell'incantesimo di un oggetto, o null. */
export const incantesimoDiOggetto = (e, dati) => incantesimoPerNome(e?.incantesimo, dati);

/**
 * Cosa costa e come si paga l'attivazione di una riga, dallo stato attuale:
 * { pm, tempo, motivo, fonte: { personali, contenitore: { uid, pm, nome }|null }|null, universale, pagamento, tipoPagamento, frasi }
 * `fonte` è quella di `azioni.lancia`; per un Consumabile è null (si consuma l'esemplare, `azioni.usaConsumabile`).
 * `motivo` è un avviso («non sintonizzato», «la riserva ha N PM…»): non blocca, il Direttore ha l'ultima parola.
 */
export function attivazioneOggetto(e, { sessione, inScontro = false, rotti = null }, dati) {
  if (e.origine === 'consumabile') {
    const motivo = motivoNonUsabile(e.voce, { inScontro, rotti });
    return {
      pm: e.consumabile.pm_sigillati, tempo: e.attivazione.testo, motivo, fonte: null, universale: false, tipoPagamento: 'sigillati',
      pagamento: { interna: 0, personali: 0 }, frasi: [],
    };
  }
  const pmRiserva = e.riserva ? sessione?.chroma?.[e.riserva.uid]?.pmAttuali ?? 0 : 0;
  const a = attivazioneInfusa(e.infuso, e.riserva ?? null, { pm: pmRiserva, personali: sessione?.pmAttuali ?? 0, sintonizzato: e.sintonizzato, deposito: e.deposito }, dati);
  if (!a) return null;
  const universale = a.alimentazione === 'universale';
  const p = a.pagamento ?? { interna: 0, personali: 0 };
  const contenitore = e.riserva ? (universale ? (p.interna ? { uid: e.riserva.uid, pm: p.interna, nome: e.riserva.nome } : null) : { uid: e.riserva.uid, pm: a.pm, nome: e.riserva.nome }) : null;
  return {
    pm: a.pm, tempo: a.tempo, motivo: a.motivo, universale, tipoPagamento: universale ? 'universale' : 'esclusiva', frasi: a.frasi,
    pagamento: p, fonte: { personali: universale ? p.personali : 0, contenitore },
  };
}
