@echo off
rem Mette sul desktop il collegamento "Mutant" a Mutant.bat, con l'icona di Mutant (tools\mutant.ico).
rem Basta farlo una volta; rifarlo sostituisce il collegamento.
rem Niente lettere accentate: la console di Windows non e' in UTF-8.
title Mutant - collegamento sul desktop
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Mutant.lnk')); $s.TargetPath='%~dp0Mutant.bat'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0tools\mutant.ico'; $s.Description='Console di Mutant'; $s.Save(); Write-Host (' Fatto: collegamento Mutant in ' + $d)"
if errorlevel 1 (
  echo.
  echo  Non sono riuscito a creare il collegamento. In alternativa: tasto destro su Mutant.bat,
  echo  "Mostra altre opzioni", "Invia a", "Desktop (crea collegamento)".
)
echo.
pause
