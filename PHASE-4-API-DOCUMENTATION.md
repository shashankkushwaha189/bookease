# Phase 4 - Services & Staff API Documentation

## Overview

This document provides comprehensive API documentation for the Services & Staff modules implemented in Phase 4. The API follows RESTful conventions and provides full CRUD operations with advanced scheduling capabilities.

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints (except public routes) require authentication. Include the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": <response_data>,
  "message": "Operation completed successfully",
  "count": <number> // For list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": <validation_errors> // For validation errors
}
```

## Service Endpoints

### GET /api/services
List all services for a tenant.

**Query Parameters:**
- `activeOnly` (boolean, optional): Filter active services only
- `includeStats` (boolean, optional): Include service statistics
- `search` (string, optional): Search services by name, description, category, or tags
- `category` (string, optional): Filter by service category

**Example Request:**
```bash
GET /api/services?activeOnly=true&includeStats=true&search=haircut
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "service-123",
      "name": "Premium Haircut",
      "description": "Professional haircut with styling",
      "category": "Hair",
      "durationMinutes": 60,
      "bufferBefore": 15,
      "bufferAfter": 15,
      "price": 75.00,
      "isActive": true,
      "allowOnlineBooking": true,
      "tags": ["premium", "styling"],
      "totalDuration": 90,
      "appointmentCount": 25
    }
  ],
  "count": 1
}
```

### GET /api/services/:id
Get a specific service by ID.

**Path Parameters:**
- `id` (string): Service ID

**Query Parameters:**
- `includeStats` (boolean, optional): Include service statistics

**Example Request:**
```bash
GET /api/services/service-123?includeStats=true
```

### POST /api/services
Create a new service.

**Request Body:**
```json
{
  "name": "New Service",
  "description": "Service description",
  "category": "General",
  "durationMinutes": 30,
  "bufferBefore": 5,
  "bufferAfter": 5,
  "price": 50.00,
  "color": "#FF5733",
  "requiresDeposit": false,
  "allowOnlineBooking": true,
  "tags": ["tag1", "tag2"]
}
```

### PUT /api/services/:id
Update an existing service.

**Request Body:** (Partial service object)
```json
{
  "name": "Updated Service Name",
  "price": 60.00
}
```

### DELETE /api/services/:id
Delete or deactivate a service.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "deactivated": false
  },
  "message": "Service deleted successfully"
}
```

### GET /api/services/categories
Get all service categories with counts.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "Hair",
      "_count": 5
    },
    {
      "category": "Wellness",
      "_count": 3
    }
  ]
}
```

### POST /api/services/:id/assign
Assign a service to multiple staff members.

**Request Body:**
```json
{
  "staffIds": ["staff-123", "staff-456"]
}
```

## Staff Endpoints

### GET /api/staff
List all staff members for a tenant.

**Query Parameters:**
- `activeOnly` (boolean, optional): Filter active staff only
- `includeStats` (boolean, optional): Include staff statistics
- `search` (string, optional): Search staff by name, email, title, or department
- `department` (string, optional): Filter by department

**Example Request:**
```bash
GET /api/staff?activeOnly=true&includeStats=true&search=john
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "staff-123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "title": "Senior Stylist",
      "department": "Hair",
      "isActive": true,
      "maxConcurrentAppointments": 2,
      "weeklyWorkingHours": 40,
      "appointmentCount": 150,
      "serviceCount": 5,
      "hasSchedule": true
    }
  ],
  "count": 1
}
```

### GET /api/staff/:id
Get a specific staff member by ID.

### POST /api/staff
Create a new staff member.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "title": "Stylist",
  "department": "Hair",
  "bio": "Experienced stylist with 5+ years",
  "photoUrl": "https://example.com/photo.jpg",
  "maxConcurrentAppointments": 2,
  "requiresApproval": false,
  "commissionRate": 15.5
}
```

### PUT /api/staff/:id
Update an existing staff member.

### DELETE /api/staff/:id
Delete or deactivate a staff member.

### POST /api/staff/:id/services
Assign services to a staff member.

**Request Body:**
```json
{
  "serviceIds": ["service-123", "service-456"]
}
```

### POST /api/staff/:id/schedule
Set weekly schedule for a staff member.

**Request Body:**
```json
{
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "isWorking": true,
      "maxAppointments": 8,
      "breaks": [
        {
          "startTime": "12:00",
          "endTime": "13:00",
          "title": "Lunch Break"
        }
      ]
    },
    {
      "dayOfWeek": 6,
      "startTime": "09:00",
      "endTime": "13:00",
      "isWorking": true,
      "breaks": []
    },
    {
      "dayOfWeek": 0,
      "isWorking": false
    }
  ]
}
```

### POST /api/staff/:id/timeoff
Add time off for a staff member.

**Request Body:**
```json
{
  "date": "2024-12-25T00:00:00Z",
  "endDate": "2024-12-25T23:59:59Z",
  "reason": "Christmas Holiday",
  "type": "HOLIDAY",
  "isPaid": true
}
```

### GET /api/staff/:id/availability
Check staff availability for a specific date.

**Query Parameters:**
- `date` (string, required): Date to check availability (ISO 8601 format)

**Example Request:**
```bash
GET /api/staff/staff-123/availability?date=2024-01-15T10:00:00Z
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "staffId": "staff-123",
    "date": "2024-01-15T10:00:00Z",
    "isAvailable": true,
    "schedule": {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "isWorking": true
    },
    "timeOffs": []
  }
}
```

### GET /api/staff/:id/slots
Get available time slots for a staff member.

**Query Parameters:**
- `date` (string, required): Date to get slots for
- `duration` (number, required): Service duration in minutes

**Example Request:**
```bash
GET /api/staff/staff-123/slots?date=2024-01-15&duration=60
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "staffId": "staff-123",
    "date": "2024-01-15",
    "serviceDuration": 60,
    "slots": [
      {
        "start": "09:00",
        "end": "10:00"
      },
      {
        "start": "10:30",
        "end": "11:30"
      }
    ]
  }
}
```

## Public Endpoints (No Authentication Required)

### GET /api/public/services
Get public services for a tenant.

**Query Parameters:**
- `tenantId` (string, required): Tenant ID

### GET /api/public/staff
Get public staff for a tenant.

**Query Parameters:**
- `tenantId` (string, required): Tenant ID

## Health Check Endpoints

### GET /api/services/health
Check service module health.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "cacheSize": 15,
    "metrics": {
      "tenant-123": {
        "cacheHitRate": 0.85,
        "averageResponseTime": 45,
        "totalRequests": 1250
      }
    }
  }
}
```

### GET /api/staff/health
Check staff module health.

## Error Codes

### Service Error Codes
- `SERVICE_LIST_ERROR`: Failed to list services
- `SERVICE_NOT_FOUND`: Service not found
- `SERVICE_CREATE_ERROR`: Failed to create service
- `SERVICE_UPDATE_ERROR`: Failed to update service
- `SERVICE_DELETE_ERROR`: Failed to delete service
- `SERVICE_CATEGORIES_ERROR`: Failed to get categories
- `SERVICE_ASSIGN_ERROR`: Failed to assign service to staff
- `SERVICE_HEALTH_ERROR`: Service health check failed
- `DUPLICATE_NAME`: Service name already exists
- `VALIDATION_ERROR`: Request validation failed

### Staff Error Codes
- `STAFF_NOT_FOUND`: Staff member not found
- `STAFF_CREATE_ERROR`: Failed to create staff
- `STAFF_UPDATE_ERROR`: Failed to update staff
- `STAFF_DELETE_ERROR`: Failed to delete staff
- `STAFF_LIST_ERROR`: Failed to list staff
- `STAFF_ASSIGN_ERROR`: Failed to assign services to staff
- `STAFF_SCHEDULE_ERROR`: Failed to update schedule
- `STAFF_TIMEOFF_ERROR`: Failed to add time off
- `STAFF_AVAILABILITY_ERROR`: Failed to check availability
- `STAFF_SLOTS_ERROR`: Failed to get time slots
- `STAFF_HEALTH_ERROR`: Staff health check failed
- `DUPLICATE_EMAIL`: Email already exists

### General Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions
- `MISSING_TENANT`: Tenant ID required
- `MISSING_DATE`: Date parameter required
- `MISSING_PARAMETERS`: Required parameters missing
- `INVALID_REQUEST`: Invalid request data
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination for large datasets:

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Example Request:**
```bash
GET /api/services?page=2&limit=50
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Webhooks

The API supports webhooks for real-time notifications:

### Available Webhooks
- `service.created`: Service created
- `service.updated`: Service updated
- `service.deleted`: Service deleted
- `staff.created`: Staff member created
- `staff.updated`: Staff member updated
- `staff.deleted`: Staff member deleted
- `staff.schedule.updated`: Schedule updated
- `staff.timeoff.added`: Time off added

### Webhook Configuration

Configure webhooks in your tenant settings:
1. Go to Settings > Webhooks
2. Add webhook URL
3. Select events to subscribe to
4. Save configuration

### Webhook Payload Example
```json
{
  "event": "service.created",
  "tenantId": "tenant-123",
  "data": {
    "id": "service-123",
    "name": "New Service",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:01Z"
}
```

## SDK Integration

### JavaScript/TypeScript SDK

```bash
npm install @bookease/sdk
```

```typescript
import { BookEaseAPI } from '@bookease/sdk';

const api = new BookEaseAPI({
  baseURL: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

// List services
const services = await api.services.list({ activeOnly: true });

// Create staff member
const staff = await api.staff.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Check availability
const slots = await api.staff.getAvailableSlots('staff-123', {
  date: '2024-01-15',
  duration: 60
});
```

### Python SDK

```bash
pip install bookease-sdk
```

```python
from bookease import BookEaseAPI

api = BookEaseAPI(
    base_url='https://your-domain.com/api',
    api_key='your-api-key'
)

# List services
services = api.services.list(active_only=True)

# Create staff member
staff = api.staff.create({
    'name': 'John Doe',
    'email': 'john@example.com'
})
```

## Testing

### API Testing

Use the provided Postman collection or OpenAPI specification for testing:

1. **Postman Collection**: Import `bookease-api.postman_collection.json`
2. **OpenAPI Spec**: Available at `/api/docs/openapi.json`
3. **Swagger UI**: Available at `/api/docs`

### Environment Variables

For testing with different environments:

```bash
# Development
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api

# Staging
NODE_ENV=staging
API_BASE_URL=https://staging.bookease.com/api

# Production
NODE_ENV=production
API_BASE_URL=https://api.bookease.com/api
```

## Support

For API support and documentation:

- **Documentation**: https://docs.bookease.com
- **Status Page**: https://status.bookease.com
- **Support Email**: api-support@bookease.com
- **Developer Community**: https://community.bookease.com

## Changelog

### v4.0.0 (Current)
- ✅ Complete Services & Staff API implementation
- ✅ Advanced scheduling and availability features
- ✅ Comprehensive validation and error handling
- ✅ Performance optimization with caching
- ✅ Full CRUD operations for both modules
- ✅ Public endpoints for customer-facing applications
- ✅ Health check and monitoring endpoints
- ✅ Webhook support for real-time notifications
