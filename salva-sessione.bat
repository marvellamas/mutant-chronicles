@echo off
rem Salvataggio della sessione di Mutant: doppio clic su questo file (con il server acceso o spento).
rem E' lo stesso di "Salva sessione" nel Tavolo del Master (tools\salva-sessione.mjs): crea
rem salvataggi\sessione_AAAA-MM-GG_hhmm.zip con personaggi, veicoli, scontri, nemici, tavolo, scene e mappe,
rem poi lo copia nella cartella di Google Drive e avvisa Marcello con ntfy (config-salvataggi.json).
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant - salvataggio della sessione
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Per la copia serve Node.js, che su questo computer non risulta installato:
  echo  si installa da https://nodejs.org ^(versione "LTS"^), come per avvia-server.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo  Salvataggio della sessione in corso...
echo.
node tools\salva-sessione.mjs
echo.
echo  Fatto. I salvataggi sono nella cartella %~dp0salvataggi
echo  e non vengono mai cancellati ne' sovrascritti.
echo.
pause
