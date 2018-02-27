pragma solidity ^0.4.19;

/**
 * IDCorpMemberAccount 
 *
 * #created 21/02/2018
 * #author Frank Bonnet
 */
interface IDCorpMemberAccount {

    /**
     * Get the observing address
     *
     * @return Observer
     */
    function getObserver() public view returns (address);
}