pragma solidity ^0.4.19;

import "../../../libraries/contract/Bytecode.sol";

/**
 * Bytecode
 *
 * Enhances contracts by decorating them with 
 * the bytecode libaries
 */
contract BytecodeExtension {

    // Decorate
    using Bytecode for address;
} 