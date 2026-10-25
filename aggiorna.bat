@echo off
rem Aggiornamento di Mutant per chi ha la copia con Git (git clone): doppio clic su questo file,
rem poi avvia.bat. Chi ha scaricato lo zip usa invece distribuzione\1_scarica_o_aggiorna_app.bat.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
rem
rem ATTENZIONE: il pull sostituisce QUESTO file mentre gira. cmd legge il .bat riga per riga, per
rem posizione: se le righe cambiano, dopo il pull riprenderebbe nel punto sbagliato. Per questo tutto
rem l'aggiornamento sta su UNA RIGA SOLA (cmd la legge per intero prima di eseguirla) e il resto sta
rem in sottoprogrammi, che cmd ritrova per nome anche nel file nuovo. Non spezzare quella riga.
rem
rem avvia.bat rigenera versione.json e l'importmap di index.html (docs/cache.md): se l'impronta
rem calcolata qui e' diversa da quella su GitHub, Git vede quei due file come modificati e il pull
rem si rifiuterebbe. Prima del pull si scartano quindi le rigenerazioni locali di quei due soli
rem file (avvia.bat le rifa' subito dopo); nessun altro file viene toccato.
rem
rem Rete di sicurezza dei dati di questo PC (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md):
rem PRIMA una copia zip di tutte le cartelle locali in backup-prima-aggiornamento\; se non riesce non
rem si aggiorna. DOPO si riconta: se una cartella che aveva file e' rimasta vuota ci si ferma, lo si
rem dice e si propone di rimettere la copia appena fatta.
setlocal
title Mutant - aggiornamento
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto senza_git
if not exist ".git\" goto senza_git

rem «exit /b» e non «exit»: la voce 2 della console chiama questo file con «call» e deve poter riaprire il menu.
(call :prima & if not errorlevel 1 (git checkout -- versione.json index.html & git pull --ff-only & if errorlevel 1 (call :errore_pull) else (call :dopo)) & echo. & pause & exit /b 0)

rem ---------------------------------------------------------------------------------------------
rem Copia di sicurezza dei dati di questo PC, prima di toccare qualunque cosa.
:prima
echo.
echo  Metto al sicuro i dati di questo PC...
set "RETE=1"
where node >nul 2>nul || set "RETE="
if not exist "tools\dati-locali.mjs" set "RETE="
if not defined RETE (
  echo  ^(senza Node non posso fare la copia: aggiorno lo stesso, Git non tocca i tuoi dati^)
  exit /b 0
)
node tools\dati-locali.mjs prima
if errorlevel 1 (
  echo.
  echo  ==============================================================
  echo   Non aggiorno: la copia di sicurezza non e' riuscita.
  echo  ==============================================================
  echo.
  call :avviso non-aggiornato "copia di sicurezza non riuscita"
  exit /b 1
)
echo.
echo  Aggiorno Mutant da GitHub...
echo.
exit /b 0

rem ---------------------------------------------------------------------------------------------
rem Dopo il pull: controllo dei dati, file di configurazione, file mancanti, riavvio del server.
:dopo
if defined RETE node tools\dati-locali.mjs dopo
if defined RETE if errorlevel 1 goto dati_mancanti
rem Avvisi a Marcello (tools\avvisi.mjs, avvisi\LEGGIMI.txt): la prima volta la configurazione si crea
rem dall'esempio; poi una notifica con il nome del PC e la versione. Mai bloccante, mai errori a schermo.
rem (25/10/2026: la configurazione sta nel profilo dell'utente, FUORI dalla cartella dell'app, e nessun
rem aggiornamento la tocca; qui si mette al sicuro quella che c'e' gia' dentro la cartella, oppure la si crea
rem dall'esempio la prima volta. Senza Node si fa come prima.)
if defined RETE node tools\config-avvisi.mjs assicura
if not defined RETE if not exist "avvisi\avvisi.json" if exist "avvisi\avvisi.esempio.json" copy /y "avvisi\avvisi.esempio.json" "avvisi\avvisi.json" >nul 2>nul
call :avviso aggiornato
rem Salvataggi (salvataggi\LEGGIMI.txt, 08/10): la prima volta la configurazione si crea dall'esempio
if not exist "config-salvataggi.json" if exist "config-salvataggi.esempio.json" copy /y "config-salvataggi.esempio.json" "config-salvataggi.json" >nul 2>nul
rem File dell'app spariti (per esempio messi in quarantena dall'antivirus, 09/10): si rimettono dalla copia di Git
for %%F in (Mutant.bat avvia-server.bat salva-sessione.bat crea-collegamento.bat avvia.bat server.mjs) do if not exist "%%F" git checkout -- "%%F" >nul 2>nul && echo  Rimesso il file mancante %%F
rem Pacchetto zip: i file fuori dalla cartella mutant (1_scarica..., 3_avvia...) si rimettono al passo
if exist "tools\aggiorna-avviatori.mjs" node tools\aggiorna-avviatori.mjs

rem Riavvio del server dopo l'aggiornamento (13/10/2026, tools\riavvia.mjs): se Mutant era acceso lo spegne
rem salvando (come "Spegni Mutant") e lo riaccende con la versione nuova; se era spento lo lascia spento; se
rem l'aggiornamento non ha cambiato niente non lo tocca. La porta la legge dall'ambiente (MUTANT_PORTA o PORTA).
echo.
echo  Fatto: Mutant e' aggiornato.
if exist "tools\riavvia.mjs" node tools\riavvia.mjs
echo.
echo  Se Mutant non e' acceso: apri Mutant.bat (o il collegamento del desktop) e scegli 1.
exit /b 0

rem ---------------------------------------------------------------------------------------------
:dati_mancanti
echo.
echo  L'aggiornamento dei file e' andato a buon fine, ma mancano dei dati.
echo.
choice /c SN /n /m "  Rimetto adesso la copia fatta prima dell'aggiornamento? [S/N] "
if errorlevel 2 goto dati_mancanti_no
node tools\dati-locali.mjs rimetti
node tools\dati-locali.mjs dopo
if errorlevel 1 (
  echo.
  echo  Qualcosa manca ancora: manda questo schermo a Marcello. Non ho cancellato niente;
  echo  le copie sono nella cartella backup-prima-aggiornamento.
) else (
  echo.
  echo  I dati sono tornati al loro posto. Apri Mutant.bat e scegli 1.
)
call :avviso non-aggiornato "dati locali svuotati dall'aggiornamento"
exit /b 0

:dati_mancanti_no
echo.
echo  Va bene: non ho toccato niente. La copia resta nella cartella backup-prima-aggiornamento
echo  e la puoi rimettere quando vuoi con la voce 4 della console (Ripristina un salvataggio).
call :avviso non-aggiornato "dati locali svuotati dall'aggiornamento"
exit /b 0

rem ---------------------------------------------------------------------------------------------
:errore_pull
call :avviso non-aggiornato "git pull non riuscito"
echo.
echo  ==============================================================
echo   Aggiornamento non riuscito: manda questo schermo a Marcello.
echo  ==============================================================
echo.
echo  Stato della cartella:
git status --short --branch
echo.
echo  L'app gia' presente funziona lo stesso: puoi usare avvia.bat.
echo  I tuoi dati non sono stati toccati; la copia di sicurezza e' in backup-prima-aggiornamento.
exit /b 0

:senza_git
call :avviso non-aggiornato "cartella senza Git o Git non installato"
echo.
echo  Questa cartella non e' una copia con Git (oppure Git non e' installato).
echo  Per aggiornare usa distribuzione\1_scarica_o_aggiorna_app.bat
echo.
pause
exit /b 1

rem Notifica a Marcello (avvisi\LEGGIMI.txt): solo con Node e lo script presenti; in silenzio
:avviso
where node >nul 2>nul
if errorlevel 1 exit /b 0
if not exist "tools\avvisi.mjs" exit /b 0
node tools\avvisi.mjs %* >nul 2>nul
exit /b 0
