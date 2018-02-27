/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test execute (proxy call) operations on an account created 
 * through DCORP
 *
 * #created 23/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccount = artifacts.require('DCorpMemberAccount')
var Target = artifacts.require('MockTarget')

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

contract('Accounts (Execute)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let targetInstance

  // Settings
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    targetInstance = await Target.new()
  })

  it('can execute a forward call', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = web3.utils.toWei('12', 'ether')

    let recordCountBefore = new BigNumber(
      await targetInstance.getRecordCount.call())

    // Act
    await dispatcherInstance.execute(
      targetInstance.address,
      amount, 
      targetInstance.contract.log.getData(),
      passphraseEncoded, 
      passphraseHashed, 
      {value: amount})

    let recordCountAfter = new BigNumber(
      await targetInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('1')), 'Record was not created')
  })

  it('logs an executed a forward call', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]
    let amount = web3.utils.toWei('1', 'ether')
    let param = 'Test param'
    let paramEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(param))
    let data = targetInstance.contract.logParam.getData(paramEncoded)

    await dispatcherInstance.sendTransaction({
      value: amount
    })

    // Act
    await dispatcherInstance.execute(
      targetInstance.address,
      amount, 
      data,
      passphraseEncoded, 
      passphraseHashed)

    let expectedLog = {
      event: 'LoggedParam',
      args: {
        sender: dispatcherInstance.address,
        value: new BigNumber(amount),
        param: paramEncoded
      }
    }

    // Assert - Event log match
    await util.events.assert(targetInstance, expectedLog)
  })
})
