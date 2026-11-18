// Lotto 218, parte C — la cancellazione di un record dal registro dei veicoli, con le cautele che servono a un record
// che contiene Integrità, munizioni e storico di campagna. Funzioni pure: le usano il server (server.mjs → /api/veicoli)
// e la tab Veicoli.
//
// **Perché esiste.** Nei pacchetti dei lotti 202, 208, 214 e 215 abbiamo scritto a Davide che il secondo record della
// Neverlost «si cancella dalla tab Veicoli». Non era vero: non c'era né un pulsante né un `DELETE` sul server, e un
// record si toglieva a mano dalla cartella `veicoli/`. Gliel'abbiamo detto quattro volte, e la Neverlost doppia era
// ancora lì — anche perché gli avevamo detto di premere una cosa che non esisteva.
//
// Le cautele, tutte dichiarate:
//  1. **La conferma nomina il mezzo e il suo identificativo** (`fraseDiConferma`), non chiede «sei sicuro?».
//  2. **Se un personaggio lo cita, l'app lo dice prima, con i nomi** (`citazioniVeicolo`): cancellarlo lascia un
//     riferimento rotto, come quelli del lotto 201, e chi decide deve saperlo *prima*.
//  3. **Il record cancellato va in una copia di sicurezza e si può rimettere** (`copiaDiSicurezza`,
//     `ripristinaDaCopia`): niente sparisce per sempre con un tocco. La copia sta in `veicoli/cancellati/`, dentro la
//     cartella che «Salva sessione» già salva.
//  4. **Solo dal PC del Direttore** (il controllo `req.mutantMaster` del server) e solo in modalità master nella scheda.

/** Dove stanno le copie dei record cancellati, dentro la cartella `veicoli/`. */
export const CARTELLA_CANCELLATI = 'cancellati';

const isOggetto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const lista = (x) => (Array.isArray(x) ? x : []);

/**
 * Chi cita il veicolo `id`.
 * @param personaggi [{ nome, file, scelte }] — il file attuale di ogni personaggio
 * @param scene [{ id, nome, token: [{ rif: { tipo, id } }] }]
 * @returns {{ personaggi: {nome, file}[], scene: {id, nome, token}[], totale: number }}
 */
export function citazioniVeicolo(id, personaggi = [], scene = []) {
  const pg = lista(personaggi)
    .filter((p) => lista(p?.scelte?.veicoli).some((v) => isOggetto(v) && v.rif === id))
    .map((p) => ({ nome: String(p.nome ?? p.scelte?.nome ?? p.file ?? '—'), file: p.file ?? null }));
  const sc = lista(scene).map((s) => ({
    id: s?.id ?? null, nome: String(s?.nome ?? s?.id ?? '—'),
    token: lista(s?.token).filter((t) => t?.rif?.tipo === 'veicolo' && t.rif.id === id).length,
  })).filter((s) => s.token > 0);
  return { personaggi: pg, scene: sc, totale: pg.length + sc.length };
}

/** Il nome con cui il record si legge: quello del mezzo, altrimenti l'identificativo. */
export const nomeDelRecord = (rec) => String(rec?.mezzo?.nome ?? rec?.id ?? '—');

/**
 * La frase della conferma. Nomina il mezzo e l'identificativo, dice quando è nato (dall'id) se si sa, e se qualcuno lo
 * cita lo dice **con i nomi** e dice che cosa succede (il riferimento resta rotto, non sparisce da solo).
 */
export function fraseDiConferma(rec, citazioni, nato = null) {
  const nome = nomeDelRecord(rec);
  const righe = [`Stai per cancellare dal registro «${nome}» (${rec.id}${nato ? `, registrato il ${nato}` : ''}), revisione ${rec.revisione ?? 0}.`];
  if (citazioni?.totale) {
    const chi = [
      ...citazioni.personaggi.map((p) => `la scheda di ${p.nome}`),
      ...citazioni.scene.map((s) => `la scena «${s.nome}» (${s.token} ${s.token === 1 ? 'token' : 'token'})`),
    ];
    righe.push(`Lo citano ${chi.join(', ')}: cancellandolo, quei riferimenti restano senza un record e la tab Veicoli li segnala come «rotti» (si riparano con «Ricollega» o «Togli dalla scheda»).`);
  } else righe.push('Nessun personaggio e nessuna scena lo cita.');
  righe.push('Una copia con tutto il suo contenuto (Integrità, munizioni, storico) resta in veicoli/cancellati/ e si rimette dalla stessa tab.');
  return righe.join(' ');
}

/** Il nome del file della copia: l'id e il momento, senza i due punti che Windows non vuole. */
export const nomeCopia = (id, quando) => `${id}_${String(quando).replace(/[:.]/g, '-')}.json`;

/**
 * La copia di sicurezza di un record cancellato: il record **per intero**, più chi e quando. Il record non si tocca.
 */
export function copiaDiSicurezza(rec, { quando, da = 'master', motivo = null } = {}) {
  if (!isOggetto(rec) || typeof rec.id !== 'string') throw new Error('copia di sicurezza: manca il record');
  if (!quando) throw new Error('copia di sicurezza: manca il momento');
  return { formato: 'mutant-veicolo-cancellato', versione: 1, cancellato: { quando, da, ...(motivo ? { motivo } : {}) }, record: rec };
}

/** Una copia è valida se porta il record intero e il momento. */
export const copiaValida = (c) => isOggetto(c) && c.formato === 'mutant-veicolo-cancellato' && isOggetto(c.record) && typeof c.record.id === 'string' && Boolean(c.cancellato?.quando);

/**
 * Il record da rimettere nel registro. La revisione sale (un client con una pagina aperta prima della cancellazione non
 * deve poterlo sovrascrivere senza accorgersene), il resto è quello di prima.
 * @returns { record } oppure { errore }
 */
export function ripristinaDaCopia(copia, attuali = [], adesso = new Date().toISOString()) {
  if (!copiaValida(copia)) return { errore: 'la copia non è un record cancellato valido' };
  const id = copia.record.id;
  if (lista(attuali).some((r) => r?.id === id)) return { errore: `nel registro c’è già un veicolo con l’identificativo ${id}: non lo sovrascrivo` };
  return { record: { ...copia.record, revisione: (copia.record.revisione ?? 0) + 1, aggiornato: adesso } };
}

/** Riga dell'elenco delle copie, per la tab: «Neverlost (veimvzoj07y0) — cancellato il 18/11 alle 09:30». */
export function rigaCopia(nomeFile, copia) {
  const q = new Date(copia.cancellato.quando);
  const quando = Number.isNaN(q.getTime()) ? copia.cancellato.quando : `${String(q.getDate()).padStart(2, '0')}/${String(q.getMonth() + 1).padStart(2, '0')} alle ${String(q.getHours()).padStart(2, '0')}:${String(q.getMinutes()).padStart(2, '0')}`;
  return { file: nomeFile, id: copia.record.id, nome: nomeDelRecord(copia.record), quando: copia.cancellato.quando, testo: `${nomeDelRecord(copia.record)} (${copia.record.id}) — cancellato il ${quando}` };
}
