pragma solidity ^0.4.19;

/**
 * IObserver
 *
 * Basic observer implementation that allows notifications
 *
 * #created 15/01/2018
 * #author Frank Bonnet
 */
interface IObserver {

    /**
     * Called by the observed smart-contract in order 
     * to notify the token observer
     */
    function notify() public;
}
