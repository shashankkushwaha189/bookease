Write-Host "Testing available endpoints..."

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
    "Content-Type" = "application/json"
}

$endpoints = @(
    "/api/appointment/book",
    "/api/appointment/locks",
    "/api/public/bookings",
    "/api/appointments"
)

foreach ($endpoint in $endpoints) {
    Write-Host "Testing endpoint: $endpoint"
    try {
        $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000$endpoint" -Headers $headers -Body '{"test":"data"}'
        Write-Host "  Status: $($response.StatusCode)"
        if ($response.StatusCode -eq 404) {
            Write-Host "  Content: NOT_FOUND - Endpoint not found"
        } else {
            Write-Host "  Content: Endpoint exists"
        }
    } catch {
        Write-Host "  Error: $_"
    }
    Write-Host ""
}
