/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test the creation of an account through DCORP
 *
 * #created 20/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')

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

contract('Accounts (Create)', function (accounts) {

  // Contracts
  let dcorpAccountsInstance

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
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
})
