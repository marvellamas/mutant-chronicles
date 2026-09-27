# Ricognizione: gli Stati (§5.18) nei valori effettivi

27 settembre 2026. Fonti:

- Manuale del Giocatore, Google Doc corrente (`docs/manuali-txt/giocatore.md`):
  - §5.18 Stati;
  - §5.5 A Terra;
  - §5.14 Ferite;
  - §5.15 Sanguinamento;
  - §5.19 Affaticamento.
- Dati: `data/regole.json` → `stati`, `ferite`, `affaticamento`.
- Motore:
  - `src/condizioni.js` (valori effettivi al tavolo);
  - `src/attacco.js` («Attacca!»), che legge `vaEffettivo` e la `scomposizione` delle armi;
  - `src/lancio.js` («Lancia!»), che legge la scomposizione di Potere.

## Come arriva oggi una penalità

`condizioniAttive` trasforma ogni Stato attivo con il campo `effetto` in una condizione. `applicaCondizioni` la somma poi a tre valori:

- **Abilità:** al VA effettivo, con la voce «Stato» nella scomposizione e il colore rosso.
- **Difese:** è un'Abilità, quindi segue la stessa strada.
- **Salvezze:** solo con `effetto.salvezze`.

Le armi ricevono le condizioni **della loro Abilità**. Quindi «Attacca!», a distanza e corpo a corpo, vede una penalità solo se tocca l'Abilità dell'arma. «Lancia!» la vede se tocca Potere.

Movimento e Azioni vengono dai blocchi `movimento` e `azioni` dello Stato (`valoriTavolo`). L'Iniziativa non riceve condizioni: né Ferite né Affaticamento né Stati. Il manuale parla di «VA» e «Prove», e il tiro d'Iniziativa non è una Prova di Abilità (§2.14). Non è quindi un buco.

**Causa del problema di Accecato.** I dati scrivono la penalità solo su Difese (`va_abilita: { Difese: −8 }`). Il testo dice invece «Prove che richiedono la vista, comprese Difese e attacchi». Le Abilità delle armi non ricevono nulla, e quindi nemmeno «Attacca!».

## Censimento

Legenda: ✓ applicato; ✗ il manuale prevede la penalità e l'app non la applica; — non previsto dal manuale o non pertinente; *testo*: resta nel riassunto.

| Stato | Testo del manuale sulla penalità | A che cosa si applica (manuale) | Dati oggi | Abilità (VA) | Difese | Salvezze | «Attacca!» distanza | «Attacca!» ravvicinato | «Lancia!» | Iniziativa / Movimento / Azioni |
|---|---|---|---|---|---|---|---|---|---|---|
| A Terra (§5.5) | «Subisce −4 VA alle azioni fisiche ravvicinate, di equilibrio e alle Difese; può usare normalmente armi a distanza se la posizione lo permette. Gli attaccanti ravvicinati ottengono +2 VA, quelli a distanza −2 VA» | Abilità ravvicinate, equilibrio (Atletica), Difese; i ±2 sono di chi attacca il personaggio | `va_categorie: { Ravvicinato: −4 }`; `movimento: solo_passo` | ✓ ravvicinate · ✗ equilibrio (Atletica) | ✓ | — | — (giusto: nessuna penalità a distanza) | ✓ | — | Movimento ✓ (niente Corsa o Scatto) |
| Accecato | «−8 VA alle Prove che richiedono la vista, comprese Difese e attacchi contro bersagli non percepiti, e fallisce automaticamente le azioni puramente visive. Non può usare Tiro o Colpo Mirato.» | Prove che richiedono la vista, attacchi compresi; Difese; divieto di Tiro Mirato e Colpo Mirato | `va_abilita: { Difese: −8 }` | ✗ (Percezione e le altre Prove a vista) | ✓ | — | ✗ VA per colpire · ✗ Tiro Mirato ammesso | ✗ VA per colpire · ✗ Colpo Mirato ammesso | — | — |
| Assordato | «Fallisce automaticamente le azioni basate soltanto sull’udito e subisce −4 VA quando l’udito è importante ma non essenziale.» | Prove basate sull'udito (solo quando l'udito conta) | nessun effetto | ✗ (−4 per l'uso «udito») | — | — | — | — | — | — |
| Avvelenato | «Il veleno indica modificatore, danno e frequenza, durata, penalità o Stati e antidoto.» | Dipende dal veleno | nessun effetto | *testo* | *testo* | *testo* | — | — | — | — |
| Immobilizzato | «Non può muoversi, usare Corsa o Scatto e subisce −4 VA alle azioni fisiche.» | Prove fisiche (Difese comprese) | `va_gruppi: { fisiche: −4 }`; `movimento: nessuno` | ✓ | ✓ | — | ✓ | ✓ | — | Movimento ✓ |
| Incendiato | «Subisce immediatamente 1d4 danni […] e −2 VA. […] il −2 VA rimane continuo fino al termine dello Stato» | Tutti i VA; le Salvezze no, per ipotesi (A.17) | `va: −2` | ✓ | ✓ | — | ✓ | ✓ | ✓ (Potere) | — |
| Rallentato | «Il Passo è ridotto a 3 Q, non può usare Corsa o Scatto e subisce −2 VA alle Prove fisiche e alle Difese.» | Prove fisiche, Difese | `va_gruppi: { fisiche: −2 }`; `movimento: passo 3 Q` | ✓ | ✓ | — | ✓ | ✓ | — | Movimento ✓ |
| Sanguinamento | «Applica integralmente le regole della sezione 5.15.» (perdita di PV, nessun VA) | PV | nessun effetto | — | — | — | — | — | — | *testo* |
| Stordito | «Può effettuare soltanto Passo e non dispone di Azioni Principali. […] non può usare Difese che consumano Azioni.» | Movimento, Azioni; Parata e Difese attive | `movimento: solo_passo`; `azioni: { principali: 0 }` | — | *testo* (Difese che consumano Azioni) | — | ✗ nessun avviso (senza Azione Principale non si attacca) | ✗ nessun avviso | ✗ nessun avviso | Movimento ✓ · Azioni ✓ |
| Svenuto | «Non dispone di Azioni o Movimento, cade A Terra, non può effettuare Difese attive» | Azioni, Movimento; A Terra | `movimento: nessuno`; `azioni: 0 / 0` | *testo* (A Terra si attiva a parte) | *testo* | — | ✗ nessun avviso | ✗ nessun avviso | ✗ nessun avviso | Movimento ✓ · Azioni ✓ |
| Terrorizzato | «Subisce −4 VA a tutte le Prove […] Le Azioni Principali possono essere usate soltanto per difendersi, nascondersi, aiutare la fuga o rimuovere lo Stato.» | Tutte le Prove (Salvezze comprese per ipotesi, A.17); niente azioni offensive | `va: −4, salvezze: −4` | ✓ | ✓ | ✓ | ✓ VA · ✗ nessun avviso sulle azioni offensive | ✓ VA · ✗ nessun avviso | ✓ (Potere) | — |
| *Ferite (§5.14)* | «Superficiale −1, Importante −2, Profonda −4, Seria −6, Grave −8» a VA e Prove Salvezza | VA e Salvezze | `ferite.stati[].penalita`, `si_applica_a` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| *Affaticamento (§5.19)* | penalità dello Stato attuale a tutte le Prove di Caratteristica, Abilità e Salvezza | VA e Salvezze | `affaticamento.stati[].penalita`, `si_applica_a` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |

## ✗ trovati: 11

1. A Terra: −4 all'equilibrio (Atletica) mancante.
2. Accecato: −8 alle Prove a vista mancante (Percezione e le altre).
3. Accecato: −8 al VA per colpire delle armi a distanza mancante.
4. Accecato: −8 al VA per colpire delle armi ravvicinate mancante.
5. Accecato: Tiro Mirato e Colpo Mirato ammessi, mentre il manuale li vieta.
6. Assordato: −4 quando l'udito è importante mancante.
7. Stordito: «Attacca!» non avvisa che manca l'Azione Principale.
8. Stordito: «Lancia!» non avvisa che manca l'Azione Principale.
9. Svenuto: «Attacca!» non avvisa che non ci sono Azioni.
10. Svenuto: «Lancia!» non avvisa che non ci sono Azioni.
11. Terrorizzato: «Attacca!» non avvisa che le Azioni Principali sono solo difensive.

## Categorie di Prove (ipotesi, A.51)

Il manuale nomina categorie di Prove senza elencarne le Abilità. Le liste sono nostre e vanno confermate da Davide (voce A.51 in `docs/per-davide.md`):

- **fisiche** (Immobilizzato, Rallentato, carico): già in uso, domanda A.16.
- **fisiche ravvicinate** (A Terra): le Abilità della categoria Ravvicinato.
- **vista** (Accecato): gli attacchi, Difese, Percezione, Pilotare.
- **udito** (Assordato): Percezione e Intrattenere, solo come uso specifico «quando l'udito è importante».

## Cosa è stato corretto

27 settembre 2026. Tutti gli 11 ✗ sono chiusi.

- **Dati** (`regole.json → stati`):
  - Ogni Stato con penalità numeriche ha una lista `effetti` nello schema degli effetti degli oggetti. Ogni effetto è di tipo `va`, con `abilita` oppure con `prove` (una categoria di `regole.json → categorie_prove`, o «tutte»), oppure di tipo `salvezza`; ha ambito generale o uso specifico e riporta la frase del manuale, verificata da `tools/verifica_frasi.mjs`.
  - I divieti e gli avvisi per le utility stanno in `limiti`: `manovre_vietate`, `solo_azioni_difensive`.
  - Le categorie `fisiche_ravvicinate`, `vista` e `udito` sono ipotesi nostre (A.51).
- **Motore** (`src/condizioni.js`):
  - `effettoDaEffetti` porta gli effetti generali nel VA effettivo di Abilità, Difese e Salvezze. Le armi li ricevono tramite la loro Abilità, quindi «Attacca!» e «Lancia!» li leggono dai valori effettivi, senza ricalcolare nulla.
  - Gli usi specifici (A Terra: equilibrio; Assordato: udito) sono valori a parte, come quelli degli oggetti.
  - `limitiStati` e `avvisiStati` leggono `azioni` e `limiti` dai dati. Più Stati si sommano.
- **Utility**:
  - «Attacca!», a distanza e corpo a corpo, avvisa con Stordito o Svenuto (nessuna Azione Principale) e con Terrorizzato (solo azioni difensive).
  - Con Accecato, «Attacca!» blocca Tiro Mirato e Colpo Mirato.
  - «Lancia!» avvisa per gli stessi Stati.
- **SD**: nel riquadro «Condizioni attive» ci sono anche le righe d'uso degli Stati. Corretto anche un difetto: gli effetti degli oggetti che non toccano i VA (AR, Contromisure) non compaiono più lì come «a undefined».
- **Restano testo**:
  - Avvelenato: le penalità le dà il veleno.
  - Sanguinamento: perdita di PV (§5.15), nessun VA.
  - Stordito e Svenuto hanno solo Movimento e Azioni, già calcolati; restano testo le Difese che consumano Azioni, «cade A Terra» (A Terra si attiva a parte) e la perdita della Concentrazione.
  - Accecato: «fallisce le azioni puramente visive» e il +4 dei nemici non percepiti.
  - Assordato: il fallimento automatico delle azioni solo uditive.
