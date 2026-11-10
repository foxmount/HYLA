$ErrorActionPreference = 'Stop'

$cli = Join-Path $env:LOCALAPPDATA 'Programs\Supabase\supabase.exe'
if (-not (Test-Path -LiteralPath $cli)) {
  throw "Supabase CLI não encontrado em: $cli"
}

$secureToken = Read-Host 'Cole o token pessoal do Supabase' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
  $env:SUPABASE_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)

  & $cli link --project-ref rnfdliedxxmjakcgkhfc
  if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível vincular o projeto (código $LASTEXITCODE)."
  }

  & $cli functions deploy admin-users
  if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível publicar a função (código $LASTEXITCODE)."
  }

  Write-Host 'Função admin-users publicada com sucesso.'
}
finally {
  $env:SUPABASE_ACCESS_TOKEN = $null
  if ($tokenPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  }
}
