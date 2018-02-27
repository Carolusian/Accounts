pragma solidity ^0.4.19;

import "../mock/MockToken.sol";

contract ProxyMockDRPSToken is MockToken {
    function ProxyMockDRPSToken() public MockToken("DRP Security", "DRPS", 8, false) {}
}