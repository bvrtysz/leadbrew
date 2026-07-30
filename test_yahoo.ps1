$baseUrl = "https://leadbrew-production-d873.up.railway.app"

Write-Output "bavertuysuz@yahoo.com adresine e-posta gonderiliyor..."

$sendBody = @{
    lead_email = "bavertuysuz@yahoo.com"
    subject = "Conbella - Ozel Cay ve Kahve Teklifi"
    body = "Merhaba Baver Bey,`n`nConbella platformu uzerinden gonderilen gercek e-posta testidir.`n`nIyi calismalar dileriz,`nConbella Ekibi"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/emails/send" -Method POST -Body $sendBody -ContentType 'application/json; charset=utf-8' -TimeoutSec 30
    Write-Output "=========================================="
    Write-Output "SONUC: $($result.message)"
    Write-Output "STATUS: $($result.success)"
    Write-Output "EMAIL ID: $($result.id)"
    Write-Output "=========================================="
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Output "HATA KODU: $statusCode"
    Write-Output "EXCEPTION: $($_.Exception.Message)"
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Output "SUNUCU DETAYI: $errorBody"
    } catch {}
}
