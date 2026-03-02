import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        availability_scan: {
            executor: 'constant-vus',
            vus: 50,
            duration: '2m',
            exec: 'availabilityScan',
        },
        high_concurrency_unique: {
            executor: 'shared-iterations',
            vus: 100,
            iterations: 100,
            maxDuration: '30s',
            exec: 'concurrentUniqueBooking',
            startTime: '2m',
        },
        high_concurrency_same_slot: {
            executor: 'shared-iterations',
            vus: 20,
            iterations: 20,
            maxDuration: '30s',
            exec: 'concurrentSameSlotBooking',
            startTime: '2m30s',
        }
    },
    thresholds: {
        'http_req_duration{scenario:availability_scan}': ['p(95)<500'],
        'http_req_failed{scenario:availability_scan}': ['rate==0'],
        'http_req_failed{scenario:high_concurrency_unique}': ['rate==0'],
    }
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const TENANT_ID = __ENV.TENANT_ID || 'demo-clinic';
const STAFF_ID = __ENV.STAFF_ID || 'dummy-staff-id';
const SERVICE_ID = __ENV.SERVICE_ID || 'dummy-service-id';

export function availabilityScan() {
    const res = http.get(`${BASE_URL}/api/availability?serviceId=${SERVICE_ID}&staffId=${STAFF_ID}&date=2026-10-10`, {
        headers: { 'X-Tenant-ID': TENANT_ID }
    });
    
    check(res, {
        'status is 200': (r) => r.status === 200,
    });
    sleep(1);
}

export function concurrentUniqueBooking() {
    const baseTime = new Date('2026-11-01T10:00:00.000Z');
    baseTime.setHours(baseTime.getHours() + __ITER);
    const uniqueTime = baseTime.toISOString();
    
    const payload = JSON.stringify({
        serviceId: SERVICE_ID,
        staffId: STAFF_ID,
        customerName: `Test VU ${__VU}`,
        customerEmail: `testvu${__VU}_${__ITER}@demo.com`,
        customerPhone: '9999999999',
        startTimeUtc: uniqueTime,
        consentGiven: true
    });
    
    const res = http.post(`${BASE_URL}/api/public/bookings`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': TENANT_ID
        }
    });
    
    check(res, {
        'status is 201': (r) => r.status === 201,
    });
}

export function concurrentSameSlotBooking() {
    const fixedTime = '2026-12-01T10:00:00.000Z';
    
    const payload = JSON.stringify({
        serviceId: SERVICE_ID,
        staffId: STAFF_ID,
        customerName: `Contest VU ${__VU}`,
        customerEmail: `contest${__VU}@demo.com`,
        customerPhone: '8888888888',
        startTimeUtc: fixedTime,
        consentGiven: true
    });
    
    const res = http.post(`${BASE_URL}/api/public/bookings`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': TENANT_ID
        }
    });
    
    check(res, {
        'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    });
}
