param(
  [string]$BuildRoot = "C:\vzb",
  [string]$StoreDir = "C:\vzs",
  [string]$OutputDir
)

$ErrorActionPreference = "Stop"

function Get-FullPath([string]$Path) {
  return [System.IO.Path]::GetFullPath($Path)
}

$repoRoot = Get-FullPath (Join-Path $PSScriptRoot "..")
$buildRootFull = Get-FullPath $BuildRoot
$storeDirFull = Get-FullPath $StoreDir
$outputDirFull = if ($OutputDir) {
  Get-FullPath $OutputDir
} else {
  Get-FullPath (Join-Path $repoRoot "artifacts")
}

if ($buildRootFull -eq [System.IO.Path]::GetPathRoot($buildRootFull)) {
  throw "Refusing to use a drive root as BuildRoot: $buildRootFull"
}

if ($buildRootFull.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "BuildRoot must be outside the repository so Android paths stay short."
}

if (Test-Path -LiteralPath $buildRootFull) {
  Remove-Item -LiteralPath $buildRootFull -Recurse -Force
}

New-Item -ItemType Directory -Path $buildRootFull | Out-Null

$excludeDirs = @(
  ".git",
  "node_modules",
  ".turbo",
  ".vercel",
  ".stryker-tmp",
  "stryker-tmp",
  "dist",
  "build",
  "coverage",
  "artifacts",
  "test-results",
  ".expo",
  ".wrangler",
  ".vite",
  ".gradle",
  ".cxx",
  ".v"
)

$excludeFiles = @(".env", ".env.*", ".dev.vars", "*.log")

robocopy $repoRoot $buildRootFull /E /NFL /NDL /NJH /NJS /NP /XD $excludeDirs /XF $excludeFiles
$copyExitCode = $LASTEXITCODE
if ($copyExitCode -ge 8) {
  throw "robocopy failed with exit code $copyExitCode"
}

pnpm.cmd install --frozen-lockfile --store-dir $storeDirFull --virtual-store-dir .v --dir $buildRootFull

$env:NODE_ENV = "production"
if (Test-Path -LiteralPath (Join-Path $buildRootFull "apps\mobile\google-services.json")) {
  $env:VALIDADE_ZERO_USE_LOCAL_FIREBASE = "1"
}

$appJson = Get-Content -LiteralPath (Join-Path $buildRootFull "apps\mobile\app.json") -Raw | ConvertFrom-Json
$versionName = [string]$appJson.expo.version
$versionCode = [string]$appJson.expo.android.versionCode
$androidDir = Join-Path $buildRootFull "apps\mobile\android"
$nativeGradle = Join-Path $androidDir "app\build.gradle"

if (Test-Path -LiteralPath $nativeGradle) {
  $nativeGradleText = Get-Content -LiteralPath $nativeGradle -Raw
  $nativeGradleText = $nativeGradleText -replace "(?m)^(\s*)versionCode\s+\d+", "`$1versionCode $versionCode"
  $nativeGradleText = $nativeGradleText -replace '(?m)^(\s*)versionName\s+"[^"]+"', "`$1versionName `"$versionName`""
  Set-Content -LiteralPath $nativeGradle -Value $nativeGradleText -NoNewline
}

Push-Location $androidDir
try {
  .\gradlew.bat :app:assembleRelease
} finally {
  Pop-Location
}

$sourceApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path -LiteralPath $sourceApk)) {
  throw "Expected APK was not produced: $sourceApk"
}

$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$aapt = Get-ChildItem -LiteralPath (Join-Path $sdkRoot "build-tools") -Filter "aapt.exe" -Recurse -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if ($aapt) {
  $badging = & $aapt.FullName dump badging $sourceApk
  $packageLine = ($badging | Select-String -Pattern "^package:" | Select-Object -First 1).Line

  if ($packageLine -notmatch "versionCode='$([regex]::Escape($versionCode))'") {
    throw "APK versionCode mismatch. app.json=$versionCode, APK badging=$packageLine"
  }

  if ($packageLine -notmatch "versionName='$([regex]::Escape($versionName))'") {
    throw "APK versionName mismatch. app.json=$versionName, APK badging=$packageLine"
  }
}

New-Item -ItemType Directory -Path $outputDirFull -Force | Out-Null
$outputApk = Join-Path $outputDirFull "validade-zero-staging-$versionName-$versionCode.apk"
Copy-Item -LiteralPath $sourceApk -Destination $outputApk -Force

Write-Output "APK: $outputApk"
Write-Output "Version: $versionName ($versionCode)"
Write-Output "Build root: $buildRootFull"

exit 0
