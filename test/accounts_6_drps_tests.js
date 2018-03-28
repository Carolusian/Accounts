/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test drps token operations on an account created 
 * through DCORP
 *
 * #created 28/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccount = artifacts.require('DCorpMemberAccount')
var MemberAccountShared = artifacts.require('DCorpMemberAccountShared')
var Observer = artifacts.require('MockTokenRepositoryObserver')
var Token = artifacts.require('MockToken')

// Tools
var BigNumber = require('bignumber.js')
var Web3Factory = require('../modules/web3_factory')

// Modules
var web3 = Web3Factory.create({testrpc: true})
var util = require('../modules/util')
var dcorpUtil = require('../modules/dcorp_util.js')

// Config
var _config = require('../config')
var config = _config.network.test

contract('Accounts (DRPS)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let sharedAccountInstance
  let observerInstance
  let drpsInstance
  let drpuInstance

  // Settings
  let tokenDecimals = 8
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    observerInstance = await Observer.new()
    drpsInstance = Token.at(await dcorpAccountsInstance.drps.call())
    drpuInstance = Token.at(await dcorpAccountsInstance.drpu.call())

    // Register observer
    await drpsInstance.addOwner(observerInstance.address)
    await drpuInstance.addOwner(observerInstance.address)
    await dcorpAccountsInstance.registerObserver(observerInstance.address)

    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
  })

  it('notifies observer when drps tokens are deposited', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 25 * Math.pow(10, tokenDecimals)

    await drpsInstance.setBalance(account, amount)

    let recordCountBefore = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Act
    await drpsInstance.transfer(dispatcherInstance.address, amount, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpsInstance.address)

    let recordCountAfter = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('1')), 'Record was not created')
  })

  it('records increased balance when drps tokens are deposited', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 50 * Math.pow(10, tokenDecimals)
    let balance = 250 * Math.pow(10, tokenDecimals)

    await drpsInstance.setBalance(account, balance)
    await drpsInstance.transfer(dispatcherInstance.address, amount, {from: account})

    // Act
    await dcorpAccountsInstance.updateAccount(
      dispatcherInstance.address, drpsInstance.address)

    let expectedLog = {
      event: 'LoggedDeposit',
      args: {
        repository: dcorpAccountsInstance.address,
        token: drpsInstance.address,
        to: dispatcherInstance.address,
        value: new BigNumber(amount)
      }
    }
  
    // Assert - Event log match
    await util.events.assert(observerInstance, expectedLog)
  })

  it('notifies observer when drps tokens are withdrawn', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 25 * Math.pow(10, tokenDecimals)

    await drpsInstance.setBalance(account, amount)
    await drpsInstance.transfer(dispatcherInstance.address, amount, {from: account})

    let recordCountBefore = new BigNumber(
      await observerInstance.getRecordCount.call())

    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpsInstance.address)
    await sharedAccountInstance.lock(dispatcherInstance.address)

    // Act
    await dispatcherInstance.withdrawTokens(
      drpsInstance.address, amount, passphraseEncoded, passphraseHashed)

    let recordCountAfter = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('2')), 'Record was not created')
  })

  it('records decreased balance when drps tokens are withdrawn', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 50 * Math.pow(10, tokenDecimals)
    let balance = 250 * Math.pow(10, tokenDecimals)

    await drpsInstance.setBalance(account, balance)
    await drpsInstance.transfer(dispatcherInstance.address, balance, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpsInstance.address)
    await sharedAccountInstance.lock(dispatcherInstance.address)

    // Act
    await dispatcherInstance.withdrawTokens(
      drpsInstance.address, amount, passphraseEncoded, passphraseHashed)

    let expectedLog = {
      event: 'LoggedWithdraw',
      args: {
        repository: dcorpAccountsInstance.address,
        token: drpsInstance.address,
        from: dispatcherInstance.address,
        value: new BigNumber(amount)
      }
    }
  
    // Assert - Event log match
    await util.events.assert(observerInstance, expectedLog)
  })

  it('does not allow drps withdraw when the account is not updated', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amountToWithdraw = 500 * Math.pow(10, tokenDecimals)
    let amountToDeposit = 600 * Math.pow(10, tokenDecimals)
    let balance = 2500 * Math.pow(10, tokenDecimals)

    await drpsInstance.setBalance(account, balance)
    await drpsInstance.transfer(dispatcherInstance.address, balance - amountToDeposit, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpsInstance.address)
    await drpsInstance.transfer(dispatcherInstance.address, amountToDeposit, {from: account})
    await sharedAccountInstance.lock(dispatcherInstance.address)

    let accountBalanceBefore = new BigNumber(
      await drpsInstance.balanceOf(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawTokens(
        drpsInstance.address, amountToWithdraw, passphraseEncoded, passphraseHashed)
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 
        'Should not be able withdraw tokens while the account is not updated')
    }

    let accountBalanceAfter = new BigNumber(
      await drpsInstance.balanceOf(dispatcherInstance.address))
  
    // Assert
    assert.isTrue(accountBalanceBefore.eq(accountBalanceAfter), 
      'Token balance should not have changed')
  })
})
