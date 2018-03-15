pragma solidity ^0.4.19;

import "./IDCorpMemberAccount.sol";
import "./account/member/MemberAccountShared.sol";

/**
 * DCorpMemberAccountShared 
 *
 * FlyWeight - Shared data to reduce the memory
 * footprint of the member account contracts
 *
 * #created 14/03/2018
 * #author Frank Bonnet
 */
contract DCorpMemberAccountShared is MemberAccountShared, IDCorpMemberAccount {

    // Listener
    address public observer;


    /**
     * Construct shared data - FlyWeight
     *
     * @param _lockStake Min amount of wei required to obtain a lock
     * @param _lockDuration Time that a lock is valid
     * @param _disallowedProxyTargets Addresses that are not allowed as proxy target
     */
    function DCorpMemberAccountShared(uint _lockStake, uint _lockDuration, address[] _disallowedProxyTargets) public 
        MemberAccountShared(_lockStake, _lockDuration, _disallowedProxyTargets) {
        observer = msg.sender;
    }


    /**
     * Get the observing address
     *
     * @return Observer
     */
    function getObserver() public view returns (address) {
        return observer;
    }
}