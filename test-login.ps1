$headers = @{
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
    "Content-Type" = "application/json"
}

$body = @{
    "email" = "admin@demo.com"
    "password" = "demo123456"
} | ConvertTo-Json

Write-Host "Getting fresh token..."
try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/auth/login" -Headers $headers -Body $body
    $token = ($response.Content | ConvertFrom-Json).data.token
    Write-Host "New token obtained: $token"
    
    # Test policy with fresh token
    $policyHeaders = @{
        "Authorization" = "Bearer $token"
        "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
        "Content-Type" = "application/json"
    }
    
    $policyBody = @{
        "testType" = "cancellation"
        "appointmentData" = @{
            "id" = "3f52d5f9-0791-4d22-8ef5-869edbd300eb"
            "startTimeUtc" = "2026-03-14T03:30:00.000Z"
            "tenantId" = "b18e0808-27d1-4253-aca9-453897585106"
        }
        "userId" = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
        "userRole" = "ADMIN"
        "overrideReason" = "Testing policy enforcement"
    } | ConvertTo-Json
    
    Write-Host "Testing policy enforcement with fresh token..."
    $policyResponse = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/policy/test" -Headers $policyHeaders -Body $policyBody
    Write-Host "Policy Test Response Status:" $policyResponse.StatusCode
    Write-Host "Policy Test Response Content:" $policyResponse.Content
    
} catch {
    Write-Host "Login/Policy Test Error occurred: $_"
}
