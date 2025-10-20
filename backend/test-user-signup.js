// Test script for user signup API
const testUserSignup = async () => {
  const testUser = {
    walletAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    profile: {
      displayName: "Test User",
      email: "test@example.com",
      bio: "Testing the signup API"
    },
    preferences: {
      timezone: "America/New_York",
      currency: "ETH",
      notifications: true,
      privacy: {
        showProfile: true,
        showGoals: true,
        showProgress: false
      }
    }
  };

  try {
    const response = await fetch('http://localhost:5000/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ User created successfully!');
      console.log('User ID:', result.data.user.id);
      console.log('Connected Accounts:', result.data.user.connectedAccounts);
    } else {
      console.log('❌ Failed to create user:', result);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Test getting user profile
const testGetUser = async (walletAddress) => {
  try {
    const response = await fetch(`http://localhost:5000/api/users/${walletAddress}`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ User profile retrieved!');
      console.log('Profile:', result.data.user.profile);
    } else {
      console.log('❌ Failed to get user:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Run tests
const runUserTests = async () => {
  console.log('🧪 Testing user signup API...\n');
  
  await testUserSignup();
  
  console.log('\n📋 Testing get user profile...');
  await testGetUser("0x742d35Cc6634C0532925a3b8D4C9db96590c6C87");
};

runUserTests();