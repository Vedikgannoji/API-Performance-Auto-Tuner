# Dashboard Data Flow Documentation

This document explains how data flows from backend APIs to the dashboard UI.

## API Endpoints & Data Structure

### 1. GET /metrics/stats

**Purpose:** Get aggregated statistics

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 30,
    "averageResponseTime": 245.67,
    "slowRequestCount": 5,
    "fastestRequest": {...},
    "slowestRequest": {...},
    "endpointStats": {...}
  }
}
```

**Dashboard Usage:**
- `totalRequests` → "Total Requests" stat card
- `averageResponseTime` → "Avg Response Time" stat card
- `slowRequestCount` → "Slow Requests" stat card

**Validation:**
- Checks if values are valid numbers
- Shows "N/A" for missing/invalid data
- Shows "0" for zero values

---

### 2. GET /metrics

**Purpose:** Get all performance logs

**Response Structure:**
```json
{
  "success": true,
  "count": 30,
  "data": [
    {
      "method": "GET",
      "endpoint": "/users",
      "responseTime": 245.67,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:15:30.123Z",
      "fromCache": false
    },
    ...
  ]
}
```

**Dashboard Usage:**
- Groups logs by endpoint
- Calculates average response time per endpoint
- Creates bar chart with color coding:
  - Green: < 500ms
  - Orange: 500-1000ms
  - Red: > 1000ms

**Filtering:**
- Excludes system endpoints: `/favicon.ico`, `/metrics`, `/analysis`, `/health`
- Only shows business APIs

**Processing:**
```javascript
// Group by endpoint
const endpointStats = {};
logs.forEach(log => {
  const key = `${log.method} ${log.endpoint}`;
  if (!endpointStats[key]) {
    endpointStats[key] = { totalTime: 0, count: 0 };
  }
  endpointStats[key].totalTime += log.responseTime;
  endpointStats[key].count++;
});

// Calculate averages
Object.keys(endpointStats).forEach(key => {
  endpointStats[key].avgTime = 
    endpointStats[key].totalTime / endpointStats[key].count;
});
```

---

### 3. GET /metrics/slow?threshold=500

**Purpose:** Get slow API requests (response time > threshold)

**Response Structure:**
```json
{
  "success": true,
  "threshold": "500ms",
  "count": 5,
  "data": [
    {
      "method": "GET",
      "endpoint": "/orders",
      "responseTime": 678.45,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:15:30.123Z",
      "fromCache": false
    },
    ...
  ]
}
```

**Dashboard Usage:**
- Filters out system endpoints
- Groups by endpoint
- Calculates:
  - Average response time
  - Count of slow requests
  - Max response time
- Displays in "Slow APIs" section

**Empty State:**
- Shows: "✅ No slow APIs detected! All endpoints performing well."

---

### 4. GET /analysis

**Purpose:** Get performance analysis and suggestions

**Response Structure:**
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
      "suggestion": "Immediate optimization required - check database queries...",
      "details": {
        "criticalRequestCount": 3,
        "totalRequests": 10,
        "maxResponseTime": 1234.56
      }
    },
    ...
  ]
}
```

**Dashboard Usage:**
- Displays each insight with:
  - Endpoint name
  - Issue description
  - Suggestion
  - Severity badge
- Color coding by severity:
  - High: Red border
  - Medium: Orange border
  - Low: Green border

**Empty State:**
- Shows: "✅ All systems performing well! No issues detected."

**Severity Levels:**
- `high`: Critical issues requiring immediate attention
- `medium`: Performance concerns needing optimization
- `low`: Informational suggestions

---

### 5. GET /metrics/comparison

**Purpose:** Compare cached vs non-cached performance

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 30,
    "cachedRequests": 15,
    "nonCachedRequests": 15,
    "avgResponseTimeWithCache": 137.45,
    "avgResponseTimeWithoutCache": 250.32,
    "improvementPercentage": 45.12,
    "improvementMs": 112.87
  }
}
```

**Dashboard Usage:**
- `improvementPercentage` → "Cache Improvement" stat card
- Displays comparison table:
  - Without Cache: avgResponseTimeWithoutCache
  - With Cache: avgResponseTimeWithCache
  - Improvement: improvementPercentage + improvementMs

**Validation:**
- Requires both cached and non-cached data
- Both values must be > 0
- If insufficient data, shows: "Not enough data to compare cache performance"

**Empty State:**
```
Status: Not enough data to compare cache performance.
Make some API requests to see cache benefits.
```

---

## Data Validation Rules

### 1. Number Validation
```javascript
function isValidNumber(value) {
  return typeof value === 'number' && 
         !isNaN(value) && 
         isFinite(value);
}
```

### 2. Endpoint Filtering
```javascript
const IGNORED_ENDPOINTS = [
  '/favicon.ico',
  '/metrics',
  '/analysis',
  '/health',
  '/metrics/stats',
  '/metrics/slow',
  '/metrics/comparison'
];

function filterEndpoint(endpoint) {
  return !IGNORED_ENDPOINTS.includes(endpoint);
}
```

### 3. Empty Data Handling
- Always check `data.success` first
- Verify data exists and has length
- Show appropriate empty states
- Never display placeholder/fake values

---

## Console Logging

All API calls log:
1. Request initiation
2. Response data
3. Validation results
4. Success/error status

Example:
```javascript
console.log('📊 Fetching metrics from /metrics...');
console.log('Metrics response:', data);
console.log('Total logs received:', data.count);
console.log('✅ Metrics chart created successfully');
```

---

## Error Handling

Each API call has try-catch:
```javascript
try {
  const response = await fetch(`${API_BASE}/metrics`);
  const data = await response.json();
  
  if (!data.success) {
    console.warn('⚠️ API returned success: false');
    // Show error state
    return;
  }
  
  // Process data
  
} catch (error) {
  console.error('❌ Error loading metrics:', error);
  // Show error message
}
```

---

## Refresh Mechanism

### Auto-Refresh
- Interval: 30 seconds
- Logs: `⏰ Auto-refresh triggered`

### Manual Refresh
- Button click
- Logs: `🔄 Manual refresh triggered`

### Update Timestamp
```javascript
function updateLastRefreshTime() {
  lastUpdate = new Date();
  const timeString = lastUpdate.toLocaleTimeString();
  document.getElementById('lastUpdate').textContent = 
    `Last updated: ${timeString}`;
}
```

---

## Chart Data Processing

### Step 1: Filter Logs
```javascript
const filteredLogs = logs.filter(log => 
  filterEndpoint(log.endpoint)
);
```

### Step 2: Group by Endpoint
```javascript
const endpointStats = {};
filteredLogs.forEach(log => {
  const key = `${log.method} ${log.endpoint}`;
  // Accumulate data
});
```

### Step 3: Calculate Averages
```javascript
Object.keys(endpointStats).forEach(key => {
  stats.avgTime = stats.totalTime / stats.count;
});
```

### Step 4: Create Chart
```javascript
const labels = endpoints.map(e => e.endpoint);
const avgTimes = endpoints.map(e => e.avgTime);
const colors = avgTimes.map(time => {
  if (time > 1000) return '#f56565'; // Red
  if (time > 500) return '#ed8936';  // Orange
  return '#48bb78';                   // Green
});

createChart(labels, avgTimes, colors);
```

---

## Color Coding System

### Response Time Colors
- **Green (#48bb78)**: < 500ms - Good performance
- **Orange (#ed8936)**: 500-1000ms - Warning
- **Red (#f56565)**: > 1000ms - Critical

### Severity Colors
- **High**: Red border (#f56565)
- **Medium**: Orange border (#ed8936)
- **Low**: Green border (#48bb78)

### Cache Improvement Colors
- **Positive**: Green - Performance improved
- **Negative**: Red - Performance degraded
- **Zero**: Gray - No change

---

## Testing Data Flow

1. Start with empty state
2. Make API requests
3. Verify data appears correctly
4. Check console logs for validation
5. Test edge cases (no data, errors)
6. Verify auto-refresh works
7. Test manual refresh

See DASHBOARD_TESTING_GUIDE.md for detailed testing scenarios.
