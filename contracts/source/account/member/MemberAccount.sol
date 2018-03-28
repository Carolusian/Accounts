pragma solidity ^0.4.19;

import "./IMemberAccount.sol";
import "./IMemberAccountShared.sol";
import "../IAccount.sol";
import "../IEtherAccount.sol";
import "../ITokenAccount.sol";
import "../../token/IToken.sol";
import "../../../infrastructure/dispatcher/Dispatchable.sol";

/**
 * MemberAccount
 * 
 * Password protected account with optional caller 
 * enforcement protection
 *
 * - Store ether
 * - Store ERC20 tokens 
 *
 * #created 14/02/2018
 * #author Frank Bonnet
 */
contract MemberAccount is Dispatchable, IAccount, IEtherAccount, ITokenAccount, IMemberAccount {

    // FlyWeight - Shared data
    IMemberAccountShared internal shared;

    /**
     * If set, calls are only accepted from 
     * the authorized account
     */
    address internal authorizedAccount;

    /**
     * Hashed version of the password, updated 
     * after each successfull match
     */
    bytes32 internal passphraseHash;


    /**
     * Authentication
     * 
     * Basic (required)
     * Compares the provided password to the stored hash of the password. The 
     * passphrase is updated after each successfull authentication to prevent 
     * a replay attack. 
     *
     * 2FA (optional)
     * Require the user to call from the stored authorized account 
     */
    modifier authenticate(bytes32 _passphrase, bytes32 _passphraseHash) {
        if (authorizedAccount != 0x0) {
            // Authorized
            require(authorizedAccount == msg.sender); // Require 2fa
        } 
        
        else {
            // Anonymous
            var (owner, until, stake) = shared.getLock(this);
            require(until >= now); // Is locked?
            require(owner == msg.sender); // Owns lock?

            // Reset lock
            shared.removeLock(this);

            // Return stake
            if (stake > 0) {
                msg.sender.transfer(stake);
            }
        }

        // Require passphrase 
        require(_passphraseHash != 0x0);
        require(keccak256(_passphrase) == passphraseHash);
        passphraseHash = _passphraseHash; 

        _;
    }


    /**
     * Charge an optional fee to cover execution costs. The gas amount 
     * should be measured as soon as possible
     * 
     * @param _gas Amount of gas that serves as basis for the charged amount
     * @param _value Amount of ether that is being sent out
     */
    modifier charge(uint _gas, uint _value) {
        uint fee = shared.calculateExecutionFee(msg.sender, _gas);
        if (fee > 0) {
            // Can pay fee?
            require(_value <= _value + fee); // Check for overflow
            require(this.balance >= _value + fee);

            // Pay fee
            msg.sender.transfer(fee);

            // Notify
            Charged(_gas, fee);
        }
        
        _; 
    }


    // Events
    event Charged(uint gas, uint fee);


    /**
     * Construct the account requiring a hashed passphrase
     *
     * @param _shared Flyweight - shared data
     * @param _passphraseHash Hashed user passphrase
     */
    function MemberAccount(address _shared, bytes32 _passphraseHash) public {
        shared = IMemberAccountShared(_shared);
        passphraseHash = _passphraseHash;
    }


    /**
     * Replace the hashed passphrase
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function resetPassphrase(bytes32 _passphrase, bytes32 _passphraseHash) public charge(msg.gas, 0) authenticate(_passphrase, _passphraseHash) {
        // Passphrase hash reset in modifier
    }


    /**
     * Calls will only be accepted from `_authorizedAccount` only
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function enable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public charge(msg.gas, 0) authenticate(_passphrase, _passphraseHash) {
        authorizedAccount = msg.sender;
    }


    /**
     * Calls will only be accepted from anyone
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function disable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public charge(msg.gas, 0) authenticate(_passphrase, _passphraseHash) {
        authorizedAccount = 0x0;
    }


    /**
     * Withdraws `_value` wei into sender
     *
     * @param _value Amount to widthdraw in wei
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawEther(uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public {
        withdrawEtherTo(msg.sender, _value, _passphrase, _passphraseHash);
    }


    /**
     * Withdraws `_value` wei into `_to` 
     *
     * @param _to Receiving address
     * @param _value Amount to widthdraw in wei
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawEtherTo(address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public charge(msg.gas, _value) authenticate(_passphrase, _passphraseHash) {
        require(shared.isValidEtherWithdraw(_to, _value));

        uint amount = _value;
        uint fee = 0;

        // Calculate fee
        if (authorizedAccount == 0x0) {
            fee = shared.calculateWithdrawFee(msg.sender, _value, true);
            amount -= fee;
        }

        // Send ether
        if (_to.send(amount) && (fee == 0 || msg.sender.send(fee))) {
            onEtherWithdrawn(_value);
        }
    }


    /**
     * Withdraws `_value` of `_token` into sender
     *
     * @param _token ERC20 token to withdraw from
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokens(address _token, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public {
        withdrawTokensTo(_token, msg.sender, _value, _passphrase, _passphraseHash);
    }


    /**
     * Withdraws `_value` of `_token` into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokensTo(address _token, address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public charge(msg.gas, 0) authenticate(_passphrase, _passphraseHash) {
        require(shared.isValidTokenWithdraw(_token, _to, _value));

        // Calculate fee
        uint fee = 0;
        if (authorizedAccount == 0x0) {
            fee = shared.calculateWithdrawFee(msg.sender, _value, true);
        }

        // Transfer tokens
        if (IToken(_token).transfer(_to, _value - fee) && (fee == 0 || IToken(_token).transfer(msg.sender, fee))) {
            onTokensWithdrawn(_token, _value);
        }
    }


    /**
     * Forward a call to `_target` passing 
     *
     * @param _target Destination address
     * @param _value Amount of Ether to send
     * @param _data Calldata
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function execute(address _target, uint _value, bytes _data, bytes32 _passphrase, bytes32 _passphraseHash) public payable charge(msg.gas, _value) authenticate(_passphrase, _passphraseHash) {
        require(_target != address(this));
        require(shared.isValidTarget(_target));

        // Call target
        if (!_target.call.value(_value)(_data)) {
            revert();
        }

        onExecuted(_target, _value, _data);
    }


    /**
     * Accept payments
     */
    function () public payable {
         // Just receive ether
    }


    /**
     * Event handler
     * 
     * Called when a token amount is withdrawn
     *
     * @param _value Amount of wei that was withdrawn
     */
    function onEtherWithdrawn(uint _value) internal;


    /**
     * Event handler
     * 
     * Called when a token amount is withdrawn
     *
     * @param _token ERC20 token that was withdraw from
     * @param _value Amount of tokens that was withdrawn
     */
    function onTokensWithdrawn(address _token, uint _value) internal;


    /**
     * Event handler
     * 
     * Called when calldata is executed
     *
     * @param _target Destination address
     * @param _value Amount of Ether to send
     * @param _data Calldata
     */
    function onExecuted(address _target, uint _value, bytes _data) internal;
}