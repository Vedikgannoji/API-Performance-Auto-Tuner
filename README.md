# API Performance Autotuner

A clean, production-ready Node.js backend built with Express.js featuring a scalable architecture and RESTful APIs.

## 📁 Project Structure

```
api-performance-autotuner/
├── config/
│   ├── app.js                      # Express app configuration
│   └── config.js                   # Environment configuration
├── controllers/
│   ├── health.controller.js        # Health check logic
│   ├── user.controller.js          # User request handlers
│   ├── product.controller.js       # Product request handlers
│   ├── order.controller.js         # Order request handlers
│   ├── metrics.controller.js       # ⭐ Performance metrics handlers
│   ├── analysis.controller.js      # 🔥 Analysis & insights handlers
│   └── cache.controller.js         # 🚀 Cache management handlers
├── middleware/
│   ├── logging.middleware.js       # Request logging
│   ├── performance.middleware.js   # ⭐ Performance tracking
│   ├── cache.middleware.js         # 🚀 Smart caching layer
│   └── error.middleware.js         # Error handling
├── routes/
│   ├── health.routes.js            # Health endpoints
│   ├── user.routes.js              # User endpoints
│   ├── product.routes.js           # Product endpoints
│   ├── order.routes.js             # Order endpoints
│   ├── metrics.routes.js           # ⭐ Metrics endpoints
│   ├── analysis.routes.js          # 🔥 Analysis endpoints
│   └── cache.routes.js             # 🚀 Cache management endpoints
├── services/
│   ├── health.service.js           # Health business logic
│   ├── user.service.js             # User business logic
│   ├── product.service.js          # Product business logic
│   ├── order.service.js            # Order business logic
│   ├── performance.service.js      # ⭐ Performance data management
│   ├── analysis.service.js         # 🔥 Analysis engine & insights
│   └── cache.service.js            # 🚀 Cache management
├── .env                            # Environment variables
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies
├── server.js                       # Entry point
├── test-performance.sh             # ⭐ Testing script
└── README.md                       # Documentation
```

⭐ = Performance tracking files
🔥 = Analysis engine files
🚀 = Caching optimization files

## 🚀 Features

- **Clean Architecture**: Separation of concerns with routes, controllers, and services
- **CORS Enabled**: Cross-Origin Resource Sharing configured
- **Error Handling**: Centralized error handling middleware
- **Request Logging**: Custom middleware for logging all requests
- **Performance Tracking**: Automatic performance monitoring for all API requests
- **Performance Metrics**: Detailed statistics and slow request detection
- **Intelligent Analysis Engine**: Rule-based system that generates optimization suggestions
- **Severity-Based Insights**: Categorizes issues as high, medium, or low priority
- **Actionable Recommendations**: Specific suggestions for performance optimization
- **Smart Caching Layer**: Automatic response caching with configurable TTL
- **Cache Performance Tracking**: Separate metrics for cached vs non-cached responses
- **Measurable Improvements**: Real-time performance comparison showing cache benefits
- **Cache Management APIs**: Full control over caching behavior
- **Health Check**: Endpoint to monitor server status
- **RESTful APIs**: Well-structured REST endpoints
- **Realistic Latency**: Simulated delays (100ms-1000ms) for testing
- **Environment Configuration**: Using dotenv for configuration management

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
The `.env` file is already created with default values:
```
PORT=3000
NODE_ENV=development
```

## ▶️ Running the Project

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## 🔌 API Endpoints

### Health Check
- **GET** `/health` - Check server health status

### Users
- **GET** `/users` - Get all users (returns 5 user records)

### Products
- **GET** `/products` - Get all products (returns 5 product records)

### Orders
- **GET** `/orders` - Get all orders (returns 5 order records)

### Performance Metrics
- **GET** `/metrics` - Get all performance logs
- **GET** `/metrics/slow` - Get slow requests (response time > 500ms)
- **GET** `/metrics/slow?threshold=300` - Get slow requests with custom threshold
- **GET** `/metrics/stats` - Get aggregated performance statistics
- **DELETE** `/metrics` - Clear all performance logs

### Performance Analysis & Insights
- **GET** `/analysis` - Get all performance insights and optimization suggestions
- **GET** `/analysis/critical` - Get only critical (high severity) issues
- **GET** `/analysis/summary` - Get analysis summary statistics

### Cache Management
- **POST** `/cache/enable` - Enable caching globally
- **POST** `/cache/disable` - Disable caching globally
- **DELETE** `/cache/clear` - Clear all cached data
- **GET** `/cache/stats` - Get cache statistics (hit rate, size, etc.)
- **GET** `/cache/keys` - Get all cache keys
- **DELETE** `/cache/:key` - Delete specific cache entry

## 📝 Example API Responses

### GET /health
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-03-30T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### GET /users
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "admin",
      "createdAt": "2024-01-15T10:30:00Z"
    }
    // ... 4 more users
  ]
}
```

### GET /products
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "Laptop Pro 15",
      "category": "Electronics",
      "price": 1299.99,
      "stock": 45,
      "description": "High-performance laptop with 16GB RAM"
    }
    // ... 4 more products
  ]
}
```

### GET /orders
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1001,
      "userId": 2,
      "items": [
        { "productId": 1, "quantity": 1, "price": 1299.99 }
      ],
      "totalAmount": 1299.99,
      "status": "delivered",
      "orderDate": "2024-03-15T10:30:00Z"
    }
    // ... 4 more orders
  ]
}
```

### GET /metrics
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "endpoint": "/users",
      "method": "GET",
      "responseTime": 234.56,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:30:00.000Z"
    },
    {
      "endpoint": "/products",
      "method": "GET",
      "responseTime": 678.90,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:30:15.000Z"
    },
    {
      "endpoint": "/orders",
      "method": "GET",
      "responseTime": 456.78,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:30:30.000Z"
    }
  ]
}
```

### GET /metrics/slow
```json
{
  "success": true,
  "threshold": "500ms",
  "count": 1,
  "data": [
    {
      "endpoint": "/products",
      "method": "GET",
      "responseTime": 678.90,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:30:15.000Z"
    }
  ]
}
```

### GET /metrics/stats
```json
{
  "success": true,
  "data": {
    "totalRequests": 10,
    "averageResponseTime": 456.78,
    "slowRequestCount": 3,
    "fastestRequest": {
      "endpoint": "/health",
      "method": "GET",
      "responseTime": 123.45,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:29:00.000Z"
    },
    "slowestRequest": {
      "endpoint": "/orders",
      "method": "GET",
      "responseTime": 890.12,
      "statusCode": 200,
      "timestamp": "2024-03-30T10:31:00.000Z"
    },
    "endpointStats": {
      "GET /users": {
        "count": 3,
        "avgTime": 345.67,
        "minTime": 234.56,
        "maxTime": 456.78
      },
      "GET /products": {
        "count": 3,
        "avgTime": 567.89,
        "minTime": 456.78,
        "maxTime": 678.90
      },
      "GET /orders": {
        "count": 3,
        "avgTime": 678.90,
        "minTime": 567.89,
        "maxTime": 890.12
      }
    }
  }
}
```

### GET /analysis
```json
{
  "success": true,
  "summary": {
    "totalInsights": 5,
    "bySeverity": {
      "high": 1,
      "medium": 2,
      "low": 2
    },
    "byIssueType": {
      "slowEndpoints": 2,
      "criticalPerformance": 1,
      "highTraffic": 1,
      "consistentlySlow": 1,
      "errors": 0
    },
    "recommendations": {
      "cachingNeeded": 3,
      "databaseOptimization": 2,
      "immediateAction": 1
    }
  },
  "count": 5,
  "data": [
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
    },
    {
      "endpoint": "GET /products",
      "issue": "Slow response time detected (avg: 678.90ms)",
      "severity": "medium",
      "suggestion": "Optimize database queries or enable caching",
      "details": {
        "slowRequestCount": 8,
        "totalRequests": 15,
        "averageResponseTime": 678.90
      }
    },
    {
      "endpoint": "GET /users",
      "issue": "Consistently slow performance (7 slow requests)",
      "severity": "medium",
      "suggestion": "Consider database indexing, query optimization, or adding read replicas",
      "details": {
        "slowRequestCount": 7,
        "averageSlowTime": 645.23
      }
    },
    {
      "endpoint": "GET /products",
      "issue": "High traffic detected (52 requests)",
      "severity": "low",
      "suggestion": "Enable caching (Redis/CDN) to reduce server load",
      "details": {
        "requestCount": 52
      }
    }
  ]
}
```

### GET /analysis/critical
```json
{
  "success": true,
  "severity": "high",
  "count": 1,
  "data": [
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
  ],
  "message": "Critical issues require immediate attention"
}
```

### GET /analysis/summary
```json
{
  "success": true,
  "data": {
    "totalInsights": 5,
    "bySeverity": {
      "high": 1,
      "medium": 2,
      "low": 2
    },
    "byIssueType": {
      "slowEndpoints": 2,
      "criticalPerformance": 1,
      "highTraffic": 1,
      "consistentlySlow": 1,
      "errors": 0
    },
    "recommendations": {
      "cachingNeeded": 3,
      "databaseOptimization": 2,
      "immediateAction": 1
    }
  }
}
```

### GET /cache/stats
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "size": 3,
    "hits": 45,
    "misses": 8,
    "hitRate": 84.91,
    "totalRequests": 53
  }
}
```

### GET /metrics/comparison
```json
{
  "success": true,
  "data": {
    "totalRequests": 50,
    "cachedRequests": 40,
    "nonCachedRequests": 10,
    "avgResponseTimeWithCache": 2.15,
    "avgResponseTimeWithoutCache": 543.67,
    "improvementPercentage": 99.60,
    "improvementMs": 541.52
  }
}
```

### POST /cache/enable
```json
{
  "success": true,
  "message": "Caching enabled",
  "status": "enabled"
}
```

### DELETE /cache/clear
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "clearedItems": 3
}
```

## 🧪 Testing the APIs

### Basic API Testing
Using curl:
```bash
# Health check
curl http://localhost:3000/health

# Get users
curl http://localhost:3000/users

# Get products
curl http://localhost:3000/products

# Get orders
curl http://localhost:3000/orders
```

### Performance Metrics Testing
```bash
# First, make some requests to generate metrics
curl http://localhost:3000/users
curl http://localhost:3000/products
curl http://localhost:3000/orders

# View all performance logs
curl http://localhost:3000/metrics

# View slow requests (> 500ms)
curl http://localhost:3000/metrics/slow

# View slow requests with custom threshold (> 300ms)
curl http://localhost:3000/metrics/slow?threshold=300

# View performance statistics
curl http://localhost:3000/metrics/stats

# Clear all metrics
curl -X DELETE http://localhost:3000/metrics
```

### Performance Analysis Testing
```bash
# Generate traffic first (at least 10-20 requests)
for i in {1..10}; do
  curl http://localhost:3000/users
  curl http://localhost:3000/products
  curl http://localhost:3000/orders
done

# Get all insights and recommendations
curl http://localhost:3000/analysis

# Get only critical issues
curl http://localhost:3000/analysis/critical

# Get analysis summary
curl http://localhost:3000/analysis/summary
```

### Cache Management Testing
```bash
# Check cache statistics
curl http://localhost:3000/cache/stats

# View all cache keys
curl http://localhost:3000/cache/keys

# Clear cache
curl -X DELETE http://localhost:3000/cache/clear

# Disable caching
curl -X POST http://localhost:3000/cache/disable

# Enable caching
curl -X POST http://localhost:3000/cache/enable

# Get performance comparison (cached vs non-cached)
curl http://localhost:3000/metrics/comparison
```

### Performance Comparison Testing
```bash
# Step 1: Clear metrics and cache
curl -X DELETE http://localhost:3000/metrics
curl -X DELETE http://localhost:3000/cache/clear

# Step 2: Make first request (cache miss - slow)
curl http://localhost:3000/users

# Step 3: Make second request (cache hit - fast)
curl http://localhost:3000/users

# Step 4: View performance comparison
curl http://localhost:3000/metrics/comparison
```

Or use tools like Postman, Insomnia, or your browser.

## 🏗️ Architecture

The project follows a layered architecture:

1. **Routes Layer**: Defines API endpoints and maps them to controllers
2. **Controllers Layer**: Handles HTTP requests/responses and calls services
3. **Services Layer**: Contains business logic and data operations
4. **Middleware Layer**: Handles cross-cutting concerns (logging, performance, errors)
5. **Config Layer**: Manages application configuration

### Performance Tracking Flow

```
Request → Performance Middleware (start timer)
       → Logging Middleware
       → Route Handler
       → Controller
       → Service (with simulated delay)
       → Response
       → Performance Middleware (end timer, store metrics)
```

## 🎯 Performance Tracking Features

### Automatic Metrics Collection
Every API request is automatically tracked with:
- Endpoint URL
- HTTP method
- Response time (in milliseconds)
- Status code
- Timestamp

### Realistic Latency Simulation
All data endpoints (/users, /products, /orders) include random delays between 100ms-1000ms to simulate real-world conditions.

### Performance Analysis
- View all requests with response times
- Filter slow requests (customizable threshold)
- Get aggregated statistics including:
  - Total request count
  - Average response time
  - Slow request count
  - Fastest/slowest requests
  - Per-endpoint statistics

## 🧠 Analysis Engine Features

### Intelligent Rule-Based Analysis
The Analysis Engine evaluates performance data and generates actionable insights:

**5 Detection Rules:**
1. **Slow Endpoint Detection** (Medium) - Response time 500-1000ms
2. **Critical Performance Issues** (High) - Response time >1000ms
3. **High Traffic Detection** (Low) - Endpoint called >50 times
4. **Repeated Slow Endpoints** (Medium) - Consistently slow performance
5. **High Error Rate** (High) - Server errors (status ≥500)

**Severity Levels:**
- **HIGH** 🔴 - Immediate action required (>1000ms, high error rate)
- **MEDIUM** 🟡 - Optimization recommended (500-1000ms, repeated issues)
- **LOW** 🟢 - Consider for scalability (high traffic)

**Actionable Suggestions:**
- Database query optimization
- Caching implementation (Redis/CDN)
- Database indexing
- Read replica setup
- Error investigation

### Analysis Outputs
- Complete insights with severity categorization
- Critical issues filtering
- Summary statistics by severity and issue type
- Specific optimization recommendations
- Detailed metrics for each issue

## 🚀 Caching Optimization Features

### Smart Caching Layer
Automatic response caching that dramatically improves performance:

**Key Features:**
- **In-Memory Cache**: Fast Map-based storage with O(1) operations
- **Smart TTL**: Configurable time-to-live per endpoint
  - `/users`: 120 seconds
  - `/products`: 180 seconds
  - `/orders`: 90 seconds
- **Automatic Caching**: Middleware automatically caches GET requests
- **Cache Headers**: `X-Cache: HIT/MISS` for transparency
- **Auto-Expiration**: Automatic cleanup of expired entries

### Performance Improvements
- **First Request (Cache Miss)**: 500-600ms (normal speed)
- **Subsequent Requests (Cache Hit)**: 1-5ms (99%+ faster!)
- **Typical Hit Rate**: 80-90%
- **Server Load Reduction**: 80-90% fewer backend calls

### Cache Management
- Enable/disable caching globally
- Clear all cache or specific entries
- View cache statistics (hit rate, size)
- List all cached keys
- Real-time performance comparison

### Measurable Results
The system tracks and compares:
- Average response time with cache
- Average response time without cache
- Improvement percentage
- Cache hit rate
- Number of cached vs non-cached requests

## 🧪 Complete Testing Guide

### Quick Test (Using Test Script)
```bash
# Make the script executable (first time only)
chmod +x test-performance.sh

# Run the test script
./test-performance.sh
```

The script will:
1. Check if server is running
2. Clear existing metrics
3. Generate 15 requests across all endpoints
4. Display all metrics, slow requests, and statistics
5. Show cache statistics
6. Display performance comparison (cached vs non-cached)

### Demonstrating Cache Performance

**Step 1: Clear everything**
```bash
curl -X DELETE http://localhost:3000/metrics
curl -X DELETE http://localhost:3000/cache/clear
```

**Step 2: First request (cache miss - slow)**
```bash
time curl http://localhost:3000/users
# Expected: ~500ms
```

**Step 3: Second request (cache hit - fast)**
```bash
time curl http://localhost:3000/users
# Expected: ~5ms (99% faster!)
```

**Step 4: View performance comparison**
```bash
curl http://localhost:3000/metrics/comparison
```

Expected output showing 99%+ improvement:
```json
{
  "avgResponseTimeWithCache": 2.34,
  "avgResponseTimeWithoutCache": 567.89,
  "improvementPercentage": 99.59
}
```

### Manual Testing

### Step 1: Start the Server
```bash
npm install
npm start
```

### Step 2: Generate Some Traffic
Make multiple requests to different endpoints:
```bash
# Make 5 requests to each endpoint
for i in {1..5}; do
  curl http://localhost:3000/users
  curl http://localhost:3000/products
  curl http://localhost:3000/orders
done
```

### Step 3: View Performance Metrics

**Get all metrics:**
```bash
curl http://localhost:3000/metrics
```

**Get slow requests (> 500ms):**
```bash
curl http://localhost:3000/metrics/slow
```

**Get slow requests with custom threshold (> 300ms):**
```bash
curl http://localhost:3000/metrics/slow?threshold=300
```

**Get detailed statistics:**
```bash
curl http://localhost:3000/metrics/stats
```

### Step 4: Clear Metrics (Optional)
```bash
curl -X DELETE http://localhost:3000/metrics
```

### Expected Console Output
When the server is running, you'll see logs like:
```
🚀 Server is running on port 3000
📍 Environment: development
🔗 Health check: http://localhost:3000/health
[2024-03-30T10:30:00.000Z] GET /users
⚡ [Performance] GET /users - 234.56ms - 200
[2024-03-30T10:30:15.000Z] GET /products
⚡ [Performance] GET /products - 678.90ms - 200
```

## 📦 Dependencies

- **express**: Web framework
- **cors**: Enable CORS
- **dotenv**: Environment variable management

## 🔧 Development Dependencies

- **nodemon**: Auto-restart server on file changes

## 📄 License

ISC
