# Censimento dei Talenti: effetti numerici nei valori effettivi

30 settembre 2026. Fonti: `data/talenti_liberi.json` (Giocatore §8.6, Magia sez. 1) e `data/classi.json` (Talenti fissi e a scelta delle 25 Classi, Giocatore cap. 3). Non ci sono Talenti di Corporazione nei dati: le Corporazioni danno solo +1 alle Abilità e alle Salvezze (già nel calcolo). Metodo come in `docs/proprieta-armature.md`: ogni Talento con il suo testo, la classificazione e, dove il testo dà un numero sui valori del personaggio, gli effetti nello schema degli oggetti (`docs/effetti-oggetti.md`). Generato da `tools/effetti_talenti.py --doc` (la stessa tabella scrive i dati con `--dati`).

## Metodo

Un Talento è **applicato** solo se un test mostra che il risultato cambia con e senza il Talento. Non basta che il Talento abbia una chiave in `effetti`: una chiave con il solo `promemoria` mostra la prima frase del Talento, non applica un valore (è così che sei Talenti di lancio risultavano «già gestiti» senza esserlo, corretto il 30/09/2026). La prova:
- per i Talenti con effetti letti dal motore (`effetti.attacco_distanza`, `attacco_ravvicinato`, `lancio`, `iniziativa`, `pv`, `magia`…) o applicati per nome, un caso con e senza il Talento in `tests/talenti-gestiti.test.js` o `tests/talenti-lancio.test.js`: lo script cerca il nome del Talento in quei file e si ferma se un Talento applicato non c’è;
- per gli effetti tipizzati di `effetti.valori` (schema degli oggetti, motore comune in `src/talenti.js` e `src/condizioni.js`), i test per tipo e ambito (`tests/talenti.test.js`, `tests/talenti-lancio.test.js`, `tests/talenti-gestiti.test.js`); la frase del manuale di ciascuno è controllata da `tools/verifica_frasi.mjs`.

Esiti (colonna «Esito»):
- **applicato**: il numero entra dove indicato (VA delle Abilità, VA per colpire, danno, Difese, Salvezze, Iniziativa, Movimento, Azioni, AR, manovre e modalità di «Attacca!», «Lancia!», rapporti del Chroma, sintonizzazione). Per gli effetti tipizzati l’ambito: **generale** (sempre), **situazionale** (interruttore al tavolo, con la frase in `condizione`), **uso_specifico** (valore a parte per un tipo di Prova).
- **promemoria**: l’app mostra il numero del Talento accanto alla regola (fra parentesi o nella riga), senza cambiare un valore.
- **testuale**: nessun numero sui valori del personaggio (regola, bonus momentaneo, per gli alleati, penalità dell’avversario) o un numero che l’app non può applicare (motivo indicato). In «Attacca!» e «Lancia!» i Talenti pertinenti compaiono in una riga «Talenti: Nome — prima frase».
- **rimandato**: il manuale non definisce il valore o è ambiguo: `TODO(Davide)` nella voce.

## Conteggi

**319 Talenti** (119 Liberi, 200 di Classe).

| Esito | Talenti |
|---|---|
| applicato | 156 |
| promemoria | 4 |
| testuale | 158 |
| rimandato | 1 |

Fra gli applicati, con effetti tipizzati: generale 5, situazionale 10, uso_specifico 56 (un Talento con più ambiti conta in ciascuno).

Talenti con effetti tipizzati nuovi: **70**, per **106 effetti** (`effetti.valori`).

## Tipi dello schema

Nuovi o estesi per i Talenti (anche in `docs/effetti-oggetti.md` e nel validatore):
- `salvezza` con ambito **generale** o **situazionale** (Scudo Spirituale): entra nella Prova Salvezza effettiva; `resistenza: true` per le Resistenze specifiche (§8.6: strutturale + Prova Salvezza Migliorata + Resistenza non oltre 18).
- `parata` (nuovo): `con: "scudo"`, `contro: "distanza"`, generale (Parata a Distanza: la penalità della Parata a distanza con lo scudo passa da −4 a −2).
- `danno` con `armi: "artefatto"` (Meccanica Potenziata: armi Mistiche o TecnoMistiche, cioè Artefatto).
- `caratteristica` e `va` con `{parametro}` e `{annotazione}`: la scelta del giocatore (Prova di Caratteristica Migliorata, Sport).

## Talenti

### Talenti Liberi

| Talento | Fonte | Esito | Dove o nota |
|---|---|---|---|
| Attivazione Tempestiva | Giocatore §8.6 | testuale | nessun valore numerico del personaggio |
| Ambidestro | Giocatore §8.6.1 | applicato | «Attacca!»: mano non dominante, a distanza e corpo a corpo |
| Iniziativa Migliorata | Giocatore §8.6.1 | applicato | Iniziativa |
| Sempre Allerta | Giocatore §8.6.1 | applicato | +3 VA a Percezione (solo per imboscate e pericoli improvvisi) |
| Sonno Leggero | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Buona Costituzione | Giocatore §8.6.1 | applicato | PV massimi |
| Struttura Robusta | Giocatore §8.6.1 | applicato | +3 alla PS di Tempra (solo per per evitare una Menomazione) |
| Duro a Morire | Giocatore §8.6.1 | applicato | +3 alla PS di Tempra (solo per a 0 PV, contro nuove Ferite) |
| Guarigione Migliorata | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Mulo da Soma | Giocatore §8.6.1 | applicato | +3 VA a Atletica (solo per sollevare e trasportare carichi); +3 alla PS di Tempra (solo per Affaticamento da trasporto di carichi) |
| Sport | Giocatore §8.6.1 | applicato | +3 VA a Atletica (solo per sport: {annotazione}) |
| Visione Perfetta | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Controllo del Fallimento | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Successo Magistrale Migliorato | Giocatore §8.6.1 | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Prova di Caratteristica Migliorata | Giocatore §8.6.2 | applicato | +3 alle Prove di Caratteristica ({parametro}) (solo per Prove dirette di Caratteristica) |
| Prova Salvezza Migliorata | Giocatore §8.6.2 | applicato | Prova Salvezza scelta |
| Resistenza ai Veleni | Giocatore §8.6.3 | applicato | +2 alla PS di Tempra (solo per contro l’avvelenamento) |
| Resistenza alle Malattie | Giocatore §8.6.3 | applicato | +2 alla PS di Tempra (solo per contro malattie e infezioni) |
| Resistenza all’Affaticamento | Giocatore §8.6.3 | applicato | +2 alla PS di Tempra (solo per contro l’Affaticamento) |
| Resistenza alla Paura | Giocatore §8.6.3 | applicato | +2 alla PS di Volontà (solo per contro paura e panico) |
| Resistenza al Controllo Mentale | Giocatore §8.6.3 | applicato | +2 alla PS di Volontà (solo per contro il controllo mentale) |
| Resistenza alla Corruzione | Giocatore §8.6.3 | applicato | +2 alla PS di Magia (solo per contro la Corruzione Oscura) |
| Mezzofondista | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Movimento Fluido | Giocatore §8.6.4 | applicato | «Attacca!» a distanza: penalità del proprio movimento |
| Scattante | Giocatore §8.6.4 | applicato | Movimento |
| Carica Migliorata | Giocatore §8.6.4 | applicato | «Attacca!» corpo a corpo: Carica |
| Imboscata Migliorata | Giocatore §8.6.4 | applicato | «Attacca!» corpo a corpo: Imboscata |
| Incalzare Migliorato | Giocatore §8.6.4 | applicato | «Attacca!» corpo a corpo: Manovre (incalzare) |
| Movimento Evasivo Migliorato | Giocatore §8.6.4 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Ritirata Migliorata | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Estrazione Rapida | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Cambio Rapido | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Imbracciatura Rapida | Giocatore §8.6.4 | applicato | «Attacca!» a distanza: Imbracciatura senza Azioni |
| Ricarica Rapida | Giocatore §8.6.4 | promemoria | nota della ricarica dell’arma: un’operazione di ricarica gratuita per Round |
| Ricarica Migliorata | Giocatore §8.6.4 | applicato | munizioni per operazione della ricarica (src/ricarica.js) |
| Pistolero | Giocatore §8.6.5 | applicato | «Attacca!»: Combattere con due armi, a distanza e corpo a corpo |
| Duellante | Giocatore §8.6.5 | applicato | «Attacca!»: Combattere con due armi, a distanza e corpo a corpo |
| Raffica Breve Migliorata | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Raffica Media Migliorata | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Raffica Lunga Migliorata | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Fuoco di Soppressione Migliorato | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Tiro Ravvicinato Istintivo | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: Tiro Ravvicinato |
| Tiro Ravvicinato Migliorato | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: Tiro Ravvicinato |
| Tiro a Bruciapelo Migliorato | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: Tiro a Bruciapelo (bersaglio consapevole) |
| Tiro Rapido Migliorato | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Tiro Mirato Migliorato | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: Tiro Mirato (VA e danno) |
| Tiro a Lunga Distanza | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: penalità di distanza |
| Mira Rapida | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: Azioni per la distanza |
| Fuoco di Precisione | Giocatore §8.6.5 | applicato | «Attacca!» a distanza: bersaglio impegnato (VA, seconda Prova) |
| Schermidore | Giocatore §8.6.6 | applicato | «Attacca!»: Combattere con due armi, a distanza e corpo a corpo |
| Affondo Migliorato | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (affondo) |
| Apertura Tattica | Giocatore §8.6.6 | testuale | nessun valore numerico del personaggio |
| Arti Marziali | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: attacco senz’armi |
| Arti Marziali Migliorate | Giocatore §8.6.6 | applicato | +1 VA a Difese (solo per contro attacchi ravvicinati, senz’armi) · «Attacca!» corpo a corpo: attacco senz’armi |
| Colpo di Opportunità Istintivo | Giocatore §8.6.6 | promemoria | «Attacca!» corpo a corpo: «due per Round contro avversari diversi» nella riga dell’Attacco di Opportunità |
| Colpo Mirato Migliorato | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (mirato) |
| Combattere alla Cieca | Giocatore §8.6.6 | applicato | riduce di 4 la penalità di Accecato (solo Prove fisiche) |
| Disarmare Migliorato | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (disarmare) |
| Immobilizzare Istintivo | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (immobilizzare) |
| Immobilizzare Migliorato | Giocatore §8.6.6 | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Sbilanciare Migliorato | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (sbilanciare) |
| Spazzata Migliorata | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (spazzata) |
| Stordire Migliorato | Giocatore §8.6.6 | applicato | «Attacca!» corpo a corpo: Manovre (stordire) |
| Copertura Migliorata | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Copertura Tattica | Giocatore §8.6.7 | applicato | «Attacca!» a distanza: attacco dalla Copertura |
| Difesa con Due Armi | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Parata a Distanza | Giocatore §8.6.7 | applicato | +2 alla Parata a distanza con lo scudo |
| Parata Istintiva | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Parata Migliorata | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Parata Multipla | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Schivata Istintiva | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Schivata Migliorata | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Schivata Multipla | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Hacker | Giocatore §8.6.9 | applicato | +2 VA a Tecnologia (solo per intrusione informatica e sorveglianza elettronica) |
| Mani Abili | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Ingegneria d’Emergenza | Giocatore §8.6.9 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Commerciante Esperto | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Diligente | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Lettura Veloce | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Poliglotta | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Autosufficiente | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Tiratore Imboscato | Giocatore §8.6.9 | applicato | «Attacca!» a distanza: danno e Copertura del bersaglio |
| Controllo d’Emergenza | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Inseguimento | Giocatore §8.6.9 | applicato | +2 VA a Pilotare (solo per inseguire o seminare un mezzo) |
| Pilotaggio Acrobatico | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Risorse Interiori | Giocatore §8.6.10 | applicato | Tecniche Interiori ammesse |
| Tecniche Interiori Supplementari | Giocatore §8.6.10 | applicato | Tecniche Interiori ammesse |
| Usufruitore di Magia | Magia sez. 1 | applicato | accesso alla Magia; quote degli Incantesimi; livello massimo degli Incantesimi |
| Potenziale Mistico Migliorato | Magia sez. 1 | applicato | livello massimo degli Incantesimi |
| Incrementare Incantesimi | Magia sez. 1 | applicato | quote degli Incantesimi |
| Lancio in Combattimento | Magia sez. 1 | applicato | valori di Magia della scheda: penalità di Ingaggio |
| Focalizzazione Migliorata | Magia sez. 1 | applicato | valori di Magia della scheda: Focalizzazione |
| Contromagia | Magia sez. 1 | applicato | valori di Magia della scheda: Contromagia |
| Contromagia Universale | Magia sez. 1 | applicato | valori di Magia della scheda: Contromagia senza conoscere l’Incantesimo |
| Contromagia Migliorata | Magia sez. 1 | applicato | valori di Magia della scheda: penalità della Contromagia |
| Incantesimi da Lancio | Magia sez. 1 | applicato | valori di Magia della scheda: bonus di Armi da lancio per colpire |
| Magia Occultata | Magia sez. 1 | applicato | valori di Magia della scheda: Magia Occultata |
| Conversione Migliorata | Magia sez. 1 | applicato | rapporto di Convertire Potere e della ricarica del Chroma (src/equipaggiamento.js → rapportoConversione, riquadro dei PM) |
| Recupero Meditativo | Magia sez. 1 | applicato | Meditazione: accesso |
| Meditazione Migliorata | Magia sez. 1 | applicato | Meditazione: PM per ora |
| Meditazione Estesa | Magia sez. 1 | applicato | Meditazione: ore al giorno |
| Potere Mistico | Magia sez. 1 | applicato | PM massimi |
| Recupero Mistico | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Escludere la Componente Somatica | Magia sez. 1 | applicato | «Lancia!»: componente mancante |
| Escludere l’Invocazione | Magia sez. 1 | applicato | «Lancia!»: componente mancante |
| Escludere il Focus | Magia sez. 1 | applicato | «Lancia!»: componente mancante |
| Concentrazione Migliorata | Magia sez. 1 | applicato | +3 alla PS di Volontà (solo per mantenere la Concentrazione) |
| Concentrazione Operativa | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Incantesimi Ampliati | Magia sez. 1 | applicato | «Lancia!»: costo dell’Anticipazione |
| Incantesimi Estesi | Magia sez. 1 | applicato | «Lancia!»: costo dell’Anticipazione |
| Incantesimi Proiettati | Magia sez. 1 | applicato | «Lancia!»: costo dell’Anticipazione |
| Incantesimi Plurimi | Magia sez. 1 | applicato | «Lancia!»: costo dell’Anticipazione |
| Incantesimi Intensificati | Magia sez. 1 | applicato | «Lancia!»: costo dell’Anticipazione |
| Anticipazione Migliorata | Magia sez. 1 | applicato | «Lancia!»: penalità dell’Anticipazione |
| Incantesimi Inarrestabili | Magia sez. 1 | applicato | «Lancia!»: Salvezza del bersaglio |
| Incantesimi Massimizzati | Magia sez. 1 | applicato | dadi al massimo (Incantesimi danno_o_cura) (con la condizione accesa) |
| Manifestazioni Occultate | Magia sez. 1 | testuale | riga «Talenti: Nome — prima frase» in «Lancia!», nessun valore |
| Ritualista Minore | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Ritualista Maggiore | Magia sez. 1 | testuale | nessun valore numerico del personaggio |

### Talenti di Classe

| Talento | Fonte | Esito | Dove o nota |
|---|---|---|---|
| Fuoco Controllato (Agente (fisso, Grado 1)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | applicato | «Attacca!» a distanza: bersaglio impegnato (VA, seconda Prova) |
| Rete di Informatori (Agente (fisso, Grado 3)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Ottime Credenziali (Agente (fisso, Grado 5)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | applicato | +4 VA a Cultura (con la condizione accesa); +4 VA a Intrattenere (con la condizione accesa); +4 VA a Oratoria (con la condizione accesa); +4 VA a Raggirare (con la condizione accesa) |
| Reazione Operativa (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Mira Selettiva (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | applicato | «Attacca!» a distanza: Copertura del bersaglio con il Tiro Mirato |
| Analisi Rapida (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | applicato | «Attacca!» a distanza: VA dopo l’analisi |
| Doppia Identità (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | applicato | +3 VA a Cultura (solo per usare o difendere le identità alternative); +3 VA a Oratoria (solo per usare o difendere le identità alternative); +3 VA a Raggirare (solo per usare o difendere le identità alternative) |
| Posizionamento Operativo (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Predatore (Cacciatore (fisso, Grado 1)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Segugio (Cacciatore (fisso, Grado 3)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Maestro della Caccia (Cacciatore (fisso, Grado 5)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Trappola Improvvisata (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Cacciatore Instancabile (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | applicato | +5 alla PS di Tempra (solo per prima PS del gruppo in marcia forzata o inseguimento) |
| Sangue Freddo (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | applicato | riduce di 2 la penalità di Terrorizzato (con la condizione accesa) |
| Senso dell’Occulto (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | applicato | +2 VA a Occultismo (solo per natura delle creature avvertite) |
| Colpo di Abbattimento (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Apripista (Esploratore (fisso, Grado 1)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Occhio del Terreno (Esploratore (fisso, Grado 3)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Padrone del Cammino (Esploratore (fisso, Grado 5)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Segni di Passaggio (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Adattamento Estremo (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Mappa Mentale (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Rotta Alternativa (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Avanguardia (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Colpo Sleale (Lestofante (fisso, Grado 1)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Opportunista (Lestofante (fisso, Grado 3)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Scambio Sporco (Lestofante (fisso, Grado 5)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Filo Nascosto (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Mano Fantasma (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Fumo e Specchi (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Ricatto Operativo (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Fuga tra la Folla (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Soccorso Immediato (Paramedico (fisso, Grado 1)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Strumentazione Efficace (Paramedico (fisso, Grado 3)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | applicato | +2 VA a Medicina (solo per Pronto Soccorso con strumenti) |
| Triage Estremo (Paramedico (fisso, Grado 5)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Protocollo Shock (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Evacuazione Medica (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | numero non applicato: toglie il −2 Q del Sovraccarico solo trasportando un ferito: la applica il giocatore al tavolo |
| Campo Sterile (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | applicato | +2 VA a Medicina (con la condizione accesa) |
| Diagnosi sul Campo (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Controllo del Trauma (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Ottimizzare Gittata (Artigliere (fisso, Grado 1)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | nessun valore numerico del personaggio |
| Ottimizzare Proiettili (Artigliere (fisso, Grado 3)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | applicato | «Attacca!» a distanza: modalità di fuoco (VA o munizioni) |
| Armaiolo da Campo (Artigliere (fisso, Grado 5)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | applicato | +2 VA a Tecnologia (solo per riparare armi da fuoco) |
| Postura d’Assedio (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | applicato | «Attacca!» a distanza: Imbracciatura e danno |
| Raffica Estesa (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Occhio del Tiratore (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | nessun valore numerico del personaggio |
| Bersaglio Designato (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | applicato | «Attacca!» a distanza: Azioni e danno dopo l’Armatura |
| Fuoco di Disturbo (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Mantenere la Posizione (Assaltatore (fisso, Grado 1)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | applicato | +3 alla PS prevista (solo per resistere a spinte, sbilanciamenti e disarmi) |
| Assalto Armato (Assaltatore (fisso, Grado 3)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | applicato | riduce di 2 Q la penalità MOV di armatura e scudo |
| Presidio di Combattimento (Assaltatore (fisso, Grado 5)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | applicato | +2 VA a Difese (con la condizione accesa) |
| Carica Brutale (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | applicato | «Attacca!» corpo a corpo: Carica |
| Spinta d’Impatto (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Scudo Aggressivo (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Interposizione Armata (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Coordinazione Offensiva (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | applicato | «Attacca!» corpo a corpo: VA con un alleato adiacente |
| Movimento Tattico (Incursore (fisso, Grado 1)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | applicato | «Attacca!» a distanza: penalità del proprio movimento |
| Rapidità Operativa (Incursore (fisso, Grado 3)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | applicato | «Attacca!» a distanza: VA al primo attacco entro 10 Q; «Attacca!» corpo a corpo: VA al primo attacco; Iniziativa |
| Colpisci e Sparisci (Incursore (fisso, Grado 5)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | testuale | riga «Talenti: Nome — prima frase» in «Attacca!», nessun valore |
| Attacco Silenzioso (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | applicato | +2 VA a Furtività (solo per avvicinarsi a un avversario senza essere visto) · «Attacca!» a distanza: VA contro un bersaglio ignaro con l’arma silenziata; «Attacca!» corpo a corpo: VA contro un bersaglio ignaro |
| Punto Vitale (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | applicato | «Attacca!» a distanza: danno dopo l’Armatura con il Tiro Mirato; «Attacca!» corpo a corpo: Manovre (mirato) |
| Carica Ottimizzata (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Sabotaggio Rapido (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | applicato | +2 VA a Tecnologia (solo per sabotare o disattivare dispositivi) |
| Piano di Riserva (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Addestramento al Combattimento Senz’Armi (Lottatore (fisso, Grado 1)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | applicato | danno senz’armi, Iniziativa e VA delle Manovre per Disciplina (classi.json → parametro, src/attacco.js) |
| Raffica di Colpi (Lottatore (fisso, Grado 3)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | applicato | «Attacca!» corpo a corpo: Manovra Raffica di Colpi |
| Combattimento Multiplo (Lottatore (fisso, Grado 5)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | applicato | «Attacca!» corpo a corpo: Manovra Combattimento Multiplo |
| Punto Debole (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | applicato | «Attacca!» corpo a corpo: Manovra Punto Debole |
| Padronanza della Disciplina (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | applicato | «Attacca!» corpo a corpo: Disciplina Potenza; Guardia e Controllo accanto alle Difese nella tab Combattimento |
| Risorse Interiori (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | nessun valore numerico del personaggio |
| Tecniche Interiori Supplementari (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | nessun valore numerico del personaggio |
| Parata a Mani Nude (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Addestramento Militare (Soldato (fisso, Grado 1)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | applicato | +3 alla PS di Volontà (solo per contro paura e pressioni del combattimento) |
| Coordinamento di Squadra (Soldato (fisso, Grado 3)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Disciplina di Ferro (Soldato (fisso, Grado 5)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | nessun valore numerico del personaggio |
| Supporto d’Attacco (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Supporto di Difesa (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | applicato | +2 VA a Difese (con la condizione accesa) |
| Supporto Logistico (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | applicato | +2 VA a Pilotare (solo per attività logistiche); +2 VA a Sopravvivenza (solo per attività logistiche); +2 VA a Tecnologia (solo per attività logistiche) |
| Base Operativa (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | applicato | +2 VA a Percezione (solo per nella Base, minacce dall’esterno) |
| Supporto Avanzato (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | numero non applicato: il Supporto migliorato si sceglie permanentemente, ma l’app non registra la scelta |
| Addestramento Rurale (Agricoltore (fisso, Grado 1)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 alla PS di Tempra (solo per Affaticamento da lavoro e clima) |
| Risorse del Territorio (Agricoltore (fisso, Grado 3)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | testuale | nessun valore numerico del personaggio |
| Autosufficienza (Agricoltore (fisso, Grado 5)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | testuale | nessun valore numerico del personaggio |
| Coltivatore Esperto (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 VA a Scienza (solo per coltivazioni); +3 VA a Sopravvivenza (solo per coltivazioni); +3 VA a Tecnologia (solo per coltivazioni) |
| Meccanizzazione Agricola (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 VA a Pilotare (solo per macchinari e impianti agricoli); +3 VA a Tecnologia (solo per macchinari e impianti agricoli) |
| Allevatore Esperto (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 VA a Medicina (solo per animali domestici); +3 VA a Percezione (solo per animali domestici); +3 VA a Sopravvivenza (solo per animali domestici) |
| Caccia, Pesca e Raccolta (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 VA a Percezione (solo per tracce, caccia, pesca e raccolta); +3 VA a Sopravvivenza (solo per tracce, caccia, pesca e raccolta) |
| Conservazione delle Provviste (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | applicato | +3 VA a Scienza (solo per provviste e acqua); +3 VA a Sopravvivenza (solo per provviste e acqua); +3 VA a Tecnologia (solo per provviste e acqua) |
| Addestramento di Bottega (Artigiano (fisso, Grado 1)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | applicato | +3 VA a Cultura (solo per esaminare materiali e manufatti); +3 VA a Percezione (solo per esaminare materiali e manufatti); +3 VA a Scienza (solo per esaminare materiali e manufatti); +3 VA a Tecnologia (solo per esaminare materiali e manufatti) |
| Lavoro a Regola d’Arte (Artigiano (fisso, Grado 3)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | testuale | nessun valore numerico del personaggio |
| Capolavoro (Artigiano (fisso, Grado 5)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | testuale | numero non applicato: bonus degli oggetti costruiti come Capolavoro: l’app non segna i Capolavori nell’Inventario |
| Armaiolo (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | applicato | +3 VA a Percezione (solo per costruire o riparare armi e munizioni); +3 VA a Scienza (solo per costruire o riparare armi e munizioni); +3 VA a Tecnologia (solo per costruire o riparare armi e munizioni) |
| Corazzaio (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | rimandato | +3 VA a Percezione (solo per costruire o riparare protezioni); +3 VA a Scienza (solo per costruire o riparare protezioni); +3 VA a Tecnologia (solo per costruire o riparare protezioni) · rimandato: Il +1 Protezione dell’armatura Capolavoro «resta da raccordare alle regole definitive delle protezioni» (lo dice il manuale). |
| Artefice di Precisione (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | applicato | +3 VA a Percezione (solo per serrature e meccanismi di precisione); +3 VA a Tecnologia (solo per serrature e meccanismi di precisione) |
| Maestro Manifattore (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | applicato | +3 VA a Cultura (solo per manufatti ordinari); +3 VA a Tecnologia (solo per manufatti ordinari) |
| Restauratore e Falsario (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | applicato | +3 VA a Cultura (solo per restauri e contraffazioni); +3 VA a Percezione (solo per restauri e contraffazioni); +3 VA a Raggirare (solo per restauri e contraffazioni); +3 VA a Tecnologia (solo per restauri e contraffazioni) |
| Duro Lavoro (Operaio (fisso, Grado 1)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | applicato | +3 VA a Atletica (solo per lavori pesanti e riparazioni strutturali); +3 VA a Pilotare (solo per lavori pesanti e riparazioni strutturali); +3 VA a Tecnologia (solo per lavori pesanti e riparazioni strutturali) |
| Resistenza Operaia (Operaio (fisso, Grado 3)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Colonna Portante (Operaio (fisso, Grado 5)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Forza da Lavoro (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | applicato | soglie del carico (regole.json → carico.moltiplicatori, src/carico.js) |
| Ritmo di Produzione (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Riparazione d’Emergenza (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Cannibalizzazione (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Lavoro di Squadra (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Pilota Nato (Pilota (fisso, Grado 1)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Controllo Assoluto (Pilota (fisso, Grado 3)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Sincronia Tattica (Pilota (fisso, Grado 5)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | applicato | +2 VA a Pilotare (solo per assetto Difensivo: evitare attacchi e collisioni) |
| Atterraggio Impossibile (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Meccanico di Bordo (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | applicato | +2 VA a Tecnologia (solo per riparare il proprio veicolo) |
| Manovra Evasiva (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Spinta al Limite (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Coordinazione di Bordo (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Mani Esperte (Tecnico (fisso, Grado 1)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | applicato | +3 VA a Tecnologia (solo per macchinari, elettronica e computer) |
| Intervento Rapido (Tecnico (fisso, Grado 3)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Controllo Parallelo (Tecnico (fisso, Grado 5)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Manutenzione Preventiva (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Sovraccarico Tecnico (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Intrusione Rapida (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Contromisure Elettroniche (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Sistema Ottimizzato (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Formazione Classica (Accademico (fisso, Grado 1)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Autorità Intellettuale (Accademico (fisso, Grado 3)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | applicato | +2 VA a Oratoria (con la condizione accesa) |
| Dottrina Consolidata (Accademico (fisso, Grado 5)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Metodo di Ricerca (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | applicato | +2 VA a Scienza (solo per ricerca con fonti e strumenti adeguati); +2 VA a Tecnologia (solo per ricerca con fonti e strumenti adeguati) |
| Analisi Critica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Interpretazione Storica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Memoria Fotografica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Mente Enciclopedica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Burocrazia Efficiente (Amministrativo (fisso, Grado 1)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Canali Interni (Amministrativo (fisso, Grado 3)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Macchina Amministrativa (Amministrativo (fisso, Grado 5)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Burocrate Esperto (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | applicato | +2 VA a Cultura (solo per regolamenti e procedure) |
| Rete Istituzionale (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Gestione Operativa (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Pianificazione Strategica (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Documentazione Perfetta (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | applicato | +2 VA a Raggirare (solo per preparare documenti falsi) |
| Espressione Potente (Artista (fisso, Grado 1)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Impatto Emotivo (Artista (fisso, Grado 3)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Icona (Artista (fisso, Grado 5)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Carisma Artistico (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Performance Coinvolgente (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Empatia Creativa (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Presenza Mediatica (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | applicato | +2 VA a Cultura (solo per contenuti per i mezzi di comunicazione); +2 VA a Tecnologia (solo per contenuti per i mezzi di comunicazione) |
| Ispirazione (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Diagnosi Clinica (Medico (fisso, Grado 1)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Intervento Mirato (Medico (fisso, Grado 3)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Terapia Intensiva (Medico (fisso, Grado 5)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Mano Sicura (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Chirurgia Precisa (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Diagnosi Rapida (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | applicato | +2 VA a Medicina (solo per identificare malattie, veleni e sostanze); +2 VA a Scienza (solo per identificare malattie, veleni e sostanze) |
| Resistenza Clinica (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | applicato | +2 alla PS di Tempra (solo per contro malattie, infezioni e veleni) |
| Stabilizzazione (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | applicato | +2 VA a Medicina (solo per Pronto Soccorso e Sanguinamento) |
| Parola Ispiratrice (Predicatore (fisso, Grado 1)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | applicato | +2 VA a Oratoria (solo per incoraggiare, consolare, guidare) |
| Guida Morale (Predicatore (fisso, Grado 3)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Fede Incrollabile (Predicatore (fisso, Grado 5)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Sermone Coinvolgente (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Autorità Morale (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | applicato | +2 VA a Oratoria (con la condizione accesa) |
| Devozione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | applicato | +2 VA a Occultismo (solo per religioni, culti e segni di Corruzione) |
| Purificazione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Consolazione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Armonizzazione Arcana (Arcanista (fisso, Grado 1)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | applicato | «Lancia!»: costo in PM |
| Controllo Superiore (Arcanista (fisso, Grado 3)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | testuale | riga «Talenti: Nome — prima frase» in «Lancia!», nessun valore |
| Architetto Arcano (Arcanista (fisso, Grado 5)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | applicato | «Lancia!»: penalità di livello |
| Geometria Arcana (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | promemoria | «Lancia!», riga «Talenti»: creature escludibili dall’Area (Mod INT, minimo 1) |
| Calcolo Arcano (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | testuale | riga «Talenti: Nome — prima frase» in «Lancia!», nessun valore |
| Riserva Tecnica (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | applicato | «Lancia!»: costo in PM, una volta per scena |
| Canalizzazione Sicura (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | promemoria | «Lancia!», riga «Talenti»: PM recuperati se la Prova fallisce (metà dei PM spesi) |
| Controllo dei Flussi (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | testuale | riga «Talenti: Nome — prima frase» in «Lancia!», nessun valore |
| Arma Astrale (Custode (fisso, Grado 1)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Maestro d’Arma (Custode (fisso, Grado 3)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | numero non applicato: il +1 danno vale per l’Arma Astrale evocata, che la scheda non ha fra le armi (Armi da mischia, danno per Grado di Custode: da aggiungere come arma evocabile) |
| Scudo Assoluto (Custode (fisso, Grado 5)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Maestria Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | numero non applicato: come Maestro d’Arma: +2 VA e +1 danno con l’Arma Astrale, che la scheda non ha fra le armi |
| Fenditura Mistica (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Guardiano Instancabile (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Intercettazione Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Difesa Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Incantesimi Aggressivi (Invocatore (fisso, Grado 1)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | applicato | +1 danno (Gradi: 1+ → 1, 3+ → 2, 5+ → 3 di Invocatore) agli Incantesimi offensivi (solo per incantesimi_offensivi) |
| Sovraccarico Controllato (Invocatore (fisso, Grado 3)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | applicato | +1 dado di danno agli Incantesimi offensivi (con la condizione accesa) |
| Controllo Arcano (Invocatore (fisso, Grado 5)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | applicato | +1 danno agli Incantesimi area (solo per incantesimi_area) |
| Potere Travolgente (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Eco Primordiale (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Impatto Arcano (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Mano Invisibile (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Canalizzazione Implacabile (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | riga «Talenti: Nome — prima frase» in «Lancia!», nessun valore |
| Tocco Sacro (Mistico (fisso, Grado 1)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | applicato | dadi al massimo (Incantesimi cura_ferite_contatto) (solo per Cura Ferite a Contatto) |
| Purificatore (Mistico (fisso, Grado 3)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Aura di Equilibrio (Mistico (fisso, Grado 5)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | numero non applicato: attenua le penalità di Ferite e Corruzione per sé e per gli alleati: la applica il giocatore al tavolo |
| Canale Vitale (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | applicato | +1 PV curati agli Incantesimi cura (solo per incantesimi_cura) |
| Flusso Sacro (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Occhio Interiore (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | applicato | «Lancia!»: VA di Potere per la Divinazione |
| Presagio (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Scudo Spirituale (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | applicato | +1 alla PS di Volontà; +1 alla PS di Magia; +2 alla PS di Volontà (con la condizione accesa); +2 alla PS di Magia (con la condizione accesa) |
| Architetto TecnoMistico (Tecnomante (fisso, Grado 1)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | applicato | capacità di sintonizzazione (artefatti.json → sintonizzazione.talento, src/equipaggiamento.js) |
| Ricarica Efficiente (Tecnomante (fisso, Grado 3)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | applicato | rapporto di Convertire Potere e della ricarica del Chroma (src/equipaggiamento.js → rapportoConversione, riquadro dei PM) |
| Sovrascrittura (Tecnomante (fisso, Grado 5)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Meccanica Potenziata (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | applicato | +1 danno con le armi Artefatto |
| Corazza Potenziata (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | applicato | AR magica (src/protezione.js) |
| Scarica d’Emergenza (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Schema Ridondante (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Interfaccia Remota (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |

## Rimandati (pacchetto per il Doc)

- **Corazzaio**: Il +1 Protezione dell’armatura Capolavoro «resta da raccordare alle regole definitive delle protezioni» (lo dice il manuale).

## Cosa è stato implementato

- **Dati:** `effetti.valori` nelle voci dei Talenti (`talenti_liberi.json`, `classi.json`), scritti da questo script; le chiavi di `effetti` già lette dal motore restano come sono. Validatore e `tools/verifica_frasi.mjs` controllano forma e frasi.
- **Motore** (`src/talenti.js`, `src/condizioni.js`): solo al tavolo (con la sessione), nei valori effettivi; il totale da regole, l’avanzamento e la SS non cambiano. Generali sempre; situazionali con l’interruttore del Talento (`sessione.talentiAccesi`); usi specifici come valore a parte accanto all’Abilità, sotto le Prove Salvezza (Resistenze con il tetto del §8.6) e sotto le Caratteristiche. I bonus dei Talenti si sommano (la regola «un solo modificatore degli strumenti» vale per gli oggetti). Provenienza: una riga per Talento, con il suo nome.
- **Interruttore «Bonus dei Talenti»** (`sessione.bonusTalenti`, predefinito acceso; nel salvataggio e nell’export, come le altre condizioni al tavolo): in testa alle tab Combattimento e Poteri. Spento: nessun effetto di `effetti.valori`, nemmeno i Talenti dell’Iniziativa; «Attacca!» e «Lancia!» calcolano senza Talenti (`talentiAttacco` vuoto); la provenienza elenca i Talenti barrati («Talenti spenti: non conta»). PV, PM, Prova Salvezza Migliorata e Movimento restano: sono il totale da regole.
- **Talenti di lancio** (`incantesimi` negli effetti, applicati da «Lancia!»): **offensivo** = la versione dell’Incantesimo ha una colonna che inizia con «Danno» e contiene dadi (in `incantesimi.json` non c’è un campo che dica «offensivo»); **ad Area** = offensivo con una colonna «Area» o «Raggio», o con l’Anticipazione dell’Area; **di cura** = una colonna «Guarigione» con dadi. Incantesimi Aggressivi (+1/+2/+3 per Grado di Invocatore), Controllo Arcano (+1 ad Area), Canale Vitale (+1 PV), Tocco Sacro (dadi al massimo) si applicano da soli; Sovraccarico Controllato (+1 dado) e Incantesimi Massimizzati sono interruttori del pannello. Il valore e il Grado compaiono nella provenienza del danno, la frase «una sola volta per bersaglio» sotto il danno.
- **Promemoria di lancio senza numero** (Canalizzazione Implacabile, Controllo Superiore, Controllo dei Flussi, Calcolo Arcano, Manifestazioni Occultate; Canalizzazione Sicura e Geometria Arcana con il numero ricavato fra parentesi): una riga «Talenti: Nome — prima frase» nei promemoria di «Lancia!». Il motore non applica nessun valore.
- **Ripasso del 30/09/2026** (tutti i «già gestiti» e i testuali con numeri, un test con e senza per ciascuno in `tests/talenti-gestiti.test.js`). Risultavano gestiti senza esserlo, ora applicati: Pistolero e Ambidestro a distanza (Combattere con due armi e mano non dominante in «Attacca!» a distanza, §5.7; anche Duellante con l’arma a distanza in mano), Rapidità Operativa (+2 VA al primo attacco a distanza entro 10 Q), Punto Vitale (+2 dopo l’Armatura con il Tiro Mirato entro 10 Q), Ricarica Efficiente e Conversione Migliorata (rapporto del Chroma), Padronanza della Disciplina (Guardia anche a distanza, Controllo anche per resistere); Reazione Operativa passa a riga «Talenti». Testuali con un numero applicabile, ora applicati: Tiratore Imboscato, Bersaglio Designato, Immobilizzare Istintivo, Assalto Armato, Combattere alla Cieca, Sangue Freddo (interruttore).
- **Schema** (anche in `docs/effetti-oggetti.md`): `riduzione_stato` (riduce la penalità al VA di uno Stato fino a 0, con `stato` e facoltativo `prove`), `movimento_armatura` (riduce la penalità MOV di armatura e scudo); in `effetti.attacco_distanza` le chiavi `primo_attacco`, `mirato_dopo_armatura`, `preparazione`, `nascosto`; `padronanza_disciplina.guardia` e `.controllo`.
- **SD:** interruttori dei Talenti situazionali nella colonna Condizioni della tab Abilità e, per Difese e Salvezze, in testa alla tab Combattimento; usi delle Prove di Caratteristica sotto le Caratteristiche (Identità).
- **Non applicati** (restano testo, motivo nella tabella): Aura di Equilibrio, Evacuazione Medica, Supporto Avanzato, Capolavoro, Maestro d’Arma, Maestria Astrale (l’Arma Astrale non è ancora un’arma della scheda).

