# I manuali del 11–12/11/2026, scaricati per la ricognizione del lotto 190

Questa cartella è il **promemoria riproducibile** della ricognizione, non una copia dei manuali. I testi estratti
non stanno nel repo: il lotto 190 era una ricognizione e non doveva recepire niente, e `docs/manuali-txt/` tiene
per protocollo **un solo testo corrente per manuale** — quello del registro `tools/manuali.json`. Metterci dentro
anche le edizioni non recepite vorrebbe dire due file per manuale, che è esattamente ciò che la regola 1 vieta.

Il lotto che recepirà riscarica da Drive e salva in `docs/manuali-txt/` con la versione nel nome, aggiornando il
registro. Qui c'è tutto quello che gli serve per farlo e per verificare di aver preso gli stessi file.

Esito della ricognizione: **`docs/ricognizione-manuali-2026-11-12-lotto190.md`**.

## Che cosa c'era su Drive il 12/11/2026

Cartella di lavoro `1p4jh2tKIN9kRimD4ifzth_YjWUZTH6-6`. **Nessun ID è cambiato** rispetto a `tools/manuali.json`.

| Manuale | ID di Drive | Versione | Modificato | File su Drive |
| --- | --- | --- | --- | --- |
| Giocatore | `110LNyYLZFWRGYuym836EqKYOUvoQRYvqBzm_2bJqybc` | 0.62 | 12/11 00:47 | 306 KB |
| Magia | `1F5npdIujLUEVcHVX6CvF5jOHNMG5LS7dx0tgklDpzAY` | 1.17 | 11/11 18:40 | 377 KB |
| Armamenti | `1eDZJHfgBIYPvzKg78tEGwiLtrI_6gzpQOIfJA9aYiYg` | 0.83 | 11/11 19:59 | 15,5 MB |
| Equipaggiamento | `1bvTeJphQ6BNKazpV5twivvRbqkHrRowNBDZ_RakQiXA` | 0.41 | 11/11 18:43 | 1,8 MB |
| Veicoli | `1lo_c3KLK7kntJwv195v5aD2ieuMfRuaThsDhPJCX3T4` | **0.17 nel nome, 0.18 nella prima pagina** | 12/11 13:54 | 4,9 MB |
| Mostri (.docx) | `1qScWOJpDjNSw7j5rNUlHGTKPbsUiEgvG` | 0.66 | 12/11 12:34 | 1,0 MB |
| Direttore (.docx) | `1lfwR5Z9pIqfoASAuNt1Ia01sOj8OOb-5` | 0.49 | 12/11 00:50 | 36 KB |
| **PNG Abilità (.json)** | `1KSjdcssH0t1FqyC8KZrdrpmnS7egkKVr` | 0.66 | 12/11 12:34 | 1,6 MB |
| per-davide.md | `1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A` | — | 11/11 10:50 | 151 KB |
| E&L | `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs` | — | 12/11 13:51 | 119 KB |

La cartella «ARCHIVIO — Manuali superati» (`1tVAzASERKxCEZPCrAf-LFHiYLqhey9Rc`) conteneva il solo «ARCHIVIO —
Manuale dei Mostri 0.23 — SUPERATO».

## Come si rifà l'estrazione

1. **Google Doc** (Giocatore, Magia, Armamenti, Equipaggiamento, Veicoli): scaricare con
   `exportMimeType: "text/markdown"`. L'esportazione **incolla le immagini** come definizioni in coda
   (`[image1]: <data:image/png;base64,…>`): vanno tolte, contate, e i richiami `![][imageN]` vanno lasciati nel
   testo, così si vede dove stava l'immagine. Sull'Armamenti sono 762 KB di base64 su 1,2 MB.
2. **Word** (Mostri, Direttore): `node tools/estrai-docx.mjs <file-o-json-di-drive> <uscita.md>`. Il Mostri da
   1 MB impiega 0,13 s. Non serve adattare niente.
3. **Veicoli**: si salva come `veicoli-0.18.md`, **dal numero della prima pagina**, non dal titolo del file —
   finché Davide non riallinea i due (regola 3).

## Le impronte di quello che ho letto

`sha256`, primi 16 caratteri, sui testi estratti con il procedimento qui sopra. Servono a sapere se il lotto che
recepisce sta guardando gli stessi file o versioni già cambiate.

| File estratto | Byte | sha256 (16) |
| --- | --: | --- |
| `giocatore-0.62.md` | 547.079 | `271c5dcba1b7d172` |
| `magia-1.17.md` | 573.835 | `dbf8b3e8a8b33e67` |
| `armamenti-0.83.md` | 462.644 | `78f2369f87dfcfc4` |
| `equipaggiamento-0.41.md` | 234.213 | `f65aa75e7dc15463` |
| `veicoli-0.18.md` | 104.916 | `d1b5a0ba6e0c09f9` |
| `mostri-0.66.md` | 2.053.136 | `f73191e792dbec3c` |
| `png-abilita-0.66.json` | 1.613.146 | `0fd515f909ecb145` |
| `per-davide.txt` | 358.906 | `c7be67659a605895` |
| `e-l.txt` | 337.347 | `98f90fbe03b3d8da` |

**Il Direttore 0.49** l'ho letto con la rappresentazione testuale di Drive invece che con `estrai-docx.mjs`, per
non far passare 48 KB di base64 dentro la conversazione: è completo (finisce con il piè di pagina «DIRETTORE 1»),
ma non ha l'impronta delle altre. Chi lo recepisce lo riestragga con `estrai-docx.mjs`, che è la forma canonica.

## Che cosa ne è stato (lotto 191, 12/11/2026)

Il lotto 191 ha riscaricato tutti e sette e riconfrontato le impronte: **cinque coincidono** (Giocatore, Magia,
Armamenti, Equipaggiamento, Mostri), il **Direttore** è stato riestratto con `estrai-docx.mjs` come questo file
chiedeva — `526ace0ead74a2ca`, 21.356 byte, stesso documento verificato sul contenuto — e i **Veicoli sono
cambiati**: alle 14:12 del 12/11 Davide ha ripubblicato il manuale, rinominandolo «v0.18» (quindi la regola 3 è
tornata rispettata e il numero non è più da indovinare) e cambiando indice e figure, non regole.

I sei coincidenti sono stati recepiti in `docs/manuali-txt/` con la versione nel nome; i Veicoli no, perché il
testo non è più quello su cui sono scritte le conclusioni del 190. Il perché, e tutto il resto, in
`docs/diff-lotto191-2026-11-12.md`. L'estrazione delle immagini, che qui era descritta a parole, è ora uno
strumento: `tools/estrai-doc-markdown.mjs`.

## L'impronta che ci dà Davide

Il JSON dichiara `sha256_manuale_mostri: "d7bd1fb11314dbc123978212d0d5c9ee7065e6447d4779eb80a812a11251169a"`.
Ho ricalcolato lo sha256 del `.docx` scaricato: **coincide**. È la regola 4 del nostro protocollo applicata da
Davide, e va usata: chi importa il JSON controlla che l'impronta corrisponda al Manuale dei Mostri che ha in mano,
e si ferma se non corrisponde.
