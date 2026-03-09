# Test Customer Booking Simple
$baseUrl = "http://localhost:3000"
$webUrl = "http://localhost:5173"

Write-Host "Investigating Customer Booking Issues..."

# Test 1: Check web app
Write-Host "1. Checking Web App..."
try {
    $webResponse = Invoke-WebRequest -Method GET -Uri $webUrl -UseBasicParsing
    Write-Host "   Web App: $($webResponse.StatusCode)"
} catch {
    Write-Host "   Web App Error: $_"
}

# Test 2: Check public endpoints
Write-Host "2. Checking Public Endpoints..."
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

try {
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    Write-Host "   Services: $($services.StatusCode)"
    
    $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff" -Headers $headers -UseBasicParsing
    Write-Host "   Staff: $($staff.StatusCode)"
    
    $availability = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=test&date=2026-03-15" -Headers $headers -UseBasicParsing
    Write-Host "   Availability: $($availability.StatusCode)"
    
    # Test booking
    $bookingData = @{
        serviceId = "test"
        staffId = "test"
        customer = @{
            name = "Test Customer"
            email = "test@example.com"
        }
        startTimeUtc = "2026-03-15T10:00:00.000Z"
        endTimeUtc = "2026-03-15T10:30:00.000Z"
        consentGiven = $true
    }
    
    $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
    Write-Host "   Booking: $($booking.StatusCode)"
    $result = $booking.Content | ConvertFrom-Json
    Write-Host "   Result: $($result.success)"
    
    if (-not $result.success) {
        Write-Host "   Error: $($result.error.message)"
        Write-Host "   Code: $($result.error.code)"
    }
    
} catch {
    Write-Host "   API Error: $_"
}

Write-Host "Investigation Complete!"
