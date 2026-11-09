# Native, CI-only acceptance check for the shipped frozen Windows executable.
# No real accounts, startup preferences or user sync state are accessed.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [Parameter(Mandatory=$true)][string]$Output
)
$ErrorActionPreference = 'Stop'
if ($env:CI -ne 'true' -or $env:GITHUB_ACTIONS -ne 'true') {
    throw 'This validation is restricted to a fresh GitHub Actions Windows CI profile.'
}
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'Native Windows execution is required.'
}
$script:AppPath = (Resolve-Path -LiteralPath $Executable).Path
if ([IO.Path]::GetExtension($script:AppPath) -ne '.exe') { throw 'Choose the frozen application executable.' }
$script:AppName = [IO.Path]::GetFileName($script:AppPath)
if ($script:AppName -notmatch '^[A-Za-z0-9 ._-]+\.exe$') { throw 'Unexpected executable name.' }
$settings = Join-Path $env:LOCALAPPDATA 'Notion Calendar Sync\desktop-settings.json'
if (Test-Path -LiteralPath $settings) { throw 'Existing desktop setup found; refusing to touch this profile.' }
$script:Started = [DateTime]::UtcNow
$script:Owned = @{}
$script:Roots = [Collections.Generic.List[int]]::new()
$checks = [Collections.Generic.List[string]]::new()
$result = [ordered]@{
    native_windows = $true
    artifact = $script:AppName
    executable_sha256 = (Get-FileHash -LiteralPath $script:AppPath -Algorithm SHA256).Hash.ToLowerInvariant()
    fresh_ci_profile = $true
    started_utc = $script:Started.ToString('o')
    checks = @()
    passed = $false
    cleanup_errors = @()
}

function Get-AppRows {
    @(Get-CimInstance Win32_Process -Filter "Name = '$script:AppName'" |
      Where-Object { $_.ExecutablePath -and [string]::Equals($_.ExecutablePath, $script:AppPath, [StringComparison]::OrdinalIgnoreCase) })
}
function Remember-OwnedTree {
    $rows = @(Get-AppRows)
    # Only roots launched by this script and their same-executable descendants
    # are eligible. Creation timestamps prevent stopping a reused process ID.
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($row in $rows) {
            $id = [int]$row.ProcessId
            if ($script:Owned.ContainsKey($id)) { continue }
            $isRoot = $script:Roots.Contains($id)
            $isChild = $script:Owned.ContainsKey([int]$row.ParentProcessId)
            if (($isRoot -or $isChild) -and $row.CreationDate.ToUniversalTime() -ge $script:Started.AddSeconds(-1)) {
                $script:Owned[$id] = [pscustomobject]@{
                    Id = $id
                    Parent = [int]$row.ParentProcessId
                    Creation = $row.CreationDate.ToUniversalTime().ToString('o')
                }
                $changed = $true
            }
        }
    }
    return $rows
}
function Stop-ExactOwned([int]$processId) {
    if (-not $script:Owned.ContainsKey($processId)) { return }
    $record = $script:Owned[$processId]
    $row = @(Get-AppRows | Where-Object { [int]$_.ProcessId -eq $processId })
    if ($row.Count -eq 0) { return }
    if ($row[0].CreationDate.ToUniversalTime().ToString('o') -ne $record.Creation) {
        throw "Process identity changed for owned ID $processId; refusing to stop it."
    }
    Stop-Process -Id $processId -Force -ErrorAction Stop
}
function Stop-Owned {
    $null = Remember-OwnedTree
    # Stop supervisors first so killing their children cannot trigger a restart.
    foreach ($id in @($script:Roots)) { Stop-ExactOwned $id }
    for ($attempt = 0; $attempt -lt 8; $attempt++) {
        $rows = @(Remember-OwnedTree)
        $alive = @($rows | Where-Object { $script:Owned.ContainsKey([int]$_.ProcessId) })
        if ($alive.Count -eq 0) { return }
        foreach ($row in $alive) { Stop-ExactOwned ([int]$row.ProcessId) }
        Start-Sleep -Milliseconds 200
    }
    throw 'An owned validation process did not exit.'
}
function Start-Owned([string[]]$Arguments) {
    $process = Start-Process -FilePath $script:AppPath -ArgumentList $Arguments -PassThru
    $script:Roots.Add([int]$process.Id)
    $null = Remember-OwnedTree
    return $process
}
function Wait-Check([string]$Name, [scriptblock]$Condition, [int]$Seconds = 60) {
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt $Seconds) {
        $value = & $Condition
        if ($value) {
            $checks.Add($Name)
            Write-Host "$Name passed"
            return $value
        }
        Start-Sleep -Milliseconds 250
    }
    throw "Timed out: $Name"
}

try {
    $smoke = Start-Owned @('--smoke-test')
    if (-not $smoke.WaitForExit(60000)) { throw 'Offline frozen UI smoke test timed out.' }
    if ($smoke.ExitCode -ne 0) { throw "Offline frozen UI failed with exit $($smoke.ExitCode)." }
    $checks.Add('frozen offline setup window opens and exits zero')
    Stop-Owned

    $child = Start-Owned @('--child')
    $window = Wait-Check 'fresh-profile frozen application displays real setup window' {
        $rows = @(Remember-OwnedTree)
        foreach ($row in $rows) {
            if (-not $script:Owned.ContainsKey([int]$row.ProcessId)) { continue }
            $p = Get-Process -Id $row.ProcessId -ErrorAction SilentlyContinue
            if ($p) {
                $p.Refresh()
                if ($p.MainWindowHandle -ne 0 -and $p.MainWindowTitle -eq 'Notion Calendar Sync') { return $p }
            }
        }
        return $null
    }
    if (Test-Path -LiteralPath $settings) { throw 'The unconfigured setup window unexpectedly created saved account setup.' }
    $checks.Add('unconfigured launch creates no approved sync configuration')
    Stop-Owned

    $guardian = Start-Owned @('--background')
    $original = Wait-Check 'frozen guardian starts an owned application child' {
        @(Remember-OwnedTree | Where-Object {
            [int]$_.ParentProcessId -eq $guardian.Id -and $script:Owned.ContainsKey([int]$_.ProcessId) -and
            $_.CommandLine -match '--child'
        }) | Select-Object -First 1
    }
    $originalId = [int]$original.ProcessId
    Stop-ExactOwned $originalId
    $replacement = Wait-Check 'frozen guardian restarts crashed owned child' {
        @(Remember-OwnedTree | Where-Object {
            [int]$_.ParentProcessId -eq $guardian.Id -and [int]$_.ProcessId -ne $originalId -and
            $script:Owned.ContainsKey([int]$_.ProcessId) -and $_.CommandLine -match '--child'
        }) | Select-Object -First 1
    }
    Start-Sleep -Seconds 2
    $alive = @(Remember-OwnedTree | Where-Object { [int]$_.ProcessId -eq [int]$replacement.ProcessId })
    if ($alive.Count -ne 1) { throw 'Replacement child did not remain alive.' }
    $checks.Add('restarted frozen child remains alive')
    $result.passed = $true
} catch {
    $result.error = $_.Exception.GetType().Name
    $result.message = $_.Exception.Message
} finally {
    try { Stop-Owned } catch { $result.cleanup_errors = @($_.Exception.Message); $result.passed = $false }
    $result.checks = @($checks.ToArray())
    $result.completed_utc = [DateTime]::UtcNow.ToString('o')
    $folder = Split-Path -Parent ([IO.Path]::GetFullPath($Output))
    if (-not (Test-Path -LiteralPath $folder)) { $null = New-Item -ItemType Directory -Path $folder -Force }
    $result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Output -Encoding utf8
    $result | ConvertTo-Json -Depth 6 | Write-Output
}
if (-not $result.passed) { exit 1 }
