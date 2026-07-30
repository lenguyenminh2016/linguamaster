$server = Join-Path $PSScriptRoot "src\server.js"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required to run the LinguaMaster backend."
    exit 1
}

& node $server
