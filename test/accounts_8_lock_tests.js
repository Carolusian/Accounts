/* global assert, it, artifacts, contract, before */

/**
 * DCORP accounts tests
 *
 * Test account lock
 * - Require lock for call from account
 * - Don't require lock for call from node
 * - Don't require lock for call when 2fa is enabled
 *
 * #created 15/03/2018
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

contract('Accounts (Lock)', function (accounts) {
  // Misc
  let totalGasUsage

  // Contracts
  let dcorpAccountsInstance
  let dispatcherInstance
  let sharedAccountInstance

  // Settings
  let passphrase = '@@@ Some Random Passphrase @@@'
  let passphraseEncoded
  let passphraseHashed
  let lockStake
  let lockDuration
  let node = accounts[1]

  before(async () => {
    totalGasUsage = new BigNumber(0)
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    passphraseEncoded = web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii(passphrase))
    passphraseHashed = web3.utils.sha3(passphraseEncoded)
    await sharedAccountInstance.addNode(node, true, 0, 1, 1)
  })

  beforeEach(async () => {
    let transaction = await dcorpAccountsInstance.createAccount(passphraseHashed)
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    dispatcherInstance = MemberAccount.at(log.args.account)
    lockStake = new BigNumber(await sharedAccountInstance.lockStake.call())
    lockDuration = new BigNumber(await sharedAccountInstance.lockDuration.call())
  })

  after(() => {
    console.log('Gas used: ' + totalGasUsage.toString())
  })

  it('cannot obtain a lock when an account is already locked', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]
    let other = accounts[accounts.length - 3]

    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake
      })
    ))

    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isTrue(before, 'Account should be locked')

    // Act
    try {
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: other, 
        value: lockStake
      })
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not lock')
    }
  })

  it('node cannot obtain a lock when an account is already locked', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]
    
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake
      })
    ))

    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isTrue(before, 'Account should be locked')

    // Act
    try {
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: node
      })
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not lock')
    }
  })

  it('cannot obtain a lock when the stake is insufficient', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]

    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(before, 'Account should not be locked')

    // Act
    try {
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake.sub(1)
      })
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not lock')
    }

    let after = await sharedAccountInstance.isLocked.call(
      dispatcherInstance.address)

    // Assert
    assert.isFalse(before, 'Account should not be locked')
  })

  it('can obtain a lock with stake', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]

    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(before, 'Account should not be locked')

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake
      })
    ))

    let after = await sharedAccountInstance.isLocked.call(
      dispatcherInstance.address)

    // Assert
    assert.isTrue(after, 'Account should be locked')
  })

  it('node can obtain a lock without stake', async function () {
    // Arrange
    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(before, 'Account should not be locked')

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: node
      })
    ))

    let after = await sharedAccountInstance.isLocked.call(
      dispatcherInstance.address)

    // Assert
    assert.isTrue(after, 'Account should be locked')
  })

  it('lock is registered correctly', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]

    let isLocked = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(isLocked, 'Account should not be locked')

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake
      })
    ))

    let lock = await sharedAccountInstance.getLock.call(
      dispatcherInstance.address)

    // Assert
    assert.equal(lock[0], account, 'Lock owner does not match')
    assert.isTrue(lockStake.eq(lock[2]), 'Lock stake does not match')
  })

  it('node lock is registered correctly', async function () {
    // Arrange
    let isLocked = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(isLocked, 'Account should not be locked')

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: node
      })
    ))

    let lock = await sharedAccountInstance.getLock.call(
      dispatcherInstance.address)

    // Assert
    assert.equal(lock[0], node, 'Lock owner does not match')
    assert.isTrue((new BigNumber(0)).eq(lock[2]), 'Lock stake does not match')
  })

  it('lock can expire', async function () {
    // Arrange
    let account = accounts[accounts.length - 2]

    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {
        from: account, 
        value: lockStake
      })
    ))

    let before = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isTrue(before, 'Account should be locked')

    // Act
    await web3.evm.increaseTimePromise(lockDuration.add('1'))
    await web3.evm.minePromise() // Workaround

    let after = await sharedAccountInstance.isLocked.call(
      dispatcherInstance.address)

    // Assert
    assert.isFalse(after, 'Lock should be expired')
  })

  it('fails autentication when not locked', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({
      value: amount
    })

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: beneficiary})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('node fails autentication when not locked', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({
      value: amount
    })

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: node})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('fails autentication when locked by someone else', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let someone = accounts[accounts.length - 3]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: someone, value: lockStake})))

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: beneficiary})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('node fails autentication when locked by someone else', async function () {
    // Arrange
    let someone = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: someone, value: lockStake})))

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEtherTo(
        someone,
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: node})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('fails autentication when lock was expired', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})))

    await web3.evm.increaseTimePromise(lockDuration.add('1'))
    await web3.evm.minePromise() // Workaround

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    try {
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed,
        {from: beneficiary})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore), 'Ether was send from account')
  })

  it('authenticates when locked', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})))

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed, 
        {from: beneficiary}))
    )
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(amount).sub(lockStake)), 'Ether was not send from account')
  })

  it('2fa authenticates when locked', async function () {
    // Arrange
    let someone = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: someone, value: lockStake})))
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: someone})))
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: someone, value: lockStake})))

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.withdrawEther(amount, passphraseEncoded, passphraseHashed, {from: someone})))
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(amount)), 'Ether was not send from account')
  })

  it('authenticates when locked and called from a node', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: node})))

    let accountBalanceBefore = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.withdrawEtherTo(
        beneficiary,
        amount, 
        passphraseEncoded, 
        passphraseHashed, 
        {from: node})
    ))
    
    let accountBalanceAfter = new BigNumber(
      await web3.eth.getBalancePromise(dispatcherInstance.address))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(amount)), 'Ether was not send from account')
  })

  it('removes lock after authenticating', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: beneficiary, value: lockStake})))

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.withdrawEther(
        amount, 
        passphraseEncoded, 
        passphraseHashed, 
        {from: beneficiary})
    ))
    
    let locked = await sharedAccountInstance.isLocked.call(
        dispatcherInstance.address)

    // Assert
    assert.isFalse(locked, 'Lock should be removed')
  })

  it('authenticates when not locked and with 2fa enabled', async function () {
    // Arrange
    let beneficiary = accounts[accounts.length - 2]
    let account = accounts[accounts.length - 1]
    let amount = new BigNumber(web3.utils.toWei('1', 'ether'))

    await dispatcherInstance.sendTransaction({value: amount})
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await sharedAccountInstance.lock(dispatcherInstance.address, {from: account, value: lockStake})))
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.enable2fa(passphraseEncoded, passphraseHashed, {from: account})))

    let locked = await sharedAccountInstance.isLocked.call(dispatcherInstance.address)
    assert.isFalse(locked, 'Account should not be locked')

    let accountBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let beneficiaryBalanceBefore = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    // Act
    totalGasUsage = totalGasUsage.add(util.transaction.getGasUsed(
      await dispatcherInstance.withdrawEtherTo(
        beneficiary,
        amount, 
        passphraseEncoded, 
        passphraseHashed, 
        {from: account})
    ))
    
    let accountBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(dispatcherInstance.address))
    let beneficiaryBalanceAfter = new BigNumber(await web3.eth.getBalancePromise(beneficiary))

    // Assert
    assert.isTrue(accountBalanceAfter.eq(accountBalanceBefore.sub(amount)), 'Ether was not send from account')
    assert.isTrue(beneficiaryBalanceAfter.eq(beneficiaryBalanceBefore.add(amount)), 'Ether was not send to beneficiary')
  })
})
