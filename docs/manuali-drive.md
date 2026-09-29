# Manuali di SIMPLY RPG su Google Drive — registro e procedura di controllo

Dal 26 settembre 2026 i manuali vivono come Google Doc nella cartella Drive di Davide (proprietario `davpoli1972@gmail.com`). I PDF in `Manuali/` sono le edizioni di partenza (Giocatore 0.43, Magia 1.1, Armamenti 0.50) e restano come riferimento storico; **la fonte corrente sono i Google Doc**.

## Registro

Ultimo controllo: **28 settembre 2026**, 13:30 UTC (tutti i manuali e «per-davide.md» cambiati; esame in `docs/diff-manuali-2026-09-28.md`) (cambiati Giocatore e Armamenti; la prima esecuzione, del 27/09, ha il confronto con i PDF in `docs/diff-manuali-2026-09-26.md`).

| Documento | ID Google Doc | Ultima modifica vista (UTC) | Edizione vista | Testo salvato | Note |
|---|---|---|---|---|---|
| Manuale del Giocatore | `110LNyYLZFWRGYuym836EqKYOUvoQRYvqBzm_2bJqybc` | 2026-09-27T16:38:22Z | 0.43 + risposte 26–27/09 (A.1, A.3, A.4, A.5–A.5.31, A.6 §8.1.2) e 25/09 (Esploratore); 16:38: Addestramenti a 76 punti (basi 2–4, schema 8×4, 12×3, 4×2) e 10 Punti Abilità Liberi per assegnazione (§1.x, §2.0, §2.3–2.8, §2.13, §2.17, §4, §8.1, §8.4) | `docs/manuali-txt/giocatore.md` | esaminato: `addestramenti.json`, `regole.json` (addestramento, creazione, eventi); modifiche non annunciate (per-davide A.32, A.52) **28/09 13:20–13:37 UTC: nuova versione, testo salvato (13:37: «minimo 1» anche nel §3.8, solo testo). 29/09: recepite le 19 risposte E&L (decisioni 44–61); restano ▢ M1–M4 e M7 di `docs/ricognizione-2026-09-28.md` (conguaglio, Movimento Tattico e Fluido, Movimento Evasivo, Carica oltre 12 Q). Data vista non aggiornata finché non sono applicate.** |
| Manuale della Magia | `1F5npdIujLUEVcHVX6CvF5jOHNMG5LS7dx0tgklDpzAY` | 2026-09-27T02:06:14Z | 1.1 + risposte 26/09 (A.2: 14 schede, sez. 1–2), 25/09 (minimo 1) e 18 Talenti nuovi del 27/09 | `docs/manuali-txt/magia.md` | esaminato: 32 Talenti in `talenti_liberi.json`; i 18 nuovi non sono annunciati (per-davide A.32) **28/09 13:21 UTC: nuova versione, testo salvato. 29/09: recepiti bonus di SAG al danno, Colpo Elementale, Rigenerazione, Anticipazione, contenitori (E&L 1, 2, 12, 17, 18); restano ▢ M5–M6 (riserve integrate A.18, prelievo dal Bianco A.20). Data vista non aggiornata finché non sono applicate.** |
| Manuale degli Armamenti | `1eDZJHfgBIYPvzKg78tEGwiLtrI_6gzpQOIfJA9aYiYg` | 2026-09-29T13:01:49Z | 0.53 (stesso Doc; la 0.50 era `1scH7QwtQYNb4D22vGJsUhGgPglwbFhZXf4ZGXPGhW3Y`): nuovo §7.23 Catalogo dei rinforzi, §7.11.2 vi rimanda | `docs/manuali-txt/armamenti.md` | esaminato: §7.23 in `rinforzi.json` (22 voci); §7.22, §7.21 nel catalogo; proprietà delle armature in effetti (`docs/proprieta-armature.md`) **28/09: 0.53 del 13:20 e 0.54 del 16:59 (KEP 808, Colt Hammershot: ▢ M9), testo salvato il 29/09; recepite E&L 16 e 19 (pistole corporative, ricarica). **29/09 sera: M9 applicato (KEP 808, Colt Hammershot, cella KEP 808; `tools/lotti/lotto_armamenti_054.mjs`); il testo del 29/09 13:01 è identico a quello salvato.** |
| Manuale dell'Equipaggiamento | `1bvTeJphQ6BNKazpV5twivvRbqkHrRowNBDZ_RakQiXA` | 2026-09-29T13:02:32Z | 0.1, solo cap. 1 | `docs/manuali-txt/equipaggiamento.md` | §1.6 e §1.7 in `regole.json`; cap. 2–8 "verranno integrati successivamente" **Edizione 0.3 (28/09 13:37 UTC): capitoli 2, 3, 4 e 6 nuovi, testo salvato; recepiti Binocolo e Registratore audiovisivo (§§4.2–4.3, E&L 15). I capitoli si estraggono a lotti (`docs/ricognizione-2026-09-28.md`). **29/09 sera: lotti dei capitoli 2, 3, 4 e 6 fatti (`tools/lotti/lotto_equipaggiamento_03.mjs`, `docs/equipaggiamento-lotti.md`); il testo del 29/09 13:02 è identico a quello salvato.** |
| per-davide.md (domande a Davide, fonte unica: `docs/protocollo-davide.md`) | `1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A` | 2026-09-29T17:18:36Z | 29/09 sera: incollato il pacchetto della sessione (A.34 a 16 voci, sezioni 5 e 6, istruzioni); nessuna risposta nuova | `docs/per-davide.md` | verificato il 29/09 contro il pacchetto: tutto applicato; nuovo pacchetto (19 risposte E&L) nel riepilogo della sessione del 29/09 |
| E&L – Risposte e correzioni approvate | `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs` | 2026-09-29T17:02:33Z (ripristinato dopo la versione delle 13:45, che conteneva per errore il testo di «per-davide.md»; contenuto uguale a quello delle 11:10, nessuna risposta nuova) | A.1–A.6 (A.5.27 rivista) + «Risposte ai 19 quesiti dell’app» (29/09) | `docs/risposte-master-2026-09-26.md` | registrate in `docs/risposte-master.md` (7–23); dotazioni nel passo «Equipaggiamento iniziale»; le 19 risposte in `docs/risposte-master.md` (44–61), ricognizione in `docs/ricognizione-2026-09-28.md` |

Link: `https://docs.google.com/document/d/<ID>/edit`

La colonna "Ultima modifica vista" è la data di modifica del Doc (`modifiedTime`) all'ultimo controllo. **Si aggiorna solo dopo aver esaminato le differenze e aggiornato dati e documenti.**

## Procedura di controllo (all'inizio di ogni sessione, o su richiesta)

1. Per ognuno dei sei Doc del registro (quattro manuali, E&L e per-davide.md) leggere `modifiedTime` e confrontarlo con il registro.
2. Se sono tutti uguali: "manuali e risposte invariati", fine.
3. Se diverso:
   a. leggere il Doc e salvarne il testo in `docs/manuali-txt/<manuale>.md` (una copia per manuale, sovrascritta; la precedente resta in Git);
   b. `git diff` sul file per vedere esattamente cosa è cambiato, paragrafo per paragrafo;
   c. classificare ogni differenza: **regola** (tocca calcolo o dati → JSON da aggiornare), **testo** (descrizioni, Talenti, schede → JSON da aggiornare, solo testo), **cosmetica** (nessuna azione);
   d. aggiornare i JSON interessati, con `versione_manuale` = titolo + data di modifica del Doc;
   e. registrare in `docs/risposte-master.md` le decisioni che chiudono domande del Doc «per-davide.md», e preparare il pacchetto per spostarle in «Risolte» (`docs/protocollo-davide.md` §5);
   f. aggiornare il registro qui sopra;
   g. riepilogo: manuale, paragrafi cambiati, cosa è stato applicato, cosa resta da decidere.
   Per il Doc «per-davide.md» il testo (export Markdown) va in `docs/per-davide.md`, sovrascritto; le risposte nuove sono in coda, nella sezione 7.
   Per il Doc E&L il testo va in `docs/risposte-master-2026-09-26.md` (intestazione di una riga, poi il testo del Doc) e ogni voce nuova diventa una decisione datata in `docs/risposte-master.md`.
4. Come si scarica il testo: strumento Drive `download_file_content` con `exportMimeType: "text/markdown"`. Il risultato è JSON con il testo in base64 nel campo `content`. Per i manuali grandi lo strumento lo salva da solo in un file di `tool-results` della sessione: si decodifica da lì con uno script, senza ricopiarlo a mano. Per un confronto con un PDF c'è `tools/confronta_doc_pdf.py`.
5. Le tabelle dei Doc sono strutturate: per i cataloghi, l'estrazione può passare dal Doc (export HTML/DOCX) invece che da pdfplumber sul PDF. Da valutare quando arriva il primo catalogo modificato.

## Regole

- Mai modificare i Doc di Davide. Le proposte di modifica seguono `docs/protocollo-davide.md`.
- Il registro e `docs/manuali-txt/` si committano insieme alle modifiche ai dati che ne derivano, così ogni commit dice "questa versione dei dati corrisponde a questa versione dei manuali".
- Se un Doc non è leggibile (permessi, link cambiato), segnalarlo subito senza inventare: l'ultimo testo valido è in `docs/manuali-txt/`.
