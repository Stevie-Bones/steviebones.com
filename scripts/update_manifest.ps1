<#
Regenerate images/manifest.json listing image files in the images/ folder.
Usage:
  Open PowerShell in the repo root and run: .\scripts\update_manifest.ps1
#>
param(
    [string]$ImagesDir = "images",
    [string]$ManifestPath = "images/manifest.json"
)

$picturePattern = 'Picture_\d{3}\.jpg'

if (-not (Test-Path $ImagesDir)) {
    Write-Error "Images directory '$ImagesDir' not found."
    exit 1
}

$files = Get-ChildItem -Path $ImagesDir -File | ForEach-Object { $_.Name }
# Keep banner files first, then Picture_### sorted naturally
$banners = $files | Where-Object { $_ -match '^banner' }
$pictures = $files | Where-Object { $_ -match $picturePattern } | Sort-Object
$others = $files | Where-Object { ($_ -notin $banners) -and ($_ -notin $pictures) } | Sort-Object

$list = @()
$list += $banners
$list += $pictures
$list += $others

$json = $list | ConvertTo-Json -Depth 1
Set-Content -Path $ManifestPath -Value $json -Encoding UTF8
Write-Output "Wrote $ManifestPath with $($list.Count) entries." 