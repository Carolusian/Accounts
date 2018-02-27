pragma solidity ^0.4.19;

/**
 * IDeployable
 *
 * Basic interface for staged deployment
 *
 * #created 16/01/2018
 * #author Frank Bonnet
 */
interface IDeployable {

    /**
     * Returns whether the contract is being deployed
     *
     * @return Whether the contract is in the deploying stage
     */
    function isDeploying() public view returns (bool);


    /**
     * Returns whether the contract is deployed
     *
     * @return Whether the contract is deployed
     */
    function isDeployed() public view returns (bool);


    /**
     * Mark deployed 
     */
    function deploy() public;
}
