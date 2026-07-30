Write-Output "Railway deploy bekleniyor (60 saniye)..."
Start-Sleep 60

$baseUrl = "https://leadbrew-production-d873.up.railway.app"

Write-Output "Railway API test ediliyor..."

$sendBody = @{
    lead_email = "bvrtysz@gmail.com"
    subject = "LeadBrew - Resend API Test"
    body = "Tebrikler! Bu e-posta Railway uzerinden Resend HTTP API ile basariyla gonderildi. Sistem 7/24 calisiyor!"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/emails/send" -Method POST -Body $sendBody -ContentType 'application/json; charset=utf-8' -TimeoutSec 30
    Write-Output "BASARILI: $($result.message)"
    Write-Output "ID: $($result.id)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Output "HATA KODU: $statusCode"
    Write-Output "EXCEPTION: $($_.Exception.Message)"
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Output "SUNUCU HATASI: $errorBody"
    } catch {
        Write-Output "Hata detayi alinamadi"
    }
}
