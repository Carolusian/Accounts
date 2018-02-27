pragma solidity ^0.4.19;

import "./IMemberAccount.sol";
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
    address internal shared;

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
        // Optional security - Requires transaction to be signed from authorized account
        require(authorizedAccount == 0x0 || authorizedAccount == msg.sender);

        // Required secuirity - Password 
        require(_passphraseHash != 0x0);
        require(keccak256(_passphrase) == passphraseHash);
        passphraseHash = _passphraseHash; 
        _;
    }


    /**
     * Construct the account requiring a hashed passphrase
     *
     * @param _shared Flyweight - shared data
     * @param _passphraseHash Hashed user passphrase
     */
    function MemberAccount(address _shared, bytes32 _passphraseHash) public {
        shared = _shared;
        passphraseHash = _passphraseHash;
    }


    /**
     * Computes the withdraw fee
     *
     * @param _value Amount that was withdrawn
     * @param _included Whether the fee is included in _value
     * @return Fee
     */
    function calculateWithdrawFee(uint _value, bool _included) public view returns (uint) {
        return IMemberAccount(shared).calculateWithdrawFee(_value, _included);
    }


    /**
     * Returns true if it's allowed to make proxy calls 
     * to `_target` 
     *
     * @param _target Target address to evaluate
     * @return Wether the target is valid
     */
    function isValidTarget(address _target) public view returns (bool) {
        return IMemberAccount(shared).isValidTarget(_target);
    }


    /**
     * Replace the hashed passphrase
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function resetPassphrase(bytes32 _passphrase, bytes32 _passphraseHash) public authenticate(_passphrase, _passphraseHash) {
        // Passphrase hash reset in modifier
    }


    /**
     * Calls will only be accepted from `_authorizedAccount` only
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function enable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public authenticate(_passphrase, _passphraseHash) {
        authorizedAccount = msg.sender;
    }


    /**
     * Calls will only be accepted from anyone
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function disable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public authenticate(_passphrase, _passphraseHash) {
        authorizedAccount = 0x0;
    }


    /**
     * Returns true if `_value` wei can be withdrawn into `_to` 
     *
     * @param _to Receiving address
     * @param _value Amount to withdraw in wei
     */
    function isValidEtherWithdraw(address _to, uint _value) public view returns (bool) {
        return IMemberAccount(shared).isValidEtherWithdraw(_to, _value);
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
    function withdrawEtherTo(address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public authenticate(_passphrase, _passphraseHash) {
        IMemberAccount _shared = IMemberAccount(shared);
        require(_shared.isValidEtherWithdraw(_to, _value));

        uint amount = _value;
        uint fee = 0;

        // Calculate fee
        if (authorizedAccount == 0x0) {
            fee = _shared.calculateWithdrawFee(_value, true);
            amount -= fee;
        }

        // Send ether
        if (_to.send(amount) && (fee == 0 || msg.sender.send(fee))) {
            onEtherWithdrawn(_value);
        }
    }


    /**
     * Returns true if `_value` of `_token` can be withdrawn into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     */
    function isValidTokenWithdraw(address _token, address _to, uint _value) public view returns (bool) {
        return IMemberAccount(shared).isValidTokenWithdraw(_token, _to, _value);
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
    function withdrawTokensTo(address _token, address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public authenticate(_passphrase, _passphraseHash) {
        IMemberAccount _shared = IMemberAccount(shared);
        require(_shared.isValidTokenWithdraw(_token, _to, _value));
        
        IToken token = IToken(_token);
        uint amount = _value;
        uint fee = 0;

        // Calculate fee
        if (authorizedAccount == 0x0) {
            fee = _shared.calculateWithdrawFee(amount, true);
            amount -= fee;
        }

        // Transfer tokens
        if (token.transfer(_to, amount) && (fee == 0 || token.transfer(msg.sender, fee))) {
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
    function execute(address _target, uint _value, bytes _data, bytes32 _passphrase, bytes32 _passphraseHash) public payable authenticate(_passphrase, _passphraseHash) {
        IMemberAccount _shared = IMemberAccount(shared);
        require(_target != address(this));
        require(_shared.isValidTarget(_target));

        // TODO: Prevent internal call (test)

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