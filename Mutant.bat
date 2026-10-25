@echo off
rem Mutant: l'unico programma da aprire (25/10/2026, "un ingresso solo"). Doppio clic su questo file, o sul
rem collegamento "Mutant" del desktop (lo crea la voce 9, Impostazioni). Ogni funzione e' una voce del menu:
rem le voci stanno in tools\menu.mjs (tests\menu.test.js controlla che ogni voce abbia qui la sua etichetta).
rem Gli altri file .bat della cartella NON si aprono a mano: avvia-server.bat e' la finestra del server che apre
rem la voce 1, aggiorna.bat e' il passo che fa la voce 2.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
rem Funziona da qualunque cartella venga lanciato (collegamento, altra cartella, call): la cartella di
rem Mutant si legge una volta sola qui sotto, in QUI, e ogni file si chiama con il percorso completo.
rem ATTENZIONE: aggiorna.bat aggiorna anche questo file mentre gira. Per questo la voce 2 sta su
rem una riga sola fra parentesi (cmd la legge per intero prima di eseguirla) e alla fine riapre
rem il menu nuovo e chiude questo: non spezzarla su piu' righe.
setlocal
set "QUI=%~dp0"
title Mutant
cd /d "%QUI%."
rem MUTANT_PORTA solo per le prove (di norma 3000, come avvia-server.bat; server.mjs legge PORTA)
if not defined MUTANT_PORTA set "MUTANT_PORTA=3000"
set "PORTA=%MUTANT_PORTA%"

where node >nul 2>nul
if errorlevel 1 goto senza_node
rem una copia di Mutant.bat fuori dalla cartella di Mutant (per esempio sul desktop) non trova i suoi file
if not exist "%QUI%server.mjs" (
  echo.
  echo  ==============================================================
  echo   Questo Mutant.bat non e' nella cartella di Mutant:
  for %%A in ("%QUI%") do echo   %%~A
  echo  ==============================================================
  echo  Probabilmente e' una copia. Cancellala, apri Mutant.bat nella cartella di Mutant e scegli
  echo  9 Impostazioni, poi "Metti il collegamento Mutant sul desktop".
  echo.
  pause
  exit /b 1
)
if not exist "%QUI%tools\console.mjs" (
  set "MANCA=tools\console.mjs"
  call :manca
  exit /b 1
)

rem all'apertura: il ruolo di questo PC (una volta sola), impostazioni mancanti, invii non riusciti
node "%QUI%tools\console.mjs" avvio

:menu
cd /d "%QUI%."
cls
echo.
node "%QUI%tools\console.mjs" menu --porta=%MUTANT_PORTA%
for %%A in ("%QUI%") do echo  Cartella di Mutant: %%~A
echo.
choice /c 123456789PC0 /n /m "  Scegli un numero (o P, C): "
if errorlevel 12 goto esci
if errorlevel 11 goto stato
if errorlevel 10 goto cerca
if errorlevel 9 goto impostazioni
if errorlevel 8 goto talenti-ripristina
if errorlevel 7 goto talenti
if errorlevel 6 goto controlla
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
rem il server gira nella sua finestra, nella cartella di Mutant: questo menu resta libero
start "Mutant - server" /d "%QUI%." "%QUI%avvia-server.bat"
echo.
echo  Mutant si sta accendendo nella sua finestra nera (resta aperta finche' si gioca).
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
(call "%QUI%aggiorna.bat" & start "Mutant" /d "%QUI%." cmd /c "%QUI%Mutant.bat" & exit)

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
rem solo da questa voce: niente altro nel programma apre finestre di Esplora risorse
if not exist "%QUI%salvataggi\" mkdir "%QUI%salvataggi"
echo.
echo  Apro la cartella dei salvataggi in Esplora risorse:
for %%A in ("%QUI%salvataggi") do echo    %%~A
start "" explorer "%QUI%salvataggi"
timeout /t 2 /nobreak >nul
goto menu

:controlla
node "%QUI%tools\console.mjs" controlla
echo.
pause
goto menu

:talenti
node "%QUI%tools\console.mjs" talenti --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:talenti-ripristina
node "%QUI%tools\console.mjs" talenti-ripristina --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:cerca
rem "Cerca i personaggi": legge soltanto; con un numero e SI sceglie quale cartella usa questo PC (tools\dati-pc.mjs)
node "%QUI%tools\console.mjs" cerca --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:stato
rem "Controlla lo stato": come stanno i personaggi, anche in stato-mutant.txt (si legge e basta)
node "%QUI%tools\console.mjs" stato-personaggi --porta=%MUTANT_PORTA%
echo.
pause
goto menu

:impostazioni
rem ruolo di questo PC, avvisi ntfy, cartella di Google Drive, notifica di prova, collegamento sul desktop
node "%QUI%tools\console.mjs" impostazioni
goto menu

rem Node.js non c'e': si installa da qui (era 2_installa_node.bat)
:senza_node
echo.
echo  Per usare Mutant serve Node.js, che su questo computer non e' installato.
echo  Lo scarico dal sito ufficiale nodejs.org e lo installo (serve internet, qualche minuto).
echo.
choice /c SN /n /m "  Procedo? [S/N] "
if errorlevel 2 exit /b 1
if exist "%QUI%tools\installa-node.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%QUI%tools\installa-node.ps1"
) else (
  start "" https://nodejs.org
  echo  Si e' aperto il sito https://nodejs.org: scarica e installa la versione "LTS".
)
echo.
echo  Quando l'installazione e' finita: chiudi questa finestra e riapri Mutant.bat
echo  (le finestre gia' aperte non vedono ancora Node.js).
echo.
pause
exit /b 0

rem Un file atteso manca davvero: dove lo si cercava e cosa fare
:manca
echo.
echo  ==============================================================
echo   Manca %MANCA% nella cartella
for %%A in ("%QUI%") do echo   %%~A
echo  ==============================================================
echo  Forse l'antivirus l'ha messo in quarantena: controlla Sicurezza di Windows,
echo  Protezione da virus e minacce, Cronologia protezione (e ripristinalo).
echo  Oppure scegli 2 (Aggiorna Mutant): rimette i file mancanti.
echo  Se il problema resta, manda questo schermo a Marcello.
echo.
pause
exit /b 0

:esci
endlocal
exit /b 0
