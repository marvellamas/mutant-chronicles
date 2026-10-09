@echo off
rem Console di Mutant (richiesta di Marcello del 09/10/2026): un menu al posto di tanti .bat.
rem Doppio clic su questo file. Le voci richiamano avvia-server.bat, aggiorna.bat e gli script
rem in tools\ (salva-sessione.mjs, console.mjs, ripristina.mjs).
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
rem ATTENZIONE: aggiorna.bat aggiorna anche questo file mentre gira. Per questo la voce 2 sta su
rem una riga sola fra parentesi (cmd la legge per intero prima di eseguirla) e alla fine riapre
rem la console nuova e chiude questa: non spezzarla su piu' righe.
setlocal
title Mutant - console
cd /d "%~dp0"
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

:menu
cls
echo.
echo  ==========================================================
echo    MUTANT - console del master
echo  ==========================================================
node tools\console.mjs intestazione --porta=%MUTANT_PORTA%
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
node tools\console.mjs stato --porta=%MUTANT_PORTA%
if not errorlevel 1 (
  echo.
  echo  Mutant e' gia' acceso: la sua finestra nera e' aperta. Il browser va su http://localhost:%MUTANT_PORTA%
  echo.
  pause
  goto menu
)
rem il server gira nella sua finestra: questa console resta libera per salvare e ripristinare
start "Mutant - server" "%~dp0avvia-server.bat"
echo.
echo  Mutant si sta accendendo nella sua finestra nera (resta aperta finche' gioca).
echo  Per spegnerlo a fine serata: "Spegni Mutant" nel Tavolo del Master.
timeout /t 4 /nobreak >nul
goto menu

:aggiorna
echo.
(call "%~dp0aggiorna.bat" & start "Mutant - console" cmd /c "%~f0" & exit)

:salva
echo.
echo  Salvataggio della sessione in corso...
echo.
node tools\salva-sessione.mjs
echo.
pause
goto menu

:ripristina
node tools\console.mjs ripristina --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:cartella
if not exist "salvataggi\" mkdir "salvataggi"
start "" explorer "%~dp0salvataggi"
goto menu

:impostazioni
node tools\console.mjs impostazioni
echo.
echo  Si aprono nel Blocco note:
echo   - config-salvataggi.json: salvataggio automatico, cartella di Google Drive, notifica a Marcello
echo   - avvisi\avvisi.json: avvisi a Marcello quando aggiorni o accendi
echo  Dopo una modifica salva il file (Ctrl+S); vale dalla prossima accensione di Mutant.
echo  Spiegazioni: salvataggi\LEGGIMI.txt e avvisi\LEGGIMI.txt
start "" notepad "%~dp0config-salvataggi.json"
start "" notepad "%~dp0avvisi\avvisi.json"
echo.
pause
goto menu

:fine
endlocal
exit /b 0
