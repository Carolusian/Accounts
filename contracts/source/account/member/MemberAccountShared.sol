pragma solidity ^0.4.19;

import "./IMemberAccountShared.sol";
import "../../token/IToken.sol";
import "../../../infrastructure/ownership/TransferableOwnership.sol";

/**
 * MemberAccountShared 
 *
 * FlyWeight - Shared data to reduce the memory
 * footprint of the member account contracts
 *
 * #created 14/03/2018
 * #author Frank Bonnet
 */
contract MemberAccountShared is TransferableOwnership, IMemberAccountShared {

    struct Lock {
        address owner;
        uint until;
        uint stake;
    }

    struct Node {
        bool enabled;
        uint gas;
        uint withdrawFeeModifier;
        uint denominator;
        uint index;
    }

    // Fees
    uint public denominator;
    uint public withdrawFeePercentage;

    // Withdraw rules
    uint public minEtherWithdrawAmount;
    uint public minTokenWithdrawAmount;
    mapping(address => uint) private minTokenWithdrawAmountOverwrites;

    // Proxy rules
    mapping(address => bool) private disallowedProxyTargets;

    // Auth
    uint public lockStake;
    uint public lockDuration;
    mapping(address => Lock) private locks;

    mapping(address => Node) private nodes;
    address[] private nodesIndex;

    // Events
    event NodeAdded(address node, bool enabled, uint gas, uint withdrawFeeModifier, uint denominator);
    event NodeUpdated(address node, bool enabled, uint gas, uint withdrawFeeModifier, uint denominator);
    

    /**
     * Construct shared data - FlyWeight
     *
     * @param _lockStake Min amount of wei required to obtain a lock
     * @param _lockDuration Time that a lock is valid
     * @param _disallowedProxyTargets Addresses that are not allowed as proxy target
     */
    function MemberAccountShared(uint _lockStake, uint _lockDuration, address[] _disallowedProxyTargets) public {

        // Auth
        lockStake = _lockStake;
        lockDuration = _lockDuration;

        // Disable targets
        for (uint i = 0; i < _disallowedProxyTargets.length; i++) {
            disallowedProxyTargets[_disallowedProxyTargets[i]] = true;
        }
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
     * Calculates the withdraw fee
     *
     * @param _value Amount that was withdrawn
     * @param _included Whether the fee is included in _value
     * @param _caller Address of the caller (node)
     * @return Withdraw fee
     */
    function calculateWithdrawFee(address _caller, uint _value, bool _included) public view returns (uint) {
        if (withdrawFeePercentage == 0) {
            return 0;
        }

        // Allow node to modify fee
        uint actualWithdrawFeePercentage;
        if (nodes[_caller].enabled) {
            if (nodes[_caller].withdrawFeeModifier == 0) {
                return 0;
            }

            // Apply node specific increase / discount
            actualWithdrawFeePercentage = withdrawFeePercentage * nodes[_caller].withdrawFeeModifier / nodes[_caller].denominator;
        } else {
            actualWithdrawFeePercentage = withdrawFeePercentage;
        }

        uint amount = _included ? _value * denominator / (denominator + actualWithdrawFeePercentage) : _value;
        return amount * actualWithdrawFeePercentage / denominator;
    }


    /**
     * Sets the stake needed to obtain a lock to `_value` wei
     *
     * @param _value Stake needed to obtain a lock
     */
    function setLockStake(uint _value) public only_owner {
        lockStake = _value;
    }


    /**
     * Set the time that a lock is valid to `_value`
     *
     * @param _value Time that a lock is valid
     */
    function setLockDuration(uint _value) public only_owner {
        lockDuration = _value;
    }


    /**
     * Returns true if `_account` is locked currently. A locked account 
     * restricts authentication to the lock owner and can be overwritten 
     * by a valid node or enabled 2fa option
     *
     * @param _account Account that is locked or not
     * @return Wether the account is locked or not
     */
    function isLocked(address _account) public view returns (bool) {
        return locks[_account].until >= now;
    }


    /**
     * Returns the lock data for `_account`. The lock data includes the 
     * lock owner, the expiry time and the received stake
     *
     * @param _account Account for which to retreive the lock data
     * @return Lock owner, expiry time, received stake
     */
    function getLock(address _account) public view returns (address, uint, uint) {
        Lock storage lock = locks[_account];
        return (lock.owner, lock.until, lock.stake); 
    }


    /**
     * Obtain a lock on `_account`. Locking the account restricts authentication 
     * to the msg.sender and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be locked
     */
    function lock(address _account) public payable {
        lockFor(_account, msg.sender);
    } 


    /**
     * Obtain a lock on `_account` for `_owner`. Locking the account restricts authentication 
     * to the `_owner` and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be locked
     * @param _owner The owner of the lock
     */
    function lockFor(address _account, address _owner) public payable {
        uint stake = msg.value;
        
        require(stake >= lockStake); // Sufficient stake
        require(locks[_account].until < now); // Not currently locked

        // Obtain lock
        locks[_account] = Lock(
            _owner, now + lockDuration, stake);

        // Return stake to account
        _account.transfer(stake);
    }


    /**
     * Remove a lock from `_account`. Locking the account restricts authentication 
     * to the msg.sender and can be overwritten by a valid node or enabled 2fa option
     *
     * @param _account Account that will be unlocked
     */
    function removeLock(address _account) public {
        require(_account == msg.sender);

        // Remove lock
        locks[_account].until = 0;
    } 


    /**
     * Adds `_node` to the nodes list. Nodes in the node list 
     * are trusted and thus not required to obtain a lock before 
     * authenticating. This saves gas.
     *
     * @param _node Address to be removed as a valid node
     * @param _enabled Whether the node is enabled or not
     * @param _gas Amount of gas it charges the caller (100 eq msg.gas)
     * @param _withdrawFeeModifier Modifier applied to fees charged when withdrawing (100 eq the standard for the token that is withdrawn)
     * @param _denominator Precesion used to calculate fees
     */
    function addNode(address _node, bool _enabled, uint _gas, uint _withdrawFeeModifier, uint _denominator) public only_owner {
        nodes[_node] = Node(
            _enabled, _gas, _withdrawFeeModifier, _denominator, nodesIndex.push(_node) - 1);

        // Notify
        NodeAdded(_node, _enabled, _gas, _withdrawFeeModifier, _denominator);
    }


    /**
     * Updates a `_node` from the nodes list
     *
     * @param _node Address to be removed as a valid node
     * @param _enabled Whether the node is enabled or not
     * @param _gas Amount of gas it charges the caller (100 eq msg.gas)
     * @param _withdrawFeeModifier Modifier applied to fees charged when withdrawing (100 eq the standard for the token that is withdrawn)
     * @param _denominator Precesion used to calculate fees
     */
    function updateNode(address _node, bool _enabled, uint _gas, uint _withdrawFeeModifier, uint _denominator) public only_owner {
        require(nodes[_node].index < nodesIndex.length && _node == nodesIndex[nodes[_node].index]);

        // Update node
        Node storage node = nodes[_node];
        node.enabled = _enabled;
        node.gas = _gas;
        node.withdrawFeeModifier = _withdrawFeeModifier;
        node.denominator = _denominator;

        // Notify
        NodeUpdated(_node, _enabled, _gas, _withdrawFeeModifier, _denominator);
    }


    /**
     * Returns true if `_node` is a valid node
     *
     * @param _node The address to be checked
     * @return Wether _node is a valid node
     */
    function isNode(address _node) public view returns (bool) {
        return nodes[_node].enabled;
    }
}