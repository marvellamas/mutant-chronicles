# Aggiornare Mutant e ripristinare un salvataggio

Procedura unica, dal 12 ottobre 2026. Nasce dalla serata in cui le cartelle di Davide sono risultate vuote dopo
un aggiornamento: la causa e le prove sono in `docs/diagnosi-dati-spariti-2026-10-12.md`.

La guida per Davide, in parole semplici, è in `distribuzione/LEGGIMI.txt` (sezioni «AGGIORNARE L'APP», «SE DOPO
UN AGGIORNAMENTO LE CARTELLE SEMBRANO VUOTE», «RIPRISTINARE UN SALVATAGGIO»). Qui c'è il quadro tecnico.

## Due installazioni, due modi di aggiornare

Dal 25/10/2026 («un ingresso solo», `docs/come-si-usa-mutant.md`) **per tutti e due si aggiorna dalla voce 2 del
menu di `Mutant.bat`**; cambia solo che cosa succede dietro.

| | Com'è fatta | Che cosa fa la voce 2 |
|---|---|---|
| **Pacchetto zip** (Davide) | `<cartella>\1_scarica_o_aggiorna_app.bat`, `LEGGIMI.txt`, `aggiorna-da-zip.ps1` e, accanto, la cartella `mutant\` con l'app | `aggiorna.bat` vede che non c'è Git e chiama `..\1_scarica_o_aggiorna_app.bat`, poi rimette al passo i file di fuori |
| **Copia con Git** (Marcello) | un `git clone` del repository | `aggiorna.bat`: mostra il branch, si ferma se ci sono modifiche non salvate, poi `git pull --ff-only` |

In tutti e due i casi si annota la versione prima e alla fine si dice in chiaro che cosa è cambiato
(`tools/esito-aggiornamento.mjs`): «Aggiornato: prima eri alla versione del 22/10, ora sei a quella del 25/10
(Talenti nuovi).», «l'app resta alla versione …; sono cambiati solo i programmi di servizio», oppure «Era gia'
aggiornato». Nessun passo dell'aggiornamento apre finestre: Esplora risorse lo apre solo la voce 5, se la si sceglie.

`1_scarica_o_aggiorna_app.bat` resta come **programma d'installazione** per un PC nuovo (e lo usa la voce 2).
I file del pacchetto che stanno **fuori** da `mutant\` li rimette al passo `tools/aggiorna-avviatori.mjs`
(dal 12/10), con il nome del file in uso in `--salta=` (un file non si può sostituire mentre gira); della copia di
prima resta un `.precedente`. Dal 25/10 toglie anche i programmi che non si usano più (`OBSOLETI`:
`2_installa_node.bat`, `3_avvia.bat`, `4_controlla_personaggi.bat`, `5_passa_ai_talenti_nuovi.bat`), solo se
accanto c'è il pacchetto.

## I tre passi di ogni aggiornamento

Valgono per tutti e due i modi (`tools/dati-locali.mjs`; l'elenco delle cartelle è in `tools/file-locali.json`,
non nel codice).

1. **Prima.** Si contano i file delle cartelle di `controllo_svuotamento` (i `LEGGIMI.txt` non contano) e si fa
   una copia zip di tutte le cartelle locali in `backup-prima-aggiornamento/locali_<data>.zip`, tenendo le
   ultime `backup_da_tenere` (5). Lo stato va in `backup-prima-aggiornamento/.stato-prima.json`, scritto sia da
   Node sia da PowerShell, nello stesso formato. **Se la copia non riesce, non si aggiorna niente.**
2. **L'aggiornamento.** `git pull --ff-only`, oppure la copia dei file dello zip
   (`distribuzione/aggiorna-da-zip.ps1`).
3. **Dopo.** Si riconta. Se una cartella che aveva file ora è vuota o non c'è più, l'aggiornamento **si ferma**,
   scrive quale e quanti file aveva, e propone di rimettere la copia del passo 1 (`dati-locali.mjs rimetti`,
   che riscrive solo i file mancanti e non sovrascrive mai niente).

Da riga di comando:

```bash
node tools/dati-locali.mjs prima
node tools/dati-locali.mjs dopo      # esce 1 se una cartella si è svuotata
node tools/dati-locali.mjs rimetti
```

`aggiorna.bat` tiene il `git pull` e tutto il resto su **una riga sola**: il file si sostituisce mentre gira e
cmd lo legge per posizione. I sottoprogrammi (`:prima`, `:dopo`, `:dati_mancanti`) cmd li ritrova per nome anche
nel file nuovo. **Non spezzare quella riga.**

## Se le cartelle sembrano vuote

All'accensione, con `personaggi/` vuota, lo dicono tutti e tre i posti, **con il percorso della cartella in
uso**: la finestra nera del server (`server.mjs`), la console sopra il menu (`tools/console.mjs` →
`righeCartellaVuota`) e la plancia del Tavolo (`/api/avvio` → `src/ui/cartella-vuota.js`).

> Non trovo personaggi in questa cartella: `C:\…\mutant\personaggi`. Ci sono salvataggi del 11/10/2026 21:40:
> vuoi ripristinarne uno?

Il percorso è la cosa importante: se non è quello che ci si aspetta, ci sono due copie dell'app e se ne è
aggiornata una mentre se ne apre un'altra.

## «Ripristina un salvataggio» (voce 4 della console)

L'elenco guarda in **quattro** posti (`postiSalvataggi` in `tools/ripristina.mjs`):

| Posto | Che cosa c'è |
|---|---|
| `salvataggi/` | `sessione_…` di «Salva sessione» e «Spegni Mutant»; `prima-del-ripristino_…` |
| `backup-prima-aggiornamento/` | `locali_…`, le copie fatte prima di ogni aggiornamento |
| `autosave/` | `autosave.zip` e `autosave-precedente.zip` |
| cartella di Google Drive | le copie mandate fuori dal PC (`config-salvataggi.json` → `cartella_drive`) |

Ogni riga dice data e ora, nome, tipo, dove sta, dimensione e **che cosa contiene** («2 personaggi · 1 scontro ·
2 mappe»). Il contenuto si legge dall'indice in coda allo zip (`nomiNelloZip`), senza decomprimere: con trenta
salvataggi grandi l'elenco resta immediato.

Si sceglie il numero: **non per forza l'ultimo**. Prima di rimettere qualunque cosa si fa comunque una copia
dello stato attuale in `salvataggi/prima-del-ripristino_<data>.zip`, da cui si torna indietro con la stessa
voce. Il server dev'essere spento (i tablet aperti riscriverebbero i dati vecchi): la console si offre di
spegnerlo con «Spegni Mutant».

Le copie fatte prima di un aggiornamento le scrive `Compress-Archive` di PowerShell, con le barre rovesciate nei
nomi: il ripristino le accetta. Contengono anche `musica/`, `avvisi/` e `config-salvataggi.json`, che **non** si
rimettono: il ripristino tocca solo le cartelle di gioco, e la conferma lo dice.

## Cartelle che non si cancellano mai

`tools/file-locali.json`, campo `cartelle`: `personaggi`, `tavolo`, `scontri`, `nemici`, `veicoli`, `scene`,
`mappe`, `musica`, `galleria`, `autosave`, `salvataggi`, `backup-master`, `avvisi`, `node_modules`,
`backup-prima-aggiornamento`; campo `file`: `config-salvataggi.json`, `.versione`.

**Aggiungendo una cartella di dati al server va aggiunta qui**, in `cartelle` e in `controllo_svuotamento`, e in
`.gitignore`. Il test `tests/dati-spariti.test.js` lo controlla: ogni cartella ignorata da git dev'essere nei
due elenchi (il trattino di `backup-master` sfuggiva al controllo di prima, e la cartella veniva cancellata).
