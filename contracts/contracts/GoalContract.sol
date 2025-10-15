// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRewardManager {
    function updateWeeklyWinnerCount(address _user, uint256 _week) external;
}

contract Goal is ReentrancyGuard {
    address public author;
    address public settler;
    uint256 public amount;
    address public rewardManager;
    uint256 public week;
    
    uint256 public deadline;
    uint256 public target;
    bool public isSettled;
    bool public isInitialized;
    
    // Events
    event GoalInitialized(address indexed author, uint256 deadline, uint256 amount);
    event Settled(address indexed author, uint256 indexed score, uint256 indexed target, uint256 userShare, uint256 remainder);
    
    // Modifiers
    modifier onlySettler() {
        require(msg.sender == settler, "Only settler can call this");
        _;
    }
    
    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Deadline has passed");
        _;
    }
    
    modifier afterDeadline() {
        require(block.timestamp >= deadline, "Deadline not reached");
        _;
    }
    
    modifier notSettled() {
        require(!isSettled, "Goal already settled");
        _;
    }
    
    modifier onlySettled() {
        require(isSettled, "Goal not settled yet");
        _;
    }
    
    constructor(address _settler, address _rewardManager, uint256 _week) {
        settler = _settler;
        rewardManager = _rewardManager;
        week = _week;
    }
    
    // Initialize the goal
    function initialize(uint256 _deadline, uint256 _target) external payable {
        require(author == address(0), "Already initialized");
        require(_deadline > block.timestamp, "Deadline must be in future");
        
        author = msg.sender;
        deadline = _deadline;
        target = target;
        amount = msg.value;
        emit GoalInitialized(msg.sender, _deadline, msg.value);
    }

    function settleGoal(uint256 score) external onlySettler afterDeadline notSettled {
        isSettled = true; // prevent re-entry
        uint256 userShare;
        uint256 remainder;
        uint256 balance = address(this).balance;

        if (score >= target) {
            userShare = balance;
            (bool success, ) = payable(author).call{value: userShare}("");
            require(success, "Transfer to user failed");
            IRewardManager(rewardManager).updateWeeklyWinnerCount(author, week);
        } else {
            uint256 completion = (score * 1e18) / target; 
            userShare = (balance * completion) / 1e18;
            remainder = balance - userShare;

            // send user their proportional refund
            if (userShare > 0) {
                (bool successUser, ) = payable(author).call{value: userShare}("");
                require(successUser, "User refund failed");
            }

            // send remaining funds to reward manager
            if (remainder > 0) {
                (bool successReward, ) = payable(rewardManager).call{value: remainder}("");
                require(successReward, "Reward transfer failed");
            }
        }

        emit Settled(author, score, target, userShare, remainder);
    }

} 