import axios from 'axios';

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    id: number;
  } | null;
}

interface GitHubUser {
  login: string;
  id: number;
  name: string;
  email: string;
}

export class GitHubService {
  private baseURL = 'https://api.github.com';
  private token: string | undefined;

  constructor() {
    this.token = process.env.GITHUB_TOKEN;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'NatX223'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  /**
   * Get user information by username
   */
  async getUserByUsername(username: string): Promise<GitHubUser | null> {
    try {
      const response = await axios.get(`${this.baseURL}/users/${username}`, {
        headers: this.getHeaders()
      });

      return {
        login: response.data.login,
        id: response.data.id,
        name: response.data.name,
        email: response.data.email
      };
    } catch (error) {
      console.error(`Error fetching GitHub user ${username}:`, error);
      return null;
    }
  }

  /**
   * Get commits for a user since a specific date
   */
  async getUserCommitsSince(username: string, since: Date, until?: Date): Promise<GitHubCommit[]> {
    try {
      // Get user's repositories
      const repos = await this.getUserRepositories(username);
      const allCommits: GitHubCommit[] = [];

      // Fetch commits from each repository
      for (const repo of repos) {
        try {
          const commits = await this.getRepositoryCommits(
            username,
            repo.name,
            username,
            since,
            until
          );
          allCommits.push(...commits);
        } catch (repoError) {
          console.warn(`Error fetching commits from ${repo.name}:`, repoError);
          // Continue with other repositories
        }
      }

      // Sort commits by date (newest first)
      return allCommits.sort((a, b) => 
        new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
      );

    } catch (error) {
      console.error(`Error fetching commits for user ${username}:`, error);
      throw new Error(`Failed to fetch GitHub commits for user ${username}`);
    }
  }

  /**
   * Get user's repositories
   */
  private async getUserRepositories(username: string): Promise<Array<{ name: string; full_name: string }>> {
    try {
      const response = await axios.get(`${this.baseURL}/users/${username}/repos`, {
        headers: this.getHeaders(),
        params: {
          type: 'owner',
          sort: 'updated',
          per_page: 100 // Get up to 100 repositories
        }
      });

      return response.data.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name
      }));
    } catch (error) {
      console.error(`Error fetching repositories for ${username}:`, error);
      return [];
    }
  }

  /**
   * Convert various date formats to Date object
   */
  private ensureDate(dateValue: any): Date {
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    
    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue === 'object') {
      if ('_seconds' in dateValue && typeof dateValue._seconds === 'number') {
        return new Date(dateValue._seconds * 1000);
      }
      if ('seconds' in dateValue && typeof dateValue.seconds === 'number') {
        return new Date(dateValue.seconds * 1000);
      }
      if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }
    }
    
    // Fallback
    return new Date(dateValue);
  }

  /**
   * Get commits from a specific repository
   */
  private async getRepositoryCommits(
    owner: string,
    repo: string,
    author: string,
    since: Date | any,
    until?: Date | any
  ): Promise<GitHubCommit[]> {
    try {
      const sinceDate = this.ensureDate(since);
      const params: any = {
        author,
        since: sinceDate.toISOString(),
        per_page: 100
      };

      if (until) {
        const untilDate = this.ensureDate(until);
        params.until = untilDate.toISOString();
      }

      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/commits`, {
        headers: this.getHeaders(),
        params
      });

      return response.data;
    } catch (error) {
      // If it's a 404, the repo might be private or doesn't exist
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`Repository ${owner}/${repo} not found or not accessible`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get commit count for a user since a specific date
   */
  async getUserCommitCount(username: string, since: Date, until?: Date): Promise<number> {
    try {
      const commits = await this.getUserCommitsSince(username, since, until);
      return commits.length;
    } catch (error) {
      console.error(`Error getting commit count for ${username}:`, error);
      throw error;
    }
  }

  /**
   * Calculate consecutive commit streak for a user between two dates
   */
  async getUserCommitStreak(username: string, startDate: Date, endDate?: Date): Promise<number> {
    try {
      const commits = await this.getUserCommitsSince(username, startDate, endDate || new Date());
      
      if (commits.length === 0) {
        return 0;
      }

      // Group commits by date (YYYY-MM-DD format)
      const commitsByDate = new Map<string, number>();
      
      commits.forEach(commit => {
        const commitDate = new Date(commit.commit.author.date);
        const dateKey = commitDate.toISOString().split('T')[0]; // YYYY-MM-DD
        commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1);
      });

      // Get all dates with commits, sorted chronologically
      const datesWithCommits = Array.from(commitsByDate.keys()).sort();
      
      if (datesWithCommits.length === 0) {
        return 0;
      }

      // Calculate consecutive days from start date
      const start = this.ensureDate(startDate);
      const end = endDate ? this.ensureDate(endDate) : new Date();
      
      let streak = 0;
      let currentDate = new Date(start);
      
      // Check each day from start date to end date (or current date)
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (commitsByDate.has(dateKey)) {
          streak++;
        } else {
          // If no commits on this day, streak is broken
          // Reset streak to 0 and continue counting from next commit day
          streak = 0;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return streak;

    } catch (error) {
      console.error(`Error calculating commit streak for ${username}:`, error);
      throw new Error(`Failed to calculate GitHub commit streak for user ${username}`);
    }
  }

  /**
   * Get current active streak (consecutive days with commits up to today)
   */
  async getCurrentCommitStreak(username: string, startDate: Date): Promise<number> {
    try {
      const commits = await this.getUserCommitsSince(username, startDate, new Date());
      
      if (commits.length === 0) {
        return 0;
      }

      // Group commits by date
      const commitsByDate = new Map<string, boolean>();
      
      commits.forEach(commit => {
        const commitDate = new Date(commit.commit.author.date);
        const dateKey = commitDate.toISOString().split('T')[0];
        commitsByDate.set(dateKey, true);
      });

      // Calculate streak working backwards from today
      let streak = 0;
      let currentDate = new Date();
      
      // Start from today and work backwards
      while (currentDate >= startDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (commitsByDate.has(dateKey)) {
          streak++;
        } else {
          // If we haven't started counting yet (no commits today), continue
          // If we have started counting, break the streak
          if (streak > 0) {
            break;
          }
        }
        
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      }

      return streak;

    } catch (error) {
      console.error(`Error calculating current commit streak for ${username}:`, error);
      throw new Error(`Failed to calculate current GitHub commit streak for user ${username}`);
    }
  }

  /**
   * Validate if a GitHub username exists
   */
  async validateUsername(username: string): Promise<boolean> {
    try {
      const user = await this.getUserByUsername(username);
      return user !== null;
    } catch (error) {
      return false;
    }
  }
}

export const githubService = new GitHubService();