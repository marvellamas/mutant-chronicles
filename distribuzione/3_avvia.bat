@echo off
rem Mutant - passo 3: accende l'app e apre il browser.
rem Per spegnere l'app basta chiudere questa finestra.
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
setlocal
title Mutant - chiudi questa finestra per spegnere
cd /d "%~dp0"

rem Porta dell'app. MUTANT_PORTA e MUTANT_SENZA_BROWSER servono solo per le prove.
if not defined MUTANT_PORTA set "MUTANT_PORTA=3000"

echo.
echo  ============================================
echo   Mutant
echo  ============================================
echo.

echo  [1/4] Controllo la cartella dell'app...
if not exist "%~dp0mutant\index.html" goto errore_app
cd /d "%~dp0mutant"

echo  [2/4] Controllo che Node.js sia installato...
where node >nul 2>nul
if errorlevel 1 goto errore_node

echo  [3/4] Controllo i componenti dell'app...
if exist "node_modules\" goto avvia
echo        Prima accensione: li installo da internet, serve circa un minuto...
call npm install --no-fund --no-audit
if errorlevel 1 goto errore_npm

:avvia
echo  [4/4] Accendo l'app...
echo.
echo  --------------------------------------------------------------
echo   Mutant e' acceso. Il browser si apre su:
echo       http://localhost:%MUTANT_PORTA%
echo   Se la pagina resta vuota, aspetta qualche secondo e premi F5.
echo.
echo   Dal telefono (collegato alla stessa Wi-Fi) apri uno di questi indirizzi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { '      http://' + $_.IPAddress + ':' + $env:MUTANT_PORTA } } catch { '      (indirizzo non disponibile: vedi LEGGIMI.txt)' }"
echo.
echo   Per spegnere Mutant chiudi questa finestra.
echo  --------------------------------------------------------------
echo.
if not defined MUTANT_SENZA_BROWSER start "" http://localhost:%MUTANT_PORTA%
call npx serve . -l %MUTANT_PORTA% --no-port-switching

echo.
echo  Mutant si e' fermato.
echo  Se qui sopra si parla della porta %MUTANT_PORTA% gia' in uso, Mutant e' probabilmente
echo  gia' acceso in un'altra finestra nera: usa quella, oppure chiudila e riprova.
echo.
pause
exit /b 1

:errore_app
echo.
echo  ERRORE: non trovo l'app (manca la cartella "mutant" accanto a questo file).
echo  Prima fai doppio clic su 1_scarica_o_aggiorna_app.bat
goto fine_errore

:errore_node
echo.
echo  ERRORE: Node.js non risulta installato su questo computer.
echo  Fai doppio clic su 2_installa_node.bat, poi chiudi questa finestra e riprova.
echo  (Se lo hai appena installato, chiudi tutte le finestre nere e riapri questo file.)
goto fine_errore

:errore_npm
echo.
echo  ERRORE: l'installazione dei componenti non e' riuscita.
echo  Controlla la connessione a internet e fai di nuovo doppio clic su questo file.
goto fine_errore

:fine_errore
echo.
pause
exit /b 1
