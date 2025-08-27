class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {}
      },
      response: {
        times: [],
        averageTime: 0
      },
      users: {
        active: 0,
        signups: 0,
        logins: 0
      },
      food: {
        searches: 0,
        entries: 0
      },
      ai: {
        chatRequests: 0,
        nutritionInsights: 0
      }
    };
    this.startTime = Date.now();
  }

  // Request metrics
  recordRequest(method, endpoint, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    // Track by endpoint
    const key = `${method} ${endpoint}`;
    if (!this.metrics.requests.byEndpoint[key]) {
      this.metrics.requests.byEndpoint[key] = { count: 0, errors: 0, totalTime: 0 };
    }
    this.metrics.requests.byEndpoint[key].count++;
    this.metrics.requests.byEndpoint[key].totalTime += responseTime;
    
    if (statusCode >= 400) {
      this.metrics.requests.byEndpoint[key].errors++;
    }

    // Response time tracking
    this.metrics.response.times.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.response.times.length > 1000) {
      this.metrics.response.times = this.metrics.response.times.slice(-1000);
    }
    
    // Calculate average
    this.metrics.response.averageTime = 
      this.metrics.response.times.reduce((a, b) => a + b, 0) / this.metrics.response.times.length;
  }

  // User metrics
  recordUserSignup() {
    this.metrics.users.signups++;
  }

  recordUserLogin() {
    this.metrics.users.logins++;
  }

  updateActiveUsers(count) {
    this.metrics.users.active = count;
  }

  // Food metrics
  recordFoodSearch() {
    this.metrics.food.searches++;
  }

  recordFoodEntry() {
    this.metrics.food.entries++;
  }

  // AI metrics
  recordChatRequest() {
    this.metrics.ai.chatRequests++;
  }

  recordNutritionInsight() {
    this.metrics.ai.nutritionInsights++;
  }

  // Get metrics summary
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      requests: {
        ...this.metrics.requests,
        successRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.success / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        errorRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.errors / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        requestsPerMinute: this.metrics.requests.total / (uptime / 60000)
      },
      response: {
        averageTime: Math.round(this.metrics.response.averageTime * 100) / 100,
        p95: this.getPercentile(this.metrics.response.times, 95),
        p99: this.getPercentile(this.metrics.response.times, 99)
      },
      users: this.metrics.users,
      food: this.metrics.food,
      ai: this.metrics.ai
    };
  }

  // Calculate percentile
  getPercentile(times, percentile) {
    if (times.length === 0) return 0;
    
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] * 100) / 100;
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, byEndpoint: {} },
      response: { times: [], averageTime: 0 },
      users: { active: 0, signups: 0, logins: 0 },
      food: { searches: 0, entries: 0 },
      ai: { chatRequests: 0, nutritionInsights: 0 }
    };
    this.startTime = Date.now();
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
