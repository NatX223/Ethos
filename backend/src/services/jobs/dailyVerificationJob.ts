import { firebaseService } from '../firebaseService.js';
import { VerificationService } from '../verificationService.js';

export class DailyVerificationJob {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  async execute(): Promise<void> {
    console.log('🔍 Starting daily verification job...');
    
    try {
      // Get all active goals that need verification
      const activeGoals = await firebaseService.queryDocuments('goals', (collection) => 
        collection.where('status', '==', 'active')
      );

      console.log(`📊 Found ${activeGoals.length} active goals to verify`);

      if (activeGoals.length === 0) {
        console.log('✅ No active goals to verify');
        return;
      }

      // Process goals in batches to avoid overwhelming external APIs
      const batchSize = 10;
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < activeGoals.length; i += batchSize) {
        const batch = activeGoals.slice(i, i + batchSize);
        
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activeGoals.length / batchSize)}`);
        
        const batchPromises = batch.map(async (goal: any) => {
          try {
            await this.verificationService.verifyGoal(goal.id);
            successCount++;
          } catch (error) {
            console.error(`❌ Failed to verify goal ${goal.id}:`, error);
            errorCount++;
          }
          processedCount++;
        });

        await Promise.allSettled(batchPromises);
        
        // Add delay between batches to respect API rate limits
        if (i + batchSize < activeGoals.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      console.log(`✅ Daily verification completed:`);
      console.log(`   📈 Processed: ${processedCount}/${activeGoals.length}`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);

      // Log summary to Firestore
      await firebaseService.createDocument('verification_logs', {
        type: 'daily_verification_summary',
        timestamp: new Date(),
        totalGoals: activeGoals.length,
        processed: processedCount,
        successful: successCount,
        errors: errorCount,
        status: errorCount === 0 ? 'success' : 'partial_success'
      });

    } catch (error) {
      console.error('❌ Daily verification job failed:', error);
      
      // Log error to Firestore
      await firebaseService.createDocument('verification_logs', {
        type: 'daily_verification_error',
        timestamp: new Date(),
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        status: 'error'
      });
      
      throw error;
    }
  }
}