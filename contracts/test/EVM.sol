pragma solidity ^0.4.19;

/**
 * EVM properties
 *
 * #created 05/02/2018
 * #author Frank Bonnet
 */  
contract EVM {

   /**
    * Returns the current EVM timestamp
    * 
    * @return Current time
    */  
    function getTimestamp() public view returns (uint) {
        return now;
    }
}