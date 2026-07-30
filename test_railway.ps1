# Railway API uzerinden lead al ve email gonder
$baseUrl = "https://leadbrew-production-d873.up.railway.app"

Write-Output "1. Lead'ler aliniyor..."
$leads = Invoke-RestMethod -Uri "$baseUrl/api/leads" -Method GET
$lead = $leads[0]
Write-Output "Lead: $($lead.name) - $($lead.email) (ID: $($lead.id))"

Write-Output ""
Write-Output "2. E-posta gonderiliyor..."

$sendBody = @{
    lead_id = $lead.id
    lead_email = "bvrtysz@gmail.com"
    subject = "LeadBrew Railway Test"
    body = "Bu e-posta Railway uzerinden basariyla gonderildi!"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/emails/send" -Method POST -Body $sendBody -ContentType 'application/json; charset=utf-8' -TimeoutSec 30
    Write-Output "BASARILI: $($result.message)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = ""
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
    } catch {}
    Write-Output "HATA KODU: $statusCode"
    Write-Output "HATA DETAY: $errorBody"
    Write-Output "EXCEPTION: $_"
}
