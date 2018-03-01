/* global assert, it, artifacts, contract, before */

/**
 * DCORP initiation tests
 *
 * Test the creation of an account through DCORP
 *
 * #created 20/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccountShared = artifacts.require('DCorpMemberAccountShared')

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

contract('Accounts (Initiation)', function (accounts) {

  // Contracts
  let dcorpAccountsInstance
  let sharedAccountInstance

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
  })

  it('creates an account through dcorp', async function () {
    // Arrange
    let passphrase = '@@@ Some Random Passphrase @@@'
    let passphraseEncoded = web3.eth.abi.encodeParameter(
      'bytes32', web3.utils.fromAscii(passphrase))

    let accountCountBefore = await dcorpAccountsInstance.getAccountCount.call()

    // Act
    await dcorpAccountsInstance.createAccount(
      web3.utils.sha3(passphraseEncoded))

    let accountCountAfter = await dcorpAccountsInstance.getAccountCount.call()

    // Assert - Account count increased
    assert.isTrue(accountCountBefore.add(1).eq(accountCountAfter),
      'Account count should have been increased')
  })

  it('logs the creation of an account through dcorp', async function () {
    // Arrange
    let passphrase = '@@@ Some Random Passphrase @@@'
    let passphraseEncoded = web3.eth.abi.encodeParameter(
      'bytes32', web3.utils.fromAscii(passphrase))

    // Act
    let transaction = await dcorpAccountsInstance.createAccount(
      web3.utils.sha3(passphraseEncoded))

    // Event - Get event log
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    let expectedLog = {
      event: 'AccountCreated',
      args: {
        account: log.args.account
      }
    }

    // Assert - Event log match
    await util.events.assert(dcorpAccountsInstance, expectedLog)
  })

  it('owner can set min ether withdraw amount', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber(web3.utils.toWei('2', 'ether'))

    let before = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setMinEtherWithdrawAmount(
      newValue, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set min ether withdraw amount', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber(web3.utils.toWei('1', 'ether'))

    let before = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setMinEtherWithdrawAmount(
        newValue, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })
})
