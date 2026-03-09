# Test Reports API with correct endpoints
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Reports API with correct endpoints..."

# Get token first
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($response.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Token obtained successfully"
    
    # Test reports endpoints
    Write-Host "Testing Reports API..."
    
    # Test summary endpoint
    $summary = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/summary" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Reports Summary: $($summary.StatusCode)"
    
    # Test peak-times endpoint
    $peakTimes = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/peak-times" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Reports Peak Times: $($peakTimes.StatusCode)"
    
    # Test staff-utilization endpoint
    $staffUtil = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/staff-utilization" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Reports Staff Utilization: $($staffUtil.StatusCode)"
    
    # Test export endpoint
    $export = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/export" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Reports Export: $($export.StatusCode)"
    
    # Test performance endpoint
    $perfData = @{ testType = "summary" } | ConvertTo-Json
    $performance = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/reports/test-performance" -Headers $authHeaders -Body $perfData -UseBasicParsing
    Write-Host "  Reports Performance Test: $($performance.StatusCode)"
    
    Write-Host "Reports API endpoints test complete!"
    
} catch {
    Write-Host "Error: $_"
}
