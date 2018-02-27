pragma solidity ^0.4.18;

import "../infrastructure/dispatcher/SimpleDispatcher.sol";

/**
 * DCorpMemberAccount Dispatcher
 *
 * #created 26/02/2018
 * #author Frank Bonnet
 */
contract DCorpMemberAccountDispatcher is SimpleDispatcher {

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
     * Construct the account requiring a hashed passphrase
     *
     * @param _target Target contract that holds the code
     * @param _shared Flyweight - shared data
     * @param _passphraseHash Hashed user passphrase
     */
    function DCorpMemberAccountDispatcher(address _target, address _shared, bytes32 _passphraseHash) public 
        SimpleDispatcher(_target) {
        shared = _shared;
        passphraseHash = _passphraseHash;
    }
}