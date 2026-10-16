# Manuale dei Mostri v0.13 — ricognizione delle regole operative (16 ottobre 2026, sera)

Versione usata: **SIMPLY RPG — Manuale dei Mostri v0.13**, Doc `11Uxmz9GM2vU2knngtIPk_80532ABlHC3xL8ZvAXX7rE`,
modificato il 16/10 13:47. Lo stesso Doc era 0.9 la mattina del 16/10 (75 creature); la 0.13 ne ha **115**.
Testo salvato in `docs/manuali-txt/mostri.md`.

Controllo d'inizio sessione: cambiati solo il Manuale dei Mostri (0.9 → 0.13) e «per-davide.md» (16/10 14:51,
solo i riassunti della sezione 1 aggiornati con «implementato il 16/10»; nessuna risposta nuova). Giocatore
0.48, Magia 1.5, Armamenti 0.64, Equipaggiamento 0.8 ed E&L invariati.

## Regole operative: coerenti con l'app

Le regole comuni (cap. 4) e le «Regole operative del catalogo» (cap. 8) rimandano alle regole già nell'app e
non chiedono automazioni nuove. Verificate coerenti con le risposte già applicate:

- **§4.2 Punti Vita, Ferite e Menomazioni** → coincide con **A.164/A.159**: oltre Grave si entra in Morente,
  contatore pari alla COS intera all'ingresso, **primo decremento dopo un Round completo**, Ferite eccedenti
  dell'ingresso che non abbreviano, ogni nuova Ferita successiva −1, a 0 la morte, stabilizzazione che
  riporta a Grave. 0 PV da soli non portano a Morente. Tutto già applicato (prompt 93).
- **§4.3 Punti Magia** → coincide con il formato: **PM 0** riserva esaurita, **PM —** riserva inesistente
  (nel nostro formato `pm` assente = nessuna riserva). Nessun cambiamento.
- **§4.4 Danno, Armatura, Stati** → ordine del colpo, AR non divisa in zone, Contromisure a soglia,
  immunità specifiche: già così (§5.24, A.73). Nessun cambiamento.
- **§4.5 Movimento, spazio e sensi** → coincide con **A.126/A.133**: «lo spazio occupato non conferisce da
  solo bonus per colpire, portata aggiuntiva o immunità alle prese». Già applicato (prompt 90).
- **§4.6 Abilità non riportate** → il Direttore definisce la competenza plausibile, l'app non usa le Difese
  come valore universale: coincide con **A.116**. Nessun cambiamento.
- **§8 Regole operative del catalogo** (Azioni e Difese, Volo alato, Movimento misto, Picchiata, Tiri a
  distanza, Capacità innate, Negare Potere, Anatomia) → tutte rimandi a regole esistenti (Giocatore §5.2,
  §5.3, §5.6, §5.24; Magia §13–14). Promemoria per il master, nessuna automazione.
- **§5.2** → **A.160**: 7 punti Abilità liberi, già applicato (prompt 93); verificato nei test.
- **§3.1** → **A.164**: «un dato assente non vale 0» (COS mancante), già applicato.

## Novità applicata in questo lotto

- **GS e PX** delle schede (A.161, risposta ricevuta il 16/10, da applicare col calcolatore nel prossimo
  lotto): aggiunto il campo `gs_px` al formato dei nemici (`{ gs, px, per_pg }`), **informativo**. La
  mini-scheda lo mostra («GS Principiante · 10 PX per 4 PG»); l'app **non calcola PX** e **non unifica** la
  scala GS (Principiante…Leggenda) ai gradi del bestiario proposto (Minore…Molto potente, su 7 PG). Il
  calcolatore «PX della partita» resta la A.161, prossimo lotto.

## Contraddizioni con regole già approvate

Nessuna contraddizione trovata fra le regole operative del Manuale dei Mostri 0.13 e le decisioni già
approvate. Le due scale di difficoltà (GS/PX del manuale e i gradi del bestiario proposto) **restano
distinte** per scelta (A.161 ancora aperta sull'unificazione): non è una contraddizione, è il
«Nel frattempo» già concordato.

## Che cosa resta (creature del catalogo)

Fatte (`docs/lotto-mostri-2026-10-16.md`): le 9 caste della Covata + il Lorath (cap. 7) e il blocco «Bestie e
predatori» del cap. 8 (10 creature). Restano gli altri blocchi del cap. 8 (circa 95 creature: la prima parte
senza nome, «Bande e grandi avversari», «Non morti», «Costrutti ed elementali», «Giganti», ecc.), da fare a
blocchi nei prossimi lotti.
