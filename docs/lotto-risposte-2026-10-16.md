# Lotto del 16 ottobre 2026 — A.160, A.162, A.163, A.164 e A.166

Cinque risposte di Davide del 16/10 applicate (la **A.161**, i PX della partita, è il prossimo lotto; la
**A.165** è solo editoriale). Tutti i valori stanno nei dati; nessuna automazione nuova oltre a quelle che
le risposte chiedono.

Fonte: sezione 7 del Doc «per-davide.md», blocchi del 16/10 (scaricato alle 09:55).

---

## 0. Controllo dei manuali (prima di tutto)

Davide cita il Manuale dei Mostri **v0.4** e **v0.5**; il Doc oggi è la **v0.9** del 16/10 09:27. Il prompt
91 aveva lavorato sulla 0.3. Che cosa cambia dalla 0.3 alla 0.9:

| | 0.3 (15/10) | 0.9 (16/10) |
|---|---|---|
| Catalogo (cap. 8) | 15 creature | **75**: le 15 più sei blocchi di dieci — «Bande e grandi avversari», «Non morti», «Bestie e predatori», «Costrutti e creature elementali», «Giganti e abitanti delle montagne», «Creature del sottosuolo», ciascuno con un riepilogo |
| §5.2 (umani costruiti come PG) | «5 punti Abilità liberi» | **«7 punti Abilità liberi a ogni Grado, compreso il primo»** → A.160 |
| §4.2 (PV, Ferite, Menomazioni) | la scala finiva a Grave | la scala arriva a **Morente**, con contatore dalla COS, primo decremento dopo un Round completo, Ferite eccedenti dell'ingresso che non abbreviano, stabilizzazione → A.164 |
| §3.1 (dati da riportare) | — | «Caratteristiche… **un dato assente non vale 0**» → A.164 (COS mancante) |
| Non morti, Covata, elementali | regole comuni della Covata | regole comuni anche per non morti, costrutti ed elementali, con Morente citato nelle singole schede |

**Applicato da questo lotto:** solo ciò che tocca le risposte (A.160 e A.164). **Resta da fare,** in elenco:

1. le **75 schede** del catalogo (le 60 nuove) nel bestiario dell'app;
2. la scala **GS/PX** e i PX per 4 PG delle schede (A.161, prossimo lotto);
3. le regole comuni dei nuovi blocchi (non morti, costrutti, elementali: resistenze, tocchi, forme
   immateriali) e il raccordo con `data/bestiario.json`;
4. il campo **Spazio** delle creature del manuale (A.126: le schede del catalogo lo danno, il nostro
   bestiario no — oggi lo deduciamo dalla Taglia).

Altri Doc ricontrollati: **Armamenti 0.64** (del 15/10 22:45) cambia solo le linee delle pistole — Colt
Enforcer, Trooper, Frontier, Jamson 45 e Hammershot con tamburi, prezzi e ricarica, Bolter semiautomatiche,
famiglie e Abilità di lanciagranate e lanciarazzi: **il §7.25 della CyberArma non è cambiato**, quindi per le
manifestazioni vale la risposta (CLAUDE.md). **E&L** del 15/10 sera: solo la rettifica della A.109 (A.165).
Giocatore 0.48, Magia 1.5 ed Equipaggiamento 0.8 invariati.

---

## 1. A.160 — 7 punti Abilità liberi anche per gli avversari

Il «5» del §5.2 era un refuso. **L'app faceva già così**: i punti vengono da `regole.json` (creazione e
`avanzamento.eventi`) e passano per lo stesso motore sia per i PG, sia per il bestiario umano
(`tools/genera_nemici_umani.mjs`, costruito come PG), sia per «PG → nemico», che porta i VA della scheda
senza ritararli. Nessun «5» era rimasto nei dati; aggiunta la nota della risposta e i test che lo bloccano
(`tests/a160-punti-avversari.test.js`, che controlla anche il §5.2 del manuale 0.9).

## 2. A.162 — «Indistruttibile» e i tre stati dell'Integrità

| Stato | Che cosa fa |
|---|---|
| Integrità ordinaria (predefinito) | PS Integrità e PI come sempre |
| **Indistruttibile** | dicitura visibile; il danneggiamento non toglie PI e non rompe |
| **Integrità da definire** | il dato manca, si segnala e si completa; **non** vale come indistruttibile né come rotto |

Senza campo vale l'ordinaria: nessun oggetto di sempre cambia. Nell'Inventario, sotto la tabella dei PI,
compaiono le righe degli oggetti speciali con la loro regola. Lo **Scrigno del Primo Giuramento** è nel
catalogo con la proprietà attiva e la nota che il danneggiamento non consente di forzarne l'apertura; la
proprietà non si estende ai Sigilli, al contenuto, né agli altri Artefatti (nessun altro oggetto del
catalogo la ha). I tre Contenitori del Silenzio usano il terzo stato, perché il §10.13 dice che Qualità, PI,
PS Integrità, costo e Reperibilità restano da definire.

## 3. A.163 — Contenitori del Silenzio: qualsiasi contenuto

I tre contenitori (Custodia, Zaino, Cofanetto) sono nel catalogo con `schermatura` (Corruzione 1, SnT 0).
Nella riga dell'oggetto, nell'Inventario, c'è l'indicazione **«Schermatura attiva / inattiva»**, due caselle
da toccare — **chiuso** e **contenuto riposto** — e il «?» con le condizioni e la regola. L'indicazione
dipende **solo** dalle tre condizioni (contenuto interamente riposto, contenitore chiuso, schermatura
integra, cioè contenitore non rotto): l'app non controlla che cosa c'è dentro, perché la schermatura vale
per qualunque contenuto. Non calcola la Corruzione e ricorda che la schermatura non elimina quella
dell'oggetto né quella già accumulata dai personaggi.

## 4. A.164 — Morente anche per i nemici

Tutto quello che valeva per i PG (A.159) vale per i nemici del Tavolo, con le precisazioni che si applicano
**anche ai PG**:

- oltre Grave: Svenuto, −8, contatore pari alla **COS intera effettiva** all'ingresso, fissata per
  quell'episodio; 0 PV da soli non portano a Morente;
- **primo decremento dopo un Round completo, alla stessa posizione d'Iniziativa dell'ingresso**: il
  contatore salva anche il turno, così nel Round successivo cala solo quando si torna a quella posizione;
- le Ferite eccedenti del colpo d'ingresso non abbreviano nulla; ogni nuova Ferita successiva toglie un
  Round; a 0 l'app avvisa che è morto e lascia decidere al master;
- «Stabilizza» riporta a Grave e spegne il contatore; un contatore spento a 0 non uccide;
- **COS mancante:** l'app lo dice e offre il campo per inserirla; non la ricava da Tempra o PV, non la tratta
  come 0, non dichiara morto nessuno. Inserita a scontro in corso, contano i Round già trascorsi
  dall'ingresso: il contatore non riparte da capo;
- nella plancia, la mini-scheda del nemico ha lo stesso riquadro **«Morente — N Round»** dei PG, con «−1
  Round» e «Stabilizza»;
- resta l'eccezione esplicita: una scheda che prevede la distruzione, o una causa di morte diretta, salta
  Morente (`morente: false` del profilo).

## 5. A.166 — Manifestazioni della CyberArma

L'Abilità è **sempre Armi da mischia**. La manifestazione è un campo a parte, e da lei dipendono:

| Forma | Famiglia | Specializzazione | Manovre |
|---|---|---|---|
| Lama lunga (spada) — forma del progetto | Spade | Spade | Affondo, Spazzata |
| Frusta | Armi flessibili | Armi Flessibili | generali, con la procedura di Immobilizzare con la Frusta |
| Ascia | Asce | Asce | Spazzata |
| Lancia | Armi inastate | Armi Inastate | Affondo |

Per le altre forme vale la famiglia corrispondente del catalogo. Il **Custode** sceglie la forma da un menu
nella riga dell'arma; il **Tecnomante** e gli altri utilizzatori ammessi vedono la forma del progetto e la
cambiano solo in «Modifica master», perché è una modifica del manufatto. Una sola Specializzazione
pertinente, mai cumulata: l'app applica il +1 VA e +1 danno solo se il personaggio possiede proprio quella
della forma. Sostituisce l'associazione provvisoria di ogni CyberArma alle Spade.

---

## Che cosa resta fuori

- **A.161** (PX della partita e calcolatore nel Tavolo del Direttore): prossimo lotto;
- le 60 schede nuove del Manuale dei Mostri 0.9, la scala GS/PX e le regole comuni dei blocchi nuovi;
- il recepimento editoriale nei manuali (A.163 §10.13 e §28.3, A.166 §7.25): lo fa Davide.
