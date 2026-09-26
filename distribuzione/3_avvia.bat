@echo off
rem Mutant - passo 3: accende l'app e apre il browser.
rem Per spegnere l'app basta chiudere questa finestra.
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
rem Tutto cio' che succede si scrive anche in avvia.log, accanto a questo file (solo l'ultimo avvio):
rem in caso di problemi e' il file da mandare a Marcello.
rem serve si avvia con node e il percorso completo di build\main.js, senza npx ne' node_modules\.bin:
rem in una cartella sincronizzata (Dropbox, OneDrive...) npx ha cercato serve nel posto sbagliato.
setlocal
title Mutant - chiudi questa finestra per spegnere
cd /d "%~dp0"
set "QUI=%~dp0"
set "LOG=%QUI%avvia.log"
set "APP=%QUI%mutant"
set "SERVE=%APP%\node_modules\serve\build\main.js"

rem Porta dell'app. MUTANT_PORTA e MUTANT_SENZA_BROWSER servono solo per le prove.
if not defined MUTANT_PORTA set "MUTANT_PORTA=3000"

rem Registro nuovo a ogni avvio. Se avvia.log e' aperto da un'altra finestra di Mutant ancora
rem accesa (il server ci scrive), questa finestra usa avvia-seconda-finestra.log.
(> "%LOG%" echo Mutant - avvio del %DATE% alle %TIME%) 2>nul || goto registro_alternativo
goto registro_pronto
:registro_alternativo
set "LOG=%QUI%avvia-seconda-finestra.log"
> "%LOG%" echo Mutant - avvio del %DATE% alle %TIME% - avvia.log e' in uso da un'altra finestra
:registro_pronto
rem La cartella si scrive con l'espansione ritardata: cosi' un nome con & o parentesi
rem (per esempio "Dropbox (Personale)") non rompe il comando.
setlocal EnableDelayedExpansion
>>"!LOG!" echo Cartella: !QUI!
endlocal

call :scrivi ""
call :scrivi " ============================================"
call :scrivi "  Mutant"
call :scrivi " ============================================"
call :scrivi ""

rem Cartelle sincronizzate: avviso e si prosegue comunque.
set "SINC="
echo("%QUI%" | findstr /i /c:"dropbox" >nul && set "SINC=Dropbox"
echo("%QUI%" | findstr /i /c:"onedrive" >nul && set "SINC=OneDrive"
echo("%QUI%" | findstr /i /c:"google drive" /c:"googledrive" /c:"il mio drive" /c:"my drive" >nul && set "SINC=Google Drive"
echo("%QUI%" | findstr /i /c:"icloud" >nul && set "SINC=iCloud"
if not defined SINC goto controlla_app
call :scrivi " ATTENZIONE: questa cartella e' sincronizzata da %SINC%."
call :scrivi " Se qualcosa non funziona, sposta tutto in una cartella normale,"
call :scrivi " ad esempio C:\Mutant, e riprova da li'."
call :scrivi ""

:controlla_app
call :scrivi " [1/5] Controllo la cartella dell'app..."
if not exist "%APP%\index.html" goto errore_app
cd /d "%APP%"

call :scrivi " [2/5] Controllo che Node.js sia installato..."
where node >nul 2>nul
if errorlevel 1 goto errore_node
set "NODEV="
for /f "delims=" %%v in ('node --version 2^>nul') do set "NODEV=%%v"
>>"%LOG%" echo Node.js %NODEV%

call :scrivi " [3/5] Controllo i componenti dell'app..."
if exist "%SERVE%" goto controlla_porta
if not exist "%APP%\node_modules\" goto installa
rem node_modules c'e' ma serve e' incompleto (installazione interrotta, sincronizzazione...):
rem si ricomincia da capo.
call :scrivi "        Componenti incompleti: li cancello e li reinstallo."
>>"%LOG%" echo Manca %SERVE%: cancello node_modules
rmdir /s /q "%APP%\node_modules" >>"%LOG%" 2>&1

:installa
call :scrivi "        Installo i componenti da internet: serve circa un minuto."
call :scrivi "        Non chiudere la finestra..."
>>"%LOG%" echo ---- npm install ----
call npm install --no-fund --no-audit --include=dev >>"%LOG%" 2>&1
if errorlevel 1 goto errore_npm
if not exist "%SERVE%" goto errore_componenti

:controlla_porta
rem serve 14 ignora --no-port-switching: con la porta occupata si accenderebbe in silenzio su
rem un'altra porta, mentre il browser apre la 3000. Per questo si controlla prima.
call :scrivi " [4/5] Controllo che la porta %MUTANT_PORTA% sia libera..."
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if (Get-NetTCPConnection -State Listen -LocalPort ([int]$env:MUTANT_PORTA) -ErrorAction Stop) { exit 1 } } catch { exit 0 }; exit 0"
if errorlevel 1 goto porta_occupata

call :scrivi " [5/5] Accendo l'app..."
call :scrivi ""
call :scrivi " --------------------------------------------------------------"
call :scrivi "  Mutant e' acceso. Il browser si apre su:"
call :scrivi "      http://localhost:%MUTANT_PORTA%"
call :scrivi "  Se la pagina resta vuota, aspetta qualche secondo e premi F5."
call :scrivi ""
call :scrivi "  Dal telefono (collegato alla stessa Wi-Fi) apri uno di questi indirizzi:"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$r = try { Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { '      http://' + $_.IPAddress + ':' + $env:MUTANT_PORTA } } catch { '      (indirizzo non disponibile: vedi LEGGIMI.txt)' }; $r; $r | Add-Content -Path $env:LOG"
call :scrivi ""
call :scrivi "  Per spegnere Mutant chiudi questa finestra."
call :scrivi " --------------------------------------------------------------"
call :scrivi ""
if not defined MUTANT_SENZA_BROWSER start "" http://localhost:%MUTANT_PORTA%
>>"%LOG%" echo ---- serve ----
node "%SERVE%" . -l %MUTANT_PORTA% --no-port-switching -L >>"%LOG%" 2>&1
set "USCITA=%ERRORLEVEL%"

rem Si arriva qui solo se serve si e' fermato da solo: con la finestra chiusa lo script finisce prima.
>>"%LOG%" echo ---- serve terminato con codice %USCITA% ----
findstr /i /c:"EADDRINUSE" /c:"is in use" /c:"already in use" "%LOG%" >nul
if not errorlevel 1 goto porta_occupata
goto errore_imprevisto

:porta_occupata
call :scrivi ""
call :scrivi " Mutant si e' fermato."
call :scrivi " La porta %MUTANT_PORTA% e' gia' in uso: Mutant e' probabilmente gia' acceso"
call :scrivi " in un'altra finestra nera. Usa quella, oppure chiudila e riprova."
goto fine_errore

:errore_imprevisto
call :scrivi ""
echo(
echo  Ultime righe del registro:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Tail 15 -Path $env:LOG | ForEach-Object { '    ' + $_ }"
call :scrivi ""
call :scrivi " Mutant si e' fermato per un errore imprevisto."
call :scrivi " Manda una foto di questa finestra a Marcello,"
call :scrivi " oppure il file avvia.log che trovi accanto a 3_avvia.bat."
if /i not "%LOG%"=="%QUI%avvia.log" call :scrivi " Questa volta il registro e' avvia-seconda-finestra.log."
goto fine_errore

:errore_app
call :scrivi ""
call :scrivi " ERRORE: non trovo l'app: manca la cartella 'mutant' accanto a questo file."
call :scrivi " Prima fai doppio clic su 1_scarica_o_aggiorna_app.bat"
goto fine_errore

:errore_node
call :scrivi ""
call :scrivi " ERRORE: Node.js non risulta installato su questo computer."
call :scrivi " Fai doppio clic su 2_installa_node.bat, poi chiudi questa finestra e riprova."
call :scrivi " Se lo hai appena installato, chiudi tutte le finestre nere e riapri questo file."
goto fine_errore

:errore_npm
call :scrivi ""
call :scrivi " ERRORE: l'installazione dei componenti non e' riuscita."
call :scrivi " Controlla la connessione a internet e fai di nuovo doppio clic su questo file."
call :scrivi " Se si ripete, manda il file avvia.log a Marcello."
goto fine_errore

:errore_componenti
call :scrivi ""
call :scrivi " ERRORE: dopo l'installazione manca ancora il componente 'serve'."
call :scrivi " Se la cartella e' in Dropbox, OneDrive o simili, spostala in C:\Mutant e riprova."
call :scrivi " Altrimenti manda il file avvia.log a Marcello."
goto fine_errore

:fine_errore
call :scrivi ""
pause
exit /b 1

rem Scrive una riga nella finestra e nel registro. Il testo non deve contenere & | < > ^ o virgolette.
:scrivi
echo(%~1
>>"%LOG%" echo(%~1
exit /b 0
