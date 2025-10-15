// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./GoalContract.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract GoalFactory is ConfirmedOwner {
    address[] public settlers;
    address public rewardManager;
    mapping(uint256 => address) public deployedGoals;
    uint256 public goalCounter;
    uint256 public currentWeek;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event SettlersChanged(address[] newSettlers);
    event rewardManagerChanged(address indexed oldrewardManager, address indexed newrewardManager);
    event GoalDeployed(uint256 indexed goalId, address indexed goal, address indexed settler, address rewardManager);

    constructor(address[] memory _settlers, address _rewardManager) ConfirmedOwner(msg.sender) {
        settlers = _settlers;
        rewardManager = _rewardManager;
    }

    function updateWeek() external {
        currentWeek = currentWeek + 1;
    }

    // Change settlers
    function changeSettlers(address[] calldata _newSettlers) external onlyOwner {
        settlers = _newSettlers;
        emit SettlersChanged(_newSettlers);
    }

    // Change router contract
    function changerewardManager(address _newrewardManager) external onlyOwner {
        require(_newrewardManager != address(0), "Zero address");
        emit rewardManagerChanged(rewardManager, _newrewardManager);
        rewardManager = _newrewardManager;
    }

    // Deploy a new Goal contract with a random settler
    function deployGoal() external {
        require(settlers.length > 0, "No settlers");
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % settlers.length;
        address selectedSettler = settlers[randomIndex];
        Goal goal = new Goal(selectedSettler, rewardManager, currentWeek);
        goalCounter++;
        deployedGoals[goalCounter] = address(goal);
        emit GoalDeployed(goalCounter, address(goal), selectedSettler, rewardManager);
    }

    // Get goal address by ID
    function getGoalById(uint256 _goalId) external view returns (address) {
        require(_goalId > 0 && _goalId <= goalCounter, "Invalid challenge ID");
        return deployedGoals[_goalId];
    }
    // Get all settlers
    function getSettlers() external view returns (address[] memory) {
        return settlers;
    }
}
