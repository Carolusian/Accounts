pragma solidity ^0.4.19;

import "../../source/token/observer/TokenRepositoryObserver.sol";

/**
 * Mock TokenRepositoryObserver for testing only
 *
 * #created 28/02/2018
 * #author Frank Bonnet
 */  
contract MockTokenRepositoryObserver is TokenRepositoryObserver {

    struct Record {
        address repository;
        address token;
        address to;
        address from;
        uint amount;
        address sender;
    }

    Record[] private records;

    // Events
    event LoggedDeposit(address sender, address repository, address token, address to, uint value);
    event LoggedWithdraw(address sender, address repository, address token, address from, uint value);


    function getRecordCount() public view returns (uint) {
        return records.length;
    }


    function getRecordAt(uint _index) public view returns (address, address, address, address, uint, address) {
        Record storage r = records[_index];
        return (r.repository, r.token, r.to, r.from, r.amount, r.sender);
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
    function onTokensDeposited(address _repository, address _token, address _to, uint _value) internal {
        records.push(Record(_repository, _token, _to, 0x0, _value, msg.sender));
        LoggedDeposit(msg.sender, _repository, _token, _to, _value);
    }


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
    function onTokensWithdrawn(address _repository, address _token, address _from, uint _value) internal {
        records.push(Record(_repository, _token, 0x0, _from, _value, msg.sender));
        LoggedWithdraw(msg.sender, _repository, _token, _from, _value);
    }


    /**
     * True if `_token` is being observed as part of the repository. If true, 
     * withdrawn and deposited events are fired
     *
     * @param _token The Token that was deposited to the repository
     * @return Whether token is being observed
     */
    function isObservedToken(address _token) public returns (bool) {
        return _token != 0x0;
    }
}