pragma solidity ^0.4.19;

/**
 * IAccount 
 * 
 * Password protected account with optional caller 
 * enforcement protection
 *
 * #created 22/02/2018
 * #author Frank Bonnet
 */
interface IAccount {

    /**
     * Replace the hashed passphrase
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function resetPassphrase(bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Calls will only be accepted from `_authorizedAccount` only
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function enable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     * Calls will only be accepted from anyone
     *
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function disable2fa(bytes32 _passphrase, bytes32 _passphraseHash) public;
}