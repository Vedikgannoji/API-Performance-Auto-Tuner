/**
 * Order service
 * Business logic for order operations
 */

const orderService = {
  /**
   * Fetch all orders from data source
   * In production, this would query a database
   * Simulates MEDIUM database query (300-600ms) - multiple table joins
   * @returns {Promise<Array>} Array of order objects
   */
  fetchAllOrders: async () => {
    // Simulate realistic database latency - MEDIUM endpoint
    // Query with JOINs across users, products, and orders tables
    const delay = Math.floor(Math.random() * 300 + 300); // 300-600ms
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1001,
            userId: 2,
            items: [
              { productId: 1, quantity: 1, price: 1299.99 }
            ],
            totalAmount: 1299.99,
            status: 'delivered',
            orderDate: '2024-03-15T10:30:00Z'
          },
          {
            id: 1002,
            userId: 3,
            items: [
              { productId: 2, quantity: 2, price: 29.99 },
              { productId: 3, quantity: 1, price: 89.99 }
            ],
            totalAmount: 149.97,
            status: 'shipped',
            orderDate: '2024-03-18T14:20:00Z'
          },
          {
            id: 1003,
            userId: 5,
            items: [
              { productId: 4, quantity: 1, price: 449.99 }
            ],
            totalAmount: 449.99,
            status: 'processing',
            orderDate: '2024-03-20T09:45:00Z'
          },
          {
            id: 1004,
            userId: 2,
            items: [
              { productId: 5, quantity: 3, price: 49.99 }
            ],
            totalAmount: 149.97,
            status: 'pending',
            orderDate: '2024-03-22T16:10:00Z'
          },
          {
            id: 1005,
            userId: 4,
            items: [
              { productId: 1, quantity: 1, price: 1299.99 },
              { productId: 2, quantity: 1, price: 29.99 },
              { productId: 5, quantity: 1, price: 49.99 }
            ],
            totalAmount: 1379.97,
            status: 'delivered',
            orderDate: '2024-03-25T11:30:00Z'
          }
        ]);
      }, delay);
    });
  }
};

module.exports = orderService;
