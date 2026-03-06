import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorCount: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'response_time' | 'error_rate' | 'connections';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    cpu: 80, // 80% CPU usage
    memory: 85, // 85% memory usage
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5% error rate
    connections: 1000, // 1000 active connections
  };
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;

  private constructor() {
    super();
    this.setupPerformanceObserver();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupPerformanceObserver(): void {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.recordRequestTime(entry.name, entry.duration);
        }
      });
    });
    obs.observe({ entryTypes: ['measure'] });
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    logger.info('Performance monitoring started', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Performance monitoring stopped');
  }

  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed + memUsage.external;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage

    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
      : 0;

    const maxResponseTime = this.requestTimes.length > 0
      ? Math.max(...this.requestTimes)
      : 0;

    const minResponseTime = this.requestTimes.length > 0
      ? Math.min(...this.requestTimes)
      : 0;

    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    const metrics: PerformanceMetrics = {
      requestCount: this.requestCount,
      averageResponseTime: avgResponseTime,
      maxResponseTime,
      minResponseTime,
      errorCount: this.errorCount,
      errorRate,
      cpuUsage: cpuPercent,
      memoryUsage: memoryUsagePercent,
      activeConnections: this.getActiveConnections(),
      timestamp: new Date(),
    };

    this.metrics.set('current', metrics);
    this.emit('metrics', metrics);

    // Reset counters for next interval
    this.requestTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;
  }

  private checkThresholds(): void {
    const metrics = this.metrics.get('current');
    if (!metrics) return;

    const alerts: PerformanceAlert[] = [];

    // CPU threshold check
    if (metrics.cpuUsage > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu',
        severity: this.getSeverity(metrics.cpuUsage, this.thresholds.cpu),
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(2)}%`,
        value: metrics.cpuUsage,
        threshold: this.thresholds.cpu,
        timestamp: new Date(),
      });
    }

    // Memory threshold check
    if (metrics.memoryUsage > this.thresholds.memory) {
      alerts.push({
        type: 'memory',
        severity: this.getSeverity(metrics.memoryUsage, this.thresholds.memory),
        message: `High memory usage: ${metrics.memoryUsage.toFixed(2)}%`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.memory,
        timestamp: new Date(),
      });
    }

    // Response time threshold check
    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: this.getSeverity(metrics.averageResponseTime, this.thresholds.responseTime),
        message: `High response time: ${metrics.averageResponseTime.toFixed(2)}ms`,
        value: metrics.averageResponseTime,
        threshold: this.thresholds.responseTime,
        timestamp: new Date(),
      });
    }

    // Error rate threshold check
    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: this.getSeverity(metrics.errorRate, this.thresholds.errorRate),
        message: `High error rate: ${metrics.errorRate.toFixed(2)}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRate,
        timestamp: new Date(),
      });
    }

    // Active connections threshold check
    if (metrics.activeConnections > this.thresholds.connections) {
      alerts.push({
        type: 'connections',
        severity: this.getSeverity(metrics.activeConnections, this.thresholds.connections),
        message: `High active connections: ${metrics.activeConnections}`,
        value: metrics.activeConnections,
        threshold: this.thresholds.connections,
        timestamp: new Date(),
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.emit('alert', alert);
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }

      logger.warn('Performance alert', alert);
    });
  }

  private getSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  private getActiveConnections(): number {
    // This would be implemented based on your server framework
    // For now, return a mock value
    return Math.floor(Math.random() * 100);
  }

  recordRequestTime(endpoint: string, duration: number): void {
    this.requestTimes.push(duration);
    this.requestCount++;
    
    // Record performance mark
    performance.mark(`${endpoint}-start`);
    performance.mark(`${endpoint}-end`);
    performance.measure(endpoint, `${endpoint}-start`, `${endpoint}-end`);
  }

  recordError(): void {
    this.errorCount++;
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.get('current') || null;
  }

  getMetricsHistory(hours: number = 24): PerformanceMetrics[] {
    // This would retrieve historical metrics from database
    // For now, return current metrics
    const current = this.metrics.get('current');
    return current ? [current] : [];
  }

  getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical', hours: number = 24): PerformanceAlert[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    let alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts;
  }

  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', { thresholds: this.thresholds });
  }

  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }

  // System health check
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: PerformanceMetrics | null;
  } {
    const metrics = this.getCurrentMetrics();
    if (!metrics) {
      return {
        status: 'warning',
        issues: ['No metrics available'],
        metrics: null,
      };
    }

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (metrics.cpuUsage > this.thresholds.cpu) {
      issues.push(`High CPU usage: ${metrics.cpuUsage.toFixed(2)}%`);
      status = 'critical';
    }

    if (metrics.memoryUsage > this.thresholds.memory) {
      issues.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}%`);
      if (status !== 'critical') status = 'warning';
    }

    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      issues.push(`High response time: ${metrics.averageResponseTime.toFixed(2)}ms`);
      if (status !== 'critical') status = 'warning';
    }

    if (metrics.errorRate > this.thresholds.errorRate) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
      status = 'critical';
    }

    return {
      status,
      issues,
      metrics,
    };
  }

  // Performance reporting
  generateReport(hours: number = 24): {
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      uptime: number;
    };
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const metrics = this.getMetricsHistory(hours);
    const alerts = this.getAlerts(undefined, hours);
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0);
    const avgResponseTime = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length
      : 0;
    const errorRate = totalRequests > 0
      ? (metrics.reduce((sum, m) => sum + m.errorCount, 0) / totalRequests) * 100
      : 0;

    const recommendations = this.generateRecommendations(metrics, alerts);

    return {
      summary: {
        totalRequests,
        averageResponseTime: avgResponseTime,
        errorRate,
        uptime: 100 - errorRate, // Simple uptime calculation
      },
      metrics,
      alerts,
      recommendations,
    };
  }

  private generateRecommendations(metrics: PerformanceMetrics[], alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    if (alerts.some(a => a.type === 'cpu')) {
      recommendations.push('Consider scaling horizontally or optimizing CPU-intensive operations');
    }

    if (alerts.some(a => a.type === 'memory')) {
      recommendations.push('Investigate memory leaks and consider increasing memory limits');
    }

    if (alerts.some(a => a.type === 'response_time')) {
      recommendations.push('Optimize database queries and implement caching strategies');
    }

    if (alerts.some(a => a.type === 'error_rate')) {
      recommendations.push('Review error logs and implement better error handling');
    }

    if (alerts.some(a => a.type === 'connections')) {
      recommendations.push('Implement connection pooling and consider load balancing');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable thresholds');
    }

    return recommendations;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware for automatic request tracking
export function performanceMiddleware(endpoint: string) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      performanceMonitor.recordRequestTime(endpoint, duration);
      
      if (res.statusCode >= 400) {
        performanceMonitor.recordError();
      }
    });
    
    next();
  };
}

// Performance decorator for functions
export function trackPerformance(name: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        performanceMonitor.recordRequestTime(name, duration);
        return result;
      } catch (error) {
        performanceMonitor.recordError();
        throw error;
      }
    };

    return descriptor;
  };
}
