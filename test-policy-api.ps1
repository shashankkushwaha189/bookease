# Test Policy API Endpoints
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Policy API Endpoints..."

# Get token first
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($response.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Token obtained successfully"
    
    # Test policy endpoints
    Write-Host "Testing Policy API..."
    
    # Test policy preview endpoint
    $preview = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/policy/preview" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Policy Preview: $($preview.StatusCode)"
    
    # Test policy overrides endpoint
    $overrides = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/policy/overrides" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Policy Overrides: $($overrides.StatusCode)"
    
    # Test policy validation endpoint
    $validationData = @{
        appointmentData = @{
            id = "test-appointment-id"
            startTimeUtc = "2026-03-14T03:30:00.000Z"
            tenantId = "b18e0808-27d1-4253-aca9-453897585106"
        }
        userId = "test-user-id"
        userRole = "ADMIN"
        testType = "cancellation"
        overrideReason = "Testing policy override"
    } | ConvertTo-Json
    
    $validation = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/policy/test" -Headers $authHeaders -Body $validationData -UseBasicParsing
    Write-Host "  Policy Validation: $($validation.StatusCode)"
    
    # Test policy update endpoint
    $updateData = @{
        cancellation = @{
            allowedUntilHoursBefore = 24
            maxReschedules = 3
        }
        noShowGracePeriodMinutes = 15
    } | ConvertTo-Json
    
    $update = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/policy" -Headers $authHeaders -Body $updateData -UseBasicParsing
    Write-Host "  Policy Update: $($update.StatusCode)"
    
    Write-Host "Policy API endpoints test complete!"
    
} catch {
    Write-Host "Error: $_"
}
