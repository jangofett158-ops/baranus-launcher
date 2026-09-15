Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(4, 10, 20))
$halo = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 62, 118))
$graphics.FillEllipse($halo, 17, 17, 222, 222)
$inner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(8, 24, 46))
$graphics.FillEllipse($inner, 29, 29, 198, 198)
$outer = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(95, 162, 231)), 8
$graphics.DrawEllipse($outer, 23, 23, 210, 210)
$arc = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(151, 208, 255)), 5
$graphics.DrawArc($arc, 43, 43, 170, 170, 205, 110)
$font = New-Object System.Drawing.Font 'Arial', 142, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$letter = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(201, 228, 255))
$graphics.DrawString('B', $font, $letter, (New-Object System.Drawing.RectangleF 0, -9, 256, 256), $format)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $PSScriptRoot 'icon.ico'))
$icon.Save($stream)
$stream.Close(); $icon.Dispose(); $letter.Dispose(); $font.Dispose(); $arc.Dispose(); $outer.Dispose(); $inner.Dispose(); $halo.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
