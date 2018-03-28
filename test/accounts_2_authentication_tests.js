/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test account authentication
 * - Password authentication
 * - Caller authentication
 *
 * #created 22/02/2018
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

contract('Accounts (Authentication)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let sharedAccountInstance

  // Settings
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed
  let lockStake
  let node

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
    node = util.config.getAccountValue(config.lock.nodes[0].account)
  })

  beforeEach(async function () {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    lockStake = new BigNumber(await sharedAccountInstance.lockStake.call())
  })

  it('fails autentication when provided a wrong password', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    let newPassphrase = '### New Random Passphrase ###'
    let newPassphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(newPassphrase))
    let newPassphraseHashed = web3.utils.sha3(newPassphraseEncoded)

    let wrongPassphrase = '||| Wrong Passphrase |||'
    let wrongPassphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(wrongPassphrase))

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEtherTo(
        beneficiary, amount, wrongPassphraseEncoded, newPassphraseHashed)
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('resets passphrase', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))
    let newPassphrase = '### Some Random Passphrase ###'
    let newPassphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(newPassphrase))
    let newPassphraseHashed = web3.utils.sha3(newPassphraseEncoded)

    await dispatcherInstance.sendTransaction({
      value: amount})

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})
    await dispatcherInstance.resetPassphrase(passphraseEncoded, newPassphraseHashed)
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})
    await dispatcherInstance.withdrawEtherTo(beneficiary, amount, newPassphraseEncoded, passphraseHashed)

    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(amount)), 
      'Ether was not send from account')
  })

  it('enables 2fa', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})
    await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(beneficiary))

    // Act
    let transaction = await dispatcherInstance.withdrawEther( 
      amount, 
      passphraseEncoded, 
      passphraseHashed,
      {from: beneficiary})

    let transactionCosts = new BigNumber(await util.transaction.getTransactionCost(transaction))
    let accountBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.add(amount).sub(transactionCosts)), 
      'Ether did not arrive at the beneficiary')
  })

  it('enforces 2fa', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 1]
    let other = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})
    await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(beneficiary))

    // Act
    try {
      await dispatcherInstance.withdrawEther( 
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: other})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }

    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(beneficiary))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('disables 2fa', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})   
    await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})
    await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})
    await dispatcherInstance.disable2fa(passphraseEncoded, passphraseHashed, {from: beneficiary})
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
})
