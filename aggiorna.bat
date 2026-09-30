@echo off
rem Aggiornamento di Mutant per chi ha la copia con Git (git clone): doppio clic su questo file,
rem poi avvia.bat. Chi ha scaricato lo zip usa invece distribuzione\1_scarica_o_aggiorna_app.bat.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
rem
rem avvia.bat rigenera versione.json e l'importmap di index.html (docs/cache.md): se l'impronta
rem calcolata qui e' diversa da quella su GitHub, Git vede quei due file come modificati e il pull
rem si rifiuterebbe. Prima del pull si scartano quindi le rigenerazioni locali di quei due soli
rem file (avvia.bat le rifa' subito dopo); nessun altro file viene toccato.
setlocal
title Mutant - aggiornamento
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto senza_git
if not exist ".git\" goto senza_git

echo.
echo  Aggiorno Mutant da GitHub...
echo.
git checkout -- versione.json index.html
git pull --ff-only
if errorlevel 1 goto errore_pull

echo.
echo  Fatto: Mutant e' aggiornato. Adesso fai doppio clic su avvia.bat
echo  (se era gia' acceso, chiudi la sua finestra nera e riaprilo).
echo.
pause
exit /b 0

:errore_pull
echo.
echo  ==============================================================
echo   Aggiornamento non riuscito: manda questo schermo a Marcello.
echo  ==============================================================
echo.
echo  Stato della cartella:
git status --short --branch
echo.
echo  L'app gia' presente funziona lo stesso: puoi usare avvia.bat.
echo.
pause
exit /b 1

:senza_git
echo.
echo  Questa cartella non e' una copia con Git (oppure Git non e' installato).
echo  Per aggiornare usa distribuzione\1_scarica_o_aggiorna_app.bat
echo.
pause
exit /b 1
