// API Base URL
const API_BASE = window.location.origin;

// Chart instance
let performanceChart = null;

// Last update timestamp
let lastUpdate = null;

// Endpoints to filter out from display
const IGNORED_ENDPOINTS = ['/favicon.ico', '/metrics', '/analysis', '/health', '/metrics/stats', '/metrics/slow', '/metrics/comparison'];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initialized');
    loadDashboardData();
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        console.log('🔄 Manual refresh triggered');
        loadDashboardData();
    });
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        console.log('⏰ Auto-refresh triggered');
        loadDashboardData();
    }, 30000);
});

// Load all dashboard data
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    updateLastRefreshTime();
    
    try {
        await Promise.all([
            loadStats(),
            loadMetrics(),
            loadSlowApis(),
            loadAnalysis(),
            loadCacheComparison()
        ]);
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// Update last refresh time
function updateLastRefreshTime() {
    lastUpdate = new Date();
    const timeString = lastUpdate.toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = `Last updated: ${timeString}`;
}

// Validate if value is a valid number
function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Filter out ignored endpoints
function filterEndpoint(endpoint) {
    return !IGNORED_ENDPOINTS.includes(endpoint);
}

// Load stats
async function loadStats() {
    console.log('📈 Fetching stats from /metrics/stats...');
    
    try {
        const response = await fetch(`${API_BASE}/metrics/stats`);
        const data = await response.json();
        
        console.log('Stats response:', data);
        
        if (!data.success) {
            console.warn('⚠️ Stats API returned success: false');
            displayNoData('stats');
            return;
        }
        
        const stats = data.data;
        
        // Validate and display total requests
        if (isValidNumber(stats.totalRequests)) {
            document.getElementById('totalRequests').textContent = stats.totalRequests;
        } else {
            console.warn('⚠️ Invalid totalRequests value:', stats.totalRequests);
            document.getElementById('totalRequests').textContent = '0';
        }
        
        // Validate and display average response time
        if (isValidNumber(stats.averageResponseTime) && stats.averageResponseTime > 0) {
            document.getElementById('avgResponseTime').textContent = `${stats.averageResponseTime.toFixed(2)}ms`;
        } else {
            console.warn('⚠️ Invalid averageResponseTime value:', stats.averageResponseTime);
            document.getElementById('avgResponseTime').textContent = 'N/A';
        }
        
        // Validate and display slow requests
        if (isValidNumber(stats.slowRequestCount)) {
            document.getElementById('slowRequests').textContent = stats.slowRequestCount;
        } else {
            console.warn('⚠️ Invalid slowRequestCount value:', stats.slowRequestCount);
            document.getElementById('slowRequests').textContent = '0';
        }
        
        console.log('✅ Stats loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        displayNoData('stats');
    }
}

// Display "No data" message
function displayNoData(section) {
    if (section === 'stats') {
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('avgResponseTime').textContent = 'N/A';
        document.getElementById('slowRequests').textContent = '0';
    }
}

// Load metrics and create chart
async function loadMetrics() {
    console.log('📊 Fetching metrics from /metrics...');
    
    try {
        const response = await fetch(`${API_BASE}/metrics`);
        const data = await response.json();
        
        console.log('Metrics response:', data);
        console.log('Total logs received:', data.count);
        
        if (!data.success || !data.data || data.data.length === 0) {
            console.warn('⚠️ No metrics data available');
            createChart([], [], []);
            return;
        }
        
        const logs = data.data;
        
        // Filter out ignored endpoints
        const filteredLogs = logs.filter(log => filterEndpoint(log.endpoint));
        console.log('Filtered logs (excluding system endpoints):', filteredLogs.length);
        
        if (filteredLogs.length === 0) {
            console.warn('⚠️ No business API logs available after filtering');
            createChart([], [], []);
            return;
        }
        
        // Group by endpoint and calculate average response time
        const endpointStats = {};
        
        filteredLogs.forEach(log => {
            const key = `${log.method} ${log.endpoint}`;
            
            if (!endpointStats[key]) {
                endpointStats[key] = {
                    endpoint: key,
                    totalTime: 0,
                    count: 0,
                    avgTime: 0
                };
            }
            
            endpointStats[key].totalTime += log.responseTime;
            endpointStats[key].count++;
        });
        
        // Calculate averages
        Object.keys(endpointStats).forEach(key => {
            const stats = endpointStats[key];
            stats.avgTime = stats.totalTime / stats.count;
        });
        
        // Convert to arrays for chart
        const endpoints = Object.values(endpointStats);
        console.log('Endpoint statistics:', endpoints);
        
        if (endpoints.length === 0) {
            console.warn('⚠️ No endpoint statistics to display');
            createChart([], [], []);
            return;
        }
        
        const labels = endpoints.map(e => e.endpoint);
        const avgTimes = endpoints.map(e => e.avgTime);
        const colors = avgTimes.map(time => {
            if (time > 1000) return '#f56565'; // Red for very slow
            if (time > 500) return '#ed8936';  // Orange for slow
            return '#48bb78';                   // Green for good
        });
        
        console.log('Chart data - Labels:', labels);
        console.log('Chart data - Avg Times:', avgTimes);
        
        createChart(labels, avgTimes, colors);
        console.log('✅ Metrics chart created successfully');
        
    } catch (error) {
        console.error('❌ Error loading metrics:', error);
        createChart([], [], []);
    }
}

// Create performance chart
function createChart(labels, data, colors) {
    const ctx = document.getElementById('performanceChart');
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    // Handle empty data
    if (labels.length === 0 || data.length === 0) {
        console.log('📊 Creating empty chart (no data available)');
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: [0],
                    backgroundColor: ['#e2e8f0'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'No metrics available - Make some API requests first'
                        }
                    }
                }
            }
        });
        return;
    }
    
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Response Time (ms)',
                data: data,
                backgroundColor: colors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Avg: ${context.parsed.y.toFixed(2)}ms`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Response Time (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Endpoints'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Load slow APIs
async function loadSlowApis() {
    console.log('🐌 Fetching slow APIs from /metrics/slow...');
    
    try {
        const response = await fetch(`${API_BASE}/metrics/slow?threshold=500`);
        const data = await response.json();
        
        console.log('Slow APIs response:', data);
        
        const container = document.getElementById('slowApisList');
        
        if (!data.success) {
            console.warn('⚠️ Slow APIs request failed');
            container.innerHTML = '<p class="error">Failed to load slow APIs</p>';
            return;
        }
        
        // Filter out ignored endpoints
        const filteredSlowApis = data.data.filter(api => filterEndpoint(api.endpoint));
        console.log('Slow APIs (filtered):', filteredSlowApis.length);
        
        if (filteredSlowApis.length === 0) {
            container.innerHTML = '<p class="loading">✅ No slow APIs detected! All endpoints performing well.</p>';
            console.log('✅ No slow APIs found');
            return;
        }
        
        // Group by endpoint and calculate stats
        const endpointStats = {};
        
        filteredSlowApis.forEach(log => {
            const key = `${log.method} ${log.endpoint}`;
            
            if (!endpointStats[key]) {
                endpointStats[key] = {
                    endpoint: key,
                    count: 0,
                    totalTime: 0,
                    maxTime: 0
                };
            }
            
            endpointStats[key].count++;
            endpointStats[key].totalTime += log.responseTime;
            endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, log.responseTime);
        });
        
        // Calculate averages and create HTML
        const slowApisHtml = Object.values(endpointStats).map(stats => {
            const avgTime = stats.totalTime / stats.count;
            
            return `
                <div class="list-item slow">
                    <h4>${stats.endpoint}</h4>
                    <p><strong>Avg Response Time:</strong> ${avgTime.toFixed(2)}ms</p>
                    <p><strong>Slow Requests:</strong> ${stats.count}</p>
                    <p><strong>Max Time:</strong> ${stats.maxTime.toFixed(2)}ms</p>
                </div>
            `;
        }).join('');
        
        container.innerHTML = slowApisHtml;
        console.log('✅ Slow APIs loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading slow APIs:', error);
        document.getElementById('slowApisList').innerHTML = 
            '<p class="error">Failed to load slow APIs</p>';
    }
}

// Load analysis
async function loadAnalysis() {
    console.log('💡 Fetching analysis from /analysis...');
    
    try {
        const response = await fetch(`${API_BASE}/analysis`);
        const data = await response.json();
        
        console.log('Analysis response:', data);
        
        const container = document.getElementById('analysisList');
        
        if (!data.success) {
            console.warn('⚠️ Analysis request failed');
            container.innerHTML = '<p class="error">Failed to load analysis</p>';
            return;
        }
        
        // The analysis service returns insights in data array, not data.suggestions
        const insights = data.data || [];
        console.log('Analysis insights:', insights.length);
        
        if (insights.length === 0) {
            container.innerHTML = '<p class="loading">✅ All systems performing well! No issues detected.</p>';
            console.log('✅ No performance issues found');
            return;
        }
        
        // Display insights
        const insightsHtml = insights.map(insight => {
            // Validate severity
            const severity = ['high', 'medium', 'low'].includes(insight.severity) 
                ? insight.severity 
                : 'low';
            
            return `
                <div class="list-item ${severity}">
                    <h4>${insight.endpoint || 'Unknown Endpoint'}</h4>
                    <p><strong>Issue:</strong> ${insight.issue || 'No description'}</p>
                    <p><strong>Suggestion:</strong> ${insight.suggestion || 'No suggestion available'}</p>
                    <span class="badge ${severity}">${severity.toUpperCase()}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = insightsHtml;
        console.log('✅ Analysis loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading analysis:', error);
        document.getElementById('analysisList').innerHTML = 
            '<p class="error">Failed to load analysis</p>';
    }
}

// Load cache comparison
async function loadCacheComparison() {
    console.log('💾 Fetching cache comparison from /metrics/comparison...');
    
    try {
        const response = await fetch(`${API_BASE}/metrics/comparison`);
        const data = await response.json();
        
        console.log('Cache comparison response:', data);
        
        const container = document.getElementById('cacheComparison');
        
        if (!data.success) {
            console.warn('⚠️ Cache comparison request failed');
            container.innerHTML = '<p class="error">Failed to load cache comparison</p>';
            document.getElementById('cacheImprovement').textContent = 'N/A';
            return;
        }
        
        const comp = data.data;
        
        // Validate that we have meaningful data
        const hasValidData = 
            isValidNumber(comp.avgResponseTimeWithCache) &&
            isValidNumber(comp.avgResponseTimeWithoutCache) &&
            comp.avgResponseTimeWithCache > 0 &&
            comp.avgResponseTimeWithoutCache > 0;
        
        console.log('Cache data validation:', {
            withCache: comp.avgResponseTimeWithCache,
            withoutCache: comp.avgResponseTimeWithoutCache,
            hasValidData: hasValidData
        });
        
        if (!hasValidData) {
            console.warn('⚠️ Not enough cache data for meaningful comparison');
            container.innerHTML = `
                <div class="comparison-item">
                    <h4>Status</h4>
                    <p style="color: #718096; text-align: center;">Not enough data to compare cache performance.<br>Make some API requests to see cache benefits.</p>
                </div>
            `;
            document.getElementById('cacheImprovement').textContent = 'N/A';
            return;
        }
        
        const improvement = comp.improvementPercentage || 0;
        const improvementClass = improvement > 0 ? 'good' : (improvement < 0 ? 'bad' : '');
        
        // Update stat card
        const improvementText = improvement > 0 
            ? `+${improvement.toFixed(1)}%` 
            : `${improvement.toFixed(1)}%`;
        document.getElementById('cacheImprovement').textContent = improvementText;
        
        container.innerHTML = `
            <div class="comparison-item">
                <h4>Without Cache</h4>
                <div class="comparison-value">${comp.avgResponseTimeWithoutCache.toFixed(2)}ms</div>
                <p style="font-size: 12px; color: #718096; margin-top: 5px;">${comp.nonCachedRequests} requests</p>
            </div>
            <div class="comparison-item">
                <h4>With Cache</h4>
                <div class="comparison-value good">${comp.avgResponseTimeWithCache.toFixed(2)}ms</div>
                <p style="font-size: 12px; color: #718096; margin-top: 5px;">${comp.cachedRequests} requests</p>
            </div>
            <div class="comparison-item">
                <h4>Improvement</h4>
                <div class="comparison-value ${improvementClass}">
                    ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%
                </div>
                <p style="font-size: 12px; color: #718096; margin-top: 5px;">${Math.abs(comp.improvementMs || 0).toFixed(2)}ms saved</p>
            </div>
        `;
        
        console.log('✅ Cache comparison loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading cache comparison:', error);
        document.getElementById('cacheComparison').innerHTML = 
            '<p class="error">Failed to load cache comparison</p>';
        document.getElementById('cacheImprovement').textContent = 'N/A';
    }
}
