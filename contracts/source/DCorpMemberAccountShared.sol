pragma solidity ^0.4.19;

import "./IDCorpMemberAccount.sol";
import "./account/member/IMemberAccount.sol";
import "./token/IToken.sol";
import "../infrastructure/ownership/TransferableOwnership.sol";

/**
 * DCorpMemberAccountShared 
 *
 * FlyWeight - Shared data to reduce the memory
 * footprint of the member account contracts
 *
 * #created 21/02/2018
 * #author Frank Bonnet
 */
contract DCorpMemberAccountShared is TransferableOwnership, IMemberAccount, IDCorpMemberAccount {

    // Fees
    uint public denominator;
    uint public withdrawFeePercentage;

    // Withdraw rules
    uint public minEtherWithdrawAmount;
    uint public minTokenWithdrawAmount;
    mapping(address => uint) private minTokenWithdrawAmountOverwrites;

    // Proxy rules
    mapping(address => bool) private disallowedProxyTargets;

    // Listener
    address public observer;


    /**
     * Construct shared data - FlyWeight
     *
     * @param _disallowedProxyTargets Addresses that are not allowed as proxy target
     */
    function DCorpMemberAccountShared(address[] _disallowedProxyTargets) public {
        observer = msg.sender;
        for (uint i = 0; i < _disallowedProxyTargets.length; i++) {
            disallowedProxyTargets[_disallowedProxyTargets[i]] = true;
        }
    }


    /**
     * Get the observing address
     *
     * @return Observer
     */
    function getObserver() public view returns (address) {
        return observer;
    }


    /**
     * Returns true if it's allowed to make proxy calls 
     * to `_target` 
     *
     * @param _target Target address to evaluate
     * @return Wether the target is valid
     */
    function isValidTarget(address _target) public view returns (bool) {
        return !disallowedProxyTargets[_target];
    }


    /**
     * Returns true if `_value` wei can be withdrawn into `_to` 
     *
     * @param _to Receiving address
     * @param _value Amount to withdraw in wei
     * @return Wether the withdraw is valid
     */
    function isValidEtherWithdraw(address _to, uint _value) public view returns (bool) {
        return _to != address(this) && _value >= minEtherWithdrawAmount;
    }


    /**
     * Sets the minimum ether withdraw value to `_value` wei
     *
     * @param _value Minimum amount to withdraw in wei
     */
    function setMinEtherWithdrawAmount(uint _value) public only_owner {
        minEtherWithdrawAmount = _value;
    }


    /**
     * Returns true if `_value` of `_token` can be withdrawn into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     * @return Wether the withdraw is valid
     */
    function isValidTokenWithdraw(address _token, address _to, uint _value) public view returns (bool) {
        return _to != address(this) && _value >= getMinTokenWithdrawAmount(_token);
    }


    /**
     * Sets the minimum token withdraw value to `_value` tokens 
     * when withdrawing `_token`
     *
     * @param _token ERC20 token to withdraw from
     * @param _value Minimum amount to withdraw in tokens
     */
    function setMinTokenWithdrawAmount(address _token, uint _value) public only_owner {
        if (_token == 0x0) {
            minTokenWithdrawAmount = _value;
        } else {
            minTokenWithdrawAmountOverwrites[_token] = _value;
        }
    }


    /**
     * Gets the minimum token withdraw value to `_value` tokens 
     * when withdrawing `_token`
     *
     * @param _token ERC20 token to withdraw from
     * @return Minimum amount to withdraw in tokens
     */
    function getMinTokenWithdrawAmount(address _token) public view returns (uint) {
        return minTokenWithdrawAmountOverwrites[_token] > 0 ? minTokenWithdrawAmountOverwrites[_token] : minTokenWithdrawAmount;
    }


    /**
     * Sets the percentge that is used to calculate the withdraw fee
     *
     * @param _percentage Percentage of the withdrawn amount
     * @param _denominator Precesion used to calculate withdraw fee
     */
    function setWithdrawFee(uint _percentage, uint _denominator) public only_owner {
        withdrawFeePercentage = _percentage;
        denominator = _denominator;
    }


    /**
     * Computes the withdraw fee
     *
     * @param _value Amount that was withdrawn
     * @param _included Whether the fee is included in _value
     * @return Fee
     */
    function calculateWithdrawFee(uint _value, bool _included) public view returns (uint) {
        if (withdrawFeePercentage == 0) {
            return 0;
        }

        uint amount = _included ? _value * denominator / (denominator + withdrawFeePercentage) : _value;
        return amount * withdrawFeePercentage / denominator;
    }
}