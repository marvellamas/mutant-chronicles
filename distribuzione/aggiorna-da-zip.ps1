# Mutant - aggiornamento da zip senza perdere i dati di questo PC (richiesta di Marcello del 09/10/2026).
# Lo esegue distribuzione\1_scarica_o_aggiorna_app.bat dalla copia appena scaricata ed estratta: cosi' la logica e'
# sempre quella della versione nuova. Niente lettere accentate: PowerShell 5.1 legge questo file come ANSI.
#
# Elenco dei file e delle cartelle locali (mai cancellati): tools\file-locali.json della versione scaricata.
# Passi:
#   1. controlla che lo zip sia completo (controllo_zip): altrimenti non tocca nulla (uscita 3);
#   2. copia zip dei dati locali in backup-prima-aggiornamento\locali_<data>.zip, tiene le ultime 5; se non riesce non
#      tocca nulla (uscita 4);
#   3. copia della cartella data in BackupDati (se il master l'aveva modificata la tiene, come prima);
#   4. mette da parte i file locali annidati (img\originali, img\sfondi\*.jpg);
#   5. toglie i file e le cartelle dell'app vecchia (mai quelli dell'elenco; node_modules solo se package.json cambia);
#   6. copia i file dell'app nuova (robocopy, senza cancellare nulla: nelle cartelle locali aggiorna solo i LEGGIMI);
#   7. rimette i file annidati che non ci sono nella versione nuova.
# Uscite: 0 fatto, 3 zip incompleto, 4 copia di sicurezza non riuscita, 5 copia dei file non riuscita.
param(
  [Parameter(Mandatory = $true)][string]$Sorgente,
  [Parameter(Mandatory = $true)][string]$Destinazione,
  [string]$BackupDati = '',
  [string]$Lavoro = ''
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
function Fine([int]$codice, [string]$testo) { if ($testo) { Write-Host $testo }; exit $codice }

# 1. lo zip e' completo?
$fileElenco = Join-Path $Sorgente 'tools\file-locali.json'
if (-not (Test-Path -LiteralPath $fileElenco)) { Fine 3 '       Lo zip scaricato e'' incompleto (manca tools\file-locali.json): non ho toccato nulla.' }
try { $L = Get-Content -Raw -Encoding UTF8 -LiteralPath $fileElenco | ConvertFrom-Json } catch { Fine 3 '       Lo zip scaricato e'' rovinato (tools\file-locali.json illeggibile): non ho toccato nulla.' }
foreach ($f in $L.controllo_zip) {
  if (-not (Test-Path -LiteralPath (Join-Path $Sorgente $f))) { Fine 3 ("       Lo zip scaricato e' incompleto (manca " + $f + '): non ho toccato nulla.') }
}
$locali = @($L.cartelle) + @($L.file)
$esclusi = @($L.backup_esclusi)
if (-not $Lavoro) { $Lavoro = Join-Path $env:TEMP ('mutant-aggiorna-' + [guid]::NewGuid().ToString('N')) }
if (-not (Test-Path -LiteralPath $Destinazione)) { New-Item -ItemType Directory -Force $Destinazione | Out-Null }

# 2. copia di sicurezza dei dati locali
$daSalvare = @()
foreach ($n in $locali) {
  if ($esclusi -contains $n) { continue }
  $p = Join-Path $Destinazione $n
  if (Test-Path -LiteralPath $p) { $daSalvare += $p }
}
$annidatiTrovati = @()
foreach ($a in $L.annidati) {
  # percorso relativo dal modello (la cartella sopra) e dal nome trovato: mai dal percorso completo, che PowerShell puo'
  # scrivere diverso (nomi brevi come BEASTM~1)
  $rel = ($a -replace '/', '\')
  $sopra = Split-Path -Parent $rel
  foreach ($x in @(Get-Item -Path (Join-Path $Destinazione $rel) -Force -ErrorAction SilentlyContinue)) {
    $annidatiTrovati += [pscustomobject]@{ Percorso = $x.FullName; Relativo = (Join-Path $sopra $x.Name) }
  }
}
if ($daSalvare.Count -gt 0) {
  try {
    $dirB = Join-Path $Destinazione $L.cartella_backup
    New-Item -ItemType Directory -Force $dirB | Out-Null
    $base = 'locali_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')
    $zip = Join-Path $dirB ($base + '.zip'); $k = 2
    while (Test-Path -LiteralPath $zip) { $zip = Join-Path $dirB ($base + '_' + $k + '.zip'); $k++ }
    Compress-Archive -LiteralPath $daSalvare -DestinationPath $zip
    if (-not (Test-Path -LiteralPath $zip) -or (Get-Item -LiteralPath $zip).Length -le 0) { throw 'zip vuoto' }
    Write-Host ('       Copia di sicurezza dei dati di questo PC: ' + $zip)
    # le ultime N
    Get-ChildItem -LiteralPath $dirB -Filter 'locali_*.zip' | Sort-Object LastWriteTime, Name -Descending | Select-Object -Skip ([int]$L.backup_da_tenere) | Remove-Item -Force
  } catch {
    Fine 4 ('       Non riesco a fare la copia di sicurezza dei dati di questo PC (' + $_ + '): non ho aggiornato nulla.')
  }
}

try {
  # 3. data (regole che il master puo' aver modificato): copia in BackupDati, tenuta solo se diversa dalla nuova
  $dati = Join-Path $Destinazione 'data'
  $copiaDati = ''
  if ($BackupDati -and (Test-Path -LiteralPath $dati)) {
    $copiaDati = Join-Path $BackupDati (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')
    New-Item -ItemType Directory -Force $copiaDati | Out-Null
    Copy-Item -Recurse -LiteralPath $dati -Destination $copiaDati
  }

  # 4. annidati da parte
  $conserva = Join-Path $Lavoro 'conserva'
  foreach ($x in $annidatiTrovati) {
    $dove = Join-Path $conserva $x.Relativo
    New-Item -ItemType Directory -Force (Split-Path -Parent $dove) | Out-Null
    Copy-Item -Recurse -Force -LiteralPath $x.Percorso -Destination $dove
  }

  # 5. via l'app vecchia, mai i file locali
  $pkg = Join-Path $Destinazione 'package.json'
  $vecchioPkg = if (Test-Path -LiteralPath $pkg) { Get-Content -Raw -LiteralPath $pkg } else { '' }
  Get-ChildItem -Force -LiteralPath $Destinazione | Where-Object { $locali -notcontains $_.Name } | Remove-Item -Recurse -Force

  # 6. app nuova: robocopy copia e unisce, non cancella nulla (codici fino a 7 = riuscito)
  & robocopy $Sorgente $Destinazione /E /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
  if ($LASTEXITCODE -ge 8) { throw ('robocopy, codice ' + $LASTEXITCODE) }

  # 7. annidati: solo quelli che la versione nuova non ha
  if (Test-Path -LiteralPath $conserva) {
    & robocopy $conserva $Destinazione /E /XC /XN /XO /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
    if ($LASTEXITCODE -ge 8) { throw ('robocopy dei file annidati, codice ' + $LASTEXITCODE) }
  }

  $nuovoPkg = Get-Content -Raw -LiteralPath $pkg
  if ($vecchioPkg -and ($nuovoPkg -ne $vecchioPkg) -and (Test-Path -LiteralPath (Join-Path $Destinazione 'node_modules'))) {
    Remove-Item -Recurse -Force (Join-Path $Destinazione 'node_modules')
    Write-Host '       Componenti da reinstallare: ci pensa il file 3 al prossimo avvio.'
  }
  if ($copiaDati) {
    $h = { param($c) Get-ChildItem -Recurse -File -LiteralPath $c | ForEach-Object { $_.FullName.Substring($c.Length) + (Get-FileHash -LiteralPath $_.FullName).Hash } }
    if (((& $h (Join-Path $copiaDati 'data')) -join ';') -eq ((& $h $dati) -join ';')) {
      Remove-Item -Recurse -Force $copiaDati
      if (-not (Get-ChildItem -Force -LiteralPath $BackupDati)) { Remove-Item -Force -LiteralPath $BackupDati }
    } else { Write-Host ('       I file delle regole (cartella data) erano diversi: copia salvata in ' + $copiaDati) }
  }
  if (Test-Path -LiteralPath $conserva) { Remove-Item -Recurse -Force -LiteralPath $conserva -ErrorAction SilentlyContinue }
} catch {
  Fine 5 ('       Errore durante la copia dei file (' + $_ + '). I dati di questo PC non sono stati toccati; la copia di sicurezza e'' in ' + $L.cartella_backup + '.')
}
Fine 0 ''
