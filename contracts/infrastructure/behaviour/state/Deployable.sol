pragma solidity ^0.4.19;

import "./IDeployable.sol";

/**
 * Deployable
 *
 * Basic implementation of staged deployment
 *
 * #created 16/01/2018
 * #author Frank Bonnet
 */
contract Deployable is IDeployable {

    enum Stages {
        Deploying,
        Deployed
    }

    // Current stage
    Stages private stage = Stages.Deploying;


    /**
     * Require that the proxy is in `_stage` 
     */
    modifier only_at_stage(Stages _stage) {
        require(stage == _stage);
        _;
    }


    /**
     * Returns whether the builder is being deployed
     *
     * @return Whether the builder is in the deploying stage
     */
    function isDeploying() public view returns (bool) {
        return stage == Stages.Deploying;
    }


    /**
     * Returns whether the builder is deployed
     *
     * @return Whether the builder is deployed
     */
    function isDeployed() public view returns (bool) {
        return stage == Stages.Deployed;
    }


    /**
     * Mark deployed 
     */
    function deploy() public only_at_stage(Stages.Deploying) {
        require(canDeploy());
        stage = Stages.Deployed;
    }


    /**
     * Leave it up to the implementing contract to determine 
     * if it can be deployed or not
     */
    function canDeploy() internal view returns (bool);
}
