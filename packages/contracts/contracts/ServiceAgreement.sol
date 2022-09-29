// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

/// @title Service Agreemnt
/// @author Ilan Olkies
/// @notice You can use this contract to enforce payments in periods of time
/// @dev Only the deployer can collect payments
contract ServiceAgreement {
    address payable paymentCollector = payable(msg.sender);

    uint constant periodTime = 30 days;

    mapping(address => mapping(uint => bool)) public hasPaidPeriod;

    event PeriodPaid(address indexed user, uint indexed period);

    /// @notice Pay a period. It costs 0.1 ether
    /// @dev Only exact payments, only once per period
    /// @param period Expressed in 30 days. Use now % 30 days
    function payPeriod(address user, uint period) external payable {
        require(msg.value == 0.00001 ether, "Pay exactly 0.00001 ETH");
        require(!hasPaidPeriod[user][period], "Period already paid");
        hasPaidPeriod[user][period] = true;
        emit PeriodPaid(user, period);
    }

    /// @notice Collect payments
    /// @dev Only deployer
    function collectPayments() external {
        require(msg.sender == paymentCollector, "Only payment collector");
        paymentCollector.transfer(address(this).balance);
    }

    /// @notice Query if a user has paid the current period
    /// @dev Use it to allow access after authentication
    /// @param user to query for
    /// @return if the user has paid the current period or not
    function hasPaidCurrentPeriod(address user) external view returns(bool) {
        return hasPaidPeriod[user][block.timestamp / periodTime];
    }
}
