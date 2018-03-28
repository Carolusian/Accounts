/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test ether operations on an account created 
 * through DCORP
 *
 * #created 20/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccount = artifacts.require('DCorpMemberAccount')
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

contract('Accounts (Ether)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let sharedAccountInstance

  // Settings
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed
  let minEtherWithdrawAmount
  let lockStake
  let node = accounts[1]

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)

    await sharedAccountInstance.addNode(
      node, true, 0, 1, 1)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    minEtherWithdrawAmount = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())

    lockStake = new BigNumber(await sharedAccountInstance.lockStake.call())
  })

  it('accepts incomming ether', async function () {
    // Arrange
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('1', 'ether'))

    let balanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    await dispatcherInstance.sendTransaction({
      value: amount
    })

    let balanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert - Balance increased
    assert.isTrue(balanceAfter.eq(balanceBefore.add(amount)), 'Ether did not arrive in the account')
  })

  it('withdraws ether', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('12', 'ether'))
    
    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let beneficiaryBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(beneficiary))

    // Act
    await dispatcherInstance.withdrawEtherTo(
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed, 
      {from: node})

    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 
      'Ether did not arrive at the beneficiary')
  })

  it('fails to withdraw less than the min amount of ether', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 1]
    let amount = minEtherWithdrawAmount.sub(1)
    
    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEtherTo(
        beneficiary, amount, passphraseEncoded, passphraseHashed, {from: node})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not withdraw')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('Pays withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('12', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    // Act
    let transaction2 = await dispatcherInstance.withdrawEtherTo(
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let transactionCosts = new BigNumber(await util.transaction.getTransactionCost(transaction2))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee).sub(transactionCosts)), 'Ether fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Ether did not arrive at the beneficiary')
  })

  it('Pays increased withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let owner = accounts[0]
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('1', 'ether'))
    let increasedFeePercentage = 120
    let denominator = 100

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    await sharedAccountInstance.updateNode(
      node, true, 0, 1, 1, {from: owner})

    let originalFee = new BigNumber(
      await sharedAccountInstance.calculateWithdrawFee.call(node, amount, false))

    await sharedAccountInstance.updateNode(
      node, true, 0, increasedFeePercentage, denominator, {from: owner})

    let increasedFee = new BigNumber(
      await sharedAccountInstance.calculateWithdrawFee.call(node, amount, false))

    assert.isTrue(increasedFee.eq(originalFee.mul(increasedFeePercentage.toString()).div(denominator.toString())), 
      'Fee is not increased correctly')

    // Act
    let transaction2 = await dispatcherInstance.withdrawEtherTo(
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let transactionCosts = new BigNumber(await util.transaction.getTransactionCost(transaction2))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee).sub(transactionCosts)), 'Ether fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Ether did not arrive at the beneficiary')
  })

  it('Pays discounted withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let owner = accounts[0]
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('1', 'ether'))
    let increasedFeePercentage = 25
    let denominator = 100

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    await sharedAccountInstance.updateNode(
      node, true, 0, 1, 1, {from: owner})

    let originalFee = new BigNumber(
      await sharedAccountInstance.calculateWithdrawFee.call(node, amount, false))

    await sharedAccountInstance.updateNode(
      node, true, 0, increasedFeePercentage, denominator, {from: owner})

    let increasedFee = new BigNumber(
      await sharedAccountInstance.calculateWithdrawFee.call(node, amount, false))

    assert.isTrue(increasedFee.eq(originalFee.mul(increasedFeePercentage.toString()).div(denominator.toString())), 
      'Fee is not increased correctly')

    // Act
    let transaction2 = await dispatcherInstance.withdrawEtherTo(
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let transactionCosts = new BigNumber(await util.transaction.getTransactionCost(transaction2))
    let nodeBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(node))
    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee).sub(transactionCosts)), 'Ether fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Ether did not arrive at the beneficiary')
  })

  it('Omits withdraw fee when 2fa is enabled', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minEtherWithdrawAmount, web3.utils.toWei('111', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})
    await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})

    let beneficiaryBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(beneficiary))

    // Act
    let transaction2 = await dispatcherInstance.withdrawEther( 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: beneficiary})

    let transactionCosts = new BigNumber(await util.transaction.getTransactionCost(transaction2))
    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    // Assert
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(transactionCosts)), 
      'Ether did not arrive at the beneficiary')
  })
})
