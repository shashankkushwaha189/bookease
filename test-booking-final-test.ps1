# Final Booking Test
$baseUrl = "http://localhost:3000"

Write-Host "Final Booking Test..."

# Test public bookings endpoint
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/public/bookings" -UseBasicParsing
    Write-Host "GET /api/public/bookings: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "GET Error: $_"
}

# Test POST to public bookings
try {
    $body = @{
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

    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Body $body -UseBasicParsing
    Write-Host "POST /api/public/bookings: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "POST Error: $_"
}
