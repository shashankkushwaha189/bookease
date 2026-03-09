$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODFkMWY1Ni1mZGM1LTQwNzAtOGUwYS0wOWZjMzM1MDZkZCIsInRlbmFudElkIjoiYjE4ZTA4MDgtMjdkMS00MjUzLWFjYTktNDUzODk3NTg1MTA2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQwOTQzNzYsImV4cCI6MTc0MDk0NzM2fQ.test"

$headers = @{
    "Authorization" = "Bearer $token"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
    "Content-Type" = "application/json"
}

$body = @{
    "staffId" = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
    "startTimeUtc" = "2026-03-14T03:30:00.000Z"
    "endTimeUtc" = "2026-03-14T04:30:00.000Z"
    "sessionToken" = "test-session-123"
} | ConvertTo-Json

Invoke-WebRequest -Method POST -Uri "http://localhost:3000/api/appointment/locks" -Headers $headers -Body $body
