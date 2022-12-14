import axios from 'axios'
import moment from 'moment'


export class MinaListen {
    constructor() {}


    async checkContractCreation( { publicKey } ) {
        var data = JSON.stringify({
            query: `query MyQuery {
                zkapp(query: {zkappCommand: {accountUpdates: {body: {publicKey_in: "${publicKey}"}}}}) {
                  zkappCommand {
                    accountUpdates {
                      body {
                        publicKey
                      }
                    }
                  }
                }
              }`,
            variables: {}
          } );
          

        const url = this.config['network'][ this.config['network']['use'] ]['graphql']

        const response = await axios( 
            url,
            {
                'method': 'post',
                'headers': { 'Content-Type': 'application/json' },
                'data' : data
            } 
        )

        const contractExist = ( response.data.data.zkapp !== null )

        return contractExist
    }


    async checkLatestEventsFromContract( { publicKey } ) {
        const data = JSON.stringify( {
            'query': `query getEvents {
            zkapps(
                query: {
                    zkappCommand: {
                        accountUpdates: {
                            body: {
                                publicKey: "${publicKey}"
                            }
                        }
                    }, 
                    canonical: true, 
                    failureReason_exists: false
                }, 
                sortBy: BLOCKHEIGHT_DESC, limit: 1000
            ) {
                blockHeight
                zkappCommand {
                    accountUpdates {
                        body {
                            events
                        }
                    }
                }
                dateTime
            }
            blocks(
                sortBy: DATETIME_DESC, 
                query: {}, 
                limit: 1
            ) {
              blockHeight
              dateTime
            }
          }`,
            'variables': {}
        } )

        const url = this.config['network'][ this.config['network']['use'] ]['graphql']

        const response = await axios( 
            url,
            {
                'method': 'post',
                'headers': { 'Content-Type': 'application/json' },
                'data' : data
            } 
        )

        const events = response.data['data']['zkapps']
            .map( a => {
                const struct = {
                    'timestamp': null,
                    'sendInMinutes': null,
                    'id': null 
                }

                struct['timestamp'] =  moment( a['dateTime'] ).unix()

                struct['sendInMinutes'] = Math.floor( 
                    moment
                        .duration( moment().diff( moment( a['dateTime'] ) ) )
                        .asMinutes() 
                )

                struct['id'] = a['zkappCommand']['accountUpdates']
                    .map( b => parseInt( b['body']['events'] ) )
                    .flat( 1 )

                return struct
            } )
            .filter( a => a['sendInMinutes'] < this.config['events']['filterEventsInMinutes'] )

        return events
    }


    async transactionEvents( { search=-1 } ) {
        const delay = ms => new Promise( resolve => setTimeout( resolve, ms ) )
        const start = new Date()

        !this.silent ? console.log( `Event Transaction` ) : ''
        
        const maxInMs = this.config['events']['maxInMinutes'] * 60 * 1000
        const intervalInMs = this.config['events']['intervalInSeconds'] * 1000

        const times = maxInMs / intervalInMs
        const line = `  Listen                     `
        const publicKey = this.encoded['contractTransaction']['address']
            .toPublicKey()
            .toBase58()
        const publicKeyShrink = this.shrinkAddress( publicKey )

        for( let i = 0; i < times; i++ ) {
            const a = await this.checkLatestEventsFromContract( { 'publicKey': publicKey } )

            const ids = a
                .map( a => a['id'] )
                .flat( 1 )

            const end = Math.round( ( new Date() - start ) / 1000 )
            if( ids.includes( search ) ) {
                
                process.stdout.clearLine()
                process.stdout.cursorTo( 0 )
                !this.silent ? console.log( `${line}${this.config['symbols']['ok1']} success! found: ${publicKeyShrink}, Event: "${search}" (${end} seconds)` ) : ''
                
                return true
            } else {
                if( !this.silent ) {
                    process.stdout.clearLine()
                    process.stdout.cursorTo( 0 )
                    process.stdout.write( `${line}${this.config['symbols']['onProgress1']} searching... ${publicKeyShrink}, Event: "${search}" (${end} seconds)` )
                }
            }

            await delay( intervalInMs )
        }

        const end = Math.round( ( new Date() - start ) / 1000 )
        !this.silent ? console.log( `${line}${this.config['symbols']['failed']} not found. ${end} seconds`) : ''

        return true
    }


    async contractCreationEvents( { key=null } ) {
        const delay = ms => new Promise( resolve => setTimeout( resolve, ms ) )
        const start = new Date()

        !this.silent ? console.log( `Contract Creation` ) : ''
        
        const maxInMs = this.config['events']['maxInMinutes'] * 60 * 1000
        const intervalInMs = this.config['events']['intervalInSeconds'] * 1000

        const times = maxInMs / intervalInMs
        const line = `  Listen                     `
        const publicKey = this.encoded[ key ]['address']
            .toPublicKey()
            .toBase58()

        const publicKeyShrink = this.shrinkAddress( publicKey )

        for( let i = 0; i < times; i++ ) {
            const exists = await this.checkContractCreation( { 'publicKey': publicKey } )

            const end = Math.round( ( new Date() - start ) / 1000 )
            if( exists ) {
                process.stdout.clearLine()
                process.stdout.cursorTo( 0 )
                !this.silent ? console.log( `${line}${this.config['symbols']['ok1']} success! found: ${publicKeyShrink} (${end} seconds)` ) : ''
                return true
            } else {
                if( !this.silent ) {
                    process.stdout.clearLine()
                    process.stdout.cursorTo( 0 )
                    process.stdout.write( `${line}${this.config['symbols']['onProgress1']} searching... ${publicKeyShrink} (${end} seconds)` )
                }
            }

            await delay( intervalInMs )
        }

        const end = Math.round( ( new Date() - start ) / 1000 )
        !this.silent ? console.log( `${line}${this.config['symbols']['failed']} not found. ${end} seconds`) : ''

        return true
    }
}