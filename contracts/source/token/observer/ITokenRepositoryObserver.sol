pragma solidity ^0.4.19;

/**
 * Token repository observer interface
 *
 * Allows a token repository smart-interface to notify observers 
 * when tokens are deposited or withdrawn
 *
 * #created 16/02/2018
 * #author Frank Bonnet
 */
interface ITokenRepositoryObserver {

    /**
     * Called by the observed token smart-interface in order 
     * to notify the token observer when tokens are deposited
     *
     * @param _token Token that was deposited to the repository
     * @param _to Address that the tokens now belong to
     * @param _value Amount of tokens that was received
     */
    function notifyTokensDeposited(address _token, address _to, uint _value) public;


    /**
     * Called by the observed token smart-interface in order 
     * to notify the token observer when tokens are withdrawn
     *
     * @param _token Token that was deposited to the repository
     * @param _from Address that the tokens used to belong to
     * @param _value Amount of tokens that was withdrawn
     */
    function notifyTokensWithdrawn(address _token, address _from, uint _value) public;


    /**
     * True if `_token` is being observed as part of the repository. If true, 
     * withdrawn and deposited events are fired
     *
     * @param _token The Token that was deposited to the repository
     * @return Whether token is being observed
     */
    function isObservedToken(address _token) public returns (bool);
}
