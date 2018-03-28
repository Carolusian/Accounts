/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test token operations on an account created 
 * through DCORP
 *
 * #created 23/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccount = artifacts.require('DCorpMemberAccount')
var MemberAccountShared = artifacts.require('DCorpMemberAccountShared')
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

contract('Accounts (Token)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let sharedAccountInstance
  let tokenInstance

  // Settings
  let tokenDecimals = 8
  let minTokenWithdrawAmount
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed
  let lockStake
  let node = accounts[1]

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    tokenInstance = await Token.new('Mock token', 'MTK', tokenDecimals, false)
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
    await sharedAccountInstance.addNode(node, true, 0, 1, 1)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    minTokenWithdrawAmount = new BigNumber(
      await sharedAccountInstance.getMinTokenWithdrawAmount.call(tokenInstance.address))

    lockStake = new BigNumber(await sharedAccountInstance.lockStake.call())
  })

  it('withdraws tokens', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minTokenWithdrawAmount, 25 * Math.pow(10, tokenDecimals))

    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let beneficiaryBalanceBefore = new BigNumber(
      await tokenInstance.balanceOf(beneficiary))

    // Act
    await dispatcherInstance.withdrawTokensTo(
      tokenInstance.address,
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let beneficiaryBalanceAfter = new BigNumber(await tokenInstance.balanceOf(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 
      'Tokens did not arrive at the beneficiary')
  })

  it('fails to withdraw less than the min amount of tokens', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 1]
    let amount = minTokenWithdrawAmount.sub(1)
    
    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let beneficiaryBalanceBefore = new BigNumber(
      await tokenInstance.balanceOf(beneficiary))

    // Act
    try {
      await dispatcherInstance.withdrawTokensTo(
        tokenInstance.address, beneficiary, amount, passphraseEncoded, passphraseHashed, {from: node})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not withdraw')
    }

    let beneficiaryBalanceAfter = new BigNumber(
      await tokenInstance.balanceOf(beneficiary))
    
    // Assert
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore), 'Tokens where send from account')
  })

  it('Pays withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minTokenWithdrawAmount, 2525 * Math.pow(10, tokenDecimals))
    
    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceBefore = new BigNumber(await tokenInstance.balanceOf(beneficiary))

    // Act
    await dispatcherInstance.withdrawTokensTo(
      tokenInstance.address,
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let nodeBalanceAfter = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceAfter = new BigNumber(await tokenInstance.balanceOf(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee)), 'Token fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Tokens did not arrive at the beneficiary')
  })

  it('Pays increased withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let owner = accounts[0]
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minTokenWithdrawAmount, 2525 * Math.pow(10, tokenDecimals))
    let increasedFeePercentage = 130
    let denominator = 100

    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceBefore = new BigNumber(await tokenInstance.balanceOf(beneficiary))

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
    await dispatcherInstance.withdrawTokensTo(
      tokenInstance.address,
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let nodeBalanceAfter = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceAfter = new BigNumber(await tokenInstance.balanceOf(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee)), 'Token fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Tokens did not arrive at the beneficiary')
  })

  it('Pays discounted withdraw fee to node when 2fa is disabled', async function () {
    // Arrange
    let owner = accounts[0]
    let beneficiary = accounts[accounts.length - 2]
    let amount = BigNumber.max(minTokenWithdrawAmount, 2525 * Math.pow(10, tokenDecimals))
    let increasedFeePercentage = 30
    let denominator = 100

    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let nodeBalanceBefore = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceBefore = new BigNumber(await tokenInstance.balanceOf(beneficiary))

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
    await dispatcherInstance.withdrawTokensTo(
      tokenInstance.address,
      beneficiary, 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: node})

    let nodeBalanceAfter = new BigNumber(await tokenInstance.balanceOf(node))
    let beneficiaryBalanceAfter = new BigNumber(await tokenInstance.balanceOf(beneficiary))
    let fee = new BigNumber(await sharedAccountInstance.calculateWithdrawFee.call(node, amount, true))

    // Assert
    assert.isTrue(nodeBalanceAfter.eq(nodeBalanceBefore.add(fee)), 'Token fee did not arrive at the node')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount).sub(fee)), 'Tokens did not arrive at the beneficiary')
  })

  it('Omits withdraw fee when 2fa is enabled', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 1]
    let amount = BigNumber.max(minTokenWithdrawAmount, 500 * Math.pow(10, tokenDecimals))

    await tokenInstance.setBalance(dispatcherInstance.address, amount)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})
    await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})

    let beneficiaryBalanceBefore = new BigNumber(
      await tokenInstance.balanceOf(beneficiary))

    // Act
    await dispatcherInstance.withdrawTokens( 
      tokenInstance.address,
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: beneficiary})

    let beneficiaryBalanceAfter = new BigNumber(
      await tokenInstance.balanceOf(beneficiary))

    // Assert
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount)), 
      'Tokens did not arrive at the beneficiary')
  })
})
