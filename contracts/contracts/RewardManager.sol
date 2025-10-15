// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract RewardManager {
    address public owner;
    address public settler;

    mapping(uint256 => uint256) public weeklyRewardAmount;
    mapping(address => mapping(uint256 => bool)) public userEligibility;
    mapping (uint256 => uint256) public weeklyWinnerCount;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event SettlerChanged(address newSettlers);
    event WeeklyRewardAdded(uint256 indexed week, uint256 newAmount);
    event UserEligibilityChanged(address indexed user, uint256 indexed week, bool isEligible, uint256 newCount);
    event WeeklyWinnerCountChanged(uint256 indexed week, uint256 newCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlySettler() {
        require(tx.origin == settler, "Only settlers can call this");
        _;
    }

    event Received(
        address indexed origin,
        address indexed sender,
        uint256 indexed value
    );

    constructor(address _owner, address _settler) {
        owner = _owner;
        settler = _settler;
    }

    // Change owner
    function changeOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero address");
        emit OwnerChanged(owner, _newOwner);
        owner = _newOwner;
    }

    // Change settlers
    function changeSettler(address _newSettler) external onlyOwner {
        settler = _newSettler;
        emit SettlerChanged(_newSettler);
    }

    // Change user eligibility
    function updateWeeklyWinnerCount(address _user, uint256 _week) external onlySettler {
        userEligibility[_user][_week] = true;
        weeklyWinnerCount[_week] = weeklyWinnerCount[_week] + 1;
        emit UserEligibilityChanged(_user, _week, true, weeklyWinnerCount[_week]);
    }

    // Change weekly reward amount
    // To be performed once a week
    // Main reward allocator function
    function updateWeeklyReward(uint256 _week, uint256 _amount) external onlySettler {
        require(_amount > 0, "Amount must be greater than 0");
        weeklyRewardAmount[_week] = weeklyRewardAmount[_week] + _amount;
        emit WeeklyRewardAdded(_week, _amount);
    }

    receive() external payable {
        emit Received(
            tx.origin,
            msg.sender,
            msg.value
        );
    }
}
