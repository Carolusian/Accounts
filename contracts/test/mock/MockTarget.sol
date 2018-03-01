pragma solidity ^0.4.19;

/**
 * Mock Target for testing only
 *
 * #created 23/02/2018
 * #author Frank Bonnet
 */  
contract MockTarget {

    struct Record {
        address sender;
        uint value;
        bytes data;
        bytes32 param;
    }

    Record[] private records;

    event Called(address sender, uint value);
    event Logged(address sender, uint value);
    event LoggedParam(address indexed sender, uint indexed value, bytes32 indexed param);

    function getRecordCount() public view returns (uint) {
        return records.length;
    }

    function getRecordAt(uint _index) public view returns (address, uint, bytes, bytes32) {
        Record storage r = records[_index];
        return (r.sender, r.value, r.data, r.param);
    }

    function log() public payable {
        records.push(Record(msg.sender, msg.value, msg.data, ""));
        Logged(msg.sender, msg.value);
    }

    function logParam(bytes32 _param) public payable {
        records.push(Record(msg.sender, msg.value, msg.data, _param));
        LoggedParam(msg.sender, msg.value, _param);
    }

    function () public payable {
        Called(msg.sender, msg.value);
    }
}