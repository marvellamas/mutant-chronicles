@echo off
rem Console di Mutant (richiesta di Marcello del 09/10/2026): un menu al posto di tanti .bat.
rem Doppio clic su questo file (o sul collegamento "Mutant" del desktop). Le voci richiamano
rem avvia-server.bat, aggiorna.bat e gli script in tools\ (salva-sessione.mjs, console.mjs, ripristina.mjs).
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
rem Funziona da qualunque cartella venga lanciato (collegamento, altra cartella, call): la cartella di
rem Mutant si legge una volta sola qui sotto, in QUI, e ogni file si chiama con il percorso completo.
rem ATTENZIONE: aggiorna.bat aggiorna anche questo file mentre gira. Per questo la voce 2 sta su
rem una riga sola fra parentesi (cmd la legge per intero prima di eseguirla) e alla fine riapre
rem la console nuova e chiude questa: non spezzarla su piu' righe.
setlocal
set "QUI=%~dp0"
title Mutant - console
cd /d "%QUI%."
rem MUTANT_PORTA solo per le prove (di norma 3000, come avvia-server.bat; server.mjs legge PORTA)
if not defined MUTANT_PORTA set "MUTANT_PORTA=3000"
set "PORTA=%MUTANT_PORTA%"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Per usare Mutant serve Node.js, che su questo computer non risulta installato.
  echo.
  echo  1. Si apre ora il sito https://nodejs.org
  echo  2. Scarica e installa la versione "LTS" ^(lasciando le opzioni proposte^)
  echo  3. Chiudi questa finestra e fai di nuovo doppio clic su Mutant.bat
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
rem una copia di Mutant.bat fuori dalla cartella di Mutant (per esempio sul desktop) non trova i suoi file
if not exist "%QUI%server.mjs" (
  echo.
  echo  ==============================================================
  echo   Questo Mutant.bat non e' nella cartella di Mutant:
  for %%A in ("%QUI%") do echo   %%~A
  echo  ==============================================================
  echo  Probabilmente e' una copia. Cancellala e, nella cartella di Mutant, fai doppio clic su
  echo  crea-collegamento.bat: mette sul desktop il collegamento giusto.
  echo.
  pause
  exit /b 1
)
if not exist "%QUI%tools\console.mjs" (
  set "MANCA=tools\console.mjs"
  call :manca
  exit /b 1
)

:menu
cd /d "%QUI%."
cls
echo.
echo  ==========================================================
echo    MUTANT - console del master
echo  ==========================================================
node "%QUI%tools\console.mjs" intestazione --porta=%MUTANT_PORTA%
for %%A in ("%QUI%") do echo  Cartella: %%~A
echo.
echo    1. Avvia Mutant (server)
echo    2. Aggiorna Mutant
echo    3. Salva sessione
echo    4. Ripristina un salvataggio
echo    5. Apri la cartella dei salvataggi
echo    6. Impostazioni
echo    7. Esci
echo.
choice /c 1234567 /n /m "  Scegli un numero: "
if errorlevel 7 goto fine
if errorlevel 6 goto impostazioni
if errorlevel 5 goto cartella
if errorlevel 4 goto ripristina
if errorlevel 3 goto salva
if errorlevel 2 goto aggiorna
if errorlevel 1 goto avvia
goto menu

:avvia
if not exist "%QUI%avvia-server.bat" (
  set "MANCA=avvia-server.bat"
  call :manca
  goto menu
)
node "%QUI%tools\console.mjs" stato --porta=%MUTANT_PORTA%
if not errorlevel 1 (
  echo.
  echo  Mutant e' gia' acceso: la sua finestra nera e' aperta. Il browser va su http://localhost:%MUTANT_PORTA%
  echo.
  pause
  goto menu
)
rem il server gira nella sua finestra, nella cartella di Mutant: questa console resta libera
start "Mutant - server" /d "%QUI%." "%QUI%avvia-server.bat"
echo.
echo  Mutant si sta accendendo nella sua finestra nera (resta aperta finche' gioca).
echo  Per spegnerlo a fine serata: "Spegni Mutant" nel Tavolo del Master.
timeout /t 4 /nobreak >nul
goto menu

:aggiorna
echo.
if not exist "%QUI%aggiorna.bat" (
  set "MANCA=aggiorna.bat"
  call :manca
  goto menu
)
(call "%QUI%aggiorna.bat" & start "Mutant - console" /d "%QUI%." cmd /c "%QUI%Mutant.bat" & exit)

:salva
echo.
echo  Salvataggio della sessione in corso...
echo.
node "%QUI%tools\salva-sessione.mjs"
echo.
pause
goto menu

:ripristina
node "%QUI%tools\console.mjs" ripristina --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:cartella
if not exist "%QUI%salvataggi\" mkdir "%QUI%salvataggi"
start "" explorer "%QUI%salvataggi"
goto menu

:impostazioni
node "%QUI%tools\console.mjs" impostazioni
echo.
echo  Si aprono nel Blocco note:
echo   - config-salvataggi.json: salvataggio automatico, cartella di Google Drive, notifica a Marcello
echo   - avvisi\avvisi.json: avvisi a Marcello quando aggiorni o accendi
echo  Dopo una modifica salva il file (Ctrl+S); vale dalla prossima accensione di Mutant.
echo  Spiegazioni: salvataggi\LEGGIMI.txt e avvisi\LEGGIMI.txt
start "" notepad "%QUI%config-salvataggi.json"
start "" notepad "%QUI%avvisi\avvisi.json"
echo.
pause
goto menu

rem Un file atteso manca davvero: dove lo si cercava e cosa fare
:manca
echo.
echo  ==============================================================
echo   Manca %MANCA% nella cartella
for %%A in ("%QUI%") do echo   %%~A
echo  ==============================================================
echo  Forse l'antivirus l'ha messo in quarantena: controlla Sicurezza di Windows,
echo  Protezione da virus e minacce, Cronologia protezione (e ripristinalo).
echo  Oppure fai doppio clic su aggiorna.bat nella cartella qui sopra: rimette i file mancanti.
echo  Se il problema resta, manda questo schermo a Marcello.
echo.
pause
exit /b 0

:fine
endlocal
exit /b 0
