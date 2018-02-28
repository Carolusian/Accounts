/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test drpu token operations on an account created 
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

contract('Accounts (DRPU)', function (accounts) {
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

  it('notifies observer when drpu tokens are deposited', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 12 * Math.pow(10, tokenDecimals)

    await drpuInstance.setBalance(account, amount)

    let recordCountBefore = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Act
    await drpuInstance.transfer(dispatcherInstance.address, amount, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpuInstance.address)

    let recordCountAfter = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('1')), 'Record was not created')
  })

  it('records increased balance when drpu tokens are deposited', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 122 * Math.pow(10, tokenDecimals)
    let balance = 250 * Math.pow(10, tokenDecimals)

    await drpuInstance.setBalance(account, balance)
    await drpuInstance.transfer(dispatcherInstance.address, amount, {from: account})

    // Act
    await dcorpAccountsInstance.updateAccount(
      dispatcherInstance.address, drpuInstance.address)

    let expectedLog = {
      event: 'LoggedDeposit',
      args: {
        repository: dcorpAccountsInstance.address,
        token: drpuInstance.address,
        to: dispatcherInstance.address,
        value: new BigNumber(amount)
      }
    }
  
    // Assert - Event log match
    await util.events.assert(observerInstance, expectedLog)
  })

  it('notifies observer when drpu tokens are withdrawn', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 53 * Math.pow(10, tokenDecimals)

    await drpuInstance.setBalance(account, amount)
    await drpuInstance.transfer(dispatcherInstance.address, amount, {from: account})

    let recordCountBefore = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Act
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpuInstance.address)
    await dispatcherInstance.withdrawTokens(drpuInstance.address, amount, passphraseEncoded, passphraseHashed)

    let recordCountAfter = new BigNumber(
      await observerInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('2')), 'Record was not created')
  })

  it('records decreased balance when drpu tokens are withdrawn', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = 55 * Math.pow(10, tokenDecimals)
    let balance = 65 * Math.pow(10, tokenDecimals)

    await drpuInstance.setBalance(account, balance)
    await drpuInstance.transfer(dispatcherInstance.address, balance, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpuInstance.address)

    // Act
    await dispatcherInstance.withdrawTokens(
      drpuInstance.address, amount, passphraseEncoded, passphraseHashed)

    let expectedLog = {
      event: 'LoggedWithdraw',
      args: {
        repository: dcorpAccountsInstance.address,
        token: drpuInstance.address,
        from: dispatcherInstance.address,
        value: new BigNumber(amount)
      }
    }
  
    // Assert - Event log match
    await util.events.assert(observerInstance, expectedLog)
  })

  it('does not allow drpu withdraw when the account is not updated', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amountToWithdraw = 444 * Math.pow(10, tokenDecimals)
    let amountToDeposit = 555 * Math.pow(10, tokenDecimals)
    let balance = 2525 * Math.pow(10, tokenDecimals)

    await drpuInstance.setBalance(account, balance)
    await drpuInstance.transfer(dispatcherInstance.address, balance - amountToDeposit, {from: account})
    await dcorpAccountsInstance.updateAccount(dispatcherInstance.address, drpuInstance.address)
    await drpuInstance.transfer(dispatcherInstance.address, amountToDeposit, {from: account})

    let accountBalanceBefore = new BigNumber(
      await drpuInstance.balanceOf(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawTokens(
        drpuInstance.address, amountToWithdraw, passphraseEncoded, passphraseHashed)
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 
        'Should not be able withdraw tokens while the account is not updated')
    }

    let accountBalanceAfter = new BigNumber(
      await drpuInstance.balanceOf(dispatcherInstance.address))
  
    // Assert
    assert.isTrue(accountBalanceBefore.eq(accountBalanceAfter), 
      'Token balance should not have changed')
  })
})
