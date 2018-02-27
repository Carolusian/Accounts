pragma solidity ^0.4.19;

import "./IObserver.sol";

/**
 * Observer
 *
 * Basic observer implementation that allows notifications
 *
 * #created 15/01/2018
 * #author Frank Bonnet
 */
contract Observer is IObserver {

    /**
     * Called by the observed smart-contract in order 
     * to notify the token observer
     */
    function notify() public {
        onNotificationReceived(msg.sender);
    }


    /**
     * Event handler
     * 
     * Called by `_sender` when an event occured
     *
     * @param _sender The contract or account called the notify function
     */
    function onNotificationReceived(address _sender) internal;
}
