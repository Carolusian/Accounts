pragma solidity ^0.4.19;

import "../mock/MockToken.sol";

contract ProxyMockDRPUToken is MockToken {
    function ProxyMockDRPUToken() public MockToken("DRP Utility", "DRPU", 8, false) {}
}