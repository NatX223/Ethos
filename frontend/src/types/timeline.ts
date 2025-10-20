export interface Cast {
  hash: string;
  text: string;
  timestamp: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  stats: {
    likes: number;
    replies: number;
    recasts: number;
  };
}

export type TimelineTemplate = 'pulse-thread' | 'snapcast' | 'branching-memory';

export interface TimelineData {
  id: string;
  name: string;
  coverImage: string;
  template: TimelineTemplate;
  tags: string[];
  keywords: string[];
  supporterAllocation: number;
  casts: Cast[];
  creator: {
    fid: string;
    username: string;
    avatar: string;
  };
} 