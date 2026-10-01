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
echo  Per spegnere Mutant chiudi questa finestra.
echo.
start "" http://localhost:3000
node server.mjs

echo.
echo  Mutant si e' fermato. Se il messaggio sopra parla della porta 3000 gia' in uso,
echo  Mutant e' probabilmente gia' acceso in un'altra finestra.
pause
