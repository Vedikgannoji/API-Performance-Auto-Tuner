/**
 * User service
 * Business logic for user operations
 */

const userService = {
  /**
   * Fetch all users from data source
   * In production, this would query a database
   * Simulates FAST database query (200-400ms) - simple indexed query
   * @returns {Promise<Array>} Array of user objects
   */
  fetchAllUsers: async () => {
    // Simulate realistic database latency - FAST endpoint
    // Simple SELECT with indexed primary key
    const delay = Math.floor(Math.random() * 200 + 200); // 200-400ms
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'admin',
            createdAt: '2024-01-15T10:30:00Z'
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'user',
            createdAt: '2024-02-20T14:45:00Z'
          },
          {
            id: 3,
            name: 'Bob Johnson',
            email: 'bob.johnson@example.com',
            role: 'user',
            createdAt: '2024-03-10T09:15:00Z'
          },
          {
            id: 4,
            name: 'Alice Williams',
            email: 'alice.williams@example.com',
            role: 'moderator',
            createdAt: '2024-03-25T16:20:00Z'
          },
          {
            id: 5,
            name: 'Charlie Brown',
            email: 'charlie.brown@example.com',
            role: 'user',
            createdAt: '2024-04-05T11:00:00Z'
          }
        ]);
      }, delay);
    });
  }
};

module.exports = userService;
