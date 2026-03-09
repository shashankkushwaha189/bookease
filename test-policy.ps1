$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
    "Content-Type" = "application/json"
}

$body = @{
    "testType" = "cancellation"
    "appointmentData" = @{
        "id" = "3f52d5f9-0791-4d22-8ef5-869edbd300eb"
        "startTimeUtc" = "2026-03-14T03:30:00.000Z"
        "tenantId" = "b18e0808-27d1-4253-aca9-453897585106"
    }
    "userId" = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
    "userRole" = "ADMIN"
    "overrideReason" = "Testing policy enforcement"
} | ConvertTo-Json

Write-Host "Testing policy engine enforcement..."
try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/policy/test" -Headers $headers -Body $body
    Write-Host "Policy Test Response Status:" $response.StatusCode
    Write-Host "Policy Test Response Content:" $response.Content
} catch {
    Write-Host "Policy Test Error occurred: $_"
}
