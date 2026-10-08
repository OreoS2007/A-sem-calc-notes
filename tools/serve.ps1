# ローカルでサイトを確認するための簡易サーバー(Windows PowerShell)
# 使い方: powershell -NoProfile -File tools\serve.ps1 -Root . -Port 8765   →  http://localhost:8765/
param([string]$Root, [int]$Port = 8765)
Add-Type -AssemblyName System.Web
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript'; '.webp'='image/webp'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml' }
while ($l.IsListening) {
  $c = $l.GetContext()
  $path = [System.Web.HttpUtility]::UrlDecode($c.Request.Url.AbsolutePath)
  if ($path.EndsWith('/')) { $path += 'index.html' }
  $f = Join-Path $Root ($path.TrimStart('/') -replace '/','\')
  if (Test-Path $f -PathType Leaf) {
    $b = [System.IO.File]::ReadAllBytes($f)
    $ext = [System.IO.Path]::GetExtension($f).ToLower()
    $c.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
    $c.Response.OutputStream.Write($b,0,$b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}

