@echo off
rem Mette sul desktop il collegamento "Mutant" a Mutant.bat, con l'icona di Mutant (tools\mutant.ico)
rem e la cartella di Mutant come cartella di lavoro. Rifarlo sostituisce il collegamento (anche uno vecchio).
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant - collegamento sul desktop
setlocal
rem MUTANT_DESKTOP solo per le prove (un altro posto al posto del desktop).
rem il percorso passa a PowerShell da una variabile d'ambiente: apostrofi, & e spazi nel nome della cartella non lo rompono
set "MUTANT_QUI=%~dp0"
cd /d "%MUTANT_QUI%."
if not exist "%MUTANT_QUI%Mutant.bat" (
  echo.
  for %%A in ("%MUTANT_QUI%") do echo  Manca Mutant.bat nella cartella %%~A
  echo  Questo file va lanciato dalla cartella di Mutant. Se c'e', forse l'antivirus l'ha messo in
  echo  quarantena: controlla Sicurezza di Windows, Protezione da virus e minacce, Cronologia protezione;
  echo  oppure fai doppio clic su aggiorna.bat.
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=$env:MUTANT_QUI; $d=if ($env:MUTANT_DESKTOP) { $env:MUTANT_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }; $p=Join-Path $d 'Mutant.lnk'; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($p); $s.TargetPath=(Join-Path $q 'Mutant.bat'); $s.WorkingDirectory=$q.TrimEnd('\'); $s.IconLocation=(Join-Path $q 'tools\mutant.ico'); $s.Description='Console di Mutant'; $s.Save(); Write-Host (' Fatto: collegamento Mutant in ' + $d); Write-Host (' Apre ' + $s.TargetPath + ', cartella di lavoro ' + $s.WorkingDirectory)" <NUL
if errorlevel 1 (
  echo.
  echo  Non sono riuscito a creare il collegamento. In alternativa: tasto destro su Mutant.bat,
  echo  "Mostra altre opzioni", "Invia a", "Desktop (crea collegamento)".
)
echo.
echo  Non copiare Mutant.bat sul desktop: usa sempre il collegamento.
echo.
pause
