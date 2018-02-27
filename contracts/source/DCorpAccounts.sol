pragma solidity ^0.4.19;

import "./DCorpMemberAccount.sol";
import "./DCorpMemberAccountShared.sol";
import "./DCorpMemberAccountDispatcher.sol";
import "./token/IToken.sol";
import "./token/observer/ITokenRepositoryObserver.sol";
import "./token/observer/TokenRepositoryObserver.sol";
import "../infrastructure/behaviour/state/Deployable.sol";
import "../infrastructure/behaviour/observer/Observable.sol";

/**
 * DCorpAccounts 
 *
 * Create and manage accounts
 *
 * Observed by DCORP notifies withdraws and deposits
 *
 * #created 13/02/2018
 * #author Frank Bonnet
 */
contract DCorpAccounts is Observable, TokenRepositoryObserver {

    struct Record {
        mapping(address => uint) weight;
        uint index;
    }

    // Created accounts
    mapping(address => Record) private accounts;
    address[] private accountsIndex;

    // Observed tokens
    IToken public drpu;
    IToken public drps;

    // Account data
    DCorpMemberAccountShared public shared;
    address private memberAccountCode;


    // Events
    event AccountCreated(address account);


    /**
     * Require that the account at `_account` is created through 
     * this contract
     *
     * @param _account Location of the account
     */
    modifier only_safe_account(address _account) {
        require(accountsIndex.length > 0 && _account == accountsIndex[accounts[_account].index]);
        _;
    }


     /**
     * Require that `_token` is one of the observed tokens
     *
     * @param _token Token to test against
     */
    modifier only_safe_token(address _token) {
        require(_token == address(drpu) || _token == address(drps));
        _;
    }


    /**
     * Construct the account section
     *
     * @param _drpu 1/2 observed tokens
     * @param _drps 2/2 observed tokens
     * @param _disallowed Addresses that are not allowed as proxy target
     * @param _withdrawFee Percentage of the withdrawn amount that makes up the fee
     * @param _denominator Precesion used to calculate withdraw fee
     * @param _minEthWithdrawAmount Minimum amount to withdraw in wei
     * @param _minTokenWithdrawAmount Minimum amount to withdraw in tokens
     */
    function DCorpAccounts(address _drpu, address _drps, address[] _disallowed, uint _withdrawFee, uint _denominator, uint _minEthWithdrawAmount, uint _minTokenWithdrawAmount) public {
        drpu = IToken(_drpu);
        drps = IToken(_drps);
        shared = new DCorpMemberAccountShared(_disallowed);
        shared.setWithdrawFee(_withdrawFee, _denominator);
        shared.setMinEtherWithdrawAmount(_minEthWithdrawAmount);
        shared.setMinTokenWithdrawAmount(0x0, _minTokenWithdrawAmount);
        shared.transferOwnership(msg.sender);
        memberAccountCode = new DCorpMemberAccount(shared, 0x0);
    }


    /**
     * Gets the amount of registered accounts
     * 
     * @return Amount of accounts
     */
    function getAccountCount() public view returns (uint) {
        return accountsIndex.length;
    }


    /**
     * Gets the accout at `_index`
     * 
     * @param _index The index of the account
     * @return Account location
     */
    function getAccountAtIndex(uint _index) public view returns (address) {
        return accountsIndex[_index];
    }


    /**
     * Gets the combined weight of `_account`
     * 
     * @param _account Account to get the weight from
     * @return Combined weight
     */
    function getAccountWeight(address _account) public view returns (uint) {
        Record storage record = accounts[_account];
        return record.weight[drpu] + record.weight[drps];
    }


    /**
     * Create an account for a member
     *
     * @param _passphraseHash Hashed user passphrase
     * @return Member account
     */
    function createAccount(bytes32 _passphraseHash) public returns (address) {
        address account = new DCorpMemberAccountDispatcher(memberAccountCode, shared, _passphraseHash);
        accounts[account].index = accountsIndex.push(account) - 1;

        AccountCreated(account); // Notify
        return account;
    }


    /**
     * Update the weight of `_account` by reflecting the correct `_token` balance
     *
     * @param _account Account to update
     * @param _token Token to retrieve weight from
     */
    function updateAccount(address _account, address _token) public only_safe_account(_account) only_safe_token(_token) {
        Record storage record = accounts[_account];
        uint recorded = record.weight[_token];

        uint actual = IToken(_token).balanceOf(_account);
        record.weight[_token] = actual;

        if (actual > recorded) {
            _notifyTokenBalanceChanged(_token, _account, actual - recorded, true);
        } else if (actual < recorded) {
            _notifyTokenBalanceChanged(_token, _account, recorded - actual, false);
        }
    }


    /**
     * Returns whether it is allowed to register `_observer` by calling 
     * canRegisterObserver() in the implementing smart-contract
     *
     * @param _observer The address to register as an observer
     * @return Whether the sender is allowed or not
     */
    function canRegisterObserver(address _observer) internal view returns (bool) {

        // TODO: Require observer to be accepted proposal dcorp address

        return isObserver(_observer);
    }


    /**
     * Returns whether it is allowed to unregister `_observer` by calling 
     * canRegisterObserver() in the implementing smart-contract
     *
     * @param _observer The address to unregister as an observer
     * @return Whether the sender is allowed or not
     */
    function canUnregisterObserver(address _observer) internal view returns (bool) {
        return isObserver(_observer);
    }


    /**
     * True if `_token` is being observed as part of the repository. If true, 
     * withdrawn and deposited events are fired
     *
     * @param _token The Token that was deposited to the repository
     * @return Whether token is being observed
     */
    function isObservedToken(address _token) public returns (bool) {
        return _token == address(drpu) || _token == address(drps);
    }


    /**
     * Event handler
     * 
     * Called by `_repository` when `_value` of `_token` is deposited to `_to`
     *
     * @param _repository Repository that received the tokens
     * @param _token Token type that was received
     * @param _to Address that the tokens now belong to
     * @param _value Value of tokens that where received by the repository
     */
    function onTokensDeposited(address _repository, address _token, address _to, uint _value) internal only_safe_account(_repository) {
        if (isObservedToken(_token)) {
            Record storage record = accounts[_repository];
            record.weight[_token] += _value; // Increase weight

            // Notfiy observers
            _notifyTokenBalanceChanged(_token, _to, _value, true);
        }
    }


    /**
     * Event handler
     * 
     * Called by `_repository` when `_value` is withdrawn from `_token` by `_from`
     *
     * @param _repository Repository that the tokens where withdrawn from
     * @param _token Token type that was withdrawn
     * @param _from Address that the tokens used to belong to
     * @param _value Value of tokens that where withdrawn from the repository
     */
    function onTokensWithdrawn(address _repository, address _token, address _from, uint _value) internal only_safe_account(_repository) {
        if (isObservedToken(_token)) {
            Record storage record = accounts[_repository];
            record.weight[_token] -= _value; // Decrease weight

            // Notfiy observers
            _notifyTokenBalanceChanged(_token, _from, _value, false);
        }
    }


    /**
     * Notify observers of a change in the `_token` balance of `_account`
     * 
     * @param _token Token type that was withdrawn
     * @param _account Address that the tokens used to belong to
     * @param _value Value of tokens that where withdrawn from the repository
     */
    function _notifyTokenBalanceChanged(address _token, address _account, uint _value, bool _increase) private {
        for (uint i = 0; i < observerIndex.length; i++) {
            if (_increase) {
                ITokenRepositoryObserver(observerIndex[i]).notifyTokensDeposited(
                    _token, _account, _value);
            } else {
                ITokenRepositoryObserver(observerIndex[i]).notifyTokensWithdrawn(
                    _token, _account, _value);
            }
        } 
    }
}