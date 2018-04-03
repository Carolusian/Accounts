pragma solidity ^0.4.19;

/**
 * IMemberAccount 

 * #created 21/02/2018
 * #author Frank Bonnet
 */
interface IMemberAccount {

    /**
     * Replace the hashed passphrase
     *
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function resetPassphrase(bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Calls will only be accepted from `_authorizedAccount` only
     *
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function enable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Calls will only be accepted from anyone
     *
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function disable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Withdraws `_value` wei into sender
     *
     * @param _value Amount to widthdraw in wei
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawEther(uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Withdraws `_value` wei into `_to` 
     *
     * @param _to Receiving address
     * @param _value Amount to widthdraw in wei
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawEtherTo(address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Withdraws `_value` of `_token` into sender
     *
     * @param _token ERC20 token to withdraw from
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokens(address _token, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Withdraws `_value` of `_token` into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokensTo(address _token, address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Forward a call to `_target` passing 
     *
     * @param _target Destination address
     * @param _value Amount of Ether to send
     * @param _data Calldata
     * @param _passphrase Raw passphrase 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function execute(address _target, uint _value, bytes _data, bytes32 _passphrase, bytes32 _passphraseHash) public payable;


    /**
     * Accept payments
     */
    function () public payable;
}