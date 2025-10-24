// Simple test script to verify API routes work
const testHealthEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    console.log('Health check:', data);
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
};

// Test the health endpoint
testHealthEndpoint();