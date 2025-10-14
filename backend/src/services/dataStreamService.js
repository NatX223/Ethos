const axios = require('axios')
const User = require('../models/user');

class DataStreamService {
    async verifyGoalAchievement(goal) {
        try {
            const user = await User.findById(goal.user);
            let actualValue = 0;

            switch (goal.datastream) {
                case 'strava':
                    actualValue = await this.getStravaData(user, goal.metric, goal.deadline);
                    break;
                    default:
                        throw new Error(`Unsupported data stream: ${goal.dataStream}`);
            }

            return {
                achieved: actualValue >= goal.targetValue,
                actualValue: actualValue
            };
        } catch (error) {
            throw new Error(`Data stream verification failed: ${error.message}`);
        }
    }

    async getStravaData(user, metric, deadline) {
        if (!user.dataStreams.strava?.accessToken) {
            throw new Error('Strava not connected');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); //for Last 30 days

        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                'Authorization' : `Bearer ${user.dataStreams.strava.accessToken}`
            },
            params: {
                after: Math.floor(startDate.getTime() / 1000),
                before: Math.floor(deadline.getTime()/ 1000),
                per_page: 200
            }
        });

        const activities = response.data;

        switch (metric) {
            case 'distance':
                return activities.reduce((sum, activity) => sum + activity.distance, 0) / 1000; //convert to km
                case 'steps':
                    //Estimating steps from distance (approximate)
                    return activities.reduce((sum, activity) => sum + (activity.distance * 1.312), 0);
                    case 'calories' :
                        return activities.reduce((sum, activity) => sum + (activity.calories || 0), 0);
                    case 'active_minutes':
                        return activities.reduce((sum, activity) => sum + (activity.moving_time / 60), 0);
                        
                        default:
                            throw new Error(`Unsupported Strava metric: ${metric}`);
        }
    }
}

module.exports = new DataStreamService();