# 仲間川地区保全利用協定 公式HP - ローカル動作確認用簡易Webサーバー
$Host.UI.RawUI.WindowTitle = "仲間川地区保全利用協定 - 簡易サーバー稼働中"
Clear-Host

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "  仲間川地区保全利用協定 公式HP - ローカル動作確認サーバー" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "パソコンのセキュリティ制限（CORS）を回避し、"
Write-Host "潮汐データを正しく読み込むための簡易Webサーバーを起動しました。"
Write-Host ""
Write-Host "★ 動作確認の手順"
Write-Host "1. 自動的にブラウザが起動し、ホームページが開きます。"
Write-Host "2. 確認が終わったら、この画面の「×」で閉じるか、"
Write-Host "   画面上で「Ctrl + C」キーを押してサーバーを終了してください。"
Write-Host "-----------------------------------------------------------------------"
Write-Host "簡易サーバーを起動中... (http://localhost:8000)" -ForegroundColor Yellow
Write-Host ""

# ブラウザを自動で開く
Start-Process "http://localhost:8000/index.html"

# HTTPサーバーの設定
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")

try {
    $listener.Start()
} catch {
    Write-Host "【エラー】サーバーの起動に失敗しました。" -ForegroundColor Red
    Write-Host "ポート 8000 が既に別のアプリ（テストツール等）で使用されている可能性があります。" -ForegroundColor Red
    Write-Host "この画面を一度閉じてから、もう一度お試しください。" -ForegroundColor Red
    Read-Host "Enterキーを押すと終了します"
    exit
}

Write-Host "簡易サーバーが正常に起動しました。テスト中はこのウインドウを閉じないでください。" -ForegroundColor Green

# サーバーのメインループ
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        
        $urlPath = $req.Url.LocalPath
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }
        
        # 安全なファイルパスの解決
        $filePath = Join-Path $PSScriptRoot $urlPath.Replace("/", "\")
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $res.ContentType = "text/html; charset=utf-8" }
                ".css"  { $res.ContentType = "text/css" }
                ".js"   { $res.ContentType = "application/javascript" }
                ".txt"  { $res.ContentType = "text/plain; charset=utf-8" }
                ".png"  { $res.ContentType = "image/png" }
                default { $res.ContentType = "application/octet-stream" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.OutputStream.Close()
    } catch {
        # エラー発生時は静かに終了するか、処理を継続
    }
}
