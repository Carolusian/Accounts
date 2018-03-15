module.exports = {
    network: {
        test: {
            lock: {
                stake: [100, 'finney'],
                duration: [10, 'minutes'],
                nodes: [0]
            },
            withdraw: {
                fee: {
                    precision: 4, // Amount of decimals
                    percentage: 100 // 1%
                },
                min: {
                    ether: [1, 'finney'],
                    tokens: 10 * Math.pow(10, 8)
                }
            },
            token: {
                security: {
                    contract: 'ProxyMockDRPSToken'
                },
                utility: {
                    contract: 'ProxyMockDRPUToken'
                }
            }
        }, 
        main: {
            lock: {
                stake: [100, 'finney'],
                duration: [10, 'minutes'],
                nodes: ['']
            },
            withdraw: {
                fee: {
                    precision: 4, // Amount of decimals
                    percentage: 100 // 1%
                },
                min: {
                    ether: [1, 'finney'],
                    tokens: 10 * Math.pow(10, 8)
                }
            },
            token: {
                security: '0x3e250a4f78410c29cfc39463a81f14a226690eb4',
                utility: '0xe30e02f049957e2a5907589e06ba646fb2c321ba'
            }
        }
    }
}
  