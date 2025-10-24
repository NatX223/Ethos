import { Document } from 'mongoose';

export interface IGoal extends Document {
  _id: string;
  user: string;
  title: string;
  description?: string;
  goalType: 'fitness' | 'coding' | 'reading' | 'health' | 'others';
  metric: string;
  targetValue: number;
  currentValue: number;
  stakeAmount: number;
  currency: 'ETH' | 'USDC';
  contractAddress: string;
  deadline: Date;
  status: 'active' | 'completed' | 'failed' | 'pending verification' | 'cancelled';
  verificationResult?: {
    achieved: boolean;
    actualValue: number;
    verifiedAt: Date;
    txHash?: string;
  };
  dataStream: 'github' | 'strava' | 'manual';
  createdAt: Date;
  save(): Promise<IGoal>;
}

declare const Goal: {
  find(query: any): {
    populate(path: string, select?: string): Promise<IGoal[]>;
  };
  findById(id: string): Promise<IGoal | null>;
};

export default Goal;