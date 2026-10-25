# Installa Node.js 22 (LTS) dal sito ufficiale, con il controllo dell'impronta SHA-256. Lo usa Mutant.bat quando Node
# non c'e' (25/10/2026, «un ingresso solo»: era distribuzione\2_installa_node.bat). Esce con 0 se l'installazione e'
# andata, 3010 se Windows chiede un riavvio, altrimenti con un codice d'errore e un messaggio.
# Messaggi senza lettere accentate: la console di Windows non e' in UTF-8.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$cartellaNode = 'https://nodejs.org/dist/latest-v22.x/'
$lavoro = Join-Path $env:TEMP 'mutant-node'

if ($env:PROCESSOR_ARCHITECTURE -eq 'x86' -and -not $env:PROCESSOR_ARCHITEW6432) {
  Write-Host ' Questo computer ha Windows a 32 bit: Node.js 22 richiede Windows a 64 bit. Avvisa Marcello.'
  exit 2
}
try {
  if (Test-Path $lavoro) { Remove-Item -Recurse -Force $lavoro }
  New-Item -ItemType Directory -Path $lavoro | Out-Null
  Write-Host ' [1/3] Cerco la versione piu'' recente di Node.js 22 (LTS)...'
  $t = (Invoke-WebRequest -UseBasicParsing -Uri ($cartellaNode + 'SHASUMS256.txt') -TimeoutSec 60).Content
  $riga = ($t -split [char]10) | Where-Object { $_ -match '\s(node-v[\d.]+-x64\.msi)\s*$' } | Select-Object -First 1
  if (-not $riga) { Write-Host ' Non trovo il file di installazione nell''elenco di nodejs.org. Riprova piu'' tardi.'; exit 3 }
  $p = $riga.Trim() -split '\s+'
  $impronta = $p[0]; $nome = $p[1]
  $installer = Join-Path $lavoro $nome
  Write-Host " [2/3] Scarico $nome (circa 30 MB, attendi qualche minuto)..."
  Invoke-WebRequest -UseBasicParsing -Uri ($cartellaNode + $nome) -OutFile $installer -TimeoutSec 1200
  if ((Get-FileHash -Algorithm SHA256 $installer).Hash -ne $impronta) { Write-Host ' Il file scaricato non e'' integro: riprova.'; exit 4 }
} catch {
  Write-Host " Non riesco a scaricare Node.js: controlla la connessione a internet e riprova. ($($_.Exception.Message))"
  exit 1
}
Write-Host ' [3/3] Si apre l''installazione di Node.js:'
Write-Host '   - premi "Next" in ogni schermata e accetta la licenza;'
Write-Host '   - lascia tutte le opzioni come sono;'
Write-Host '   - se Windows chiede "Consentire a questa app di apportare modifiche?", rispondi Si;'
Write-Host '   - alla fine premi "Finish".'
$proc = Start-Process -FilePath 'msiexec.exe' -ArgumentList '/i', "`"$installer`"" -Wait -PassThru
Remove-Item -Recurse -Force $lavoro -ErrorAction SilentlyContinue
exit $proc.ExitCode
