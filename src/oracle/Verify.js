import axios from 'axios'
import { 
    Field, 
    Signature,
    Mina
} from 'snarkyjs'

import moment from 'moment'


export class MinaVerify {
    constructor() {}


    async verify( { userId, seed } ) {
        if( !this.state['deployer']['writeEnoughFund']) {
            console.log( `Not enough funds to verify a method.` )
            process.exit( 1 )
        }

        await this.addVerificationKey()
        let result = { 'transactionReceipt': null }

        !this.silent ? console.log( `Verify` ) : ''

        const server = this.config['oracle'][ this.config['oracle']['use'] ]['server']
        const url = server.replaceAll( '{{userId}}', userId )
    
/*
        const path = Object
            .entries( config['path'] )
            .map( a => a[ 1 ].replaceAll( '{{userId}}', config['id'] ) ) 
            .join( '' )
*/
    
        !this.silent ? process.stdout.write( `  Fetch Signature            ` ) : ''

        let resp
        let messages = []
        try {
            resp = await axios( url, { 'method': 'get' } )
            !this.silent ? console.log( `${this.config['symbols']['ok1']} ${url}` ) : ''
        } catch( e ) {
            messages.push( e )
            !this.silent ? console.log( `${this.config['symbols']['failed']} ${url}` ) : ''
        }

        ( messages.length !== 0 ) ? process.exit( 1 ) : ''

        const encoded = Object
            .entries( resp.data.data )
            .reduce( ( acc, a, index ) => {
                const [ key, value ] = a
                acc[ key ] = Field( parseInt( value ) )
                return acc
            }, {} )

        const signature = Signature.fromJSON( resp.data.signature )
  

        !this.silent ? process.stdout.write( `  Transaction                ` ) : ''
        let txn
        try {
            txn = await Mina.transaction(
                {
                    'feePayerKey': this.encoded['deployer']['address'], 
                    'fee': this.config['network'][ this.config['network']['use'] ]['transaction_fee']
                },
                () => {
                    this.encoded['contractTransaction']['zkApp'].verify(
                        encoded['id'],
                        encoded['creditScore'],
                        signature ?? fail( 'something is wrong with the signature' ),
                        Field( seed )
                    )
                }
            )
            !this.silent ? console.log( `${this.config['symbols']['ok1']} Seed: ${seed}` ) : ''
        } catch( e ) {
            !this.silent ? console.log( `${this.config['symbols']['failed']}  ... ${ (e + '').substring( 0, 250 ).replaceAll( "\n", ' ' )}` ) : ''
        }

        let resp2
        try {
            !this.silent ? process.stdout.write( `  Prove                      ` ) : ''
            const start1 = new Date()
            await txn.prove()
            const end1 = Math.round( ( new Date() - start1 ) / 1000 )
            !this.silent ? console.log( `${this.config['symbols']['ok1']} ${end1} seconds` ) : ''

            !this.silent ? process.stdout.write( `  Send                       ` ) : ''
            const start2 = new Date()
            const resp2 = await txn.send()
            const end2 = Math.round( ( new Date() - start2 ) / 1000 )
            !this.silent ? console.log( `${this.config['symbols']['ok1']} ${end2} seconds` ) : ''

            result['transactionReceipt'] = 
                await this.transactionReceipt( resp2 )

        } catch( e ) {
            !this.silent ? console.log( `${this.config['symbols']['failed']} ... ${ (e + '').substring( 0, 250 ).replaceAll( "\n", ' ' )}` ) : ''
        }

        return result
    }
}