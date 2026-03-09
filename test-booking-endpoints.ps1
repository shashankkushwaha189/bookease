# Test Booking API Endpoints
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Booking API Endpoints..."

# Get token first
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($response.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Token obtained successfully"
    
    # Test appointments endpoints
    Write-Host "Testing Appointments API..."
    $appointments = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Appointments List: $($appointments.StatusCode)"
    
    # Test appointment creation
    $bookingData = @{
        serviceId = "c45a5e05-78d8-4164-a1ac-313e2cefcfce"
        staffId = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
        customer = @{
            name = "Test Customer"
            email = "test@example.com"
            phone = "1234567890"
        }
        startTimeUtc = "2026-03-14T03:30:00.000Z"
        endTimeUtc = "2026-03-14T04:30:00.000Z"
        consentGiven = $true
        sessionToken = "test-session-123"
    }
    $createBooking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/appointments/book" -Headers $authHeaders -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
    Write-Host "  Create Booking: $($createBooking.StatusCode)"
    
    # Test availability endpoint
    Write-Host "Testing Availability API..."
    $availability = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/availability?serviceId=c45a5e05-78d8-4164-a1ac-313e2cefcfce&staffId=68f11f56-fdc5-4070-8e0a-09fc33506ded&date=2026-03-14" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Availability: $($availability.StatusCode)"
    
    # Test timeline endpoint
    Write-Host "Testing Timeline API..."
    $timeline = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/3f52d5f9-0791-4d22-8ef5-869edbd300eb/timeline" -Headers $authHeaders -UseBasicParsing
    Write-Host "  Timeline: $($timeline.StatusCode)"
    
    Write-Host "Booking API endpoints test complete!"
    
} catch {
    Write-Host "Error: $_"
}
