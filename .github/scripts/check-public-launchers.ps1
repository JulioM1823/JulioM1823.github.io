[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Bundle,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true') {throw 'Fresh hosted CI profile required'}
$bundle=(Resolve-Path -LiteralPath $Bundle).Path
$runtime=Join-Path $bundle 'runtime\pythonw.exe'
$settings=Join-Path $env:LOCALAPPDATA 'Notion Calendar Sync\desktop-settings.json'
if(Test-Path -LiteralPath $settings){throw 'Refusing existing account setup'}
$checks=[Collections.Generic.List[string]]::new()
$since=[DateTime]::UtcNow.AddSeconds(-1)
function Rows {
 @(Get-CimInstance Win32_Process -Filter "Name='pythonw.exe'" | Where-Object {$_.ExecutablePath -and [string]::Equals($_.ExecutablePath,$runtime,[StringComparison]::OrdinalIgnoreCase) -and $_.CreationDate.ToUniversalTime() -ge $since})
}
function Cleanup {
 $rows=@(Rows)
 # Stop supervisors before their children, and only the exact fresh download runtime.
 foreach($row in @($rows | Where-Object {$_.CommandLine -notmatch '--child'})) {Stop-Process -Id $row.ProcessId -Force -ErrorAction SilentlyContinue}
 foreach($row in @(Rows)) {Stop-Process -Id $row.ProcessId -Force -ErrorAction SilentlyContinue}
}
function Window {
 $timer=[Diagnostics.Stopwatch]::StartNew()
 while($timer.Elapsed.TotalSeconds -lt 45){
  foreach($row in @(Rows)){
   $p=Get-Process -Id $row.ProcessId -ErrorAction SilentlyContinue
   if($p){$p.Refresh();if($p.MainWindowHandle -ne 0 -and $p.MainWindowTitle -eq 'Notion Calendar Sync'){return}}
  }
  Start-Sleep -Milliseconds 250
 }
 throw 'Documented launcher failed to display setup window'
}
$result=[ordered]@{passed=$false;checks=@();fresh_ci_profile=$true;real_provider_accounts_accessed=$false}
try {
 $vbs=Join-Path $bundle 'Start Notion Calendar Sync.vbs'
 $p=Start-Process -FilePath 'wscript.exe' -ArgumentList ('"'+$vbs+'"') -PassThru
 Window
 $checks.Add('public Start Notion Calendar Sync.vbs opens real fresh setup window')
 if(Test-Path -LiteralPath $settings){throw 'Unapproved launcher created account setup'}
 $checks.Add('documented launcher creates no approved sync configuration')
 Cleanup
 Start-Sleep -Seconds 1
 $cmd=Join-Path $bundle 'Start Notion Calendar Sync.cmd'
 $p=Start-Process -FilePath $env:ComSpec -ArgumentList ('/d /s /c ""'+$cmd+'""') -PassThru
 Window
 $checks.Add('public cmd fallback opens real fresh setup window')
 Cleanup
 $result.passed=$true
} catch { $result.error=$_.Exception.Message }
finally {
 Cleanup
 $result.checks=@($checks.ToArray())
 $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Output -Encoding utf8
 $result | ConvertTo-Json -Depth 5 | Write-Output
}
if(-not $result.passed){exit 1}
