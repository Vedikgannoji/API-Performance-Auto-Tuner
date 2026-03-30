# Dashboard Testing Guide

This guide helps you test the API Performance Autotuner Dashboard to ensure it correctly displays real backend data.

## Prerequisites

1. Start the server:
   ```bash
   npm start
   ```

2. Open the dashboard:
   ```
   http://localhost:3000
   ```

3. Open browser console (F12) to see debug logs

## Testing Scenarios

### Scenario 1: Empty State (No Data)

**Expected Behavior:**
- Total Requests: 0
- Avg Response Time: N/A
- Slow Requests: 0
- Cache Improvement: N/A
- Chart: Shows "No Data" placeholder
- Slow APIs: "No slow APIs detected!"
- Analysis: "All systems performing well!"
- Cache Comparison: "Not enough data to compare"

**Console Logs:**
```
🚀 Dashboard initialized
📊 Loading dashboard data...
📈 Fetching stats from /metrics/stats...
⚠️ No metrics data available
```

### Scenario 2: Generate Test Data

**Make API Requests:**

```bash
# Windows (PowerShell)
# Make multiple requests to generate data
for ($i=1; $i -le 10; $i++) { Invoke-WebRequest -Uri http://localhost:3000/users }
for ($i=1; $i -le 10; $i++) { Invoke-WebRequest -Uri http://localhost:3000/products }
for ($i=1; $i -le 10; $i++) { Invoke-WebRequest -Uri http://localhost:3000/orders }

# Or use curl
curl http://localhost:3000/users
curl http://localhost:3000/products
curl http://localhost:3000/orders
```

**Expected Behavior After Requests:**
- Total Requests: Should show actual count (e.g., 30)
- Avg Response Time: Should show real average (e.g., 245.67ms)
- Slow Requests: Count of requests > 500ms
- Chart: Shows bars for /users, /products, /orders
- Colors:
  - Green: < 500ms
  - Orange: 500-1000ms
  - Red: > 1000ms

**Console Logs:**
```
📊 Fetching metrics from /metrics...
Total logs received: 30
Filtered logs (excluding system endpoints): 30
Endpoint statistics: [...]
✅ Metrics chart created successfully
```

### Scenario 3: Test Cache Performance

**Make Cached Requests:**

```bash
# First request (not cached)
curl http://localhost:3000/users

# Second request (should be cached)
curl http://localhost:3000/users

# Repeat multiple times
for ($i=1; $i -le 5; $i++) { curl http://localhost:3000/users }
```

**Expected Behavior:**
- Cache Improvement: Should show positive percentage (e.g., +45.2%)
- Cache Comparison section:
  - Without Cache: Higher value (e.g., 250ms)
  - With Cache: Lower value (e.g., 137ms)
  - Improvement: Positive percentage with "ms saved"

**Console Logs:**
```
💾 Fetching cache comparison from /metrics/comparison...
Cache data validation: {
  withCache: 137.45,
  withoutCache: 250.32,
  hasValidData: true
}
✅ Cache comparison loaded successfully
```

### Scenario 4: Test Slow APIs Detection

**Simulate Slow Requests:**

```bash
# Make requests with delay parameter (if your API supports it)
# Or make many requests to trigger slow performance
for ($i=1; $i -le 20; $i++) { curl http://localhost:3000/orders }
```

**Expected Behavior:**
- Slow Requests stat increases
- Slow APIs section shows endpoints with:
  - Avg Response Time
  - Slow Requests count
  - Max Time
- Chart shows orange/red bars for slow endpoints

**Console Logs:**
```
🐌 Fetching slow APIs from /metrics/slow...
Slow APIs (filtered): 3
✅ Slow APIs loaded successfully
```

### Scenario 5: Test Analysis & Suggestions

**Expected Behavior:**
- Analysis section shows insights based on performance patterns
- Each insight displays:
  - Endpoint name
  - Issue description
  - Suggestion
  - Severity badge (HIGH/MEDIUM/LOW)
- Color coding:
  - Red border: High severity
  - Orange border: Medium severity
  - Green border: Low severity

**Console Logs:**
```
💡 Fetching analysis from /analysis...
Analysis insights: 5
✅ Analysis loaded successfully
```

### Scenario 6: Test Auto-Refresh

**Expected Behavior:**
- Dashboard auto-refreshes every 30 seconds
- "Last updated" timestamp updates
- Console shows: `⏰ Auto-refresh triggered`

### Scenario 7: Test Manual Refresh

**Steps:**
1. Click "🔄 Refresh Data" button

**Expected Behavior:**
- All data reloads
- "Last updated" timestamp updates
- Console shows: `🔄 Manual refresh triggered`

## Data Validation Checks

The dashboard performs these validations:

1. **Stats Validation:**
   - Checks if values are valid numbers
   - Shows "N/A" for invalid/missing data
   - Shows "0" for zero values

2. **Endpoint Filtering:**
   - Filters out system endpoints:
     - /favicon.ico
     - /metrics
     - /analysis
     - /health
     - /metrics/stats
     - /metrics/slow
     - /metrics/comparison
   - Only shows business APIs

3. **Cache Comparison Validation:**
   - Requires both cached and non-cached data
   - Shows "Not enough data" if insufficient
   - Validates positive numbers

4. **Chart Data Validation:**
   - Groups logs by endpoint
   - Calculates real averages
   - Shows empty state if no data

## Debugging Tips

### Check API Responses

Open browser console and look for:
```javascript
// Stats response
Stats response: {success: true, data: {...}}

// Metrics response
Metrics response: {success: true, count: 30, data: [...]}

// Slow APIs response
Slow APIs response: {success: true, count: 5, data: [...]}

// Analysis response
Analysis response: {success: true, count: 3, data: [...]}

// Cache comparison response
Cache comparison response: {success: true, data: {...}}
```

### Common Issues

1. **"No data available"**
   - Make some API requests first
   - Check if server is running

2. **"Failed to load..."**
   - Check network tab for errors
   - Verify API endpoints are working
   - Check server logs

3. **Incorrect values**
   - Check console for validation warnings
   - Verify backend is returning correct data structure

4. **Chart not showing**
   - Check if Chart.js loaded (network tab)
   - Verify data is being passed to chart
   - Check console for errors

## Expected Console Output (With Data)

```
🚀 Dashboard initialized
📊 Loading dashboard data...
📈 Fetching stats from /metrics/stats...
Stats response: {success: true, data: {totalRequests: 30, ...}}
✅ Stats loaded successfully
📊 Fetching metrics from /metrics...
Metrics response: {success: true, count: 30, data: [...]}
Total logs received: 30
Filtered logs (excluding system endpoints): 30
Chart data - Labels: ["GET /users", "GET /products", "GET /orders"]
Chart data - Avg Times: [245.67, 312.45, 189.23]
✅ Metrics chart created successfully
🐌 Fetching slow APIs from /metrics/slow...
Slow APIs (filtered): 2
✅ Slow APIs loaded successfully
💡 Fetching analysis from /analysis...
Analysis insights: 3
✅ Analysis loaded successfully
💾 Fetching cache comparison from /metrics/comparison...
Cache data validation: {withCache: 137.45, withoutCache: 250.32, hasValidData: true}
✅ Cache comparison loaded successfully
✅ Dashboard data loaded successfully
```

## Performance Metrics

The dashboard should:
- Load in < 2 seconds
- Refresh smoothly without flickering
- Handle 100+ logs without lag
- Update charts without destroying user experience

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Next Steps

After testing:
1. Clear metrics: `DELETE http://localhost:3000/metrics`
2. Generate fresh test data
3. Verify all sections update correctly
4. Check console for any warnings/errors
