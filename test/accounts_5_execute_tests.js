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
var MemberAccountShared = artifacts.require('DCorpMemberAccountShared')
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
  let sharedAccountInstance
  let targetInstance
  let excludedTargetInstance

  // Settings
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed
  let node = accounts[1]

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    excludedTargetInstance = await Target.deployed()
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
    await sharedAccountInstance.addNode(node, true, 0, 1, 1)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    targetInstance = await Target.new()
  })

  it('can execute a call', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = web3.utils.toWei('12', 'ether')
    let data = targetInstance.contract.log.getData()

    let recordCountBefore = new BigNumber(
      await targetInstance.getRecordCount.call())

    await sharedAccountInstance.lock(
      dispatcherInstance.address, {from: node})

    // Act
    await dispatcherInstance.execute(
      targetInstance.address,
      amount, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node, value: amount})

    let recordCountAfter = new BigNumber(
      await targetInstance.getRecordCount.call())

    // Assert
    assert.isTrue(recordCountAfter.eq(recordCountBefore.add('1')), 'Record was not created')
  })

  it('logs an executed call', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]
    let amount = web3.utils.toWei('1', 'ether')
    let param = 'Test param'
    let paramEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(param))
    let data = targetInstance.contract.logParam.getData(paramEncoded)

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    // Act
    await dispatcherInstance.execute(
      targetInstance.address,
      amount, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

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

  it('does not execute a call to itself', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = web3.utils.toWei('1', 'ether')

    await sharedAccountInstance.lock(
      dispatcherInstance.address, {from: node})

    // Act
    try {
      await dispatcherInstance.execute(
        dispatcherInstance.address,
        amount, 
        0x0,
        passphraseEncoded, 
        passphraseHashed, 
        {from: node, value: amount})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not call')
    }
  })

  it('does not execute a call to an excluded target', async function () {
    // Arrange
    let account = accounts[accounts.length - 1]
    let amount = web3.utils.toWei('1', 'ether')

    await sharedAccountInstance.lock(
      dispatcherInstance.address, {from: node})

    // Act
    try {
      await dispatcherInstance.execute(
        excludedTargetInstance.address,
        amount, 
        0x0,
        passphraseEncoded, 
        passphraseHashed, 
        {from: node, value: amount})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not call')
    }
  })

  it('node charges execution fee', async function () {
    // Arrange
    let balance = web3.utils.toWei('12', 'ether') // Enough to cover the gas
    let account = accounts[accounts.length - 1]
    let data = targetInstance.contract.log.getData()

    // Node uses default values
    await sharedAccountInstance.updateNode(node, true, 1, 1, 1)
    await dispatcherInstance.sendTransaction({value: balance})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let accountBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))

    // Act
    let transaction = await dispatcherInstance.execute(
      targetInstance.address,
      0, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let accountBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))

    let transactionCosts = await util.transaction.getTransactionCost(transaction)
    let log = await dcorpUtil.account.events.charged.getLog(dispatcherInstance, transaction)
    let fee = log.args.fee

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(fee)), 'Fee was not deducted as expected')
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee).sub(transactionCosts)), 'Fee was not received as expected')
  })

  it('node charges increased execution fee', async function () {
    // Arrange
    let balance = web3.utils.toWei('12', 'ether') // Enough to cover the gas
    let account = accounts[accounts.length - 1]
    let data = targetInstance.contract.log.getData()
    let denominator = 100
    let newFee = 150

    // Node charges 100% of the default execution fee
    await dispatcherInstance.sendTransaction({value: balance})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})
    await sharedAccountInstance.updateNode(node, true, denominator, denominator, denominator)

    let transaction1 = await dispatcherInstance.execute(
      targetInstance.address,
      0, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let log1 = await dcorpUtil.account.events.charged.getLog(dispatcherInstance, transaction1)
    let fee1 = new BigNumber(log1.args.fee)

    await sharedAccountInstance.lock(
      dispatcherInstance.address, {from: node})

    // Node charges 150% of the default execution fee
    await sharedAccountInstance.updateNode(
      node, true, newFee, denominator, denominator)
    
    let accountBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))

    // Act
    let transaction2 = await dispatcherInstance.execute(
      targetInstance.address,
      0, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let accountBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))

    let transactionCosts = await util.transaction.getTransactionCost(transaction2)
    let log2 = await dcorpUtil.account.events.charged.getLog(dispatcherInstance, transaction2)
    let fee2 = new BigNumber(log2.args.fee)

    // Assert
    assert.isTrue(fee2.eq(fee1.mul(newFee).div(denominator)), 'Fee was not increased as expected')
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(fee2)), 'Fee was not deducted as expected')
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee2).sub(transactionCosts)), 'Fee was not received as expected')
  })

  it('node charges discounted execution fee', async function () {
    // Arrange
    let balance = web3.utils.toWei('5', 'ether') // Enough to cover the gas
    let account = accounts[accounts.length - 1]
    let data = targetInstance.contract.log.getData()
    let denominator = 100
    let newFee = 75

    // Node charges 100% of the default execution fee
    await dispatcherInstance.sendTransaction({value: balance})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})
    await sharedAccountInstance.updateNode(node, true, denominator, denominator, denominator)

    let transaction1 = await dispatcherInstance.execute(
      targetInstance.address,
      0, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let log1 = await dcorpUtil.account.events.charged.getLog(dispatcherInstance, transaction1)
    let fee1 = new BigNumber(log1.args.fee)

    await sharedAccountInstance.lock(
      dispatcherInstance.address, {from: node})

    // Node charges 150% of the default execution fee
    await sharedAccountInstance.updateNode(
      node, true, newFee, denominator, denominator)
    
    let accountBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))

    // Act
    let transaction2 = await dispatcherInstance.execute(
      targetInstance.address,
      0, 
      data,
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let accountBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))

    let transactionCosts = await util.transaction.getTransactionCost(transaction2)
    let log2 = await dcorpUtil.account.events.charged.getLog(dispatcherInstance, transaction2)
    let fee2 = new BigNumber(log2.args.fee)

    // Assert
    assert.isTrue(fee2.eq(fee1.mul(newFee).div(denominator)), 'Fee was not increased as expected')
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(fee2)), 'Fee was not deducted as expected')
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee2).sub(transactionCosts)), 'Fee was not received as expected')
  })
})
