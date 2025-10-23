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
      'User-Agent': 'Ethos'
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
   * Get commits from a specific repository
   */
  private async getRepositoryCommits(
    owner: string,
    repo: string,
    author: string,
    since: Date,
    until?: Date
  ): Promise<GitHubCommit[]> {
    try {
      const params: any = {
        author,
        since: since.toISOString(),
        per_page: 100
      };

      if (until) {
        params.until = until.toISOString();
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