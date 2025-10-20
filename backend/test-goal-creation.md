# Goal Creation API Test

## Create a New Goal

**Endpoint:** `POST /api/goals`

### Example Request Body:

```json
{
  "title": "Daily Coding Challenge",
  "description": "Complete at least 1 coding challenge every day for 30 days",
  "category": "coding",
  "type": "daily",
  "metric": "challenges_completed",
  "targetValue": 30,
  "lockAmount": 0.1,
  "currency": "ETH",
  "deadline": "2024-12-31T23:59:59.000Z",
  "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "dataSource": {
    "type": "github",
    "config": {
      "repository": "coding-challenges",
      "trackCommits": true
    }
  }
}
```

### Example Fitness Goal:

```json
{
  "title": "10K Steps Daily",
  "description": "Walk at least 10,000 steps every day",
  "category": "fitness",
  "type": "daily",
  "metric": "steps",
  "targetValue": 10000,
  "lockAmount": 0.05,
  "currency": "ETH",
  "deadline": "2024-11-30T23:59:59.000Z",
  "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "dataSource": {
    "type": "strava"
  }
}
```

## Get Latest Goals (Public)

**Endpoint:** `GET /api/goals/latest`

### Query Parameters:
- `limit` (optional): Number of goals to return (1-100, default: 20)
- `offset` (optional): Number of goals to skip (default: 0)
- `category` (optional): Filter by category (fitness, coding, reading, health, productivity, learning, other, all)
- `status` (optional): Filter by status (active, completed, failed, all - default: active)
- `timeframe` (optional): Time period (1d, 3d, 7d, 30d, all - default: 7d)

### Example:
```
GET /api/goals/latest?limit=10&category=fitness&timeframe=7d&status=active
```

### Response includes:
- Anonymized goals (user addresses partially hidden)
- Pagination info
- Statistics (category breakdown, total lock amounts, etc.)
- Applied filters

## Get Trending Goals

**Endpoint:** `GET /api/goals/trending`

### Query Parameters:
- `limit` (optional): Number of trending goals (1-50, default: 10)
- `category` (optional): Filter by category

### Example:
```
GET /api/goals/trending?limit=5&category=coding
```

### Response includes:
- Trending goals with metrics (completion rates, popularity scores)
- Analysis metadata

## Get User Goals

**Endpoint:** `GET /api/goals/:userAddress`

### Query Parameters:
- `status` (optional): Filter by goal status (active, completed, failed, etc.)
- `limit` (optional): Number of goals to return (default: 20)
- `offset` (optional): Number of goals to skip (default: 0)

### Example:
```
GET /api/goals/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87?status=active&limit=10
```

## Get Specific Goal

**Endpoint:** `GET /api/goals/goal/:goalId`

## Update Goal Progress

**Endpoint:** `PUT /api/goals/:goalId/progress`

### Request Body:
```json
{
  "currentValue": 15,
  "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87"
}
```

## Validation Rules

### Required Fields:
- `title`: 3-100 characters
- `category`: fitness, coding, reading, health, productivity, learning, other
- `type`: daily, weekly, monthly, one-time, streak
- `metric`: 2-50 characters (e.g., "steps", "commits", "pages_read")
- `targetValue`: Positive number
- `lockAmount`: Positive number (amount to stake)
- `deadline`: Future date
- `userAddress`: Valid Ethereum address (0x...)

### Optional Fields:
- `description`: Up to 500 characters
- `currency`: ETH or USDC (default: ETH)
- `dataSource`: Object with type and config

## Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Goal created successfully",
  "data": {
    "goalId": "abc123...",
    "goal": {
      "id": "abc123...",
      "title": "Daily Coding Challenge",
      "category": "coding",
      "status": "active",
      "currentValue": 0,
      "targetValue": 30,
      "createdAt": "2024-01-15T10:30:00Z",
      ...
    }
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "userAddress",
      "message": "User address must be a valid Ethereum address"
    }
  ]
}
```