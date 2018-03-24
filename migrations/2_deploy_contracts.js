var truffle = require('../truffle')
var config = require('../config')
var util = require('../modules/util')

// Contracts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccountShared = artifacts.require('MemberAccountShared')

// Test
var EVM = artifacts.require('EVM')
var ExcludedTarget = artifacts.require('MockTarget')

// Events
var preDeploy = () => Promise.resolve()
var postDeploy = () => Promise.resolve()

const deploy = async function(deployer, network, accounts, config) {

  // Setup
  util.setArtifacts(artifacts)
  util.setAccounts(accounts)

  let drpsTokenAddress, drpuTokenAddress
  let excludedTargets = [drpsTokenAddress, drpuTokenAddress]

  // DRPS
  if (typeof config.token.security === 'string') {
    drpsTokenAddress = config.token.security
  } else {
    let DRPSToken = artifacts.require(config.token.security.contract)
    await deployer.deploy(DRPSToken)
    let drpsToken = await DRPSToken.deployed()
    drpsTokenAddress = drpsToken.address
  }

  // DRPU
  if (typeof config.token.utility === 'string') {
    drpuTokenAddress = config.token.utility
  } else {
    let DRPUToken = artifacts.require(config.token.utility.contract)
    await deployer.deploy(DRPUToken)
    let drpuToken = await DRPUToken.deployed()
    drpuTokenAddress = drpuToken.address
  }

  // Initialization
  if (network == 'develop' || network == 'test') {
    preDeploy = async () => {
      await deployer.deploy(EVM)
      await deployer.deploy(ExcludedTarget)
      let excludedTarget = await ExcludedTarget.deployed()
      excludedTargets.push(excludedTarget.address)
    }
  }

  // Pre-init
  await preDeploy()
  
  // Accounts section
  await deployer.deploy(
    DCorpAccounts, 
    drpsTokenAddress, 
    drpuTokenAddress, 
    util.config.getWeiValue(config.lock.stake),
    util.config.getDurationValue(config.lock.duration),
    excludedTargets,
    config.withdraw.fee.percentage, 
    Math.pow(10, config.withdraw.fee.precision),
    util.config.getWeiValue(config.withdraw.min.ether),
    config.withdraw.min.tokens)

  let dcorpAccounts = await DCorpAccounts.deployed()
  let shared = MemberAccountShared.at(await dcorpAccounts.shared.call())

  // Add trusted nodes
  await Promise.all(config.lock.nodes.map(async node => {
      await shared.addNode(
        util.config.getAccountValue(node.account), 
        node.enabled,
        node.gas, 
        node.withdrawFeeModifier, 
        node.denominator)
  }));

  // Post-init
  await postDeploy()
}

module.exports = function(deployer, network, accounts) {
  return deployer.then(async () => await deploy(deployer, network, accounts, config.network[network]))
}
