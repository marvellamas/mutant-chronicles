@echo off
rem Mutant - passo 1: scarica l'app la prima volta, oppure la aggiorna.
rem Crea accanto a questo file la cartella "mutant". Non serve Git: scarica lo zip da GitHub.
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
setlocal
title Mutant - scarica o aggiorna l'app
cd /d "%~dp0"

rem Indirizzi. Le variabili MUTANT_ZIP_URL e MUTANT_API_URL servono solo per le prove.
if not defined MUTANT_ZIP_URL set "MUTANT_ZIP_URL=https://github.com/marvellamas/mutant-chronicles/archive/refs/heads/main.zip"
if not defined MUTANT_API_URL set "MUTANT_API_URL=https://api.github.com/repos/marvellamas/mutant-chronicles/commits/main"
set "DEST=%~dp0mutant"
set "LAVORO=%TEMP%\mutant-scarico"
rem Copia delle regole modificate a mano (cartella data) prima di sostituirle.
set "BACKUP=%~dp0backup_dati"
set "PSC=powershell -NoProfile -ExecutionPolicy Bypass -Command"
rem Preambolo comune: niente barra di avanzamento (rallenta molto) e connessione sicura TLS 1.2.
set "PRE=$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;"

echo.
echo  ============================================
echo   Mutant - scarica o aggiorna l'app
echo  ============================================
echo.

rem Cartelle sincronizzate (Dropbox, OneDrive...): l'app ci funziona male. Avviso e si prosegue.
set "SINC="
echo("%~dp0" | findstr /i /c:"dropbox" >nul && set "SINC=Dropbox"
echo("%~dp0" | findstr /i /c:"onedrive" >nul && set "SINC=OneDrive"
echo("%~dp0" | findstr /i /c:"google drive" /c:"googledrive" /c:"il mio drive" /c:"my drive" >nul && set "SINC=Google Drive"
echo("%~dp0" | findstr /i /c:"icloud" >nul && set "SINC=iCloud"
if not defined SINC goto prepara
echo  ATTENZIONE: questa cartella e' sincronizzata da %SINC%.
echo  Se qualcosa non funziona, sposta tutto in una cartella normale,
echo  ad esempio C:\Mutant, e riprova da li'.
echo.

:prepara
echo  [1/5] Preparo una cartella di lavoro temporanea...
if exist "%LAVORO%" rmdir /s /q "%LAVORO%"
mkdir "%LAVORO%"
if errorlevel 1 goto errore_lavoro

echo  [2/5] Chiedo a internet qual e' la versione piu' recente...
%PSC% "%PRE% try { $r = Invoke-RestMethod -UseBasicParsing -Uri $env:MUTANT_API_URL -Headers @{'User-Agent'='mutant-installatore'} -TimeoutSec 30; Set-Content -Encoding ASCII -Path (Join-Path $env:LAVORO 'ultima.txt') -Value $r.sha; exit 0 } catch { if ($_.Exception.Response) { exit 2 } else { exit 1 } }"
if errorlevel 2 goto versione_ignota
if errorlevel 1 goto errore_rete

set "ULTIMA="
set /p ULTIMA=<"%LAVORO%\ultima.txt"
set "ATTUALE="
if exist "%DEST%\.versione" set /p ATTUALE=<"%DEST%\.versione"
echo        Versione piu' recente: %ULTIMA%
if defined ATTUALE echo        Versione sul computer: %ATTUALE%
if /i "%ULTIMA%"=="%ATTUALE%" goto gia_aggiornato
goto scarica

:versione_ignota
rem Il sito risponde ma non da' la versione (per esempio troppe richieste in un'ora):
rem si scarica comunque, senza poter dire se era gia' aggiornata.
echo        Non riesco a leggere il numero di versione: scarico comunque.
set "ULTIMA="

:scarica
echo  [3/5] Scarico l'app da internet (qualche megabyte, attendi)...
%PSC% "%PRE% try { Invoke-WebRequest -UseBasicParsing -Uri $env:MUTANT_ZIP_URL -OutFile (Join-Path $env:LAVORO 'mutant.zip') -TimeoutSec 600; exit 0 } catch { if ($_.Exception.Response) { exit 2 } else { exit 1 } }"
if errorlevel 2 goto errore_sito
if errorlevel 1 goto errore_rete

echo  [4/5] Estraggo i file...
%PSC% "%PRE% try { Expand-Archive -LiteralPath (Join-Path $env:LAVORO 'mutant.zip') -DestinationPath (Join-Path $env:LAVORO 'estratto') -Force; exit 0 } catch { exit 1 }"
if errorlevel 1 goto errore_zip

echo  [5/5] Copio i file nella cartella "mutant"...
rem Si conserva node_modules (i componenti gia' installati), a meno che package.json sia cambiato:
rem in quel caso si cancella e il file 3 li reinstalla.
rem Prima di sostituire, la cartella data (regole che il master puo' aver modificato) si copia in
rem backup_dati\data-e-ora; la copia si tiene solo se diversa dalla versione nuova.
rem Gli sfondi messi a mano in img\sfondi (*.jpg, vedi README) si rimettono al loro posto dopo la copia.
%PSC% "%PRE% try { $src = (Get-ChildItem -Directory (Join-Path $env:LAVORO 'estratto') | Select-Object -First 1).FullName; if (-not $src) { exit 1 }; $dest = $env:DEST; if (-not (Test-Path $dest)) { New-Item -ItemType Directory $dest | Out-Null }; $pkg = Join-Path $dest 'package.json'; $vecchio = if (Test-Path $pkg) { Get-Content -Raw $pkg } else { '' }; $dati = Join-Path $dest 'data'; $copia = ''; if (Test-Path $dati) { $copia = Join-Path $env:BACKUP (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'); New-Item -ItemType Directory -Force $copia | Out-Null; Copy-Item -Recurse $dati $copia }; $sf = Join-Path $dest 'img\sfondi'; $sfTmp = Join-Path $env:LAVORO 'sfondi'; if (Test-Path $sf) { New-Item -ItemType Directory -Force $sfTmp | Out-Null; Get-ChildItem -File $sf -Filter '*.jpg' | Copy-Item -Destination $sfTmp }; Get-ChildItem -Force $dest | Where-Object { $_.Name -ne 'node_modules' } | Remove-Item -Recurse -Force; Get-ChildItem -Force $src | Move-Item -Destination $dest; if (Test-Path $sfTmp) { New-Item -ItemType Directory -Force $sf | Out-Null; Get-ChildItem -File $sfTmp | Where-Object { -not (Test-Path (Join-Path $sf $_.Name)) } | Copy-Item -Destination $sf }; if ($vecchio -and ((Get-Content -Raw $pkg) -ne $vecchio) -and (Test-Path (Join-Path $dest 'node_modules'))) { Remove-Item -Recurse -Force (Join-Path $dest 'node_modules'); Write-Host '       Componenti da reinstallare: ci pensa il file 3 al prossimo avvio.' }; if ($copia) { $h = { param($c) Get-ChildItem -Recurse -File $c | ForEach-Object { $_.FullName.Substring($c.Length) + (Get-FileHash $_.FullName).Hash } }; if (((& $h (Join-Path $copia 'data')) -join ';') -eq ((& $h $dati) -join ';')) { Remove-Item -Recurse -Force $copia; if (-not (Get-ChildItem -Force $env:BACKUP)) { Remove-Item -Force $env:BACKUP } } else { Write-Host ('       I file delle regole (cartella data) erano diversi: copia salvata in ' + $copia) } }; exit 0 } catch { Write-Host $_; exit 1 }"
if errorlevel 1 goto errore_copia

if defined ULTIMA (echo %ULTIMA%)>"%DEST%\.versione"
rmdir /s /q "%LAVORO%" 2>nul

echo.
echo  Fatto: l'app e' nella cartella "mutant", accanto a questo file.
echo  Adesso fai doppio clic su 3_avvia.bat
echo  (se Node.js non e' ancora installato, prima fai doppio clic su 2_installa_node.bat).
echo.
pause
exit /b 0

:gia_aggiornato
rmdir /s /q "%LAVORO%" 2>nul
echo.
echo  L'app e' gia' aggiornata: non c'e' niente da scaricare.
echo  Per usarla fai doppio clic su 3_avvia.bat
echo.
pause
exit /b 0

:errore_rete
echo.
echo  ERRORE: non riesco a collegarmi a internet.
echo  Controlla la connessione (Wi-Fi o cavo) e fai di nuovo doppio clic su questo file.
if exist "%DEST%\index.html" echo  L'app gia' scaricata funziona lo stesso: puoi usare 3_avvia.bat.
goto fine_errore

:errore_sito
echo.
echo  ERRORE: il sito GitHub risponde, ma non consegna il file dell'app.
echo  Indirizzo: %MUTANT_ZIP_URL%
echo  Probabilmente l'app non e' ancora pubblica. Avvisa Marcello.
goto fine_errore

:errore_lavoro
echo.
echo  ERRORE: non riesco a creare la cartella temporanea %LAVORO%
goto fine_errore

:errore_zip
echo.
echo  ERRORE: il file scaricato non e' uno zip valido. Riprova tra qualche minuto.
goto fine_errore

:errore_copia
echo.
echo  ERRORE: non riesco a copiare i file nella cartella "mutant".
echo  Se l'app e' accesa, chiudi la finestra nera di 3_avvia.bat e riprova.
goto fine_errore

:fine_errore
rmdir /s /q "%LAVORO%" 2>nul
echo.
pause
exit /b 1
