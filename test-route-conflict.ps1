# Test Route Conflict
$baseUrl = "http://localhost:3000"

Write-Host "Testing Route Conflict..."

# Test 1: Check if public bookings route exists
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/public/bookings" -Method GET -UseBasicParsing
    Write-Host "GET /api/public/bookings: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "GET Error: $_"
}

# Test 2: Check if old route is still being hit
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/appointments" -Method GET -UseBasicParsing
    Write-Host "GET /api/appointments: $($response.StatusCode)"
} catch {
    Write-Host "GET /api/appointments Error: $_"
}

# Test 3: Check with tenant header
try {
    $headers = @{"x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"}
    $response = Invoke-WebRequest -Uri "$baseUrl/api/public/bookings" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "GET /api/public/bookings with tenant: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "GET with tenant Error: $_"
}
