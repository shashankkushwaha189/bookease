# Test Admin Panels Simple
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing All Admin Panels..."

try {
    # Get admin token
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Admin login: SUCCESS"
    
    # Test Dashboard
    $dashboard = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/summary?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
    Write-Host "Dashboard: $($dashboard.StatusCode)"
    
    # Test Customers
    $customers = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/customers" -Headers $authHeaders -UseBasicParsing
    Write-Host "Customers: $($customers.StatusCode)"
    
    # Test Staff
    $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders -UseBasicParsing
    Write-Host "Staff: $($staff.StatusCode)"
    
    # Test Services
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders -UseBasicParsing
    Write-Host "Services: $($services.StatusCode)"
    
    # Test Reports
    $reports = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/summary?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
    Write-Host "Reports: $($reports.StatusCode)"
    
    # Test Config
    $config = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/config" -Headers $authHeaders -UseBasicParsing
    Write-Host "Config: $($config.StatusCode)"
    
    # Test Audit
    $audit = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/audit" -Headers $authHeaders -UseBasicParsing
    Write-Host "Audit: $($audit.StatusCode)"
    
    Write-Host ""
    Write-Host "All panels tested successfully!"
    
} catch {
    Write-Host "Panel testing failed: $_"
}
