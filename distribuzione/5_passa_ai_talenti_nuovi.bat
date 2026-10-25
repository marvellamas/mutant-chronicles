@echo off
rem Mutant - passo 5: passa i personaggi ai Talenti nuovi (Talenti Liberi, Maestrie, Specializzazioni).
rem Si apre con un doppio clic. Non cambia niente finche' non scrivi SI.
rem Se il passaggio e' gia' stato fatto, propone di tornare a com'era prima (scrivendo RIPRISTINA).
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
setlocal
title Mutant - passaggio ai Talenti nuovi
cd /d "%~dp0"
set "QUI=%~dp0"
set "APP=%QUI%mutant"
set "RAPPORTO=%QUI%rapporto-talenti-nuovi.txt"

if not exist "%APP%\tools\migra-talenti.mjs" (
  echo.
  echo Non trovo l'app aggiornata in "%APP%".
  echo Prima fai "Aggiorna" ^(1_scarica_o_aggiorna_app.bat o la console di Mutant^), poi riapri questo file.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Non trovo Node: lancia prima 2_installa_node.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  PASSAGGIO AI TALENTI NUOVI
echo ================================================================
echo.
echo  Per ogni personaggio ti dico quali Talenti ha oggi, in quale
echo  categoria nuova stanno, quanti posti avra' da riempire e se c'e'
echo  qualcosa da guardare.
echo.
echo  Adesso non cambio NIENTE: leggo soltanto.
echo.
echo ----------------------------------------------------------------
echo.

pushd "%APP%"
node tools\migra-talenti.mjs --su "%RAPPORTO%"
set "ESITO=%ERRORLEVEL%"
node tools\migra-talenti.mjs --stato
set "STATO=%ERRORLEVEL%"
popd
if not "%ESITO%"=="0" (
  echo.
  echo  Qualcosa non ha funzionato. Manda a Marcello questa finestra.
  echo.
  pause
  exit /b 1
)

echo.
echo ----------------------------------------------------------------
echo.
echo  Lo stesso testo e' in: %RAPPORTO%
echo.
echo  Se scrivi SI:
echo    1. faccio prima una copia zip di tutta la cartella personaggi
echo       (in mutant\salvataggi\, con data e ora);
echo    2. a ogni personaggio tolgo i Talenti di oggi e li scrivo nel
echo       registro "Modifiche del master" della sua scheda;
echo    3. ogni giocatore poi sceglie i Talenti nuovi dalla scheda,
echo       nel riquadro "Da scegliere", uno alla volta.
echo.
echo  Se chiudi questa finestra adesso, non e' stato fatto niente.
echo.

set "RISPOSTA="
set /p "RISPOSTA=  Vuoi fare il passaggio? Scrivi SI e premi Invio (altrimenti Invio e basta): "
if /i "%RISPOSTA%"=="SI" goto passaggio

if "%STATO%"=="10" (
  echo.
  echo  Ho trovato la copia fatta prima di un passaggio ai Talenti nuovi.
  echo  Se vuoi tornare a com'era prima del passaggio, scrivi RIPRISTINA:
  echo  rimetto i file della copia ^(e tengo una copia di com'e' adesso^).
  echo.
  set "RISPOSTA="
  set /p "RISPOSTA=  Scrivi RIPRISTINA e premi Invio (altrimenti Invio e basta): "
)
if /i "%RISPOSTA%"=="RIPRISTINA" goto ripristino

echo.
echo  Va bene: non ho toccato niente.
echo.
pause
exit /b 0

:passaggio
echo.
echo  Faccio il passaggio...
echo.
pushd "%APP%"
node tools\migra-talenti.mjs --applica --su "%RAPPORTO%"
set "ESITO=%ERRORLEVEL%"
popd
echo.
if "%ESITO%"=="0" (
  echo  Fatto. Adesso ogni giocatore apre la sua scheda e sceglie i Talenti
  echo  nel riquadro "Da scegliere". Per tornare indietro riapri questo file.
) else (
  echo  Qualcosa non ha funzionato: leggi sopra quali personaggi sono rimasti
  echo  com'erano e manda a Marcello questa finestra. La copia zip c'e'.
)
echo.
pause
exit /b 0

:ripristino
echo.
echo  Rimetto i file com'erano prima del passaggio...
echo.
pushd "%APP%"
node tools\migra-talenti.mjs --ripristina --su "%RAPPORTO%"
set "ESITO=%ERRORLEVEL%"
popd
echo.
if "%ESITO%"=="0" (
  echo  Fatto: i personaggi sono tornati com'erano prima del passaggio.
) else (
  echo  Qualcosa non ha funzionato. Manda a Marcello questa finestra.
)
echo.
pause
exit /b 0
