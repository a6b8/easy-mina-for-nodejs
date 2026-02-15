import { describe, test, expect, jest, beforeEach } from '@jest/globals'


const mockAxios = jest.fn()

jest.unstable_mockModule( 'axios', () => ( {
    default: mockAxios
} ) )

const mockMomentInstance = {
    unix: jest.fn().mockReturnValue( 1234567890 ),
    diff: jest.fn().mockReturnValue( 60000 ),
    format: jest.fn().mockReturnValue( '2023-01-01' )
}
const mockDuration = {
    asMinutes: jest.fn().mockReturnValue( 5 )
}

jest.unstable_mockModule( 'moment', () => {
    const momentFn = ( ...args ) => {
        if( args.length === 0 ) {
            return mockMomentInstance
        }
        return {
            unix: jest.fn().mockReturnValue( 1234567890 ),
            diff: jest.fn().mockReturnValue( 60000 )
        }
    }
    momentFn.duration = jest.fn().mockReturnValue( mockDuration )
    momentFn.default = momentFn

    return { default: momentFn }
} )

const mockFsExistsSync = jest.fn()
const mockFsMkdirSync = jest.fn()
const mockFsWriteFileSync = jest.fn()

jest.unstable_mockModule( 'fs', () => ( {
    default: {
        existsSync: mockFsExistsSync,
        mkdirSync: mockFsMkdirSync,
        readdirSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: mockFsWriteFileSync
    }
} ) )

const mockSnarkyTransaction = jest.fn()

jest.unstable_mockModule( 'snarkyjs', () => ( {
    isReady: Promise.resolve(),
    shutdown: jest.fn(),
    Mina: {
        BerkeleyQANet: jest.fn(),
        setActiveInstance: jest.fn(),
        transaction: mockSnarkyTransaction
    },
    AccountUpdate: { fundNewAccount: jest.fn() },
    PrivateKey: {
        random: jest.fn(),
        fromBase58: jest.fn()
    },
    fetchAccount: jest.fn(),
    Field: jest.fn( ( v ) => v ),
    Signature: { fromJSON: jest.fn() }
} ) )


const { MinaDeploy } = await import( '../../src/oracle/Deploy.js' )
const { MinaListen } = await import( '../../src/oracle/Listen.js' )
const { MinaVerify } = await import( '../../src/oracle/Verify.js' )


describe( 'MinaDeploy', () => {
    let instance

    beforeEach( () => {
        jest.clearAllMocks()
        instance = new MinaDeploy()
        instance.silent = true
        instance.config = {
            'network': {
                'use': 'berkeley',
                'berkeley': {
                    'transaction_fee': 100000000,
                    'explorer': {
                        'transaction': 'https://berkeley.minaexplorer.com/transaction/',
                        'wallet': 'https://berkeley.minaexplorer.com/wallet/'
                    }
                }
            },
            'meta': {
                'name': 'test',
                'unix': 1234567890,
                'format': '2023-01-01'
            },
            'contracts': {
                'use': 'oracle',
                'oracle': {
                    'path': './test.js',
                    'classes': ['Test']
                }
            },
            'envs': {
                'deployer': {
                    'public': 'B62qDeployerPublic',
                    'private': 'EKEDeployerPrivate'
                },
                'contractCreation': {
                    'public': 'B62qContractPublic',
                    'private': 'EKEContractPrivate'
                }
            },
            'path': {
                'mina': {
                    'contracts': {
                        'folder': '.mina/contracts/',
                        'folderFull': '.mina/contracts/',
                        'full': '.mina/contracts/contract--1234567890.json'
                    }
                }
            },
            'symbols': {
                'ok1': 'OK',
                'failed': 'FAIL'
            }
        }
        instance.state = {
            'deployer': {
                'contractCreationEnoughFund': true
            }
        }
        instance.encoded = {
            'deployer': { 'address': { toPublicKey: jest.fn() } },
            'contractCreation': {
                'address': {
                    toPublicKey: jest.fn().mockReturnValue( {
                        toBase58: jest.fn().mockReturnValue( 'B62qContractPublic' )
                    } )
                },
                'zkApp': {
                    deploy: jest.fn(),
                    init: jest.fn()
                }
            }
        }
        instance.verificationKey = { data: 'test-key' }
        instance.snarkyjs = {
            fetchAccount: jest.fn(),
            Mina: {
                transaction: jest.fn()
            },
            AccountUpdate: {
                fundNewAccount: jest.fn()
            }
        }
        instance.shrinkAddress = ( addr ) => {
            return `${addr.substring( 0, 8 )}...${addr.substring( addr.length - 4, addr.length )}`
        }
        instance.addVerificationKey = jest.fn().mockResolvedValue( true )
    } )


    describe( 'constructor', () => {
        test( 'should create an instance', () => {
            const deploy = new MinaDeploy()

            expect( deploy ).toBeInstanceOf( MinaDeploy )
        } )
    } )


    describe( 'deployKeysSave', () => {
        test( 'should save keys to JSON file', () => {
            mockFsExistsSync.mockReturnValue( true )

            const response = {
                'transactionReceipt': 'https://explorer/tx/abc',
                'payerWallet': 'https://explorer/wallet/xyz'
            }

            instance.deployKeysSave( response )

            expect( mockFsWriteFileSync ).toHaveBeenCalledWith(
                '.mina/contracts/contract--1234567890.json',
                expect.any( String ),
                'utf-8'
            )
        } )


        test( 'should create directory if not exists', () => {
            mockFsExistsSync.mockReturnValue( false )

            const response = { 'transactionReceipt': 'test' }

            instance.deployKeysSave( response )

            expect( mockFsMkdirSync ).toHaveBeenCalledWith( '.mina/contracts/' )
        } )
    } )


    describe( 'deployContract', () => {
        test( 'should detect already deployed contract', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: null } )

            const result = await instance.deployContract()

            expect( result['transactionReceipt'] ).toBeNull()
        } )


        test( 'should deploy when contract not yet deployed', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: 'not found' } )

            const mockProve = jest.fn().mockResolvedValue( true )
            const mockSign = jest.fn()
            const mockSend = jest.fn().mockResolvedValue( {
                hash: jest.fn().mockResolvedValue( 'deployhash123' )
            } )

            instance.snarkyjs.Mina.transaction.mockResolvedValue( {
                prove: mockProve,
                sign: mockSign,
                send: mockSend
            } )

            const result = await instance.deployContract()

            expect( result['transactionReceipt'] ).toContain( 'deployhash123' )
        } )


        test( 'should handle deploy with null hash', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: 'not found' } )

            const mockProve = jest.fn().mockResolvedValue( true )
            const mockSign = jest.fn()
            const mockSend = jest.fn().mockResolvedValue( {
                hash: jest.fn().mockResolvedValue( null )
            } )

            instance.snarkyjs.Mina.transaction.mockResolvedValue( {
                prove: mockProve,
                sign: mockSign,
                send: mockSend
            } )

            const result = await instance.deployContract()

            expect( result['transactionReceipt'] ).toBe( 'Error sending transaction' )
        } )


        test( 'should handle deploy transaction error', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: 'not found' } )

            instance.snarkyjs.Mina.transaction.mockResolvedValue( {
                prove: jest.fn().mockRejectedValue( new Error( 'prove failed' ) ),
                sign: jest.fn(),
                send: jest.fn()
            } )

            const result = await instance.deployContract()

            expect( result['transactionReceipt'] ).toBe( 'Error sending transaction' )
        } )


        test( 'should handle undefined verification key', async () => {
            instance.verificationKey = undefined
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: 'not found' } )

            instance.snarkyjs.Mina.transaction.mockResolvedValue( {
                prove: jest.fn().mockResolvedValue( true ),
                sign: jest.fn(),
                send: jest.fn().mockResolvedValue( {
                    hash: jest.fn().mockResolvedValue( 'hash123' )
                } )
            } )

            const result = await instance.deployContract()

            expect( result ).toBeDefined()
        } )
    } )


    describe( 'deploy', () => {
        test( 'should exit when not enough funds', async () => {
            instance.state['deployer']['contractCreationEnoughFund'] = false
            const mockExit = jest.spyOn( process, 'exit' ).mockImplementation( () => {
                throw new Error( 'process.exit' )
            } )

            await expect(
                instance.deploy( { saveFile: false } )
            ).rejects.toThrow( 'process.exit' )

            mockExit.mockRestore()
        } )


        test( 'should deploy and save file', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: null } )

            mockFsExistsSync.mockReturnValue( true )

            const result = await instance.deploy( { saveFile: true } )

            expect( result ).toBe( true )
            expect( instance.addVerificationKey ).toHaveBeenCalled()
            expect( mockFsWriteFileSync ).toHaveBeenCalled()
        } )


        test( 'should deploy without saving file', async () => {
            instance.snarkyjs.fetchAccount.mockResolvedValue( { error: null } )

            const result = await instance.deploy( { saveFile: false } )

            expect( result ).toBe( true )
            expect( mockFsWriteFileSync ).not.toHaveBeenCalled()
        } )
    } )
} )


describe( 'MinaListen', () => {
    let instance

    beforeEach( () => {
        jest.clearAllMocks()
        instance = new MinaListen()
        instance.silent = true
        instance.config = {
            'network': {
                'use': 'berkeley',
                'berkeley': {
                    'graphql': 'https://berkeley.graphql.minaexplorer.com'
                }
            },
            'events': {
                'intervalInSeconds': 1,
                'maxInMinutes': 0.05,
                'filterEventsInMinutes': 60
            },
            'symbols': {
                'ok1': 'OK',
                'onProgress1': 'P',
                'failed': 'FAIL'
            }
        }
        instance.encoded = {
            'contractTransaction': {
                'address': {
                    toPublicKey: jest.fn().mockReturnValue( {
                        toBase58: jest.fn().mockReturnValue( 'B62qContractPublic' )
                    } )
                }
            },
            'contractCreation': {
                'address': {
                    toPublicKey: jest.fn().mockReturnValue( {
                        toBase58: jest.fn().mockReturnValue( 'B62qCreationPublic' )
                    } )
                }
            }
        }
        instance.shrinkAddress = ( addr ) => {
            return `${addr.substring( 0, 8 )}...${addr.substring( addr.length - 4, addr.length )}`
        }
    } )


    describe( 'constructor', () => {
        test( 'should create an instance', () => {
            const listen = new MinaListen()

            expect( listen ).toBeInstanceOf( MinaListen )
        } )
    } )


    describe( 'checkContractCreation', () => {
        test( 'should return true when contract exists', async () => {
            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapp: { zkappCommand: { accountUpdates: [] } }
                    }
                }
            } )

            const result = await instance.checkContractCreation( {
                publicKey: 'B62qtest'
            } )

            expect( result ).toBe( true )
        } )


        test( 'should return false when contract does not exist', async () => {
            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapp: null
                    }
                }
            } )

            const result = await instance.checkContractCreation( {
                publicKey: 'B62qtest'
            } )

            expect( result ).toBe( false )
        } )
    } )


    describe( 'checkLatestEventsFromContract', () => {
        test( 'should return parsed events', async () => {
            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapps: [
                            {
                                dateTime: '2023-01-01T00:00:00Z',
                                zkappCommand: {
                                    accountUpdates: [
                                        { body: { events: '42' } }
                                    ]
                                }
                            }
                        ]
                    }
                }
            } )

            const result = await instance.checkLatestEventsFromContract( {
                publicKey: 'B62qtest'
            } )

            expect( Array.isArray( result ) ).toBe( true )
        } )


        test( 'should return empty array when no recent events', async () => {
            mockDuration.asMinutes.mockReturnValue( 120 )

            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapps: [
                            {
                                dateTime: '2022-01-01T00:00:00Z',
                                zkappCommand: {
                                    accountUpdates: [
                                        { body: { events: '42' } }
                                    ]
                                }
                            }
                        ]
                    }
                }
            } )

            const result = await instance.checkLatestEventsFromContract( {
                publicKey: 'B62qtest'
            } )

            expect( Array.isArray( result ) ).toBe( true )
        } )
    } )


    describe( 'transactionEvents', () => {
        test( 'should return true when event found', async () => {
            const originalClearLine = process.stdout.clearLine
            const originalCursorTo = process.stdout.cursorTo
            process.stdout.clearLine = jest.fn()
            process.stdout.cursorTo = jest.fn()

            mockDuration.asMinutes.mockReturnValue( 1 )

            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapps: [
                            {
                                dateTime: '2023-01-01T00:00:00Z',
                                zkappCommand: {
                                    accountUpdates: [
                                        { body: { events: '42' } }
                                    ]
                                }
                            }
                        ]
                    }
                }
            } )

            const result = await instance.transactionEvents( { search: 42 } )

            expect( result ).toBe( true )

            process.stdout.clearLine = originalClearLine
            process.stdout.cursorTo = originalCursorTo
        } )


        test( 'should return true after timeout when event not found', async () => {
            const originalClearLine = process.stdout.clearLine
            const originalCursorTo = process.stdout.cursorTo
            process.stdout.clearLine = jest.fn()
            process.stdout.cursorTo = jest.fn()

            instance.config['events']['maxInMinutes'] = 0.001
            instance.config['events']['intervalInSeconds'] = 0.001

            mockDuration.asMinutes.mockReturnValue( 1 )

            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapps: []
                    }
                }
            } )

            const result = await instance.transactionEvents( { search: 999 } )

            expect( result ).toBe( true )

            process.stdout.clearLine = originalClearLine
            process.stdout.cursorTo = originalCursorTo
        } )
    } )


    describe( 'contractCreationEvents', () => {
        test( 'should return true when contract found', async () => {
            const originalClearLine = process.stdout.clearLine
            const originalCursorTo = process.stdout.cursorTo
            process.stdout.clearLine = jest.fn()
            process.stdout.cursorTo = jest.fn()

            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapp: { zkappCommand: { accountUpdates: [] } }
                    }
                }
            } )

            const result = await instance.contractCreationEvents( {
                key: 'contractCreation'
            } )

            expect( result ).toBe( true )

            process.stdout.clearLine = originalClearLine
            process.stdout.cursorTo = originalCursorTo
        } )


        test( 'should return true after timeout when contract not found', async () => {
            const originalClearLine = process.stdout.clearLine
            const originalCursorTo = process.stdout.cursorTo
            process.stdout.clearLine = jest.fn()
            process.stdout.cursorTo = jest.fn()

            instance.config['events']['maxInMinutes'] = 0.001
            instance.config['events']['intervalInSeconds'] = 0.001

            mockAxios.mockResolvedValue( {
                data: {
                    data: {
                        zkapp: null
                    }
                }
            } )

            const result = await instance.contractCreationEvents( {
                key: 'contractCreation'
            } )

            expect( result ).toBe( true )

            process.stdout.clearLine = originalClearLine
            process.stdout.cursorTo = originalCursorTo
        } )
    } )
} )


describe( 'MinaVerify', () => {
    let instance

    beforeEach( () => {
        jest.clearAllMocks()
        instance = new MinaVerify()
        instance.silent = true
        instance.config = {
            'network': {
                'use': 'berkeley',
                'berkeley': {
                    'transaction_fee': 100000000,
                    'explorer': {
                        'transaction': 'https://berkeley.minaexplorer.com/transaction/'
                    }
                }
            },
            'oracle': {
                'use': 'demo',
                'demo': {
                    'server': 'https://example.com/user/{{userId}}'
                }
            },
            'symbols': {
                'ok1': 'OK',
                'failed': 'FAIL'
            }
        }
        instance.state = {
            'deployer': {
                'writeEnoughFund': true
            }
        }
        instance.encoded = {
            'deployer': { 'address': 'deployerAddr' },
            'contractTransaction': {
                'zkApp': {
                    verify: jest.fn()
                }
            }
        }
        instance.addVerificationKey = jest.fn().mockResolvedValue( true )
        instance.transactionReceipt = jest.fn().mockResolvedValue( 'receipt-url' )
    } )


    describe( 'constructor', () => {
        test( 'should create an instance', () => {
            const verify = new MinaVerify()

            expect( verify ).toBeInstanceOf( MinaVerify )
        } )
    } )


    describe( 'verify', () => {
        test( 'should exit when not enough funds', async () => {
            instance.state['deployer']['writeEnoughFund'] = false
            const mockExit = jest.spyOn( process, 'exit' ).mockImplementation( () => {
                throw new Error( 'process.exit' )
            } )

            await expect(
                instance.verify( { userId: '1', seed: 42 } )
            ).rejects.toThrow( 'process.exit' )

            mockExit.mockRestore()
        } )


        test( 'should fetch signature and process transaction', async () => {
            mockAxios.mockResolvedValue( {
                data: {
                    data: { id: '1', creditScore: '700' },
                    signature: { r: '123', s: '456' }
                }
            } )

            const mockTxn = {
                prove: jest.fn().mockResolvedValue( true ),
                send: jest.fn().mockResolvedValue( {
                    hash: jest.fn().mockResolvedValue( 'txhash123' )
                } )
            }

            mockSnarkyTransaction.mockResolvedValue( mockTxn )

            const result = await instance.verify( { userId: '1', seed: 42 } )

            expect( instance.addVerificationKey ).toHaveBeenCalled()
            expect( mockAxios ).toHaveBeenCalledWith(
                'https://example.com/user/1',
                { 'method': 'get' }
            )
            expect( result ).toHaveProperty( 'transactionReceipt' )
        } )
    } )
} )
