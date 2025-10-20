# User Signup API Documentation

## 🆕 User Management Endpoints

### 1. POST /api/users/signup
**Purpose:** Create a new user account in the `ethosuser` collection

#### Request Body:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "profile": {
    "displayName": "John Doe",
    "email": "john@example.com",
    "bio": "Fitness enthusiast and developer"
  },
  "preferences": {
    "timezone": "America/New_York",
    "currency": "ETH",
    "notifications": true,
    "privacy": {
      "showProfile": true,
      "showGoals": true,
      "showProgress": false
    }
  }
}
```

#### Required Fields:
- `walletAddress`: Valid Ethereum address (0x...)

#### Optional Fields:
- `profile.displayName`: 2-50 characters
- `profile.email`: Valid email address
- `profile.bio`: Up to 200 characters
- `preferences.timezone`: Timezone string (default: UTC)
- `preferences.currency`: ETH or USDC (default: ETH)
- `preferences.notifications`: Boolean (default: true)
- `preferences.privacy`: Privacy settings object

#### Response:
```json
{
  "success": true,
  "message": "User account created successfully",
  "data": {
    "user": {
      "id": "0x742d35cc6634c0532925a3b8d4c9db96590c6c87",
      "walletAddress": "0x742d35cc6634c0532925a3b8d4c9db96590c6c87",
      "profile": {
        "displayName": "John Doe",
        "email": "john@example.com",
        "bio": "Fitness enthusiast and developer",
        "avatar": ""
      },
      "connectedAccounts": {
        "github": {
          "username": "",
          "userId": "",
          "isActive": false
        },
        "strava": {
          "username": "",
          "athleteId": "",
          "isActive": false
        }
      },
      "preferences": {
        "notifications": true,
        "timezone": "America/New_York",
        "currency": "ETH",
        "privacy": {
          "showProfile": true,
          "showGoals": true,
          "showProgress": false
        }
      },
      "stats": {
        "totalGoals": 0,
        "completedGoals": 0,
        "failedGoals": 0,
        "totalStaked": 0,
        "totalEarned": 0,
        "currentStreak": 0,
        "longestStreak": 0
      },
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:30:00Z",
      "lastLoginAt": "2024-01-15T14:30:00Z"
    }
  }
}
```

### 2. GET /api/users/:walletAddress
**Purpose:** Get user profile by wallet address

#### Example:
```
GET /api/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87
```

#### Response:
Returns user profile with sensitive data removed (no access tokens).

### 3. PUT /api/users/:walletAddress/profile
**Purpose:** Update user profile information

#### Request Body:
```json
{
  "profile": {
    "displayName": "Jane Doe",
    "bio": "Updated bio"
  },
  "preferences": {
    "notifications": false,
    "privacy": {
      "showProgress": true
    }
  }
}
```

### 4. POST /api/users/:walletAddress/login
**Purpose:** Record user login timestamp

#### Response:
```json
{
  "success": true,
  "message": "Login recorded successfully",
  "data": {
    "walletAddress": "0x742d35cc6634c0532925a3b8d4c9db96590c6c87",
    "lastLoginAt": "2024-01-15T14:30:00Z"
  }
}
```

### 5. GET /api/users/:walletAddress/stats
**Purpose:** Get user statistics (real-time calculated)

#### Response:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalGoals": 5,
      "completedGoals": 3,
      "failedGoals": 1,
      "activeGoals": 1,
      "totalStaked": 0.25,
      "totalEarned": 0.15,
      "currentStreak": 7,
      "longestStreak": 14
    },
    "lastUpdated": "2024-01-15T14:30:00Z"
  }
}
```

## 🔧 Key Features

### Document Structure:
- **Document ID**: Uses Ethereum address as the document ID in `ethosuser` collection
- **Normalized Addresses**: All addresses stored in lowercase
- **Placeholder Fields**: GitHub and Strava fields initialized as empty but ready for OAuth integration
- **Privacy Controls**: Granular privacy settings for profile visibility

### Connected Accounts Structure:
```json
{
  "connectedAccounts": {
    "github": {
      "username": "",           // GitHub username (empty initially)
      "userId": "",            // GitHub user ID (empty initially)
      "accessToken": "",       // Encrypted token (empty initially)
      "refreshToken": "",      // Encrypted refresh token (empty initially)
      "connectedAt": null,     // Connection timestamp
      "lastSyncAt": null,      // Last data sync timestamp
      "isActive": false        // Connection status
    },
    "strava": {
      "username": "",          // Strava display name (empty initially)
      "athleteId": "",         // Strava athlete ID (empty initially)
      "accessToken": "",       // Encrypted token (empty initially)
      "refreshToken": "",      // Encrypted refresh token (empty initially)
      "connectedAt": null,     // Connection timestamp
      "lastSyncAt": null,      // Last data sync timestamp
      "isActive": false        // Connection status
    }
  }
}
```

### User Statistics:
- **Real-time Calculation**: Stats are calculated from actual goal data
- **Comprehensive Metrics**: Goals, earnings, streaks, completion rates
- **Performance Tracking**: Current and historical performance data

## 🔒 Security & Privacy

### Data Protection:
- **Sensitive Data Filtering**: Access tokens never returned in API responses
- **Address Normalization**: Consistent lowercase storage
- **Privacy Settings**: User-controlled visibility options

### Validation:
- **Ethereum Address**: Strict validation using regex pattern
- **Input Sanitization**: All inputs validated with Joi schemas
- **Duplicate Prevention**: Prevents multiple accounts per wallet address

## 🧪 Testing Examples

### Create User:
```bash
curl -X POST http://localhost:5000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "profile": {
      "displayName": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Get User Profile:
```bash
curl http://localhost:5000/api/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87
```

### Update Profile:
```bash
curl -X PUT http://localhost:5000/api/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/profile \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "displayName": "Updated Name"
    }
  }'
```

## 🎯 Integration Ready

The user structure is designed to seamlessly integrate with:
- **OAuth Services**: GitHub and Strava connection fields ready
- **Goal System**: User stats automatically calculated from goals
- **Privacy Controls**: Granular visibility settings
- **Analytics**: Comprehensive user metrics and tracking

The `ethosuser` collection is now ready to store user accounts with Ethereum addresses as document IDs! 🚀