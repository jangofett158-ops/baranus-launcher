Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(8, 9, 13))
$outer = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(182, 193, 255)), 12
$graphics.DrawEllipse($outer, 24, 24, 208, 208)
$orbit = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(105, 120, 190)), 8
$graphics.DrawEllipse($orbit, 13, 76, 230, 105)
$font = New-Object System.Drawing.Font 'Georgia', 138, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('B', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, -7, 256, 256), $format)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $PSScriptRoot 'icon.ico'))
$icon.Save($stream)
$stream.Close(); $icon.Dispose(); $font.Dispose(); $outer.Dispose(); $orbit.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
