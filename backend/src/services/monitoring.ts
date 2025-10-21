import { logger } from './logger.js';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: any;
}

interface ErrorMetric {
  error: string;
  count: number;
  lastOccurrence: Date;
  contexts: string[];
}

interface SystemHealth {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  averageResponseTime: number;
}

class MonitoringService {
  private performanceMetrics: PerformanceMetric[] = [];
  private errorMetrics: Map<string, ErrorMetric> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private startTime: Date = new Date();
  private maxMetricsHistory = 1000;

  constructor() {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    // Log system health every 5 minutes
    setInterval(() => {
      this.logSystemHealth();
    }, 5 * 60 * 1000);
  }

  /**
   * Track performance metrics
   */
  trackPerformance(operation: string, duration: number, success: boolean = true, metadata?: any): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      success,
      metadata
    };

    this.performanceMetrics.push(metric);
    this.responseTimes.push(duration);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.shift();
    }

    if (this.responseTimes.length > this.maxMetricsHistory) {
      this.responseTimes.shift();
    }

    // Log slow operations
    if (duration > 5000) {
      logger.warn('Slow operation detected', {
        operation,
        duration: `${duration}ms`,
        success,
        metadata
      });
    }

    // Log performance statistics periodically
    if (this.performanceMetrics.length % 100 === 0) {
      this.logPerformanceStats();
    }
  }

  /**
   * Track errors
   */
  trackError(error: string, context?: string): void {
    const existing = this.errorMetrics.get(error);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
      if (context && !existing.contexts.includes(context)) {
        existing.contexts.push(context);
      }
    } else {
      this.errorMetrics.set(error, {
        error,
        count: 1,
        lastOccurrence: new Date(),
        contexts: context ? [context] : []
      });
    }

    // Log frequent errors
    const errorMetric = this.errorMetrics.get(error)!;
    if (errorMetric.count % 10 === 0) {
      logger.warn('Frequent error detected', {
        error,
        count: errorMetric.count,
        contexts: errorMetric.contexts,
        lastOccurrence: errorMetric.lastOccurrence
      });
    }
  }

  /**
   * Track API endpoint usage
   */
  trackEndpoint(endpoint: string): void {
    const current = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, current + 1);
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): SystemHealth {
    const uptime = Date.now() - this.startTime.getTime();
    const memoryUsage = process.memoryUsage();
    
    // Calculate error rate (errors per 100 requests)
    const totalErrors = Array.from(this.errorMetrics.values())
      .reduce((sum, metric) => sum + metric.count, 0);
    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Calculate average response time
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      uptime,
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      activeConnections: 0, // Would need to track this separately
      errorRate,
      averageResponseTime
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    if (this.performanceMetrics.length === 0) {
      return { message: 'No performance data available' };
    }

    const operations = new Map<string, number[]>();
    
    this.performanceMetrics.forEach(metric => {
      if (!operations.has(metric.operation)) {
        operations.set(metric.operation, []);
      }
      operations.get(metric.operation)!.push(metric.duration);
    });

    const stats: any = {};
    
    operations.forEach((durations, operation) => {
      const sorted = durations.sort((a, b) => a - b);
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      stats[operation] = {
        count: durations.length,
        average: Math.round(avg),
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        min: sorted[0],
        max: sorted[sorted.length - 1]
      };
    });

    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    const stats: any = {
      totalUniqueErrors: this.errorMetrics.size,
      totalErrorCount: 0,
      topErrors: []
    };

    const errorArray = Array.from(this.errorMetrics.values());
    stats.totalErrorCount = errorArray.reduce((sum, metric) => sum + metric.count, 0);

    // Get top 10 most frequent errors
    stats.topErrors = errorArray
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(metric => ({
        error: metric.error,
        count: metric.count,
        lastOccurrence: metric.lastOccurrence,
        contexts: metric.contexts
      }));

    return stats;
  }

  /**
   * Get endpoint usage statistics
   */
  getEndpointStats(): any {
    const stats: any = {
      totalRequests: 0,
      endpoints: []
    };

    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    stats.totalRequests = totalRequests;
    
    stats.endpoints = Array.from(this.requestCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([endpoint, count]) => ({
        endpoint,
        count,
        percentage: totalRequests > 0 ? ((count / totalRequests) * 100).toFixed(2) : 0
      }));

    return stats;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Clean performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp > oneHourAgo
    );

    // Clean error metrics (keep errors that occurred in the last hour)
    for (const [error, metric] of this.errorMetrics.entries()) {
      if (metric.lastOccurrence < oneHourAgo) {
        this.errorMetrics.delete(error);
      }
    }

    logger.debug('Cleaned up old monitoring metrics', {
      performanceMetricsCount: this.performanceMetrics.length,
      errorMetricsCount: this.errorMetrics.size,
      responseTimesCount: this.responseTimes.length
    });
  }

  /**
   * Log system health periodically
   */
  private logSystemHealth(): void {
    const health = this.getSystemHealth();
    
    logger.info('System health check', {
      uptime: `${Math.floor(health.uptime / 1000 / 60)} minutes`,
      memoryUsage: {
        rss: `${Math.round(health.memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(health.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(health.memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      errorRate: `${health.errorRate.toFixed(2)}%`,
      averageResponseTime: `${Math.round(health.averageResponseTime)}ms`
    });

    // Alert on high error rate
    if (health.errorRate > 5) {
      logger.warn('High error rate detected', {
        errorRate: `${health.errorRate.toFixed(2)}%`,
        threshold: '5%'
      });
    }

    // Alert on high memory usage
    const memoryUsagePercent = (health.memoryUsage.heapUsed / health.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      logger.warn('High memory usage detected', {
        memoryUsage: `${memoryUsagePercent.toFixed(2)}%`,
        heapUsed: `${Math.round(health.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(health.memoryUsage.heapTotal / 1024 / 1024)}MB`
      });
    }

    // Alert on slow average response time
    if (health.averageResponseTime > 2000) {
      logger.warn('Slow average response time detected', {
        averageResponseTime: `${Math.round(health.averageResponseTime)}ms`,
        threshold: '2000ms'
      });
    }
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(): void {
    const stats = this.getPerformanceStats();
    
    logger.debug('Performance statistics', {
      totalOperations: this.performanceMetrics.length,
      operationStats: stats
    });
  }

  /**
   * Generate monitoring report
   */
  generateReport(): any {
    return {
      timestamp: new Date().toISOString(),
      systemHealth: this.getSystemHealth(),
      performanceStats: this.getPerformanceStats(),
      errorStats: this.getErrorStats(),
      endpointStats: this.getEndpointStats()
    };
  }
}

export const monitoring = new MonitoringService();