const Web3 = require('web3');
const web3 = new Web3(process.env.WEB3_PROVIDER_URL);
const GoalContractABI = require('../contracts/GoalContractABI.json');

class BlockchainService {
    constructor() {
        this.acoount = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
        web3.eth.accounts.wallet.add(this.account);
    }
    
    async createGoalContract(userAddress, stakeAmount, currency, deadline) {
        try {
            const goalContract = new web3.eth.Contract(GoalContractABI);

            const deployment = goalContract.deploy ({
                data: GoalContractABI.bytecode,
                arguments: [userAddress, stakeAmount,  deadline]});

            const gasEstimate = await deployment.estimateGas();

            const deployedContract = await deployment.send({
                from: this.account.address,
                gas: gasEstimate,
                gasPrice: await web3.eth.getGasPrice()
            });

            //transferring stake amount to contract
            if (currency === 'ETH') {
                await web3.eth.sendTransaction ({
                    from: userAddress,
                    to: deployedContract.options.address,
                    value: web3.utils.toWei(stakeAmount.toString(), 'ether'),
                    gas: 50000
                });
            }

            return deployedContract.options.address;
        }   catch (error) {
            throw new Error(`Failed to create goal contract:  ${error.message}`);
        }
    }

    async updateGoalResult(contractAddress, achieved, actualValue) {
        try{
            const goalContract = new web3.eth.Contract(GoalContractABI, contractAddress);

            const transaction = goalContract.methods.finalizeGoal(achieved, actualValue);

            const gasEstimate = await transaction.estimateGas({ from: this.account.address });

            const result = await transaction.send ({
                from: this.account.address,
                gas: gasEstimate,
                gasPrice: await web3.eth.getGasPrice()
            });

            return result.transactionHash;
        }   catch (error) {
            throw new Error(`Failed to update goal result: ${error.message}`);
        }
    }
}

module.exports = new BlockchainService();
module.exports.createGoalContract = module.exports.createGoalContract.bind(module.exports);
module.exports.updateGoalResult = module.exports.updateGoalResult.bind(module.exports); 