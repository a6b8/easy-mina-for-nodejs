import fs from 'fs'
import { 
    isReady, 
    shutdown, 
    Mina, 
    AccountUpdate,
    PrivateKey, 
    fetchAccount
} from 'snarkyjs'


export function aggregation( baseClass, ...mixins ) {
    class base extends baseClass {
        constructor( ...args ) {
            super( ...args )
            mixins
                .forEach( ( mixin ) => {
                    copyProps( this, ( new mixin ) )
                } )
        }
    }


    let copyProps = ( target, source ) => {  // this function copies all properties and symbols, filtering out some special ones
        Object
            .getOwnPropertyNames( source )
            .concat( Object.getOwnPropertySymbols( source ) )
            .forEach( ( prop ) => {
                if( !prop.match( /^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/ ) )
                Object.defineProperty( target, prop, Object.getOwnPropertyDescriptor( source, prop ) )
            } )
    }

    mixins
        .forEach( ( mixin ) => { // outside contructor() to allow aggregation(A,B,C).staticFunction() to be called etc.
            copyProps( base.prototype, mixin.prototype )
            copyProps( base, mixin )
        } )

    return base
}


export class EasyMina {
    constructor() {
        // super()
    }

    async init( silent=false ) {
        this.silent = silent
        this.SmartContract
        this.verificationKey
        this.snarkyjs

        this.encoded = {
            'deployer': {
                'address': null
            },
            'contractCreation': {
                'address': null,
                'zkApp': null
            },
            'contractTransaction': {
                'address': null,
                'zkApp': null
            }
        }

        this.state = {
            'deployer': {},
            'contract': {},
            'time': {
                'start': null
            }
        }

        this.state['time']['start'] = new Date()

        const n = [ 'deployers', 'contracts' ]
            .forEach( key => {
                const filename = this.config['path']['mina'][ key ]['filename']
                    .replace( /{{unix}}/, this.config['meta']['unix'] )
    
                let path = ''
                path += `${this.config['path']['mina']['folder']}`
                path += `${this.config['path']['mina'][ key ]['folder']}`

                this.config['path']['mina'][ key ]['folderFull'] = path 
                path += `${filename}`
                this.config['path']['mina'][ key ]['full'] = path
            } )

        !this.silent ? console.log( 'Init' ) : ''

        this.addEnvironment()
        await this.addSnarkyjs()
        await this.addNetwork()
        this.addMinaCleanUp()
        this.addDeployer()
        this.addAddresses()
        await this.addContract()

        !this.silent ? console.log( 'State' ) : ''
        await this.stateDeployer()
        await this.stateContract()

        return true
    }


    addEnvironment() {
        !this.silent ? process.stdout.write( '  Add Environment            ' ) : ''

        let created = false
        const n = [ 'deployers', 'contracts' ]
            .forEach( key => {
                // console.log( this.config['path']['mina'] )
                if( !fs.existsSync( this.config['path']['mina'][ key ]['folderFull'] ) ) {
                    created = true
                    fs.mkdirSync(
                        this.config['path']['mina'][ key ]['folderFull'], 
                        { 
                            'recursive': true 
                        }
                    )
                }
            } )

        let m = ''
        m += `${this.config['symbols']['ok1']} `
        m += `${created ? 'created: ': 'folders exist: ' }${this.config['path']['mina']['folder']}`
        !this.silent ? console.log( `${m}` ) : ''
        return true
    }


    addDeployer() {
        !this.silent ? process.stdout.write( '  Add Deployer               ' ) : ''

        switch( this.config['envs']['deployer']['use'] ) {
            case 'latestAddress':
                let files = fs.readdirSync( this.config['path']['mina']['deployers']['folderFull'] )
                files = files.filter( a => a.endsWith( '.json' ) )
                if( files.length === 0 ) {
                    const result = this.generateAddress()

                    const filename = this.config['path']['mina']['deployers']['filename']
                        .replace( /{{unix}}/, this.config['meta']['unix'] )

                    const path = `${this.config['path']['mina']['deployers']['folderFull']}/${filename}`
                    fs.writeFileSync( path, JSON.stringify( result, null, 4 ), 'utf-8' )
                    files = fs.readdirSync( this.config['path']['mina']['deployers']['folderFull'] )
                }

                const timestamps = files
                    .filter( a => a.endsWith( '.json' ) )
                    .map( a => {
                        const cc = {
                            'original': a,
                            'timestamp': parseInt( a.split( '--' )[ 1 ].split( '.' )[ 0 ] )
                        }
                        return cc
                    } )
                    .sort( ( a, b ) => b['timestamp'] - a['timestamp'] )
        
                const pathFile = `${this.config['path']['mina']['deployers']['folderFull']}${timestamps[ 0 ]['original']}`
                const json = JSON.parse( fs.readFileSync( pathFile, 'utf-8' ) )

                this.config['envs']['deployer'] = [ 'public', 'private' ]
                    .reduce( ( acc, key, index ) => {
                        if( index === 0 ) {
                            acc = { ...this.config['envs']['deployer'] }
                        }
                        acc[ key ] = json['deployer'][ key ]
                        return acc
                    }, {} )
                break
            case 'customPath': 
                const search = [ 'public', 'private' ]
                    .map( key => [ this.config['envs']['deployer'][ key ], key ] )
        
                const secrets = fs.readFileSync( this.config['envs']['deployer']['customPath'], 'utf-8' )
                    .split( "\n" )
                    .filter( a => a != '' )
                    .reduce( ( acc, a, index ) => {
                        const [ key, value ] = a.split( '=' )
        
                        const result = search
                            .filter( a => a[ 0 ] === key )
        
                        if( result.length > 0 ) {
                            acc[ result[ 0 ][ 1 ] ] = value
                        }
        
                        return acc
                    }, {} )
        
                this.config['envs']['deployer'] = search
                    .reduce( ( acc, a, index ) => {
                        const key = a[ 1 ]
                        if( index === 0 ) {
                            acc['path'] = this.config['envs']['deployer']['path']
                        }
                        acc[ key ] = secrets[ key ]
        
                        return acc
                    }, {} )
            default:
                this.silent ? console.log(  `${this.config['symbols']['failed']} not found deployer keys.` ) : ''
                break
        }

        this.encoded['deployer']['address'] = this.snarkyjs.PrivateKey
            .fromBase58( this.config['envs']['deployer']['private'] )

        let m = ''
        m += `${this.config['symbols']['ok1']} `
        m += `${this.config['network'][ this.config['network']['use'] ]['explorer']['wallet']}`
        m += `${this.config['envs']['deployer']['public']}`

        !this.silent ? console.log( `${m}` ) : ''

        return true
    }


    addAddresses() {
        !this.silent ? process.stdout.write( '  Add Contract Addresses     ' ) : ''
        
        // contractCreation
        this.config['envs']['contractCreation']['private'] = this.snarkyjs.PrivateKey
            .random()
            .toBase58()

        this.config['envs']['contractCreation']['public'] = this.snarkyjs.PrivateKey
            .fromBase58( this.config['envs']['contractCreation']['private'] )
            .toPublicKey()
            .toBase58()

        let pathFile
        switch( this.config['envs']['contractTransaction']['use'] ) {
            case 'latestCreation':
                if( !fs.existsSync( this.config['path']['mina']['contracts']['folderFull'] ) ) {
                    // console.log( `Folder: ${this.config['path']['mina']['contracts']['folderFull']} not found.` )
                    !this.silent ? console.log( `${this.config['symbols']['failed']}` ) : ''
                } else {
                    let files = fs.readdirSync( this.config['path']['mina']['contracts']['folderFull'] )
                    files = files
                        .filter( a => a.endsWith( '.json' ) )

                    if( files.length === 0 ) {
                        // let m = ''
                        // m += `${this.config['symbols']['failed']}`
                        // m += ` No files found at "${this.config['path']['mina']['contracts']['folderFull']}", deploy first.`
                        // console.log( m )
                        break
                    }

                    const timestamps = files
                        .filter( a => a.indexOf() )
                        .map( a => {
                            const cc = {
                                'original': a,
                                'timestamp': parseInt( a.split( '--' )[ 1 ].split( '.' )[ 0 ] )
                            }
                            return cc
                        } )
                        .sort( ( a, b ) => b['timestamp'] - a['timestamp'] )
            
                    pathFile = `${this.config['path']['mina']['contracts']['folderFull']}${timestamps[ 0 ]['original']}`
                }

                break
            case 'customPath':
                pathFile = this.config['envs']['contractTransaction']['customPath']
                break
            default:
                break
        }

        this.encoded['contractCreation']['address'] = this.snarkyjs.PrivateKey
            .fromBase58( this.config['envs']['contractCreation']['private'] )
            
        if( pathFile !== undefined ) {
            const latestContractKeys = JSON.parse( fs.readFileSync( pathFile, 'utf-8' ) )
            this.config['envs']['contractTransaction']['private'] = latestContractKeys['contract']['private']
            this.config['envs']['contractTransaction']['public'] = latestContractKeys['contract']['public']
        } else {
            this.config['envs']['contractTransaction']['private'] = this.encoded['contractCreation']['address']
                .toBase58()
            this.config['envs']['contractTransaction']['public'] = this.encoded['contractCreation']['address']
                .toPublicKey()
                .toBase58()
        }

        this.encoded['contractTransaction']['address'] = this.snarkyjs.PrivateKey
            .fromBase58( this.config['envs']['contractTransaction']['private'] )

        const n = [ 'contractTransaction', 'contractCreation' ]
            .forEach( ( key, index ) => {
                let m = ''
                let space = ''

                if( index === 0 ) {
                    m += `${this.config['symbols']['ok1']} `
                    m += `${this.config['network'][ this.config['network']['use'] ]['explorer']['wallet']}`
                    m += `${this.config['envs'][ key ]['public']}`
                    // !this.silent ? console.log( `${this.config['symbols']['ok1']}` ) : ''
                } else {
                    space = `                             ${this.config['symbols']['ok1']} `
                    m += `${this.config['network'][ this.config['network']['use'] ]['explorer']['wallet']}`
                    m += `${this.config['envs'][ key ]['public']}`
                }

                switch( key ) {
                    case 'contractTransaction':
                        m += ` (cT)`
                        break
                    case 'contractCreation':
                        m += ` (cC)`
                        break
                }

                let additional = ''
                if( ( key === 'contractTransaction' ) && ( pathFile === undefined ) ) {
                    m = ``
                    m += `${this.config['symbols']['onProgress1']} `
                    m += `${this.shrinkAddress( this.config['envs'][ key ]['public'] )} `
                    m += `(${key}) `
                    m += ` key not found, reused "contractCreation" key.`
                   // additional += `${this.config['symbols']['onProgress1']} key not found, reused "contractCreation" key.`
                }

                console.log( `${space}${m}` )
            } )

        return true
    }


    async addSnarkyjs() {
        !this.silent ? process.stdout.write( `  Snarkyjs                   ` ) : ''
        // this.config['contract']['random'] = this.snarkyjs.PrivateKey.random()

        this.snarkyjs = await import( 'snarkyjs' )
        // await snarkyjs.isReady
        await this.snarkyjs.isReady

        /*
            this.encoded['deployer']['address'] = this.snarkyjs.PrivateKey
                .fromBase58( this.config['envs']['deployer']['private'] )

            this.zkAppPrivateKey = this.snarkyjs.PrivateKey
                .fromBase58( this.config['contract']['address'] )
        */

        !this.silent ? console.log( `${this.config['symbols']['ok1']} ready.` ) : ''
    }


    async addNetwork() {
        !this.silent ? process.stdout.write( `  Add Network                ` ) : ''

        switch( this.config['network']['use'] ) {
            case 'berkeley':
                const node = this.config['network'][ this.config['network']['use'] ]['node'] 
                const Berkeley = this.snarkyjs.Mina.BerkeleyQANet( node )
                this.snarkyjs.Mina.setActiveInstance( Berkeley )
        
                this.snarkyjs.fetchAccount( { 
                    'publicKey': this.config['envs']['deployer']['public']
                } )
                !this.silent ? console.log( `${this.config['symbols']['ok1']} berkeley: ${node}` ) : ''

                break
            default:
                break
        }

        return true
    }


    addMinaCleanUp() {
        [ 
            `exit`, 
            `SIGINT`,
            `SIGUSR1`,
            `SIGUSR2`,
            `uncaughtException`,
            `SIGTERM`
        ]
            .forEach( ( eventType ) => {
                process.on( 
                    eventType, 
                    async() => { this.snarkyjs.shutdown() } 
                )
            } )
    }


    async stateDeployer() {
        const status = {
            'deployerAccountExist': false,
            'deployerBalance': -1,
            'contractCreationEnoughFund': false,
            'writeEnoughFund': false,
            'deploy': false,
            'write': false,
            'read': false
        }

        !this.silent ? console.log( `  Deployer` ) : ''
        !this.silent ? process.stdout.write( `    Account                  ` ) : ''

        let m = null
        let result = null

        try{
            let response = await this.snarkyjs.fetchAccount( { 
                'publicKey': this.config['envs']['deployer']['public']
            } )

            status['deployerAccountExist'] = response.error == null
            if( status['deployerAccountExist'] ) {

                const account = response.account
                status['deployerBalance'] = parseInt( account.balance )
                const fee = this.config['network'][ this.config['network']['use'] ]['transaction_fee']
                const left = Math.floor(status['deployerBalance'] / fee )
                status['contractCreationEnoughFund'] = (left >= 1) ? true : false
                status['writeEnoughFund'] = (left >= 1) ? true : false

                m = ''
                m += `${this.config['symbols']['ok1']} `
                m += `${this.shrinkAddress( this.config['envs']['deployer']['public'] )}, `
                m += `(${account.nonce}), `
                m += `Balance: ${status['deployerBalance']} `
                m += `(${left} left)`
            } else {
                m = ''
                m += `${this.config['symbols']['failed']} `
                m += 'Account does not exist: '
                // m += `${this.config['network'][ this.config['network']['use'] ]['faucet']}`
                // m += `${this.config['envs']['deployer']['public']}`
            }
        } catch( e ) {
            m = ''
            m += `${this.config['symbols']['failed']} `
            m += `Error ${e}`
        }

        !this.silent ? console.log( `${m}` ) : ''

        status['deploy'] = ( status['deployerAccountExist'] && status['contractCreationEnoughFund'] )
        status['write'] = ( status['deployerAccountExist'] && status['writeEnoughFund'] )
        status['read'] = status['deployerAccountExist']

        !this.silent ? process.stdout.write( `    Interactions             ` ) : ''
        const nn = [ 'deploy', 'write', 'read' ]
            .forEach( ( key, index ) => {
                const tt = status[ key ]
                let symbol
                switch( tt ) {
                    case true:
                        symbol = this.config['symbols']['ok1']
                        break
                    case false:
                        symbol = this.config['symbols']['failed']
                        break
                    default:
                        break
                }

                if( index == 2 ) {
                    !this.silent ? console.log( `${symbol} ${key}  ` ) : ''
                } else {
                    !this.silent ? process.stdout.write( `${symbol} ${key}  ` ) : ''
                }
            } )

        if( !status['write'] ) {
            !this.silent ? process.stdout.write( `                             ` ) : ''
            const faucet = this.config['network'][ this.config['network']['use'] ]['faucet']
            const address = this.encoded['deployer']['address']
                .toPublicKey()
                .toBase58()
            !this.silent ? console.log( `   ${faucet}${address}` ) : ''
        }

        this.state['deployer'] = status

        return true
    }


    async stateContract() {
        !this.silent ? process.stdout.write( `  Contract                   ` ) : ''

        const keys = [ 'contractTransaction', 'contractCreation' ]
        for( let index = 0; index < keys.length; index++ ) {
            const key = keys[ index ]
            const exists = await this.accountExists( this.config['envs'][ key ]['public'] )

            let symbolList
            switch( key ) {
                case 'contractTransaction':
                    symbolList = [
                        this.config['symbols']['ok1'],
                        this.config['symbols']['failed']
                    ]
                    break
                case 'contractCreation':
                    symbolList = [
                        this.config['symbols']['failed'],
                        this.config['symbols']['ok1']
                    ]
                    break
                default:
                    break
            }

            let m = ''
            let symbol = ''

            const addr = this.shrinkAddress( this.config['envs'][ key ]['public'] )
            switch( exists['accountExists'] ) {
                case true:
                    symbol = symbolList[ 0 ]
                    m += `${symbol} `
                    m += `${addr} `
                    m += `(${key}) `
                    m += `does exist.`
                    break
                case false:
                    symbol = symbolList[ 1 ]
                    m += `${symbol} `
                    m += `${addr} `
                    m += `(${key}) `
                    m += `does not exist.`
                    break
            }

            if( exists['error'] ) {
                m += `Raised an error `
            }

            if( index === 0 ) {
                !this.silent ? console.log( `${m}` ) : ''
            } else {
                !this.silent ? console.log( `                             ${m}` ) : ''
            }
        }

        return true
    }


    async addVerificationKey() {
        const start = new Date()
        !this.silent ? process.stdout.write( `Add Verification Key         ` ) : ''
        
        let compiled = await this.SmartContract.compile()
        this.verificationKey = compiled['verificationKey']

        const end = Math.round( ( new Date() - start ) / 1000 )
        !this.silent ? console.log( `${this.config['symbols']['ok1']} ${end} seconds` ) : ''

        return true
    }

/*
    async transactionProof() {
        !this.silent ? process.stdout.write( `  Create Proof               ` ) : ''
        const start = Date.now()

        // const initialState = this.zkapp.num.get()

        // Why this line? It increments internal feePayer account variables, such as
        // nonce, necessary for successfully sending a transaction

        const n = await this.contract['zkApp'].num.get()
        await this.snarkyjs.fetchAccount( { 
            'publicKey': this.encoded['deployer']['address'].toPublicKey() 
        } )

        let transaction = await this.snarkyjs.Mina.transaction( 
            { 
                'feePayerKey': this.encoded['deployer']['address'], 
                'fee': this.config['network'][ this.config['network']['use'] ]['transaction_fee']
            },
            () => {
                this.contract['zkApp'].update( n.mul( n ) ) 
            }
        )

        await transaction.prove()
        const time = Math.round( ( Date.now() - start) / 1e3 )

        !this.silent ? console.log( `${this.config['symbols']['ok1']} ${time} seconds` ) : ''

        return transaction
    }
*/

/*
    async transactionSend( tx ) {
        !this.silent ? process.stdout.write( `  Send Transactions          ` ) : ''

        let m = ''
        try {
            const res = await tx.send()
            const hash = await res.hash()

            if( hash === null ) {
                m = `${this.config['symbols']['failed']} Error sending transaction (See Above)`
            } else {
                const explorer = this.config['network'][ this.config['network']['use'] ]['explorer']['transaction']
                m = `${this.config['symbols']['ok1']} ${this.config['network'][ this.config['network']['use'] ]['explorer']['transaction']}${hash}`
            }
        }  catch( e ) {
            m = `${this.config['symbols']['failed']} ${e}`
        }

        !this.silent ? console.log( `${m}` ) : ''

        return true
    }
*/

    async addContract() {
        !this.silent ? process.stdout.write( `  Contract Init              ` ) : ''
        const keys = [  'contractTransaction', 'contractCreation' ]

        const contract = [ 'path', 'classes' ]
            .reduce( ( acc, key, index ) => {
                acc[ key ] = this.config['contracts'][ this.config['contracts']['use'] ][ key ]
                Array.isArray( acc[ key ] ) ? acc[ key ] = acc[ key ][ 0 ] : ''
                return acc
            }, {} )

        const smartContract = await import( contract['path'] )
        this.SmartContract = smartContract[ contract['classes'] ]

        const message = Object
            .entries( contract )
            .map( ( a, index )  => {
                const [ key, value ] = a
                let str = ''
                str += ( index === 0 ) ? `${this.config['symbols']['ok1']} ` : ''
                str += `${key}: ${value}`
                return str
            } )
            .join( ', ' )

        !this.silent ? console.log( `${message}` ) : ''

        const n = keys
            .map( async( mode, index ) => {
                const zkAppPublicKey = this.encoded[ mode ]['address'].toPublicKey()
                this.encoded[ mode ]['zkApp'] = new this.SmartContract( zkAppPublicKey )

                const addr = this.shrinkAddress( zkAppPublicKey.toBase58() )
            } )

        return true
    }


    shrinkAddress( addr ) {
        return `${addr.substring( 0, 8 )}...${addr.substring( addr.length-4,addr.length )}`
    }

/*
    async callMethod() {
        !this.silent ? console.log( 'Call Method                    ' ) : ''
        const zkAppPublicKey = this.addresses['contractTransaction'].toPublicKey()
        this.contract['zkApp'] = new Square( zkAppPublicKey )

        await this.addVerificationKey()
        const tx = await this.transactionProof()
        const response = await this.transactionSend( tx )

        return true
    }
*/

    async accountExists( account ) {
        const result = {
            'error': false,
            'accountExists': false
        }
        try {
            let response = await this.snarkyjs.fetchAccount( { 
                'publicKey': account 
            } )

            result['accountExists'] = ( response.error === undefined )
        } catch( e ) {
            result['error'] = true
        }

        return result
    }


    generateAddress() {
        const struct = {
            'name': this.config.meta['name'],
            'time': {
                'unix': this.config.meta['unix'],
                'format': this.config.meta['format']
            },
            'deployer': {
                'private': null,
                'public': null
            }
        }

        struct['deployer']['private'] = this.snarkyjs.PrivateKey
            .random()
            .toBase58()

        struct['deployer']['public'] = this.snarkyjs.PrivateKey
            .fromBase58( struct['deployer']['private'] )
            .toPublicKey()
            .toBase58()

        return struct
    }


    async transactionReceipt( response ) {
        !this.silent ? process.stdout.write( `  Transaction Receipt        ` ) : ''
        let hash
        try {
            hash = await response.hash()
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

        return m
    }

/*
    async read( { method=null } ) {
        !this.silent ? console.log( 'Read' ) : ''
        const zkAppPublicKey = this.addresses['contractTransaction'].toPublicKey()
        this.contract['zkApp'] = new Square( zkAppPublicKey )
        const response  = parseInt( this.contract['zkApp'][ method ].get() )
        console.log( response )
        this.close()
    }
*/

    async close() {
        const end = Math.round( ( new Date() - this.state['time']['start'] ) / 1000 )
        !this.silent ? console.log( `Shutdown Mina                ${this.config['symbols']['ok1']} ${end} seconds` ) : ''
        await this.snarkyjs.shutdown()
    }
}


