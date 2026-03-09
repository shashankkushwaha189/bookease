# Test Customer and Admin API Endpoints
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Customer and Admin API Endpoints..."

# Get token first
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($response.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Token obtained successfully"
    
    # Test customers API
    Write-Host "Testing Customers API..."
    $customers = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/customers" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Customers List: $($customers.StatusCode)"
    
    # Test customer creation
    $customerData = @{
        name = "New Test Customer"
        email = "newtest@example.com"
        phone = "9876543210"
        notes = "Test customer notes"
        tags = @("VIP", "Test")
    }
    $createCustomer = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/customers" -Headers $authHeaders -Body ($customerData | ConvertTo-Json) -UseBasicParsing
    Write-Host "  Create Customer: $($createCustomer.StatusCode)"
    
    # Test services API
    Write-Host "Testing Services API..."
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Services List: $($services.StatusCode)"
    
    # Test staff API
    Write-Host "Testing Staff API..."
    $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Staff List: $($staff.StatusCode)"
    
    # Test reports API
    Write-Host "Testing Reports API..."
    $reports = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Reports: $($reports.StatusCode)"
    
    # Test audit API
    Write-Host "Testing Audit API..."
    $audit = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/audit" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Audit: $($audit.StatusCode)"
    
    # Test policy API
    Write-Host "Testing Policy API..."
    $policy = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/policy" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Policy: $($policy.StatusCode)"
    
    Write-Host "Customer and Admin API endpoints test complete!"
    
} catch {
    Write-Host "Error: $_"
}
