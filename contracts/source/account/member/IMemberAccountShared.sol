pragma solidity ^0.4.19;

/**
 * IMemberAccountShared 
 *
 * FlyWeight
 *
 * #created 21/02/2018
 * #author Frank Bonnet
 */
interface IMemberAccountShared {

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


    /**
     * Returns true if `_account` is locked currently. A locked account 
     * restricts authentication to the lock owner and can be overwritten 
     * by a valid node or enabled 2fa option
     *
     * @param _account Account that is locked or not
     * @return Wether the account is locked or not
     */
    function isLocked(address _account) public view returns (bool);


    /**
     * Returns the lock data for `_account`. The lock data includes the 
     * lock owner, the expiry time and the received stake
     *
     * @param _account Account for which to retreive the lock data
     * @return Lock owner, expiry time, received stake
     */
    function getLock(address _account) public view returns (address, uint, uint);


    /**
     * Obtain a lock on `_account`. Locking the account restricts authentication 
     * to the msg.sender and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be locked
     */
    function lock(address _account) public payable;


    /**
     * Obtain a lock on `_account` for `_owner`. Locking the account restricts authentication 
     * to the `_owner` and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be locked
     * @param _owner The owner of the lock
     */
    function lockFor(address _account, address _owner) public payable;


    /**
     * Remove a lock from `_account`. Locking the account restricts authentication 
     * to the msg.sender and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be unlocked
     */
    function removeLock(address _account) public;


    /**
     * Returns true if `_node` is a valid node
     *
     * @param _node The address to be checked
     * @return Wether _node is a valid node
     */
    function isNode(address _node) public view returns (bool);
}