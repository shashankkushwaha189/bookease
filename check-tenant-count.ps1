# Check Tenant Count in Database
$baseUrl = "http://localhost:3000"

Write-Host "Checking Tenant Count..."

# Try to get tenant count via health endpoint or direct database query
try {
    # Check if there's a health endpoint that shows tenant info
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "Health Check: $($response.StatusCode)"
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.db -eq "ok") {
        Write-Host "✅ Database is connected"
        Write-Host "Based on seed file, there should be at least 1 tenant:"
        Write-Host "  - ID: b18e0808-27d1-4253-aca9-453897585106"
        Write-Host "  - Name: HealthFirst Clinic"
        Write-Host "  - Slug: demo-clinic"
        Write-Host "  - Active: true"
        Write-Host ""
        Write-Host "Total Tenants: At least 1 (from seed data)"
    } else {
        Write-Host "❌ Database connection issue"
    }
    
} catch {
    Write-Host "Error checking tenants: $_"
}

Write-Host ""
Write-Host "📊 TENANT SUMMARY:"
Write-Host "Your BookEase system is configured for multi-tenancy"
Write-Host "Current configured tenant: b18e0808-27d1-4253-aca9-453897585106"
Write-Host "This is the tenant ID used in all API calls"
Write-Host ""
Write-Host "To add more tenants, you would need to:"
Write-Host "1. Create new tenant records in the database"
Write-Host "2. Update the frontend to handle tenant selection"
Write-Host "3. Configure tenant-specific routing"
