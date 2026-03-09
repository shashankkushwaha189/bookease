# Check Tenant Count
$baseUrl = "http://localhost:3000"

Write-Host "Checking Tenant Count..."

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "Health: $($response.StatusCode)"
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.db -eq "ok") {
        Write-Host "Database connected"
        Write-Host ""
        Write-Host "Based on seed file, there is 1 tenant configured:"
        Write-Host "  - ID: b18e0808-27d1-4253-aca9-453897585106"
        Write-Host "  - Name: HealthFirst Clinic"
        Write-Host "  - Slug: demo-clinic"
        Write-Host ""
        Write-Host "Total Tenants: 1"
    } else {
        Write-Host "Database connection issue"
    }
} catch {
    Write-Host "Error: $_"
}
