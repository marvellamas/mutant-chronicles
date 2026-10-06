@echo off
rem Copia di fine sessione di Mutant: doppio clic su questo file (anche con il server acceso).
rem Crea salvataggi\sessione_AAAA-MM-GG_hhmm.zip con personaggi, veicoli, scontri, nemici e tavolo;
rem se configurato in config-salvataggi.json, lo copia anche su Drive e su un repository GitHub privato.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant - copia di fine sessione
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
echo  Copia di fine sessione in corso...
echo.
node tools\salva-sessione.mjs
echo.
echo  Fatto. I salvataggi sono nella cartella %~dp0salvataggi
echo  e non vengono mai cancellati ne' sovrascritti.
echo.
pause
