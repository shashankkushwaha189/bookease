$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing customer management endpoints..."
try {
    # Test customer list
    $response = Invoke-WebRequest -Method GET -Uri "http://localhost:3000/api/customers" -Headers $headers
    Write-Host "Customer List Response Status:" $response.StatusCode
    Write-Host "Customer List Response Content:" $response.Content
    
    # Test customer creation
    $customerBody = @{
        "name" = "Test Customer New"
        "email" = "testnew@example.com"
        "phone" = "9876543210"
        "notes" = "Test notes"
        "tags" = @("VIP", "Test")
    } | ConvertTo-Json
    
    $createResponse = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/customers" -Headers $headers -Body $customerBody
    Write-Host "Customer Create Response Status:" $createResponse.StatusCode
    Write-Host "Customer Create Response Content:" $createResponse.Content
    
} catch {
    Write-Host "Customer Test Error occurred: $_"
}
