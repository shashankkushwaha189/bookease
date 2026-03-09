# Check Tenants
$baseUrl = "http://localhost:3000"

Write-Host "Checking Tenants..."

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/tenants" -UseBasicParsing
    Write-Host "Tenants API: $($response.StatusCode)"
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Tenants Count: $($data.data.Count)"
    $data.data | ForEach-Object {
        Write-Host "  - ID: $($_.id)"
        Write-Host "    Name: $($_.name)"
        Write-Host "    Active: $($_.isActive)"
        Write-Host ""
    }
} catch {
    Write-Host "Error: $_"
}
