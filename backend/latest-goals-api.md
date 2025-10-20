# Latest Goals API Documentation

## 🆕 New Endpoints Added

### 1. GET /api/goals/latest
**Purpose:** Retrieve the most recently created goals across all users (public feed)

#### Query Parameters:
- `limit` (1-100, default: 20) - Number of goals to return
- `offset` (default: 0) - Pagination offset
- `category` (optional) - Filter by: fitness, coding, reading, health, productivity, learning, other, all
- `status` (default: active) - Filter by: active, completed, failed, all
- `timeframe` (default: 7d) - Time period: 1d, 3d, 7d, 30d, all

#### Example Requests:
```bash
# Get latest 10 active fitness goals from last 7 days
GET /api/goals/latest?limit=10&category=fitness&timeframe=7d&status=active

# Get all goals from last 30 days
GET /api/goals/latest?timeframe=30d&status=all

# Get latest coding goals with pagination
GET /api/goals/latest?category=coding&limit=5&offset=10
```

#### Response Features:
✅ **Privacy Protection**: User addresses are anonymized (0x1234...abcd)  
✅ **Rich Statistics**: Category breakdown, total/average lock amounts  
✅ **Pagination Support**: Limit/offset with hasMore indicator  
✅ **Flexible Filtering**: By category, status, and timeframe  
✅ **Real-time Data**: Always shows the most recent goals  

#### Sample Response:
```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "id": "goal123",
        "title": "Daily 10K Steps",
        "category": "fitness",
        "type": "daily",
        "targetValue": 10000,
        "currentValue": 2500,
        "lockAmount": 0.05,
        "currency": "ETH",
        "status": "active",
        "userAddress": "0x1234...abcd",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": false
    },
    "filters": {
      "category": "all",
      "status": "active", 
      "timeframe": "7d"
    },
    "statistics": {
      "totalReturned": 15,
      "categories": {
        "fitness": 8,
        "coding": 4,
        "reading": 3
      },
      "statuses": {
        "active": 12,
        "completed": 3
      },
      "totalLockAmount": 2.5,
      "averageLockAmount": 0.167
    }
  }
}
```

### 2. GET /api/goals/trending
**Purpose:** Get trending goals based on popularity, completion rates, and recent activity

#### Query Parameters:
- `limit` (1-50, default: 10) - Number of trending goals
- `category` (optional) - Filter by category

#### Example Requests:
```bash
# Get top 5 trending goals
GET /api/goals/trending?limit=5

# Get trending coding goals
GET /api/goals/trending?category=coding&limit=3
```

#### Trending Algorithm:
The trending score considers:
- **Recent Activity** (3x weight): Goals created in last 7 days
- **Completion Rate** (0.5x weight): Percentage of goals completed
- **Popularity** (1x weight): Total number of similar goals
- **Lock Amount** (2x weight): Higher stakes indicate commitment

#### Sample Response:
```json
{
  "success": true,
  "data": {
    "trendingGoals": [
      {
        "title": "Daily Coding Challenge",
        "category": "coding",
        "count": 25,
        "completionRate": 68.5,
        "averageLockAmount": 0.08,
        "totalLockAmount": 2.0,
        "recentCreations": 8,
        "trendingScore": 45.2
      }
    ],
    "metadata": {
      "analysisTimeframe": "30 days",
      "totalGoalsAnalyzed": 150,
      "categories": ["fitness", "coding", "reading"],
      "generatedAt": "2024-01-15T15:30:00Z"
    }
  }
}
```

## 🔒 Privacy & Security Features

### User Privacy:
- **Address Anonymization**: Shows only `0x1234...abcd` format
- **No Sensitive Data**: Excludes transaction hashes and private details
- **Aggregated Statistics**: Individual user data is not exposed

### Performance Optimizations:
- **Efficient Queries**: Uses Firestore indexes for fast retrieval
- **Pagination**: Prevents large data transfers
- **Caching Ready**: Structured for future caching implementation

## 🎯 Use Cases

### For Frontend Applications:
1. **Public Goal Feed**: Show inspiring goals from the community
2. **Trending Dashboard**: Display popular goal types and categories
3. **Discovery**: Help users find goal ideas based on trends
4. **Statistics**: Show platform activity and engagement metrics

### For Analytics:
1. **Platform Metrics**: Track goal creation trends over time
2. **Category Popularity**: Understand which goal types are most popular
3. **Completion Rates**: Analyze success patterns across categories
4. **Lock Amount Trends**: Monitor staking behavior and commitment levels

## 🚀 Integration Examples

### React Component Example:
```javascript
const LatestGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goals/latest?limit=10&category=fitness')
      .then(res => res.json())
      .then(data => {
        setGoals(data.data.goals);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2>Latest Fitness Goals</h2>
      {goals.map(goal => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
};
```

### Analytics Dashboard:
```javascript
const TrendingAnalytics = () => {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    fetch('/api/goals/trending?limit=5')
      .then(res => res.json())
      .then(data => setTrending(data.data.trendingGoals));
  }, []);

  return (
    <div>
      <h2>Trending Goals</h2>
      {trending.map(trend => (
        <TrendCard 
          key={trend.title}
          title={trend.title}
          completionRate={trend.completionRate}
          popularity={trend.count}
        />
      ))}
    </div>
  );
};
```

## 📊 Current API Endpoints Summary

| Endpoint | Method | Purpose | Privacy |
|----------|--------|---------|---------|
| `/api/goals` | POST | Create new goal | Private |
| `/api/goals/latest` | GET | Get recent goals | Public (anonymized) |
| `/api/goals/trending` | GET | Get trending goals | Public (aggregated) |
| `/api/goals/:userAddress` | GET | Get user's goals | Private |
| `/api/goals/goal/:goalId` | GET | Get specific goal | Private |
| `/api/goals/:goalId/progress` | PUT | Update progress | Private |

The API now provides both private user-specific functionality and public community features while maintaining privacy and security! 🎉