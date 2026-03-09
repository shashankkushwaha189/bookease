$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
    "Content-Type" = "application/json"
}

$body = @{
    "serviceId" = "c45a5e05-78d8-4164-a1ac-313e2cefcfce"
    "staffId" = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
    "customer" = @{
        "name" = "Test Customer"
        "email" = "test@example.com"
        "phone" = "1234567890"
    }
    "startTimeUtc" = "2026-03-14T03:30:00.000Z"
    "endTimeUtc" = "2026-03-14T04:30:00.000Z"
    "consentGiven" = $true
    "ipAddress" = "127.0.0.1"
    "sessionToken" = "test-session-123"
} | ConvertTo-Json

Write-Host "Testing appointment booking endpoint..."
try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/appointments/book" -Headers $headers -Body $body
    Write-Host "Response Status:" $response.StatusCode
    Write-Host "Response Content:" $response.Content
} catch {
    Write-Host "Error occurred: $_"
}

Write-Host ""
Write-Host "Testing slot locking endpoint..."
$lockBody = @{
    "staffId" = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
    "startTimeUtc" = "2026-03-14T03:30:00.000Z"
    "endTimeUtc" = "2026-03-14T04:30:00.000Z"
    "sessionToken" = "test-session-123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/appointments/locks" -Headers $headers -Body $lockBody
    Write-Host "Lock Response Status:" $response.StatusCode
    Write-Host "Lock Response Content:" $response.Content
} catch {
    Write-Host "Lock Error occurred: $_"
}
