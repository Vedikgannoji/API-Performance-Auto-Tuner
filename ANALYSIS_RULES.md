# Analysis Engine - Rule Definitions

## 📋 Complete Rule Reference

This document provides detailed specifications for all analysis rules implemented in the Analysis Engine.

---

## Rule 1: Slow Endpoint Detection

### Identifier
`detectSlowEndpoints()`

### Severity
🟡 **MEDIUM**

### Trigger Conditions
- Response time between **500ms - 1000ms**
- More than **30%** of requests are slow

### Detection Logic
```javascript
1. Group all logs by endpoint (method + URL)
2. For each endpoint:
   - Count total requests
   - Count slow requests (500ms < time ≤ 1000ms)
   - Calculate percentage: (slowCount / totalCount) * 100
3. If percentage > 30%:
   - Generate insight
```

### Example Scenario
```
Endpoint: GET /users
Total Requests: 20
Slow Requests (500-1000ms): 8
Percentage: 40%
Result: ✅ Insight generated
```

### Insight Output
```json
{
  "endpoint": "GET /users",
  "issue": "Slow response time detected (avg: 678.90ms)",
  "severity": "medium",
  "suggestion": "Optimize database queries or enable caching",
  "details": {
    "slowRequestCount": 8,
    "totalRequests": 20,
    "averageResponseTime": 678.90
  }
}
```

### Recommended Actions
1. Review database queries for N+1 problems
2. Add database indexes on frequently queried columns
3. Implement query result caching (Redis)
4. Use database query optimization tools
5. Consider pagination for large datasets

---

## Rule 2: Critical Performance Issues

### Identifier
`detectVerySlowEndpoints()`

### Severity
🔴 **HIGH**

### Trigger Conditions
- Response time **> 1000ms**
- Any occurrence triggers alert

### Detection Logic
```javascript
1. Group all logs by endpoint
2. For each endpoint:
   - Count requests > 1000ms
   - Track maximum response time
3. If any very slow requests exist:
   - Generate high severity insight
```

### Example Scenario
```
Endpoint: GET /orders
Total Requests: 15
Very Slow Requests (>1000ms): 3
Max Response Time: 1234.56ms
Result: ✅ Critical insight generated
```

### Insight Output
```json
{
  "endpoint": "GET /orders",
  "issue": "Critical performance issue (max: 1234.56ms)",
  "severity": "high",
  "suggestion": "Immediate optimization required - check database queries, add indexes, or implement caching",
  "details": {
    "criticalRequestCount": 3,
    "totalRequests": 15,
    "maxResponseTime": 1234.56
  }
}
```

### Recommended Actions
1. **IMMEDIATE**: Investigate the slowest requests
2. Check database query execution plans
3. Add missing database indexes
4. Implement aggressive caching
5. Consider database read replicas
6. Review external API calls
7. Check for blocking operations

---

## Rule 3: High Traffic Detection

### Identifier
`detectHighTraffic()`

### Severity
🟢 **LOW**

### Trigger Conditions
- Endpoint called **more than 50 times**

### Detection Logic
```javascript
1. Count requests per endpoint
2. If count > 50:
   - Generate low severity insight
```

### Example Scenario
```
Endpoint: GET /products
Total Requests: 52
Result: ✅ Insight generated
```

### Insight Output
```json
{
  "endpoint": "GET /products",
  "issue": "High traffic detected (52 requests)",
  "severity": "low",
  "suggestion": "Enable caching (Redis/CDN) to reduce server load",
  "details": {
    "requestCount": 52
  }
}
```

### Recommended Actions
1. Implement Redis caching for frequently accessed data
2. Set up CDN for static content
3. Enable HTTP caching headers (ETag, Cache-Control)
4. Consider API rate limiting
5. Implement load balancing
6. Use database connection pooling

---

## Rule 4: Repeated Slow Endpoints

### Identifier
`detectRepeatedSlowEndpoints()`

### Severity
🟡 **MEDIUM**

### Trigger Conditions
- Endpoint appears in slow logs **≥ 5 times**
- Slow = response time > 500ms

### Detection Logic
```javascript
1. Filter all logs where responseTime > 500ms
2. Group slow logs by endpoint
3. Count slow requests per endpoint
4. If count ≥ 5:
   - Calculate average slow time
   - Generate insight
```

### Example Scenario
```
Endpoint: GET /users
Total Slow Requests: 7
Average Slow Time: 645.23ms
Result: ✅ Insight generated
```

### Insight Output
```json
{
  "endpoint": "GET /users",
  "issue": "Consistently slow performance (7 slow requests)",
  "severity": "medium",
  "suggestion": "Consider database indexing, query optimization, or adding read replicas",
  "details": {
    "slowRequestCount": 7,
    "averageSlowTime": 645.23
  }
}
```

### Recommended Actions
1. Analyze query patterns for this endpoint
2. Add composite indexes for complex queries
3. Implement database query caching
4. Set up read replicas for read-heavy endpoints
5. Use database query profiling tools
6. Consider denormalization for frequently joined tables

---

## Rule 5: High Error Rate Detection

### Identifier
`detectErrorRates()`

### Severity
🔴 **HIGH**

### Trigger Conditions
- Status code **≥ 500** (server errors)
- Error rate **> 10%** OR **≥ 3 errors**

### Detection Logic
```javascript
1. Group logs by endpoint
2. For each endpoint:
   - Count total requests
   - Count errors (statusCode ≥ 500)
   - Calculate error rate: (errorCount / totalCount) * 100
3. If error rate > 10% OR errorCount ≥ 3:
   - Generate high severity insight
```

### Example Scenario
```
Endpoint: GET /orders
Total Requests: 20
Error Count: 4
Error Rate: 20%
Result: ✅ Critical insight generated
```

### Insight Output
```json
{
  "endpoint": "GET /orders",
  "issue": "High error rate detected (20.0%)",
  "severity": "high",
  "suggestion": "Investigate server errors immediately - check logs, database connections, and external dependencies",
  "details": {
    "errorCount": 4,
    "totalRequests": 20,
    "errorRate": 20.0,
    "recentErrors": [
      {
        "statusCode": 500,
        "timestamp": "2024-03-30T10:30:00.000Z"
      },
      {
        "statusCode": 503,
        "timestamp": "2024-03-30T10:31:00.000Z"
      },
      {
        "statusCode": 500,
        "timestamp": "2024-03-30T10:32:00.000Z"
      }
    ]
  }
}
```

### Recommended Actions
1. **IMMEDIATE**: Check application logs for error details
2. Verify database connection pool status
3. Check external API dependencies
4. Review recent code deployments
5. Monitor server resources (CPU, memory, disk)
6. Implement circuit breakers for external services
7. Add comprehensive error logging
8. Set up error alerting

---

## 🎯 Severity Priority Matrix

| Severity | Response Time | Error Rate | Traffic | Action Required |
|----------|--------------|------------|---------|-----------------|
| 🔴 HIGH | >1000ms | >10% or ≥3 errors | N/A | Immediate |
| 🟡 MEDIUM | 500-1000ms | N/A | N/A | Within 24h |
| 🟢 LOW | <500ms | <10% | >50 requests | Plan ahead |

---

## 🔄 Rule Execution Order

The analysis engine executes rules in this order:

```
1. detectSlowEndpoints()
   ↓
2. detectVerySlowEndpoints()
   ↓
3. detectHighTraffic()
   ↓
4. detectRepeatedSlowEndpoints()
   ↓
5. detectErrorRates()
   ↓
6. Collect all insights
   ↓
7. Sort by severity (high → medium → low)
   ↓
8. Return results
```

---

## 📊 Rule Effectiveness Metrics

### Rule Coverage
- **Slow Endpoints**: Catches 500-1000ms issues
- **Critical Performance**: Catches >1000ms issues
- **High Traffic**: Identifies scalability needs
- **Repeated Slow**: Detects consistent problems
- **Error Rate**: Catches reliability issues

### Detection Thresholds

| Rule | Threshold | Rationale |
|------|-----------|-----------|
| Slow | 500ms | Industry standard for "slow" |
| Critical | 1000ms | User experience severely impacted |
| High Traffic | 50 requests | Significant load indicator |
| Repeated | 5 occurrences | Pattern established |
| Error Rate | 10% or 3 errors | Reliability concern |

---

## 🧪 Testing Each Rule

### Test Rule 1: Slow Endpoints
```bash
# Generate requests that will be 500-1000ms
for i in {1..20}; do
  curl http://localhost:3000/products
done

# Check analysis
curl http://localhost:3000/analysis | grep "Slow response"
```

### Test Rule 2: Critical Performance
```bash
# Some requests will randomly be >1000ms
for i in {1..15}; do
  curl http://localhost:3000/orders
done

# Check for critical issues
curl http://localhost:3000/analysis/critical
```

### Test Rule 3: High Traffic
```bash
# Generate >50 requests
for i in {1..60}; do
  curl http://localhost:3000/users
done

# Check analysis
curl http://localhost:3000/analysis | grep "High traffic"
```

### Test Rule 4: Repeated Slow
```bash
# Generate multiple slow requests
for i in {1..10}; do
  curl http://localhost:3000/products
done

# Check analysis
curl http://localhost:3000/analysis | grep "Consistently slow"
```

### Test Rule 5: Error Rate
```bash
# This would require simulating errors
# In production, monitor actual error responses
curl http://localhost:3000/analysis | grep "error rate"
```

---

## 🔧 Customizing Rules

### Adjusting Thresholds

To modify detection thresholds, edit `services/analysis.service.js`:

```javascript
// Change slow threshold from 500ms to 300ms
if (log.responseTime > 300 && log.responseTime <= 1000) {
  // ...
}

// Change high traffic threshold from 50 to 100
if (count > 100) {
  // ...
}

// Change repeated slow threshold from 5 to 10
if (stats.count >= 10) {
  // ...
}
```

### Adding New Rules

To add a new rule:

1. Create detection function in `analysis.service.js`:
```javascript
detectNewRule: (logs) => {
  const insights = [];
  // Your detection logic
  return insights;
}
```

2. Add to `analyzePerformance()`:
```javascript
insights.push(...analysisService.detectNewRule(logs));
```

3. Update documentation

---

## 📈 Rule Performance

### Computational Complexity

| Rule | Time Complexity | Space Complexity |
|------|----------------|------------------|
| Slow Endpoints | O(n) | O(m) |
| Critical Performance | O(n) | O(m) |
| High Traffic | O(n) | O(m) |
| Repeated Slow | O(n) | O(m) |
| Error Rate | O(n) | O(m) |

Where:
- n = number of logs
- m = number of unique endpoints

### Optimization Notes
- All rules use single-pass algorithms
- Endpoint grouping is efficient with hash maps
- No nested loops or recursive operations
- Memory usage scales with unique endpoints, not total logs

---

## ✅ Rule Validation Checklist

When adding or modifying rules:

- [ ] Clear trigger conditions defined
- [ ] Appropriate severity level assigned
- [ ] Actionable suggestion provided
- [ ] Detailed metrics included
- [ ] Edge cases handled (empty logs, single request, etc.)
- [ ] Performance impact minimal (O(n) or better)
- [ ] Documentation updated
- [ ] Tests added

---

## 🎓 Best Practices

1. **Threshold Tuning**: Adjust thresholds based on your application's SLA
2. **Rule Priority**: Address high severity issues first
3. **Regular Review**: Run analysis after significant traffic
4. **Trend Monitoring**: Compare insights over time
5. **Action Tracking**: Document which suggestions were implemented

---

**Last Updated:** 2024-03-30
**Version:** 1.0.0
**Rules Implemented:** 5
