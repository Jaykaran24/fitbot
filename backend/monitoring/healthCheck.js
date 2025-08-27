const mongoose = require('mongoose');

class HealthCheckService {
  static async checkDatabase() {
    try {
      if (mongoose.connection.readyState === 1) {
        // Test a simple query
        await mongoose.connection.db.admin().ping();
        return { status: 'healthy', message: 'Database connection active' };
      } else {
        return { status: 'unhealthy', message: 'Database not connected' };
      }
    } catch (error) {
      return { status: 'unhealthy', message: `Database error: ${error.message}` };
    }
  }

  static async checkExternalAPIs() {
    const checks = {};
    
    try {
      // Check Open Food Facts API
      const response = await fetch('https://world.openfoodfacts.org/api/v0/product/737628064502.json');
      checks.openFoodFacts = response.ok ? 
        { status: 'healthy', message: 'Open Food Facts API accessible' } :
        { status: 'unhealthy', message: 'Open Food Facts API not responding' };
    } catch (error) {
      checks.openFoodFacts = { status: 'unhealthy', message: `Open Food Facts API error: ${error.message}` };
    }

    return checks;
  }

  static getSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`
      },
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  static async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    try {
      // Database health
      healthCheck.checks.database = await this.checkDatabase();
      
      // External APIs health
      healthCheck.checks.externalAPIs = await this.checkExternalAPIs();
      
      // System health
      healthCheck.checks.system = this.getSystemHealth();

      // Overall status
      const hasUnhealthy = Object.values(healthCheck.checks).some(check => 
        check.status === 'unhealthy' || 
        (typeof check === 'object' && Object.values(check).some(subCheck => subCheck.status === 'unhealthy'))
      );
      
      if (hasUnhealthy) {
        healthCheck.status = 'degraded';
      }

    } catch (error) {
      healthCheck.status = 'unhealthy';
      healthCheck.error = error.message;
    }

    return healthCheck;
  }
}

module.exports = HealthCheckService;
