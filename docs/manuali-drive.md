# Manuali di SIMPLY RPG su Google Drive — registro e procedura di controllo

Dal 26 settembre 2026 i manuali vivono come Google Doc nella cartella Drive di Davide (proprietario `davpoli1972@gmail.com`). I PDF in `Manuali/` sono le edizioni di partenza (Giocatore 0.43, Magia 1.1, Armamenti 0.50) e restano come riferimento storico; **la fonte corrente sono i Google Doc**.

## Registro

Ultimo controllo: **26 settembre 2026, sera** (prima esecuzione; confronto con i PDF in `docs/diff-manuali-2026-09-26.md`).

| Documento | ID Google Doc | Ultima modifica vista (UTC) | Edizione vista | Testo salvato | Note |
|---|---|---|---|---|---|
| Manuale del Giocatore | `110LNyYLZFWRGYuym836EqKYOUvoQRYvqBzm_2bJqybc` | 2026-09-26T16:18:37Z | 0.43 + risposte 26/09 (A.1, A.3, A.4, A.5, A.5.1, A.5.2) e 25/09 (Esploratore) | `docs/manuali-txt/giocatore.md` | esaminato: coincide con i dati, tranne §2.16.1–§2.16.2 (dotazioni iniziali, approvate), che aspettano il passo guidato |
| Manuale della Magia | `1F5npdIujLUEVcHVX6CvF5jOHNMG5LS7dx0tgklDpzAY` | 2026-09-26T13:26:03Z | 1.1 + risposte 26/09 (A.2: 14 schede, sez. 1–2) e 25/09 (minimo 1) | `docs/manuali-txt/magia.md` | esaminato: coincide con i dati |
| Manuale degli Armamenti | `1scH7QwtQYNb4D22vGJsUhGgPglwbFhZXf4ZGXPGhW3Y` | 2026-09-26T09:32:57Z | 0.50 | `docs/manuali-txt/armamenti.md` | esaminato: nessuna differenza di sostanza dal PDF |
| Manuale dell'Equipaggiamento | `1bvTeJphQ6BNKazpV5twivvRbqkHrRowNBDZ_RakQiXA` | 2026-09-26T09:33:06Z | 0.1, solo cap. 1 | `docs/manuali-txt/equipaggiamento.md` | §1.6 e §1.7 in `regole.json`; cap. 2–8 "verranno integrati successivamente" |
| E&L – Risposte e correzioni approvate | `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs` | 2026-09-26T16:19:45Z | A.1–A.5.2 | `docs/risposte-master-2026-09-26.md` | registrate in `docs/risposte-master.md` (7–14); A.5.1–A.5.2 non ancora nell'app |

Link: `https://docs.google.com/document/d/<ID>/edit`

La colonna "Ultima modifica vista" è la data di modifica del Doc (`modifiedTime`) all'ultimo controllo. **Si aggiorna solo dopo aver esaminato le differenze e aggiornato dati e documenti.**

## Procedura di controllo (all'inizio di ogni sessione, o su richiesta)

1. Per ognuno dei cinque Doc del registro (quattro manuali ed E&L) leggere `modifiedTime` e confrontarlo con il registro.
2. Se sono tutti uguali: "manuali e risposte invariati", fine.
3. Se diverso:
   a. leggere il Doc e salvarne il testo in `docs/manuali-txt/<manuale>.md` (una copia per manuale, sovrascritta; la precedente resta in Git);
   b. `git diff` sul file per vedere esattamente cosa è cambiato, paragrafo per paragrafo;
   c. classificare ogni differenza: **regola** (tocca calcolo o dati → JSON da aggiornare), **testo** (descrizioni, Talenti, schede → JSON da aggiornare, solo testo), **cosmetica** (nessuna azione);
   d. aggiornare i JSON interessati, con `versione_manuale` = titolo + data di modifica del Doc;
   e. registrare in `docs/risposte-master.md` le decisioni che chiudono domande di `docs/per-davide.md`, e toglierle da lì;
   f. aggiornare il registro qui sopra;
   g. riepilogo: manuale, paragrafi cambiati, cosa è stato applicato, cosa resta da decidere.
   Per il Doc E&L il testo va in `docs/risposte-master-2026-09-26.md` (intestazione di una riga, poi il testo del Doc) e ogni voce nuova diventa una decisione datata in `docs/risposte-master.md`.
4. Come si scarica il testo: strumento Drive `download_file_content` con `exportMimeType: "text/markdown"`. Il risultato è JSON con il testo in base64 nel campo `content`. Per i manuali grandi lo strumento lo salva da solo in un file di `tool-results` della sessione: si decodifica da lì con uno script, senza ricopiarlo a mano. Per un confronto con un PDF c'è `tools/confronta_doc_pdf.py`.
5. Le tabelle dei Doc sono strutturate: per i cataloghi, l'estrazione può passare dal Doc (export HTML/DOCX) invece che da pdfplumber sul PDF. Da valutare quando arriva il primo catalogo modificato.

## Regole

- Mai modificare i Doc di Davide. Le proposte di modifica seguono `docs/protocollo-davide.md`.
- Il registro e `docs/manuali-txt/` si committano insieme alle modifiche ai dati che ne derivano, così ogni commit dice "questa versione dei dati corrisponde a questa versione dei manuali".
- Se un Doc non è leggibile (permessi, link cambiato), segnalarlo subito senza inventare: l'ultimo testo valido è in `docs/manuali-txt/`.
