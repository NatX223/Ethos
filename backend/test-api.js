// Simple test script to verify the goals API
const testGoalCreation = async () => {
  const testGoal = {
    title: "Daily Coding Challenge",
    description: "Complete at least 1 coding challenge every day for 30 days",
    category: "coding",
    type: "daily", 
    metric: "challenges_completed",
    targetValue: 30,
    lockAmount: 0.1,
    currency: "ETH",
    deadline: "2024-12-31T23:59:59.000Z",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    dataSource: {
      type: "github",
      config: {
        repository: "coding-challenges",
        trackCommits: true
      }
    }
  };

  try {
    const response = await fetch('http://localhost:5000/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testGoal)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Goal created successfully!');
      console.log('Goal ID:', result.data.goalId);
      console.log('Goal Data:', JSON.stringify(result.data.goal, null, 2));
    } else {
      console.log('❌ Failed to create goal:');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Test latest goals endpoint
const testLatestGoals = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/goals/latest?limit=5&timeframe=30d');
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Latest goals retrieved successfully!');
      console.log('Goals count:', result.data.goals.length);
      console.log('Statistics:', result.data.statistics);
      console.log('Filters applied:', result.data.filters);
    } else {
      console.log('❌ Failed to get latest goals:');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
  } catch (error) {
    console.error('❌ Latest goals error:', error.message);
  }
};

// Test trending goals endpoint
const testTrendingGoals = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/goals/trending?limit=3');
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Trending goals retrieved successfully!');
      console.log('Trending goals count:', result.data.trendingGoals.length);
      console.log('Analysis metadata:', result.data.metadata);
    } else {
      console.log('❌ Failed to get trending goals:');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
  } catch (error) {
    console.error('❌ Trending goals error:', error.message);
  }
};

// Test health endpoint first
const testHealth = async () => {
  try {
    const response = await fetch('http://localhost:5000/health');
    const result = await response.json();
    console.log('🏥 Health check:', result);
    return response.ok;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
};

// Run tests
const runTests = async () => {
  console.log('🧪 Starting API tests...\n');
  
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n📝 Testing goal creation...');
  await testGoalCreation();
  
  console.log('\n📊 Testing latest goals...');
  await testLatestGoals();
  
  console.log('\n🔥 Testing trending goals...');
  await testTrendingGoals();
};

runTests();