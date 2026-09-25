@echo off
rem Avvio di Mutant per chi non usa il terminale: doppio clic su questo file.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant - chiudi questa finestra per spegnere
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Per usare Mutant serve Node.js, che su questo computer non risulta installato.
  echo.
  echo  1. Si apre ora il sito https://nodejs.org
  echo  2. Scarica e installa la versione "LTS" ^(lasciando le opzioni proposte^)
  echo  3. Chiudi questa finestra e fai di nuovo doppio clic su avvia.bat
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo  Prima accensione: installo i componenti necessari, serve un minuto e la connessione a internet...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Installazione non riuscita. Controlla la connessione a internet e riprova.
    pause
    exit /b 1
  )
)

echo.
echo  Mutant e' acceso: il browser si apre su http://localhost:3000
echo  Se la pagina resta vuota, aspetta qualche secondo e premi F5.
echo  Per spegnere Mutant chiudi questa finestra.
echo.
start "" http://localhost:3000
call npx serve . -l 3000 --no-port-switching

echo.
echo  Mutant si e' fermato. Se il messaggio sopra parla della porta 3000 gia' in uso,
echo  Mutant e' probabilmente gia' acceso in un'altra finestra.
pause
