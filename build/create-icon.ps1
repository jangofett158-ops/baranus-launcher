Add-Type -AssemblyName System.Drawing

# Keep the Windows icon in sync with the B mark used in the launcher UI.
$source = Join-Path $PSScriptRoot 'brand-mark.png'
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.Clear([System.Drawing.Color]::Black)
$mark = [System.Drawing.Image]::FromFile($source)
$graphics.DrawImage($mark, 0, 0, 256, 256)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $PSScriptRoot 'icon.ico'))
$icon.Save($stream)
$stream.Close(); $icon.Dispose(); $mark.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
