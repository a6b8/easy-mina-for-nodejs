import { EasyMina, aggregation } from './../../src/EasyMina.js'
import { MinaDeploy as Deploy }  from './../../src/oracle/Deploy.js'
import { MinaVerify as Verify }  from './../../src/oracle/Verify.js'
import { MinaListen as Listen }  from './../../src/oracle/Listen.js'
import moment from 'moment'


class OracleExample extends aggregation( EasyMina, Deploy, Verify, Listen ) {
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
                    'path': './../build/contracts/Oracle.js',
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
    const oracleExample = new OracleExample()
    await oracleExample.init()
    

    const randomNumber = ( min, max ) => Math.floor( Math.random() * ( max - min + 1 ) + min )
    const seed = randomNumber( 100_000_000, 999_000_000 ) 

    await oracleExample.init()

    await oracleExample.verify( { 
        'userId': 1,
        'seed': seed
    } )

    await oracleExample.transactionEvents( { 
        'search': seed 
    } )

    await oracleExample.close()
    return true
}


main()
    .then( a => console.log( a ) )
    .catch( e => console.log( e ) )