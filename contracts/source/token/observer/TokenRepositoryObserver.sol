pragma solidity ^0.4.19;

import "./ITokenRepositoryObserver.sol";

/**
 * Token repository observer (abstract)
 *
 * Allows observers to be notified by an observed token repository smart-contract
 * when tokens are deposited or withdrawn
 *
 * #created 07/11/2017
 * #author Frank Bonnet
 */
contract TokenRepositoryObserver is ITokenRepositoryObserver {

    /**
     * Called by the observed token smart-interface in order 
     * to notify the token observer when tokens are deposited
     *
     * @param _token The Token that was deposited to the repository
     * @param _to The address that the tokens now belong to
     * @param _value The amount of tokens that was received
     */
    function notifyTokensDeposited(address _token, address _to, uint _value) public {
        if (isObservedToken(_token)) {
            onTokensDeposited(msg.sender, _token, _to, _value);
        }
    }


    /**
     * Called by the observed token smart-interface in order 
     * to notify the token observer when tokens are withdrawn
     *
     * @param _token The Token that was deposited to the repository
     * @param _from The address that the tokens used to belong to
     * @param _value The amount of tokens that was withdrawn
     */
    function notifyTokensWithdrawn(address _token, address _from, uint _value) public {
        if (isObservedToken(_token)) {
            onTokensWithdrawn(msg.sender, _token, _from, _value);
        }
    }


    /**
     * Event handler
     * 
     * Called by the repository when a token amount is received
     *
     * @param _repository The repository that received the tokens
     * @param _token The token type that was received
     * @param _to The address that the tokens now belong to
     * @param _value The value of tokens that where received by the repository
     */
    function onTokensDeposited(address _repository, address _token, address _to, uint _value) internal;


    /**
     * Event handler
     * 
     * Called by the repository when a token amount is withdrawn
     *
     * @param _repository The repository that the tokens where withdrawn from
     * @param _token The token type that was withdrawn
     * @param _from The address that the tokens used to belong to
     * @param _value The value of tokens that where withdrawn from the repository
     */
    function onTokensWithdrawn(address _repository, address _token, address _from, uint _value) internal;


    /**
     * True if `_token` is being observed as part of the repository. If true, 
     * withdrawn and deposited events are fired
     *
     * @param _token The Token that was deposited to the repository
     * @return Whether token is being observed
     */
    function isObservedToken(address _token) public returns (bool);
}
