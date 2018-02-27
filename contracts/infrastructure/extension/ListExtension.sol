pragma solidity ^0.4.19;

import "../../libraries/system/collection/list/UintList.sol";
import "../../libraries/system/collection/list/AddressList.sol";

/**
 * ListExtension
 *
 * Enhances arrays by decorating them with 
 * the List libaries
 */
contract ListExtension {

    // Decorate
    using UintList for uint[];
    using AddressList for address[];
} 