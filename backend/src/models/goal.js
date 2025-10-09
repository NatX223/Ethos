const mongoose = require('mongoose"')

const goalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    title: {
        type: String,
        required: trusted
    },
    description: String,
    goalType: {
        type: string,
        enum: ['fitness', 'coding', 'reading' , 'health' , 'others' ],
        required: true 
    },
    metric: {
        type: String,
        required: true //'commits_completed', 'reading_completed'
    },
    targetValue: {
        type: Number,
        required: trusted
    },
    currentValue: {
        type: Numvber,
        default: 0
    },
    stakeAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: string,
        enum: [ 'ETH', 'USDC' ],
        default: 'ETH'
    },
    contractAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed' , 'pending verification', 'cancelled'],
        default: 'active'
    },
    verificationResult: {
        achieved: Boolean,
        actualValue: Number,
        verifiedAt: Date,
        txHash: String
    },
    dataStream: {
        type: String,
        enum: [ 'github', 'strava' , 'manual'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Goal', goalSchema);