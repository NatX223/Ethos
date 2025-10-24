import axios from 'axios';

interface StravaActivity {
  id: number;
  name: string;
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  total_elevation_gain: number; // in meters
  type: string; // Run, Ride, Swim, etc.
  start_date: string; // ISO 8601 format
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id: string | null;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  average_speed: number; // in m/s
  max_speed: number; // in m/s
  average_cadence: number;
  average_watts: number;
  weighted_average_watts: number;
  kilojoules: number;
  device_watts: boolean;
  has_heartrate: boolean;
  average_heartrate: number;
  max_heartrate: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high: number;
  elev_low: number;
  upload_id: number;
  upload_id_str: string;
  external_id: string;
  from_accepted_tag: boolean;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  suffer_score: number;
  calories?: number; // Optional, not always provided
}

interface StravaAthlete {
  id: number;
  username: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number;
  profile_medium: string;
  profile: string;
  friend: string | null;
  follower: string | null;
}

export class StravaService {
  private baseURL = 'https://www.strava.com/api/v3';

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
   * Get headers for Strava API requests
   */
  private getHeaders(accessToken: string) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };
  }

  /**
   * Get athlete information
   */
  async getAthlete(accessToken: string): Promise<StravaAthlete | null> {
    try {
      const response = await axios.get(`${this.baseURL}/athlete`, {
        headers: this.getHeaders(accessToken)
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Strava athlete:', error);
      return null;
    }
  }

  /**
   * Get athlete activities since a specific date
   */
  async getActivitiesSince(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<StravaActivity[]> {
    try {
      const sinceDate = this.ensureDate(since);
      const params: any = {
        after: Math.floor(sinceDate.getTime() / 1000), // Strava expects Unix timestamp
        per_page: 200 // Maximum allowed by Strava
      };

      if (until) {
        const untilDate = this.ensureDate(until);
        params.before = Math.floor(untilDate.getTime() / 1000);
      }

      const response = await axios.get(`${this.baseURL}/athlete/activities`, {
        headers: this.getHeaders(accessToken),
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Strava activities:', error);
      throw new Error('Failed to fetch Strava activities');
    }
  }

  /**
   * Calculate total distance from activities (in meters)
   */
  async getTotalDistance(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<number> {
    try {
      const activities = await this.getActivitiesSince(accessToken, since, until);
      
      const totalDistance = activities.reduce((sum, activity) => {
        return sum + (activity.distance || 0);
      }, 0);

      return totalDistance; // Returns distance in meters
    } catch (error) {
      console.error('Error calculating total distance:', error);
      throw error;
    }
  }

  /**
   * Calculate total distance in kilometers
   */
  async getTotalDistanceKm(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<number> {
    const distanceMeters = await this.getTotalDistance(accessToken, since, until);
    return distanceMeters / 1000; // Convert to kilometers
  }

  /**
   * Calculate total distance in miles
   */
  async getTotalDistanceMiles(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<number> {
    const distanceMeters = await this.getTotalDistance(accessToken, since, until);
    return distanceMeters / 1609.34; // Convert to miles
  }

  /**
   * Calculate total calories burned from activities
   */
  async getTotalCalories(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<number> {
    try {
      const activities = await this.getActivitiesSince(accessToken, since, until);
      
      let totalCalories = 0;
      
      for (const activity of activities) {
        if (activity.calories) {
          totalCalories += activity.calories;
        } else {
          // Estimate calories if not provided by Strava
          const estimatedCalories = this.estimateCalories(activity);
          totalCalories += estimatedCalories;
        }
      }

      return Math.round(totalCalories);
    } catch (error) {
      console.error('Error calculating total calories:', error);
      throw error;
    }
  }

  /**
   * Estimate calories burned for an activity (rough estimation)
   */
  private estimateCalories(activity: StravaActivity): number {
    const durationHours = activity.moving_time / 3600; // Convert seconds to hours
    const distanceKm = activity.distance / 1000; // Convert meters to km
    
    // Rough calorie estimation based on activity type
    let caloriesPerHour = 400; // Default moderate activity
    
    switch (activity.type.toLowerCase()) {
      case 'run':
      case 'trail run':
        caloriesPerHour = 600;
        break;
      case 'ride':
      case 'mountain bike ride':
      case 'gravel ride':
        caloriesPerHour = 500;
        break;
      case 'swim':
        caloriesPerHour = 400;
        break;
      case 'walk':
      case 'hike':
        caloriesPerHour = 300;
        break;
      case 'workout':
      case 'crossfit':
        caloriesPerHour = 450;
        break;
      default:
        caloriesPerHour = 400;
    }
    
    return durationHours * caloriesPerHour;
  }

  /**
   * Calculate activity streak (consecutive days with activities)
   */
  async getActivityStreak(
    accessToken: string, 
    startDate: Date, 
    endDate?: Date
  ): Promise<number> {
    try {
      const activities = await this.getActivitiesSince(accessToken, startDate, endDate);
      
      if (activities.length === 0) {
        return 0;
      }

      // Group activities by date (YYYY-MM-DD format)
      const activitiesByDate = new Map<string, boolean>();
      
      activities.forEach(activity => {
        const activityDate = new Date(activity.start_date);
        const dateKey = activityDate.toISOString().split('T')[0];
        activitiesByDate.set(dateKey, true);
      });

      // Calculate streak working backwards from today (or end date)
      let streak = 0;
      const end = endDate ? this.ensureDate(endDate) : new Date();
      let currentDate = new Date(end);
      
      // Start from end date and work backwards
      while (currentDate >= startDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (activitiesByDate.has(dateKey)) {
          streak++;
        } else {
          // If we haven't started counting yet (no activity today), continue
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
      console.error('Error calculating activity streak:', error);
      throw error;
    }
  }

  /**
   * Get current active streak (consecutive days with activities up to today)
   */
  async getCurrentActivityStreak(
    accessToken: string, 
    startDate: Date
  ): Promise<number> {
    return this.getActivityStreak(accessToken, startDate, new Date());
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at
      };
    } catch (error) {
      console.error('Error refreshing Strava access token:', error);
      return null;
    }
  }

  /**
   * Validate if access token is valid
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const athlete = await this.getAthlete(accessToken);
      return athlete !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get activity count since a specific date
   */
  async getActivityCount(
    accessToken: string, 
    since: Date, 
    until?: Date
  ): Promise<number> {
    try {
      const activities = await this.getActivitiesSince(accessToken, since, until);
      return activities.length;
    } catch (error) {
      console.error('Error getting activity count:', error);
      throw error;
    }
  }
}

export const stravaService = new StravaService();