pragma solidity ^0.4.19;

/**
 * ITokenAccount
 * 
 * Account capable of withdrawing ERC20 tokens
 *
 * #created 14/02/2018
 * #author Frank Bonnet
 */
interface ITokenAccount {
    
    /**
     * Withdraws `_value` of `_token` into sender
     *
     * @param _token ERC20 token to withdraw from
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokens(address _token, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;


    /**
     *  Withdraws `_value` of `_token` into `_to` 
     *
     * @param _token ERC20 token to withdraw from
     * @param _to Receiving address
     * @param _value Amount to withdraw in tokens
     * @param _passphrase Raw passphrasse 
     * @param _passphraseHash Hash of the new passphrase 
     */
    function withdrawTokensTo(address _token, address _to, uint _value, bytes32 _passphrase, bytes32 _passphraseHash) public;
}
    