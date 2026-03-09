# Simple API Integration Test
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing API Endpoints Integration..."

# Test Login
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData
    Write-Host "Login: $($response.StatusCode)"
    
    if ($response.StatusCode -eq 200) {
        $token = ($response.Content | ConvertFrom-Json).data.token
        $authHeaders = $headers.Clone()
        $authHeaders["Authorization"] = "Bearer $token"
        
        # Test protected endpoints
        $endpoints = @(
            "$baseUrl/api/appointments",
            "$baseUrl/api/services", 
            "$baseUrl/api/staff",
            "$baseUrl/api/customers",
            "$baseUrl/api/availability",
            "$baseUrl/api/reports",
            "$baseUrl/api/audit",
            "$baseUrl/api/policy"
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $resp = Invoke-WebRequest -Method GET -Uri $endpoint -Headers $authHeaders
                Write-Host "$($endpoint.Substring($endpoint.LastIndexOf('/') + 1)): $($resp.StatusCode)"
            } catch {
                Write-Host "$($endpoint.Substring($endpoint.LastIndexOf('/') + 1)): ERROR - $_"
            }
        }
    }
} catch {
    Write-Host "Login failed: $_"
}

Write-Host "API Integration Test Complete!"
