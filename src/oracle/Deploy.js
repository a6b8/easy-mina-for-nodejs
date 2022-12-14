import fs from 'fs'


export class MinaDeploy {
    constructor() {}


    async deploy( { saveFile=true } ) {
        if( !this.state['deployer']['contractCreationEnoughFund']) {
            console.log( `Not enough funds to deploy a smart contract.` )
            process.exit( 1 )
        }

        await this.addVerificationKey()
        !this.silent ? console.log( `Deployment` ) : ''
        const response = await this.deployContract()

        const tt = [ 'deployer', 'contractCreation' ]
            .forEach( key => {
                let name
                let kk
                switch( key ) {
                    case 'deployer':
                        name = 'Payer Wallet'
                        kk = 'payerWallet'
                        break
                    case 'contractCreation':
                        name = 'Contract Wallet'
                        kk = 'contractWallet'
                        break
                }

                const address = this.config['envs'][ key ]['public']
                let m = ''
                m += `${this.config['network'][ this.config['network']['use'] ]['explorer']['wallet']}`
                m += `${address}`
                response[ kk ] = m

                const space = new Array( 27 - name .length ).fill( ' ' ).join( '' )
                !this.silent ? console.log( `  ${name }${space}   ${m}` ) : ''
                return true
            } )

        if( saveFile ) {
            this.deployKeysSave( response )
        } 
        
        return true
    }


    async deployContract() {
        let response = { 'transactionReceipt': null }

        let zkAppResponse = await this.snarkyjs.fetchAccount( { 
            'publicKey': this.encoded['contractCreation']['address'].toPublicKey()
        } )

        let isDeployed = zkAppResponse.error == null

        if( isDeployed ) {
            console.log( `  Error                      ${this.config['symbols']['failed']} is already deployed` )
        } else {
            if( this.verificationKey === undefined ) {
                console.log()
                console.log( `${this.config['symbols']['failed']} Verfication Key is undefined` )
            }

            let fee = this.config['network'][ this.config['network']['use'] ]['transaction_fee']
            !this.silent ? process.stdout.write( `  Fund new account           ` ) : ''

            let transaction = await this.snarkyjs.Mina.transaction(
                {
                    'feePayerKey': this.encoded['deployer']['address'], 
                    'fee': fee
                },
                () => {
                    this.snarkyjs.AccountUpdate
                        .fundNewAccount( this.encoded['deployer']['address'] )

                    this.encoded['contractCreation']['zkApp'].deploy( {
                        'zkappKey': this.encoded['contractCreation']['address'], 
                        // 'verificationKey': this.verificationKey 
                    } )

                    this.encoded['contractCreation']['zkApp'].init( 
                        this.encoded['contractCreation']['address'] 
                    )
                }
            )

            let mmm = ''
            mmm += `${this.config['symbols']['ok1']} `
            mmm += `${fee} > `
            mmm += `${this.shrinkAddress( this.config['envs']['deployer']['public'] )}`

            !this.silent ? console.log( `${mmm}` ) : ''
            !this.silent ? process.stdout.write( `  Transaction Receipt        ` ) : ''

            let hash
            try {
                await transaction.prove()
                transaction.sign( [ this.encoded['contractCreation']['address'] ] )

                const res = await transaction.send()
                hash = await res.hash()
            } catch( e ) {
                !this.silent ? console.log( `${this.config['symbols']['failed']} ... ${ (e + '').substring(0, 250 ).replaceAll("\n", ' ' )}` ) : ''
            }

            let m
            if( hash == null ) {
                m = `Error sending transaction`
                !this.silent ? console.log( `                             ${this.config['symbols']['failed']} ${m}` ) : ''
            } else {
                m = `${this.config['network'][ this.config['network']['use'] ]['explorer']['transaction']}${hash}`
                !this.silent ? console.log( `${this.config['symbols']['ok1']} ${m}` ) : ''
            }
            response['transactionReceipt'] = m
        }

        return response
    }


    deployKeysSave( response ) {
        !this.silent ? process.stdout.write( `  Save Keys                  ` ) : ''
        const json = {
            'name': this.config['meta']['name'],
            'time': {
                'unix': this.config['meta']['unix'],
                'format': this.config['meta']['format']
            },
            'smartContract': {
                'source': this.config['contracts'][ this.config['contracts']['use'] ]['path'],
                'name':  this.config['contracts'][ this.config['contracts']['use'] ]['classes'][ 0 ]
            },
            'deployer': {
                'private': this.config['envs']['deployer']['private'],
                'public': this.config['envs']['deployer']['public']
            },
            'contract': {
                'private': this.config['envs']['contractCreation']['private'],
                'public': this.config['envs']['contractCreation']['public']
            },
            'explorer': { ...response },
            'verificationKey': { ...this.verificationKey }
        }

        if( !fs.existsSync( this.config['path']['mina']['contracts']['folder'] ) ) {
            fs.mkdirSync( this.config['path']['mina']['contracts']['folder'] )
        }

        fs.writeFileSync( 
            this.config['path']['mina']['contracts']['full'], 
            JSON.stringify( json, null, 4 ), 
            'utf-8'
        )

        !this.silent ? console.log( `${this.config['symbols']['ok1']} ${this.config['path']['mina']['contracts']['full']}` ) : ''
    }
}