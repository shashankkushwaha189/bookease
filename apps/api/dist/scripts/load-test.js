"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOAD_TEST_CONFIGS = exports.LoadTester = void 0;
exports.runLoadTestCommand = runLoadTestCommand;
const events_1 = require("events");
const logger_1 = require("@bookease/logger");
class LoadTester extends events_1.EventEmitter {
    config;
    isRunning = false;
    startTime = 0;
    endTime = 0;
    results;
    activeRequests = 0;
    responseTimes = [];
    endpointStats = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.results = this.initializeResults();
    }
    initializeResults() {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            duration: 0,
            errors: [],
            endpointResults: [],
        };
    }
    async runTest() {
        if (this.isRunning) {
            throw new Error('Load test is already running');
        }
        this.isRunning = true;
        this.startTime = Date.now();
        this.results = this.initializeResults();
        logger_1.logger.info({
            concurrentUsers: this.config.concurrentUsers,
            duration: this.config.duration,
            rampUpTime: this.config.rampUpTime,
        }, 'Starting load test');
        this.emit('start', this.config);
        try {
            await this.executeLoadTest();
            this.endTime = Date.now();
            this.results.duration = (this.endTime - this.startTime) / 1000;
            this.calculateFinalResults();
            this.logResults();
            this.emit('complete', this.results);
            return this.results;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    async executeLoadTest() {
        const promises = [];
        const rampUpDelay = this.config.rampUpTime / this.config.concurrentUsers;
        // Ramp up users gradually
        for (let i = 0; i < this.config.concurrentUsers; i++) {
            promises.push(this.simulateUser(i));
            if (i < this.config.concurrentUsers - 1) {
                await this.delay(rampUpDelay * 1000);
            }
        }
        // Wait for all users to complete
        await Promise.all(promises);
    }
    async simulateUser(userId) {
        const endTime = Date.now() + (this.config.duration * 1000);
        const token = await this.getAuthToken();
        while (Date.now() < endTime && this.isRunning) {
            const endpoint = this.selectEndpoint();
            try {
                await this.makeRequest(endpoint, token, userId);
            }
            catch (error) {
                // Error is recorded in makeRequest
            }
            // Small delay between requests
            await this.delay(Math.random() * 100 + 50);
        }
    }
    selectEndpoint() {
        const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
        let random = Math.random() * totalWeight;
        for (const endpoint of this.config.endpoints) {
            random -= endpoint.weight;
            if (random <= 0) {
                return endpoint;
            }
        }
        return this.config.endpoints[0];
    }
    async makeRequest(endpoint, token, userId) {
        const startTime = Date.now();
        this.activeRequests++;
        const url = `${this.config.baseUrl}${endpoint.path}`;
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': `LoadTester-${userId}`,
            ...this.config.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const options = {
            method: endpoint.method,
            headers,
        };
        if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            options.body = JSON.stringify(endpoint.body);
        }
        let response = null;
        let error = null;
        try {
            response = await fetch(url, options);
            const responseTime = Date.now() - startTime;
            this.recordResponse(endpoint, responseTime, response.status, null);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (err) {
            error = err;
            const responseTime = Date.now() - startTime;
            this.recordResponse(endpoint, responseTime, response?.status || 0, error);
        }
        finally {
            this.activeRequests--;
        }
    }
    recordResponse(endpoint, responseTime, statusCode, error) {
        this.results.totalRequests++;
        this.responseTimes.push(responseTime);
        const endpointKey = `${endpoint.method} ${endpoint.path}`;
        let stats = this.endpointStats.get(endpointKey);
        if (!stats) {
            stats = { times: [], errors: 0, total: 0 };
            this.endpointStats.set(endpointKey, stats);
        }
        stats.times.push(responseTime);
        stats.total++;
        if (error || (statusCode >= 400)) {
            this.results.failedRequests++;
            stats.errors++;
            const errorMessage = error?.message || `HTTP ${statusCode}`;
            const existingError = this.results.errors.find(e => e.error === errorMessage);
            if (existingError) {
                existingError.count++;
            }
            else {
                this.results.errors.push({
                    error: errorMessage,
                    count: 1,
                    statusCode: error ? undefined : statusCode,
                });
            }
        }
        else {
            this.results.successfulRequests++;
        }
        // Update min/max response times
        this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
        this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
    }
    async getAuthToken() {
        if (!this.config.auth) {
            return null;
        }
        try {
            const response = await fetch(`${this.config.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.config.auth.email,
                    password: this.config.auth.password,
                }),
            });
            if (!response.ok) {
                throw new Error(`Auth failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.data?.token || data.token || null;
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get auth token');
            return null;
        }
    }
    calculateFinalResults() {
        const totalRequests = this.results.totalRequests;
        if (totalRequests === 0) {
            return;
        }
        // Calculate response time percentiles
        const sortedTimes = this.responseTimes.sort((a, b) => a - b);
        this.results.averageResponseTime = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
        this.results.p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        this.results.p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        // Calculate rates
        this.results.requestsPerSecond = totalRequests / this.results.duration;
        this.results.errorRate = (this.results.failedRequests / totalRequests) * 100;
        // Get system metrics
        const memUsage = process.memoryUsage();
        this.results.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        // Calculate endpoint results
        this.results.endpointResults = Array.from(this.endpointStats.entries()).map(([endpoint, stats]) => ({
            endpoint,
            method: endpoint.split(' ')[0],
            requests: stats.total,
            averageTime: stats.times.length > 0 ? stats.times.reduce((sum, time) => sum + time, 0) / stats.times.length : 0,
            errorRate: (stats.errors / stats.total) * 100,
        }));
    }
    logResults() {
        logger_1.logger.info(this.results, 'Load test completed');
        logger_1.logger.info({
            totalRequests: this.results.totalRequests,
            successfulRequests: this.results.successfulRequests,
            failedRequests: this.results.failedRequests,
            averageResponseTime: this.results.averageResponseTime,
            p95ResponseTime: this.results.p95ResponseTime,
            requestsPerSecond: this.results.requestsPerSecond,
            errorRate: this.results.errorRate,
            duration: this.results.duration,
        });
        if (this.results.errors.length > 0) {
            logger_1.logger.error({ errors: this.results.errors }, 'Load test errors');
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    stop() {
        this.isRunning = false;
        logger_1.logger.info('Load test stopped');
        this.emit('stop');
    }
    getResults() {
        return { ...this.results };
    }
    isActive() {
        return this.isRunning;
    }
}
exports.LoadTester = LoadTester;
// Predefined load test configurations
exports.LOAD_TEST_CONFIGS = {
    // Light load test
    light: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        concurrentUsers: 10,
        duration: 60, // 1 minute
        rampUpTime: 10, // 10 seconds
        endpoints: [
            { path: '/health', method: 'GET', weight: 20 },
            { path: '/api/services', method: 'GET', weight: 30 },
            { path: '/api/appointments', method: 'GET', weight: 30 },
            { path: '/api/customers', method: 'GET', weight: 20 },
        ],
        auth: {
            email: 'admin@healthfirst.demo',
            password: 'demo123456',
        },
    },
    // Medium load test
    medium: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        concurrentUsers: 50,
        duration: 300, // 5 minutes
        rampUpTime: 30, // 30 seconds
        endpoints: [
            { path: '/health', method: 'GET', weight: 15 },
            { path: '/api/services', method: 'GET', weight: 25 },
            { path: '/api/appointments', method: 'GET', weight: 25 },
            { path: '/api/customers', method: 'GET', weight: 20 },
            { path: '/api/staff', method: 'GET', weight: 15 },
        ],
        auth: {
            email: 'admin@healthfirst.demo',
            password: 'demo123456',
        },
    },
    // Heavy load test
    heavy: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        concurrentUsers: 200,
        duration: 600, // 10 minutes
        rampUpTime: 60, // 1 minute
        endpoints: [
            { path: '/health', method: 'GET', weight: 10 },
            { path: '/api/services', method: 'GET', weight: 20 },
            { path: '/api/appointments', method: 'GET', weight: 30 },
            { path: '/api/customers', method: 'GET', weight: 25 },
            { path: '/api/staff', method: 'GET', weight: 10 },
            { path: '/api/reports/summary', method: 'GET', weight: 5 },
            { path: '/api/ai/configuration', method: 'GET', weight: 5 },
        ],
        auth: {
            email: 'admin@healthfirst.demo',
            password: 'demo123456',
        },
    },
    // Stress test
    stress: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        concurrentUsers: 500,
        duration: 900, // 15 minutes
        rampUpTime: 120, // 2 minutes
        endpoints: [
            { path: '/health', method: 'GET', weight: 5 },
            { path: '/api/services', method: 'GET', weight: 15 },
            { path: '/api/appointments', method: 'GET', weight: 40 },
            { path: '/api/customers', method: 'GET', weight: 25 },
            { path: '/api/staff', method: 'GET', weight: 10 },
            { path: '/api/reports/summary', method: 'GET', weight: 3 },
            { path: '/api/ai/configuration', method: 'GET', weight: 2 },
        ],
        auth: {
            email: 'admin@healthfirst.demo',
            password: 'demo123456',
        },
    },
};
// CLI command functions
async function runLoadTestCommand(profile = 'medium') {
    const config = exports.LOAD_TEST_CONFIGS[profile];
    if (!config) {
        console.error(`Unknown load test profile: ${profile}`);
        console.log('Available profiles: light, medium, heavy, stress');
        process.exit(1);
    }
    console.log(`🚀 Starting ${profile} load test...`);
    console.log(`📊 Configuration:`);
    console.log(`   Concurrent Users: ${config.concurrentUsers}`);
    console.log(`   Duration: ${config.duration}s`);
    console.log(`   Ramp-up Time: ${config.rampUpTime}s`);
    console.log(`   Base URL: ${config.baseUrl}`);
    console.log(`   Endpoints: ${config.endpoints.length}`);
    const tester = new LoadTester(config);
    // Set up event listeners
    tester.on('start', () => {
        console.log('✅ Load test started');
    });
    tester.on('complete', (results) => {
        console.log('\n🎉 Load test completed!');
        console.log('\n📊 Results:');
        console.log(`   Total Requests: ${results.totalRequests.toLocaleString()}`);
        console.log(`   Successful: ${results.successfulRequests.toLocaleString()}`);
        console.log(`   Failed: ${results.failedRequests.toLocaleString()}`);
        console.log(`   Success Rate: ${(100 - results.errorRate).toFixed(2)}%`);
        console.log(`   Requests/sec: ${results.requestsPerSecond.toFixed(2)}`);
        console.log(`   Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
        console.log(`   P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms`);
        console.log(`   P99 Response Time: ${results.p99ResponseTime.toFixed(2)}ms`);
        console.log(`   Min Response Time: ${results.minResponseTime.toFixed(2)}ms`);
        console.log(`   Max Response Time: ${results.maxResponseTime.toFixed(2)}ms`);
        console.log(`   Error Rate: ${results.errorRate.toFixed(2)}%`);
        console.log(`   Memory Usage: ${results.memoryUsage.toFixed(2)}%`);
        console.log(`   Duration: ${results.duration.toFixed(2)}s`);
        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            results.errors.forEach(error => {
                console.log(`   ${error.error}: ${error.count} times`);
            });
        }
        console.log('\n📈 Endpoint Performance:');
        results.endpointResults.forEach(endpoint => {
            console.log(`   ${endpoint.method} ${endpoint.endpoint}:`);
            console.log(`     Requests: ${endpoint.requests}`);
            console.log(`     Avg Time: ${endpoint.averageTime.toFixed(2)}ms`);
            console.log(`     Error Rate: ${endpoint.errorRate.toFixed(2)}%`);
        });
        // Performance assessment
        console.log('\n🎯 Performance Assessment:');
        if (results.errorRate > 5) {
            console.log('   ❌ High error rate (>5%)');
        }
        else if (results.errorRate > 1) {
            console.log('   ⚠️  Moderate error rate (>1%)');
        }
        else {
            console.log('   ✅ Low error rate (<1%)');
        }
        if (results.averageResponseTime > 2000) {
            console.log('   ❌ High response time (>2s)');
        }
        else if (results.averageResponseTime > 1000) {
            console.log('   ⚠️  Moderate response time (>1s)');
        }
        else {
            console.log('   ✅ Good response time (<1s)');
        }
        if (results.requestsPerSecond < 100) {
            console.log('   ❌ Low throughput (<100 RPS)');
        }
        else if (results.requestsPerSecond < 500) {
            console.log('   ⚠️  Moderate throughput (<500 RPS)');
        }
        else {
            console.log('   ✅ Good throughput (>500 RPS)');
        }
    });
    tester.on('error', (error) => {
        console.error('❌ Load test failed:', error.message);
        process.exit(1);
    });
    try {
        await tester.runTest();
    }
    catch (error) {
        console.error('❌ Load test failed:', error);
        process.exit(1);
    }
}
// Run command if called directly
if (require.main === module) {
    const profile = process.argv[2] || 'medium';
    runLoadTestCommand(profile);
}
