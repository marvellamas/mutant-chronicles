@echo off
rem Avvio di Mutant con la cartella personaggi (server.mjs): doppio clic su questo file.
rem I personaggi si salvano anche come file in personaggi, oltre che nel browser.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant con la cartella personaggi - chiudi questa finestra per spegnere
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Per usare Mutant serve Node.js, che su questo computer non risulta installato.
  echo.
  echo  1. Si apre ora il sito https://nodejs.org
  echo  2. Scarica e installa la versione "LTS" ^(lasciando le opzioni proposte^)
  echo  3. Chiudi questa finestra e fai di nuovo doppio clic su avvia-server.bat
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

rem Versione dell'app e indirizzi dei moduli con ?v= (docs/cache.md): dopo un aggiornamento il
rem browser prende i file nuovi senza Ctrl+F5. Se non riesce si prosegue: l'app funziona lo stesso.
node tools\versione.mjs
echo.
echo  Mutant e' acceso con la cartella personaggi: il browser si apre su http://localhost:3000
echo  I personaggi si salvano anche in %~dp0personaggi
echo  Se la pagina resta vuota, aspetta qualche secondo e premi F5.
echo  Gli indirizzi per i giocatori (telefoni e PC sulla stessa Wi-Fi) compaiono qui sotto,
echo  fra le righe di uguali, e nella plancia nel riquadro "Collega i giocatori".
echo  Se Windows chiede il permesso per Node.js: consenti le "reti private".
echo  avvia.bat non serve: questa finestra basta per tutto.
echo  Salvataggio automatico ogni 5 minuti nella cartella autosave.
echo  Per spegnere a fine serata: "Spegni Mutant" nel Tavolo del Master (salva, manda la copia
echo  e chiude questa finestra). Chiudendo questa finestra con la X Mutant prova comunque a salvare.
echo.
start "" http://localhost:3000
node server.mjs
rem 42 = spento da "Spegni Mutant" (server.mjs, 08/10): la sessione e' gia' salvata, la finestra si chiude
if "%errorlevel%"=="42" exit

echo.
echo  Mutant si e' fermato. Se la porta 3000 era occupata, il messaggio sopra dice da chi:
echo  da un Mutant rimasto acceso (rispondendo S lo si ferma e si riparte) o da un altro programma.
pause
