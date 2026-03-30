# Quick Start Guide - Analysis Engine

## 🚀 Get Started in 3 Minutes

### Step 1: Start the Server (30 seconds)
```bash
npm install
npm start
```

You should see:
```
🚀 Server is running on port 3000
📍 Environment: development
🔗 Health check: http://localhost:3000/health
```

---

### Step 2: Generate Traffic (1 minute)
```bash
# Quick test - 15 requests
for i in {1..5}; do
  curl -s http://localhost:3000/users > /dev/null
  curl -s http://localhost:3000/products > /dev/null
  curl -s http://localhost:3000/orders > /dev/null
done
```

Or use the automated script:
```bash
chmod +x test-performance.sh
./test-performance.sh
```

---

### Step 3: View Analysis (30 seconds)
```bash
# Get all insights
curl http://localhost:3000/analysis

# Get only critical issues
curl http://localhost:3000/analysis/critical

# Get summary
curl http://localhost:3000/analysis/summary
```

---

## 📊 What You'll See

### Example Analysis Output
```json
{
  "success": true,
  "summary": {
    "totalInsights": 3,
    "bySeverity": {
      "high": 1,
      "medium": 1,
      "low": 1
    }
  },
  "count": 3,
  "data": [
    {
      "endpoint": "GET /orders",
      "issue": "Critical performance issue (max: 1234.56ms)",
      "severity": "high",
      "suggestion": "Immediate optimization required - check database queries, add indexes, or implement caching"
    },
    {
      "endpoint": "GET /products",
      "issue": "Slow response time detected (avg: 678.90ms)",
      "severity": "medium",
      "suggestion": "Optimize database queries or enable caching"
    },
    {
      "endpoint": "GET /users",
      "issue": "High traffic detected (52 requests)",
      "severity": "low",
      "suggestion": "Enable caching (Redis/CDN) to reduce server load"
    }
  ]
}
```

---

## 🎯 Understanding the Output

### Severity Levels

🔴 **HIGH** - Fix immediately
- Response time >1000ms
- High error rate
- **Action**: Stop and fix now

🟡 **MEDIUM** - Fix soon
- Response time 500-1000ms
- Repeated slow requests
- **Action**: Plan optimization within 24h

🟢 **LOW** - Consider for future
- High traffic but performing well
- **Action**: Plan for scalability

---

## 🔧 Common Scenarios

### Scenario 1: No Issues Found
```json
{
  "success": true,
  "summary": {
    "totalInsights": 0
  },
  "count": 0,
  "data": []
}
```
**Meaning**: All endpoints performing well! 🎉

### Scenario 2: Critical Issues
```json
{
  "success": true,
  "severity": "high",
  "count": 2,
  "message": "Critical issues require immediate attention"
}
```
**Action**: Check `/analysis/critical` and fix immediately

### Scenario 3: Optimization Needed
```json
{
  "summary": {
    "bySeverity": {
      "high": 0,
      "medium": 3,
      "low": 1
    }
  }
}
```
**Action**: Review medium severity issues and plan optimizations

---

## 📋 All Available Endpoints

### Data Endpoints
```bash
GET /health      # Health check
GET /users       # Get users (with simulated delay)
GET /products    # Get products (with simulated delay)
GET /orders      # Get orders (with simulated delay)
```

### Metrics Endpoints
```bash
GET /metrics              # All performance logs
GET /metrics/slow         # Slow requests (>500ms)
GET /metrics/stats        # Performance statistics
DELETE /metrics           # Clear all logs
```

### Analysis Endpoints
```bash
GET /analysis             # All insights + summary
GET /analysis/critical    # Only high severity issues
GET /analysis/summary     # Summary statistics only
```

---

## 🧪 Testing Workflow

### 1. Clear Previous Data
```bash
curl -X DELETE http://localhost:3000/metrics
```

### 2. Generate New Traffic
```bash
for i in {1..20}; do
  curl -s http://localhost:3000/users > /dev/null
  curl -s http://localhost:3000/products > /dev/null
  curl -s http://localhost:3000/orders > /dev/null
done
```

### 3. Check Metrics
```bash
curl http://localhost:3000/metrics/stats
```

### 4. Get Analysis
```bash
curl http://localhost:3000/analysis
```

### 5. Review Critical Issues
```bash
curl http://localhost:3000/analysis/critical
```

---

## 💡 Pro Tips

### Tip 1: Use jq for Pretty Output
```bash
curl -s http://localhost:3000/analysis | jq
```

### Tip 2: Filter Specific Severity
```bash
curl -s http://localhost:3000/analysis | jq '.data[] | select(.severity=="high")'
```

### Tip 3: Count Issues by Type
```bash
curl -s http://localhost:3000/analysis/summary | jq '.data.byIssueType'
```

### Tip 4: Monitor in Real-Time
```bash
watch -n 5 'curl -s http://localhost:3000/analysis/summary | jq'
```

### Tip 5: Generate Heavy Load
```bash
# Generate 100 requests quickly
seq 1 100 | xargs -P 10 -I {} curl -s http://localhost:3000/users > /dev/null
```

---

## 🔍 Troubleshooting

### Issue: No insights generated
**Solution**: Generate more traffic (need at least 5-10 requests)

### Issue: Server not responding
**Solution**: Check if server is running on port 3000
```bash
lsof -i :3000
```

### Issue: All requests are fast
**Solution**: This is good! The simulated delays are random (100-1000ms), so some batches may be faster

### Issue: Can't see critical issues
**Solution**: Generate more requests. Critical issues (>1000ms) occur randomly

---

## 📚 Next Steps

### Learn More
- Read `ANALYSIS_ENGINE.md` for complete documentation
- Read `ANALYSIS_RULES.md` for rule specifications
- Read `README.md` for full project documentation

### Customize
- Adjust thresholds in `services/analysis.service.js`
- Add new rules following existing patterns
- Modify severity levels based on your SLA

### Integrate
- Add to monitoring dashboard
- Set up alerts for critical issues
- Export metrics to external tools

---

## 🎯 Quick Reference

### One-Line Commands

```bash
# Full test cycle
npm start && sleep 2 && ./test-performance.sh

# Quick analysis
curl -s http://localhost:3000/analysis | jq '.summary'

# Critical issues only
curl -s http://localhost:3000/analysis/critical | jq '.count'

# Generate traffic + analyze
for i in {1..20}; do curl -s http://localhost:3000/users > /dev/null; done && curl -s http://localhost:3000/analysis | jq

# Clear and restart
curl -X DELETE http://localhost:3000/metrics && echo "Metrics cleared"
```

---

## ✅ Success Checklist

After following this guide, you should be able to:

- [x] Start the server
- [x] Generate traffic
- [x] View performance metrics
- [x] Get analysis insights
- [x] Understand severity levels
- [x] Identify critical issues
- [x] Read optimization suggestions

---

## 🎉 You're Ready!

You now have a fully functional performance analysis system. The engine will:

✅ Automatically track all requests
✅ Analyze performance patterns
✅ Generate actionable insights
✅ Prioritize by severity
✅ Suggest specific optimizations

**Happy optimizing!** 🚀

---

**Need Help?**
- Check `README.md` for detailed documentation
- Review `ANALYSIS_ENGINE.md` for architecture details
- Read `ANALYSIS_RULES.md` for rule specifications
