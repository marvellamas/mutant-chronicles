@echo off
rem Mutant - passo 4: controlla i file dei personaggi e, se vuoi, mette via le copie vecchie.
rem Si apre con un doppio clic. Non cambia niente finche' non scrivi SI alla fine.
rem Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
setlocal
title Mutant - controlla i personaggi
cd /d "%~dp0"
set "QUI=%~dp0"
set "APP=%QUI%mutant"
set "RAPPORTO=%QUI%rapporto-personaggi.txt"

if not exist "%APP%\tools\pulizia-personaggi.mjs" (
  echo.
  echo Non trovo l'app in "%APP%".
  echo Questo file va tenuto accanto alla cartella mutant, insieme agli altri numerati.
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
echo  CONTROLLO DEI PERSONAGGI
echo ================================================================
echo.
echo  Guardo dentro ogni file di personaggi\ e ti dico, per ciascuno,
echo  che cosa contiene: livello, PX, PV, PM, oggetti, crediti e a che
echo  giorno arriva il calendario della campagna.
echo.
echo  Dove ci sono piu' file dello stesso personaggio, ti propongo
echo  quale tenere e perche'. Dove non e' chiaro, NON scelgo io: te lo
echo  segnalo come caso dubbio e lascio tutto com'e'.
echo.
echo  Adesso non cambio NIENTE: leggo soltanto.
echo.
echo ----------------------------------------------------------------
echo.

pushd "%APP%"
node tools\pulizia-personaggi.mjs --su "%RAPPORTO%"
set "ESITO=%ERRORLEVEL%"
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
echo  Lo stesso testo e' stato scritto in:
echo    %RAPPORTO%
echo  Puoi aprirlo con il Blocco note e mandarlo a Marcello.
echo.
echo  Se vuoi, adesso posso mettere via i file vecchi: resta un file
echo  per personaggio (quello proposto qui sopra) e gli altri vanno in
echo  personaggi\storico\, senza cancellare niente. I casi dubbi NON
echo  si toccano.
echo.
echo  Se non sei sicuro, chiudi pure questa finestra: non e' stato
echo  fatto niente e i file sono tutti al loro posto.
echo.

set "RISPOSTA="
set /p "RISPOSTA=  Vuoi spostare i file vecchi? Scrivi SI e premi Invio (altrimenti Invio e basta): "
if /i not "%RISPOSTA%"=="SI" (
  echo.
  echo  Va bene: non ho toccato niente.
  echo.
  pause
  exit /b 0
)

echo.
echo  Sposto i file vecchi...
echo.
pushd "%APP%"
node tools\pulizia-personaggi.mjs --sposta --su "%RAPPORTO%"
set "ESITO=%ERRORLEVEL%"
popd
echo.
if "%ESITO%"=="0" (
  echo  Fatto. Niente e' stato cancellato: i file vecchi sono in
  echo  mutant\personaggi\storico\, divisi per personaggio.
) else (
  echo  Qualcosa non ha funzionato. Manda a Marcello questa finestra:
  echo  i file sono ancora tutti al loro posto.
)
echo.
pause
