# Loads backend/.env into environment variables, then starts the Spring Boot app.
# Usage (from the backend folder):  .\run.ps1

# Always run from this script's own folder (so double-click / any cwd works)
Set-Location $PSScriptRoot

# Make sure Java 21 is available
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
}

# Read .env: each non-comment KEY=VALUE line becomes an environment variable.
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $i = $line.IndexOf("=")
            $name = $line.Substring(0, $i).Trim()
            $value = $line.Substring($i + 1).Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "Loaded .env - starting PrepPal backend on http://localhost:8080" -ForegroundColor Magenta
} else {
    Write-Host "No .env found - copy .env.example to .env and fill it in." -ForegroundColor Yellow
    exit 1
}

.\mvnw.cmd spring-boot:run
