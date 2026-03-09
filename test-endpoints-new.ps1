# Test API Endpoints
$baseUrl = "http://localhost:3000"

Write-Host "Testing API Endpoints..."

# Test 1: Health check
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "Health: $($health.StatusCode)"
} catch {
    Write-Host "Health Error: $_"
}

# Test 2: Public services
try {
    $headers = @{"x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"}
    $services = Invoke-WebRequest -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    Write-Host "Public Services: $($services.StatusCode)"
    Write-Host "Content: $($services.Content.Substring(0, [Math]::Min(200, $services.Content.Length)))..."
} catch {
    Write-Host "Public Services Error: $_"
}

# Test 3: Public bookings endpoint
try {
    $bookingData = @{
        serviceId = "1c77d539-076a-4d06-8a1f-a70d277858a4"
        staffId = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
        customer = @{
            name = "Test Customer"
            email = "test@test.com"
            phone = "1234567890"
        }
        startTimeUtc = "2026-03-10T10:00:00.000Z"
        endTimeUtc = "2026-03-10T11:00:00.000Z"
        consentGiven = $true
        notes = "Test booking"
        sessionToken = "test-session"
    } | ConvertTo-Json -Depth 10

    $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body $bookingData -UseBasicParsing
    Write-Host "Public Bookings: $($booking.StatusCode)"
    Write-Host "Content: $($booking.Content.Substring(0, [Math]::Min(200, $booking.Content.Length)))..."
} catch {
    Write-Host "Public Bookings Error: $_"
}
