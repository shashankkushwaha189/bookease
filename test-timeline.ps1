$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing timeline endpoint..."
try {
    $response = Invoke-WebRequest -Method GET -Uri "http://localhost:3000/api/appointments/3f52d5f9-0791-4d22-8ef5-869edbd300eb/timeline" -Headers $headers
    Write-Host "Timeline Response Status:" $response.StatusCode
    Write-Host "Timeline Response Content:" $response.Content
} catch {
    Write-Host "Timeline Test Error occurred: $_"
}
