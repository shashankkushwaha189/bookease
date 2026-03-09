# Test Direct Booking
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Direct Booking..."

try {
    # Test 1: Simple booking without any middleware checks
    $bookingData = @{
        serviceId = "1c77d539-076a-4d06-8a1f-a70d277858a4"
        staffId = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
        customer = @{
            name = "Direct Test Customer"
            email = "direct@test.com"
            phone = "1234567890"
        }
        startTimeUtc = "2026-03-10T10:00:00.000Z"
        endTimeUtc = "2026-03-10T11:00:00.000Z"
        consentGiven = $true
        notes = "Direct booking test"
        sessionToken = "direct-session-$([System.Guid]::NewGuid())"
    } | ConvertTo-Json -Depth 10

    Write-Host "Sending direct booking request..."
    $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body $bookingData -UseBasicParsing
    Write-Host "Direct Booking Response: $($booking.StatusCode)"
    Write-Host "Response: $($booking.Content)"
    
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        Write-Host "Content: $($_.Exception.Response.Content)"
    }
}
