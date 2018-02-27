pragma solidity ^0.4.19;

import "../../libraries/system/collection/linq/UintLinq.sol";
import "../../libraries/system/collection/linq/AddressLinq.sol";

/**
 * ListExtension
 *
 * Enhances arrays by decorating them with 
 * the Linq libaries
 */
contract LinqExtension {

    // Decorate
    using UintLinq for uint[];
    using AddressLinq for address[];
} 