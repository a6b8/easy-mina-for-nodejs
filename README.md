<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/custom/mina-quickstart.svg" height="45px" alt="Mina Quickstart" name="# Mina Quickstart">
</a>

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/examples.svg" height="45px" alt="Examples" name="examples">
</a>

In the following examples we use an off chain oracle contract to test EasyMina.js


## Deploy Contract
0. Setup your environment
> See [Setup](#setup) for more Informations

1. Download modules and compile typescript.
```
node install && tsc
```

2. Run node 
```
node example/oracle/1-deploy.js
```

3. Wait for confirmation.
```
Contract Creation
  Listen                     🟩 success! ...
```

## Send Transaction
0. Setup your environment
> See [Setup](#setup) for more Informations  
  

1. Download modules and compile typescript.
```
node install && tsc
```

2. Run node 
```
node example/oracle/2-verify.js
```

3. Wait for confirmation.
```
Event Transaction
  Listen                     🟩 success! ...
```







<br>

<br>

<a href="#headline">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/table-of-contents.svg" height="45px" name="table-of-contents" alt="Table of Contents">
</a>
<br>

1. [Examples](#examples)<br>
2. [Setup](#setup)
3. [Config](#config)<br>
4. [Contributing](#contributing)<br>
5. [Limitations](#limitations)<br>
6. [Credits](#Credits)<br>
7.  [License](#license)<br>
8.  [Code of Conduct](#code-of-conduct)<br>
11. [Support my Work](#support-my-work)<br>

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/setup.svg" height="45px" name="setup" alt="Setup">
</a>

## Environment keys

your ```.env```
```
MINA_ACCOUNT_DEVELOPMENT_PRIVATE_KEY=EK...
MINA_ACCOUNT_DEVELOPMENT_PUBLIC_KEY=B62...
```


modify ```this.config``` and change ```'use'``` to ```'customPath'```
```js
this.config = {
    ...
    'envs': {
        'deployer': {
            'use': 'customPath',
            'customPath': '.env',
            'public': 'MINA_ACCOUNT_DEVELOPMENT_PUBLIC_KEY',
            'private': 'MINA_ACCOUNT_DEVELOPMENT_PRIVATE_KEY'
        },
        ...
    }
    ...
}
```


## Generate keys

1. Download packages  
```
npm install
```

2. Setup environment and generate deployment keys  
  Your keys will randomly created under `.mina/deployer/`.

```
node 0-generate-keys.js
```

3. Get test tokens  
On your console you will find a deeplink to get free test tokens.  
> ❌ Account does not exist: https://faucet.minaprotocol.com/?address=...

4. Click to "Request"  
  
5. Wait for confirmation

> Success. Testnet Mina will arrive at your address when the next block is produced (~3 min).
View your transaction on https://berkeley.minaexplorer.com/transaction/your_public_key...

6. Try again

```
node 0-generate-keys.js
```


you should see a green mark in fron of your deployer address. Your nonce should be `0` and your have funds for `490` transactions

> Deployer<br>
>    Account                  🟩 B62qmzLL...fFTP, (0), Balance: 49000000000 (490 left)


<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/config.svg" height="45px" alt="Config" name="config">
</a>  

Setting up  ```this.config```

```js
import { EasyMina, aggregation } from './../../src/EasyMina.js'
import moment from 'moment'


class YourClass extends aggregation( EasyMina ) {
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
                    'path': './../build/contracts/YourContract.js',
                    'classes': [ 'YourContract' ]
                }
            },
            'envs': {
                'deployer': {
                    'use': 'latestAddress', // 'customPath', // 'latestAddress'
                    'customPath': '.env',
                    'public': 'MINA_ACCOUNT_DEVELOPMENT_PUBLIC_KEY',
                    'private': 'MINA_ACCOUNT_DEVELOPMENT_PRIVATE_KEY'
                },
                'contractCreation': {
                    'public': null,
                    'private': null
                },
                'contractTransaction': {
                    'use': 'latestCreation', // | customPath
                    'customPath': '.mina/deploy--yourTimestamp.json',
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
            }
        }


        async start() {
            /* ---->
                Your Code
            <------ */

            return true
        }

    }
}


async function main() {
    const yourClass = new YourClass()
    await yourClass.init()
    await yourClass.start()
}


main()
    .then( a => console.log( a ) ) 
    .catch( e => console.log( e ) )

```


<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/contributing.svg" height="45px" alt="Contributing" name="contributing">
</a>

Bug reports and pull requests are welcome on GitHub at https://github.com/a6b8/easy-mina. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [code of conduct](https://github.com/a6b8/easy-mina/blob/master/CODE_OF_CONDUCT.md).

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/limitations.svg" height="45px" name="limitations" alt="Limitations">
</a>

- Proof of Concept, not battle-tested.

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/credits.svg" height="45px" name="credits" alt="Credits">
</a>

EasyMina is based on the examples of jackryanservia
- jackryanservia/oracle-example https://github.com/jackryanservia/oracle-example
- jackryanservia/mina-credit-score-signer https://github.com/jackryanservia/mina-credit-score-signer

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/license.svg" height="45px" alt="License" name="license">
</a>

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

<br>

<a href="#table-of-contents">
<img src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/code-of-conduct.svg" height="45px" alt="Code of Conduct" name="code-of-conduct">
</a>

Everyone interacting in the AsciiToSvg project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/a6b8/easy-mina/blob/master/CODE_OF_CONDUCT.md).

<br>

<a href="#table-of-contents">
<img href="#table-of-contents" src="https://raw.githubusercontent.com/a6b8/a6b8/main/assets/headlines/default/star-us.svg" height="45px" name="star-us" alt="Star us">
</a>

Please ⭐️ star this Project, every ⭐️ star makes us very happy!