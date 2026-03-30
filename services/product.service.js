/**
 * Product service
 * Business logic for product operations
 */

const productService = {
  /**
   * Fetch all products from data source
   * In production, this would query a database
   * Simulates SLOW database query (500-1000ms) - complex query without proper indexes
   * @returns {Promise<Array>} Array of product objects
   */
  fetchAllProducts: async () => {
    // Simulate realistic database latency - SLOW endpoint
    // Complex query with JOINs, aggregations, no indexes - NEEDS OPTIMIZATION
    const delay = Math.floor(Math.random() * 500 + 500); // 500-1000ms
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            name: 'Laptop Pro 15',
            category: 'Electronics',
            price: 1299.99,
            stock: 45,
            description: 'High-performance laptop with 16GB RAM'
          },
          {
            id: 2,
            name: 'Wireless Mouse',
            category: 'Accessories',
            price: 29.99,
            stock: 150,
            description: 'Ergonomic wireless mouse with USB receiver'
          },
          {
            id: 3,
            name: 'Mechanical Keyboard',
            category: 'Accessories',
            price: 89.99,
            stock: 78,
            description: 'RGB mechanical keyboard with blue switches'
          },
          {
            id: 4,
            name: '4K Monitor',
            category: 'Electronics',
            price: 449.99,
            stock: 32,
            description: '27-inch 4K UHD monitor with HDR support'
          },
          {
            id: 5,
            name: 'USB-C Hub',
            category: 'Accessories',
            price: 49.99,
            stock: 200,
            description: '7-in-1 USB-C hub with HDMI and card reader'
          }
        ]);
      }, delay);
    });
  }
};

module.exports = productService;
