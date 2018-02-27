pragma solidity ^0.4.19;

import "./IDCorpMemberAccount.sol";
import "./account/member/MemberAccount.sol";
import "./token/observer/ITokenRepositoryObserver.sol";

/**
 * DCorp Member Account
 * 
 * Password protected account with optional caller 
 * enforcement protection
 *
 * - Store ether
 * - Store ERC20 tokens 
 * - Forward calls
 *
 * #created 14/02/2018
 * #author Frank Bonnet
 */
contract DCorpMemberAccount is MemberAccount, IDCorpMemberAccount {

    // Events
    event Executed(address target, uint value, bytes data);
    event EtherWithdrawn(uint value);
    event TokensWithdrawn(address token, uint value);


    /**
     * Construct the account requiring a hashed passphrase
     *
     * @param _shared Flyweight - shared data
     * @param _passphraseHash Hashed user passphrase
     */
    function DCorpMemberAccount(address _shared, bytes32 _passphraseHash) public 
        MemberAccount(_shared, _passphraseHash) {}


    /**
     * Get the observing address
     *
     * @return Observer
     */
    function getObserver() public view returns (address) {
        return IDCorpMemberAccount(shared).getObserver();
    }


    /**
     * Event handler
     * 
     * Called when a token amount is withdrawn
     *
     * @param _value Amount of wei that was withdrawn
     */
    function onEtherWithdrawn(uint _value) internal {
        EtherWithdrawn(_value);
    }


    /**
     * Event handler
     * 
     * Called when a token amount is withdrawn
     *
     * @param _token ERC20 token that was withdraw from
     * @param _value Amount of tokens that was withdrawn
     */
    function onTokensWithdrawn(address _token, uint _value) internal {
        // Notify
        address observer = IDCorpMemberAccount(shared).getObserver();
        ITokenRepositoryObserver(observer).notifyTokensWithdrawn(
            _token, this, _value);

        // Log
        TokensWithdrawn(_token, _value);
    }


    /**
     * Event handler
     * 
     * Called when calldata is executed
     *
     * @param _target Destination address
     * @param _value Amount of Ether to send
     * @param _data Calldata
     */
    function onExecuted(address _target, uint _value, bytes _data) internal {
        Executed(_target, _value, _data);
    }
}