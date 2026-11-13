param(
    [string]$Package = "com.ffmfmelet.frfjrje",
    [string]$OutputDir = "",
    [switch]$NoClear
)

$ErrorActionPreference = "Stop"

function Find-Adb {
    $adb = Get-Command adb -ErrorAction SilentlyContinue
    if ($adb) {
        return $adb.Source
    }

    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
        "${env:ProgramFiles(x86)}\Android\android-sdk\platform-tools\adb.exe",
        "$env:ProgramFiles\Android\android-sdk\platform-tools\adb.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }

    throw "adb.exe not found. Install Android SDK Platform-Tools and add it to PATH."
}

function Invoke-Adb {
    param([string[]]$Args)

    $adbArgs = @()
    if ($script:DeviceSerial) {
        $adbArgs += @("-s", $script:DeviceSerial)
    }
    $adbArgs += $Args

    & $script:AdbPath @adbArgs
    if ($LASTEXITCODE -ne 0 -and $Args[0] -ne "logcat") {
        throw "adb $($adbArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Get-ConnectedDevices {
    $lines = Invoke-Adb @("devices")
    return @(
        $lines |
            Select-Object -Skip 1 |
            Where-Object { $_ -match "\tdevice$" } |
            ForEach-Object { ($_ -split "\t")[0] }
    )
}

function Get-PackageUid {
    param([string]$PackageName)

    $output = Invoke-Adb @("shell", "pm", "list", "packages", "-U", $PackageName)
    foreach ($line in $output) {
        if ($line -match "^package:$([regex]::Escape($PackageName))\s+uid:(\d+)$") {
            return [int]$Matches[1]
        }
    }

    return $null
}

function Get-PackagePid {
    param([string]$PackageName)

    $pidOutput = Invoke-Adb @("shell", "pidof", "-s", $PackageName)
    $pidText = ($pidOutput | Out-String).Trim()
    if ($pidText -match "^\d+$") {
        return [int]$pidText
    }

    return $null
}

function Wait-ForPackagePid {
    param(
        [string]$PackageName,
        [int]$TimeoutSec = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $pid = Get-PackagePid -PackageName $PackageName
        if ($pid) {
            return $pid
        }

        Start-Sleep -Seconds 1
    }

    return $null
}

$script:AdbPath = Find-Adb
$devices = Get-ConnectedDevices

if ($devices.Count -eq 0) {
    throw "No authorized Android device found. Run 'adb devices' and allow USB debugging on the phone."
}

if ($devices.Count -gt 1) {
    $script:DeviceSerial = $devices[0]
    Write-Warning "Multiple devices detected, using the first one: $($script:DeviceSerial)"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "logs"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $OutputDir "$Package-$timestamp.log"

Write-Host ""
Write-Host "Package : $Package"
Write-Host "ADB     : $script:AdbPath"
Write-Host "Output  : $logFile"
Write-Host ""

if (-not $NoClear) {
    Write-Host "Clearing old logcat buffer..."
    Invoke-Adb @("logcat", "-c")
}

$uid = Get-PackageUid -PackageName $Package
$pid = Get-PackagePid -PackageName $Package

if (-not $pid) {
    Write-Host "App is not running yet."
    Write-Host "Open the app on the phone now..."
    $pid = Wait-ForPackagePid -PackageName $Package -TimeoutSec 120
}

if (-not $pid) {
    throw "Could not find running process for $Package. Start the app on the phone and run the script again."
}

Write-Host "Process PID: $pid"
if ($uid) {
    Write-Host "Package UID: $uid"
}

Write-Host ""
Write-Host "Recording logs. Press Ctrl+C to stop."
Write-Host ""

$logcatArgs = @("logcat", "-v", "threadtime")

if ($uid) {
    $logcatArgs += @("--uid=$uid")
} else {
    Write-Warning "UID not found, falling back to PID filter."
    $logcatArgs += @("--pid=$pid")
}

$runArgs = @()
if ($script:DeviceSerial) {
    $runArgs += @("-s", $script:DeviceSerial)
}
$runArgs += $logcatArgs

try {
    & $script:AdbPath @runArgs | Tee-Object -FilePath $logFile
} catch {
    if ($_.Exception.Message -notmatch "pipeline|broken") {
        throw
    }
}

Write-Host ""
Write-Host "Saved to: $logFile"
