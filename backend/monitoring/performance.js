const performance = require('perf_hooks').performance;
const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      database: {
        queries: 0,
        totalTime: 0,
        slowQueries: []
      },
      api: {
        requests: 0,
        totalTime: 0,
        slowRequests: []
      },
      memory: {
        samples: [],
        maxHeapUsed: 0,
        maxRSS: 0
      }
    };
    
    this.thresholds = {
      slowQuery: 100, // ms
      slowRequest: 500, // ms
      maxSlowQueries: 50,
      maxSlowRequests: 50
    };
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  // Database performance monitoring
  trackDatabaseQuery(operation, duration) {
    this.metrics.database.queries++;
    this.metrics.database.totalTime += duration;
    
    if (duration > this.thresholds.slowQuery) {
      this.metrics.database.slowQueries.push({
        operation,
        duration,
        timestamp: new Date()
      });
      
      // Keep only recent slow queries
      if (this.metrics.database.slowQueries.length > this.thresholds.maxSlowQueries) {
        this.metrics.database.slowQueries.shift();
      }
      
      this.emit('slowQuery', { operation, duration });
    }
  }

  // API performance monitoring
  trackAPIRequest(endpoint, method, duration) {
    this.metrics.api.requests++;
    this.metrics.api.totalTime += duration;
    
    if (duration > this.thresholds.slowRequest) {
      this.metrics.api.slowRequests.push({
        endpoint,
        method,
        duration,
        timestamp: new Date()
      });
      
      if (this.metrics.api.slowRequests.length > this.thresholds.maxSlowRequests) {
        this.metrics.api.slowRequests.shift();
      }
      
      this.emit('slowRequest', { endpoint, method, duration });
    }
  }

  // Memory monitoring
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      this.metrics.memory.samples.push({
        timestamp: new Date(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external
      });
      
      // Keep only last 100 samples (about 100 minutes with 1-minute intervals)
      if (this.metrics.memory.samples.length > 100) {
        this.metrics.memory.samples.shift();
      }
      
      // Track maximums
      if (memUsage.heapUsed > this.metrics.memory.maxHeapUsed) {
        this.metrics.memory.maxHeapUsed = memUsage.heapUsed;
      }
      
      if (memUsage.rss > this.metrics.memory.maxRSS) {
        this.metrics.memory.maxRSS = memUsage.rss;
      }
      
      // Alert on high memory usage
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (heapUsagePercent > 90) {
        this.emit('highMemoryUsage', { percentage: heapUsagePercent, memUsage });
      }
      
    }, 60000); // Check every minute
  }

  // Get performance summary
  getPerformanceSummary() {
    return {
      database: {
        totalQueries: this.metrics.database.queries,
        averageQueryTime: this.metrics.database.queries > 0 ? 
          this.metrics.database.totalTime / this.metrics.database.queries : 0,
        slowQueriesCount: this.metrics.database.slowQueries.length,
        recentSlowQueries: this.metrics.database.slowQueries.slice(-5)
      },
      api: {
        totalRequests: this.metrics.api.requests,
        averageResponseTime: this.metrics.api.requests > 0 ? 
          this.metrics.api.totalTime / this.metrics.api.requests : 0,
        slowRequestsCount: this.metrics.api.slowRequests.length,
        recentSlowRequests: this.metrics.api.slowRequests.slice(-5)
      },
      memory: {
        currentUsage: process.memoryUsage(),
        maxHeapUsed: this.metrics.memory.maxHeapUsed,
        maxRSS: this.metrics.memory.maxRSS,
        recentSamples: this.metrics.memory.samples.slice(-10)
      },
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      database: { queries: 0, totalTime: 0, slowQueries: [] },
      api: { requests: 0, totalTime: 0, slowRequests: [] },
      memory: { samples: [], maxHeapUsed: 0, maxRSS: 0 }
    };
  }
}

// Middleware to track API performance
function createPerformanceMiddleware(monitor) {
  return (req, res, next) => {
    const startTime = performance.now();
    
    res.on('finish', () => {
      const duration = performance.now() - startTime;
      monitor.trackAPIRequest(req.path, req.method, duration);
    });
    
    next();
  };
}

// Database query wrapper for performance tracking
function wrapDatabaseQuery(monitor) {
  return {
    trackQuery: (operation, queryPromise) => {
      const startTime = performance.now();
      
      return queryPromise
        .then(result => {
          const duration = performance.now() - startTime;
          monitor.trackDatabaseQuery(operation, duration);
          return result;
        })
        .catch(error => {
          const duration = performance.now() - startTime;
          monitor.trackDatabaseQuery(`${operation} (ERROR)`, duration);
          throw error;
        });
    }
  };
}

module.exports = {
  PerformanceMonitor,
  createPerformanceMiddleware,
  wrapDatabaseQuery
};
