Param(
    [switch]$ForceInstall
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

function Ensure-Dependencies {
    param(
        [string]$ProjectPath
    )

    $nodeModulesPath = Join-Path -Path $repoRoot -ChildPath (Join-Path $ProjectPath 'node_modules')

    if ($ForceInstall -or -not (Test-Path $nodeModulesPath)) {
        Write-Host "Installing dependencies for $ProjectPath" -ForegroundColor Cyan
        npm --prefix (Join-Path $repoRoot $ProjectPath) install
    }
}

Ensure-Dependencies -ProjectPath 'server'
Ensure-Dependencies -ProjectPath 'client'

Write-Host "Starting backend dev server..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Param($Root)
    Set-Location $Root
    npm --prefix server run dev
} -ArgumentList $repoRoot

Write-Host "Starting frontend dev server..." -ForegroundColor Green
$clientJob = Start-Job -ScriptBlock {
    Param($Root)
    Set-Location $Root
    npm --prefix client run dev -- --host
} -ArgumentList $repoRoot

function Show-JobInfo {
    Write-Host "`nJobs running:" -ForegroundColor Yellow
    Get-Job | Format-Table Id, State, Command -AutoSize
    Write-Host "`nUse 'Receive-Job -Id <id>' to view output." -ForegroundColor Yellow
    Write-Host "Use 'Stop-Job -Id <id>' then 'Remove-Job -Id <id>' to stop and clean up." -ForegroundColor Yellow
}

Show-JobInfo

Register-EngineEvent PowerShell.Exiting -Action {
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
} | Out-Null

Write-Host "`nDev servers are starting. Press Ctrl+C to exit (jobs will be stopped automatically)." -ForegroundColor Green
Wait-Job -Job $serverJob, $clientJob
