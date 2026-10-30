// Scala della mappa (A.198, risposta di Davide del 30/10/2026): la scena dichiara se i suoi quadretti sono Q Base
// (1 Q = 1,5 m, le creature hanno la sagoma del campo «spazio» del profilo) o Q Tattici (1 Q = 15 m, le creature hanno la
// pedina convenzionale del manuale, campo «pedina_tattica»; «queste sagome non modificano le dimensioni effettive della
// creatura nei passaggi stretti»). La scala non si deduce da niente: sta nella scena, si legge sempre sulla mappa e decide
// quale delle due misure si usa. Una scena senza il campo `scala` (quelle di prima) è in Q Base.
// Si sceglie finché la scena non ha creature né veicoli: cambiare scala a pedine già messe le farebbe cambiare misura sotto
// gli occhi di tutti (e un 14 × 10 sparirebbe in una pedina 2 × 1 in mezzo ad altre pedine).
// Funzioni pure.

/** Le scale ammesse (data/mappa.json → scale.elenco). */
export const scale = (dati) => dati?.mappa?.scale?.elenco ?? [{ id: 'base', nome: 'Q Base', q_metri: dati?.mappa?.q_metri ?? 1.5 }];

/** L'identificativo della scala della scena (Q Base se non c'è il campo o non si riconosce). */
export function scalaDi(scena, dati) {
  const ok = scale(dati).some((x) => x.id === scena?.scala);
  return ok ? scena.scala : (dati?.mappa?.scale?.predefinita ?? 'base');
}

/** La scala della scena con nome e metri per Q. */
export const infoScala = (scena, dati) => scale(dati).find((x) => x.id === scalaDi(scena, dati)) ?? scale(dati)[0];

/** Metri per Q della scena (1,5 in Q Base, 15 in Q Tattici). */
export const qMetri = (scena, dati) => infoScala(scena, dati).q_metri;

/** La scena in Q Tattici? */
export const eTattica = (scena, dati) => scalaDi(scena, dati) === 'tattica';

/** «Q Base · 1 Q = 1,5 m», per la barra della mappa e per i giocatori. */
export const testoScalaScena = (scena, dati) => {
  const s = infoScala(scena, dati);
  return `${s.nome} · 1 Q = ${String(s.q_metri).replace('.', ',')} m`;
};

/** I token che impediscono di cambiare scala: creature (non i PG, sempre 1 × 1) e veicoli; i token liberi no. */
export const tokenDiScala = (scena) => (scena?.token ?? []).filter((t) => t?.rif?.tipo === 'veicolo' || (t?.rif?.tipo === 'partecipante' && !String(t.rif.id ?? '').startsWith('pg:')));

/** Si può cambiare scala? { ok, motivo? }: no se la scena ha già pedine di creature grandi o veicoli. */
export function scalaCambiabile(scena) {
  const t = tokenDiScala(scena);
  return t.length ? { ok: false, motivo: `la scena ha già ${t.length} pedine di creature o veicoli: toglile per cambiare scala` } : { ok: true };
}

/** La scena con la scala cambiata (null se non ammessa o non cambiabile). Il campo si scrive sempre, anche per Q Base. */
export function conScala(scena, id, dati) {
  if (!scale(dati).some((x) => x.id === id)) return null;
  if (id === scalaDi(scena, dati)) return scena;
  if (!scalaCambiabile(scena).ok) return null;
  return { ...scena, scala: id };
}
