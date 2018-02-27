var truffle = require('../truffle')
var config = require('../config')
var util = require('../modules/util')

// Contracts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var DCorpMemberAccountShared = artifacts.require('DCorpMemberAccountShared')

// Test
var EVM = artifacts.require('EVM')

// Events
var preDeploy = () => Promise.resolve()
var postDeploy = () => Promise.resolve()

const deploy = async function(deployer, network, accounts, config) {

  // Setup
  util.setArtifacts(artifacts)
  util.setAccounts(accounts)

  let drpsTokenAddress, drpuTokenAddress

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
    }
  }

  // Pre-init
  await preDeploy()
  
  // Accounts section
  await deployer.deploy(
    DCorpAccounts, 
    drpsTokenAddress, 
    drpuTokenAddress, 
    [drpsTokenAddress, drpuTokenAddress],
    config.withdraw.fee.percentage, 
    Math.pow(10, config.withdraw.fee.precision),
    util.config.getWeiValue(config.withdraw.min.ether),
    config.withdraw.min.tokens)

  // Post-init
  await postDeploy()
}

module.exports = function(deployer, network, accounts) {
  return deployer.then(async () => await deploy(deployer, network, accounts, config.network[network]))
}
