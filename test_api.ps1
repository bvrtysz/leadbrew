$leads = Invoke-RestMethod -Uri 'http://localhost:3001/api/leads' -Method GET
$leadId = $leads[0].id
$leadName = $leads[0].name
Write-Output "Lead: $leadName (ID: $leadId)"

# Now test sending email through API
$sendBody = @{
    lead_id = $leadId
    lead_email = "bvrtysz@gmail.com"
    subject = "LeadBrew Test - API Uzerinden Gonderim"
    body = "Merhaba, bu e-posta LeadBrew sitesi uzerinden API ile gonderildi. Sistem basariyla calisiyor!"
} | ConvertTo-Json

Write-Output "Gonderiliyor..."

try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/emails/send' -Method POST -Body $sendBody -ContentType 'application/json; charset=utf-8'
    Write-Output "SONUC: $($result.message)"
    Write-Output "SUCCESS: $($result.success)"
} catch {
    $errorBody = $_.ErrorDetails.Message
    Write-Output "HATA: $errorBody"
    Write-Output "DETAY: $_"
}
