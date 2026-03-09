# Test All Fixes Simple
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing All Fixes..."

try {
    # Test 1: Public Services (should work without auth)
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    Write-Host "Public Services: $($services.StatusCode)"
    
    # Test 2: Public Staff (should work without auth)
    $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff" -Headers $headers -UseBasicParsing
    Write-Host "Public Staff: $($staff.StatusCode)"
    
    # Test 3: Public Availability (should work without auth)
    $availability = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=test&staffId=test&date=2026-03-09" -Headers $headers -UseBasicParsing
    Write-Host "Public Availability: $($availability.StatusCode)"
    
    # Test 4: Public Booking (should work without auth)
    $bookingData = @{ serviceId = "test"; staffId = "test"; customer = @{ name = "Test" }; consentGiven = $true } | ConvertTo-Json
    $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body $bookingData -UseBasicParsing
    Write-Host "Public Booking: $($booking.StatusCode)"
    
    # Test 5: Protected Routes (should require auth)
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    $appointments = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments" -Headers $authHeaders -UseBasicParsing
    Write-Host "Protected Appointments: $($appointments.StatusCode)"
    
    $customers = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/customers" -Headers $authHeaders -UseBasicParsing
    Write-Host "Protected Customers: $($customers.StatusCode)"
    
    Write-Host ""
    Write-Host "Fixes verification complete!"
    
} catch {
    Write-Host "Test error: $_"
}
