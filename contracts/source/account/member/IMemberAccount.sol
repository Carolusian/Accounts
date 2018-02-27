pragma solidity ^0.4.19;

/**
 * IMemberAccount 
 *
 * FlyWeight
 *
 * #created 21/02/2018
 * #author Frank Bonnet
 */
interface IMemberAccount {

    /**
     * Returns true if `_value` wei can be withdrawn into `_to` 
     *
     * @param _to Receiving address
     * @param _value Amount to withdraw in wei
     */
    function isValidEtherWithdraw(address _to, uint _value) public view returns (bool);


    /**
     * Returns true if `_value` of `_token` can be withdrawn into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     */
    function isValidTokenWithdraw(address _token, address _to, uint _value) public view returns (bool);


    /**
     * Computes the withdraw fee
     *
     * @param _value Amount that was withdrawn
     * @param _included Whether the fee is included in _value
     * @return Fee
     */
    function calculateWithdrawFee(uint _value, bool _included) public view returns (uint);


    /**
     * Returns true if it's allowed to make proxy calls 
     * to `_target` 
     *
     * @param _target Target address to evaluate
     * @return Wether the target is valid
     */
    function isValidTarget(address _target) public view returns (bool);
}