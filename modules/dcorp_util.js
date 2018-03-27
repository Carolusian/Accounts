var util = require("./util.js");

var getLog = async function(instance, transaction, event) {
  let filter = {
    event: event,
    transactionHash: transaction.receipt.transactionHash
  }

  let logs = await util.events.get(instance, filter)
  return logs[0]
}

_export = {
  accounts: {
    events: {
      created: {
        getLog: async function(instance, transaction) {
          let log = await getLog(instance, transaction, 'AccountCreated')
          return log
        }
      }
    },
    fromTransaction: async function(instance, transaction) {
      let log = await _export.accounts.events.created.getLog(instance, transaction)
      return log.args.account
    }
  },
  account: {
    events: {
      charged: {
        getLog: async function(instance, transaction) {
          let log = await getLog(instance, transaction, 'Charged')
          return log
        }
      }
    }
  },
  targets: {
    events: {
      logged: {
        getLog: async function(instance, transaction) {
          let log = await getLog(instance, transaction, 'Logged')
          return log
        }
      },
      loggedParam: {
        getLog: async function(instance, transaction) {
          let log = await getLog(instance, transaction, 'LoggedParam')
          return log
        }
      }
    }
  }
}

module.exports = _export
