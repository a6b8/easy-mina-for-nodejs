import { EasyMina, aggregation } from './../src/EasyMina.js'
import moment from 'moment'


class OracleExample extends aggregation( EasyMina ) {
    constructor() {
        super()
        this.config = {
            'meta': {
                'name': 'hello-world',
                'unix': moment().unix(),
                'format': moment().format()
            },
            'network': {
                'use': 'berkeley', 
                'berkeley': {
                    'node': 'https://proxy.berkeley.minaexplorer.com/graphql',
                    'explorer': {
                        'transaction': 'https://berkeley.minaexplorer.com/transaction/',
                        'wallet': 'https://berkeley.minaexplorer.com/wallet/'
                    },
                    'graphql': 'https://berkeley.graphql.minaexplorer.com',
                    'faucet': 'https://faucet.minaprotocol.com/?address=',
                    'transaction_fee': 100_000_000,
                }
            },
            'contracts': {
                'use': 'oracle',
                'oracle': {
                    'path': './../build/contracts/Oracle.js', // path will be used in "src/EasyMina.js" thats why "./../" is necessary
                    'classes': [ 'OracleExample' ]
                }
            },
            'envs': {
                'deployer': {
                    'use': 'latestAddress', // 'customPath', // 'latestAddress'
                    'customPath': './../../../.env',
                    'public': 'MINA_ACCOUNT_DEVELOPMENT_PUBLIC_KEY',
                    'private': 'MINA_ACCOUNT_DEVELOPMENT_PRIVATE_KEY'
                },
                'contractCreation': {
                    'public': null,
                    'private': null
                },
                'contractTransaction': {
                    'use': 'latestCreation', // | customPath
                    'customPath': '.mina/deploy--1669945776.json',
                    'public': null,
                    'private': null
                }
            },
            'path': {
                'mina': {
                    'folder': '.mina/',
                    'deployers': {
                        'folder': 'deployers/',
                        'folderFull': null,
                        'filename': 'deployer--{{unix}}.json',
                        'full': null
                    },
                    'contracts': {
                        'folder': 'contracts/',
                        'folderFull': null,
                        'filename': 'contract--{{unix}}.json',
                        'full': null
                    }
                }
            },
            'symbols': {
                'neutral': '⬛',
                'onProgress1': '🔄',
                'onProgress2': '🔥',
                'ok1': '🟩',
                'ok2': '🟪',
                'split': '',
                'failed': '❌'
            },
            'oracle': {
                'use': 'demo',
                'demo': {
                    'publicKey': 'B62qoAE4rBRuTgC42vqvEyUqCGhaZsW58SKVW4Ht8aYqP9UTvxFWBgy',
                    'server': 'https://mina-credit-score-signer-pe3eh.ondigitalocean.app/user/{{userId}}'
                }
            },
            'events': {
                'intervalInSeconds': 5,
                'maxInMinutes': 60,
                'filterEventsInMinutes': 60
            }
        }
    }
}



async function main() {
    console.log( 'A' )
    const oracleExample = new OracleExample()
    console.log( 'B' )
    await oracleExample.init()
    console.log( 'C' )
    await oracleExample.close()
    console.log( 'D' )
    return true
}


main()
    .then( a => process.exit( 0 ) )
    .catch( e => process.exit( 1 ) )