# Dashboard Quick Start Guide

Get the API Performance Autotuner Dashboard up and running in 3 minutes.

## Step 1: Start the Server

```bash
npm start
```

Expected output:
```
🚀 Server is running on port 3000
📍 Environment: development
🎨 Dashboard: http://localhost:3000
🔗 Health check: http://localhost:3000/health
...
```

## Step 2: Open the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the dashboard with empty state (no data yet).

## Step 3: Generate Test Data

Open a new terminal and run:

### Windows PowerShell
```powershell
# Make 10 requests to each endpoint
for ($i=1; $i -le 10; $i++) { 
    Invoke-WebRequest -Uri http://localhost:3000/users 
}

for ($i=1; $i -le 10; $i++) { 
    Invoke-WebRequest -Uri http://localhost:3000/products 
}

for ($i=1; $i -le 10; $i++) { 
    Invoke-WebRequest -Uri http://localhost:3000/orders 
}
```

### Using curl (Windows/Mac/Linux)
```bash
# Quick test - 3 requests
curl http://localhost:3000/users
curl http://localhost:3000/products
curl http://localhost:3000/orders

# Generate more data
for i in {1..10}; do curl http://localhost:3000/users; done
for i in {1..10}; do curl http://localhost:3000/products; done
for i in {1..10}; do curl http://localhost:3000/orders; done
```

## Step 4: Refresh Dashboard

Click the "🔄 Refresh Data" button or wait for auto-refresh (30 seconds).

## Step 5: Verify Data

You should now see:

### Stats Cards
- ✅ Total Requests: 30 (or your count)
- ✅ Avg Response Time: Real value (e.g., 245.67ms)
- ✅ Slow Requests: Count of requests > 500ms
- ✅ Cache Improvement: Percentage (after cached requests)

### Chart
- ✅ Bars for GET /users, GET /products, GET /orders
- ✅ Color coded (green/orange/red)

### Slow APIs
- ✅ List of slow endpoints (if any)
- ✅ Or "No slow APIs detected!"

### Analysis
- ✅ Performance insights (if issues detected)
- ✅ Or "All systems performing well!"

### Cache Comparison
- ✅ Shows comparison after making duplicate requests
- ✅ Or "Not enough data to compare"

## Step 6: Test Cache Performance

Make the same request multiple times to see cache benefits:

```bash
# First request (not cached)
curl http://localhost:3000/users

# Subsequent requests (cached)
curl http://localhost:3000/users
curl http://localhost:3000/users
curl http://localhost:3000/users
```

Refresh dashboard to see cache improvement percentage.

## Debugging

### Open Browser Console (F12)

You should see logs like:
```
🚀 Dashboard initialized
📊 Loading dashboard data...
📈 Fetching stats from /metrics/stats...
Stats response: {success: true, data: {...}}
✅ Stats loaded successfully
...
```

### Common Issues

**Issue:** Dashboard shows "No data available"
- **Solution:** Make some API requests first (Step 3)

**Issue:** "Failed to load..."
- **Solution:** Check if server is running on port 3000
- **Solution:** Check browser console for errors

**Issue:** Chart not showing
- **Solution:** Check if Chart.js loaded (Network tab)
- **Solution:** Verify you made requests to business APIs

**Issue:** Cache comparison shows "Not enough data"
- **Solution:** Make duplicate requests to same endpoint
- **Solution:** Need both cached and non-cached requests

## Testing Different Scenarios

### Test Slow APIs
```bash
# Make many requests to trigger slow performance
for i in {1..50}; do curl http://localhost:3000/orders; done
```

### Clear All Data
```bash
# Delete all metrics
curl -X DELETE http://localhost:3000/metrics
```

### Check Raw API Data
```bash
# View all metrics
curl http://localhost:3000/metrics

# View stats
curl http://localhost:3000/metrics/stats

# View slow APIs
curl http://localhost:3000/metrics/slow

# View analysis
curl http://localhost:3000/analysis

# View cache comparison
curl http://localhost:3000/metrics/comparison
```

## Features to Try

1. **Auto-Refresh:** Wait 30 seconds, dashboard updates automatically
2. **Manual Refresh:** Click refresh button
3. **Last Updated:** Check timestamp updates
4. **Color Coding:** Make slow requests to see red/orange bars
5. **Empty States:** Clear metrics and see empty state messages
6. **Console Logs:** Watch real-time data flow in console

## Next Steps

- Read **DASHBOARD_TESTING_GUIDE.md** for detailed testing scenarios
- Read **public/DATA_FLOW.md** for technical documentation
- Read **DASHBOARD_IMPROVEMENTS.md** for implementation details

## Quick Commands Reference

```bash
# Start server
npm start

# Make test requests
curl http://localhost:3000/users
curl http://localhost:3000/products
curl http://localhost:3000/orders

# View metrics
curl http://localhost:3000/metrics/stats

# Clear metrics
curl -X DELETE http://localhost:3000/metrics

# Open dashboard
# http://localhost:3000
```

## Success Criteria

✅ Dashboard loads without errors
✅ Stats show real values (not 0 or N/A)
✅ Chart displays business endpoints
✅ Console shows successful logs
✅ Refresh button works
✅ Auto-refresh works
✅ Last updated timestamp updates

---

**You're all set! The dashboard is now displaying real backend performance data.**
