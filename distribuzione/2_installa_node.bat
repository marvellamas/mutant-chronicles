@echo off
rem Mutant - passo 2: installa Node.js, il programma che fa funzionare l'app.
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
rem
rem Da dove si scarica: la cartella ufficiale https://nodejs.org/dist/latest-v22.x/
rem Il nome dell'installer (node-v22.x.y-x64.msi) si ricava dal file SHASUMS256.txt della
rem stessa cartella, che contiene anche l'impronta SHA-256 di ogni file. Scelta preferita a un
rem indirizzo fisso perche': (1) scarica sempre l'ultima correzione di sicurezza della versione
rem LTS 22 senza dover aggiornare questo file; (2) l'impronta permette di controllare che
rem l'installer scaricato sia integro prima di avviarlo. Un indirizzo fisso invecchierebbe.
setlocal
title Mutant - installa Node.js
cd /d "%~dp0"

set "CARTELLA_NODE=https://nodejs.org/dist/latest-v22.x/"
set "LAVORO=%TEMP%\mutant-node"
set "PSC=powershell -NoProfile -ExecutionPolicy Bypass -Command"
set "PRE=$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;"

echo.
echo  ============================================
echo   Mutant - installa Node.js
echo  ============================================
echo.

echo  [1/4] Controllo se Node.js e' gia' installato...
where node >nul 2>nul
if errorlevel 1 goto installa
for /f "delims=" %%V in ('node -v') do set "VERSIONE=%%V"
echo.
echo  Node.js e' gia' installato su questo computer (versione %VERSIONE%).
echo  Non serve fare altro: puoi passare a 3_avvia.bat
echo.
pause
exit /b 0

:installa
echo        Node.js non c'e': lo scarico dal sito ufficiale nodejs.org.
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" if not defined PROCESSOR_ARCHITEW6432 goto errore_32bit

echo  [2/4] Cerco la versione piu' recente di Node.js 22 (LTS)...
if exist "%LAVORO%" rmdir /s /q "%LAVORO%"
mkdir "%LAVORO%"
if errorlevel 1 goto errore_lavoro
%PSC% "%PRE% try { $t = (Invoke-WebRequest -UseBasicParsing -Uri ($env:CARTELLA_NODE + 'SHASUMS256.txt') -TimeoutSec 60).Content; $riga = ($t -split [char]10) | Where-Object { $_ -match '\s(node-v[\d.]+-x64\.msi)\s*$' } | Select-Object -First 1; if (-not $riga) { exit 3 }; $p = $riga.Trim() -split '\s+'; Set-Content -Encoding ASCII -Path (Join-Path $env:LAVORO 'nome.txt') -Value $p[1]; Set-Content -Encoding ASCII -Path (Join-Path $env:LAVORO 'impronta.txt') -Value $p[0]; exit 0 } catch { exit 1 }"
if errorlevel 3 goto errore_elenco
if errorlevel 1 goto errore_rete
set /p NOME=<"%LAVORO%\nome.txt"
set /p IMPRONTA=<"%LAVORO%\impronta.txt"
echo        Trovato: %NOME%

echo  [3/4] Scarico %NOME% (circa 30 MB, attendi qualche minuto)...
set "INSTALLER=%LAVORO%\%NOME%"
%PSC% "%PRE% try { Invoke-WebRequest -UseBasicParsing -Uri ($env:CARTELLA_NODE + $env:NOME) -OutFile $env:INSTALLER -TimeoutSec 1200; if ((Get-FileHash -Algorithm SHA256 $env:INSTALLER).Hash -ne $env:IMPRONTA) { exit 3 }; exit 0 } catch { exit 1 }"
if errorlevel 3 goto errore_impronta
if errorlevel 1 goto errore_rete
echo        Scaricato e controllato: il file e' integro.

echo  [4/4] Avvio l'installazione di Node.js...
echo.
echo  Si apre la finestra di installazione di Node.js:
echo   - premi "Next" in ogni schermata e accetta la licenza;
echo   - lascia tutte le opzioni come sono;
echo   - se Windows chiede "Consentire a questa app di apportare modifiche?", rispondi Si;
echo   - alla fine premi "Finish".
echo.
start "" /wait msiexec /i "%INSTALLER%"
set "ESITO=%errorlevel%"
rem msiexec: 0 = installato; 3010 = installato, riavvio consigliato; altro = annullato o non riuscito
if "%ESITO%"=="3010" echo  Windows consiglia di riavviare il computer: fallo prima di 3_avvia.bat
if not "%ESITO%"=="0" if not "%ESITO%"=="3010" goto errore_installazione

rmdir /s /q "%LAVORO%" 2>nul
echo.
echo  Installazione di Node.js terminata.
echo  IMPORTANTE: chiudi questa finestra e tutte le altre finestre nere eventualmente aperte,
echo  poi fai doppio clic su 3_avvia.bat (le finestre gia' aperte non vedono ancora Node.js).
echo.
pause
exit /b 0

:errore_32bit
echo.
echo  ERRORE: questo computer ha Windows a 32 bit, e Node.js 22 richiede Windows a 64 bit.
echo  Avvisa Marcello.
goto fine_errore

:errore_lavoro
echo.
echo  ERRORE: non riesco a creare la cartella temporanea %LAVORO%
goto fine_errore

:errore_rete
echo.
echo  ERRORE: non riesco a scaricare da internet.
echo  Controlla la connessione (Wi-Fi o cavo) e fai di nuovo doppio clic su questo file.
goto fine_errore

:errore_elenco
echo.
echo  ERRORE: sul sito di Node.js non trovo l'installer per Windows a 64 bit.
echo  Puoi installarlo a mano: apri https://nodejs.org e scarica la versione "LTS".
goto fine_errore

:errore_impronta
echo.
echo  ERRORE: il file scaricato non corrisponde a quello ufficiale (download rovinato).
echo  Fai di nuovo doppio clic su questo file per riprovare.
goto fine_errore

:errore_installazione
echo.
echo  L'installazione non e' stata completata (annullata o non riuscita).
echo  Fai di nuovo doppio clic su questo file per riprovare.
goto fine_errore

:fine_errore
rmdir /s /q "%LAVORO%" 2>nul
echo.
pause
exit /b 1
