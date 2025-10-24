# Backend Migration to Next.js API Routes

## Migration Steps

### 1. Copy Backend Files to Frontend
Move these files from your backend to your frontend project:

```
backend/src/services/          → frontend/src/lib/services/
backend/src/models/            → frontend/src/lib/models/
backend/.env                   → frontend/.env.local
```

### 2. Create API Routes Structure
In your frontend project, create these API routes:

```
frontend/src/app/api/
├── health/
│   └── route.ts
├── auth/
│   └── route.ts
├── users/
│   └── route.ts
├── goals/
│   └── route.ts
├── oauth/
│   ├── route.ts
│   └── callback/
│       ├── github/
│       │   └── route.ts
│       └── strava/
│           └── route.ts
└── admin/
    └── jobs/
        ├── route.ts
        └── [jobName]/
            ├── route.ts
            └── execute/
                └── route.ts
```

### 3. Convert Express Routes to Next.js API Routes

**Example: Convert `backend/src/routes/goals.ts` to `frontend/src/app/api/goals/route.ts`**

```typescript
// frontend/src/app/api/goals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

export async function GET(request: NextRequest) {
  try {
    const goals = await firebaseService.queryDocuments('goals');
    return NextResponse.json({
      success: true,
      data: goals
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const goal = await firebaseService.createDocument('goals', body);
    return NextResponse.json({
      success: true,
      data: goal
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
```

### 4. Update Environment Variables
Rename your backend `.env` to `.env.local` in your frontend project.

### 5. Update Package Dependencies
Add these to your frontend's `package.json`:

```json
{
  "dependencies": {
    "firebase-admin": "^12.7.0",
    "axios": "^1.12.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "node-cron": "^3.0.2",
    "ethers": "^6.8.0",
    "web3": "^4.2.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node-cron": "^3.0.8"
  }
}
```

### 6. Cron Jobs Solution
For cron jobs in Next.js, you have these options:

**Option A: Vercel Cron (Pro Plan)**
```typescript
// frontend/src/app/api/cron/daily-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run your cron job logic
  try {
    // Import and execute your job
    const { DailyVerificationJob } = await import('@/lib/services/jobs/dailyVerificationJob');
    const job = new DailyVerificationJob();
    await job.execute();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

**Option B: External Cron Service**
Use services like cron-job.org to call your API endpoints on schedule.

### 7. Benefits of This Migration
- ✅ No deployment issues with Vercel
- ✅ Unified codebase (frontend + backend)
- ✅ Better performance (same domain)
- ✅ Easier development and maintenance
- ✅ Built-in TypeScript support
- ✅ Automatic API route optimization

### 8. File Structure After Migration
```
frontend/
├── src/
│   ├── app/
│   │   ├── api/           # Your backend API routes
│   │   │   ├── health/
│   │   │   ├── goals/
│   │   │   ├── oauth/
│   │   │   └── admin/
│   │   └── ...            # Your frontend pages
│   └── lib/
│       ├── services/      # Your backend services
│       ├── models/        # Your data models
│       └── utils/         # Shared utilities
├── .env.local             # Your environment variables
└── package.json           # Combined dependencies
```

This migration will solve all your Vercel deployment issues and give you a cleaner, more maintainable codebase!