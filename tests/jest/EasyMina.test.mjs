import { describe, test, expect, jest, beforeEach } from '@jest/globals'


const mockExistsSync = jest.fn()
const mockMkdirSync = jest.fn()
const mockReaddirSync = jest.fn()
const mockReadFileSync = jest.fn()
const mockWriteFileSync = jest.fn()

jest.unstable_mockModule( 'fs', () => ( {
    default: {
        existsSync: mockExistsSync,
        mkdirSync: mockMkdirSync,
        readdirSync: mockReaddirSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync
    },
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
} ) )

const mockIsReady = Promise.resolve()
const mockPrivateKeyRandom = jest.fn()
const mockPrivateKeyFromBase58 = jest.fn()
const mockFetchAccount = jest.fn()
const mockBerkeleyQANet = jest.fn()
const mockSetActiveInstance = jest.fn()
const mockShutdown = jest.fn()

jest.unstable_mockModule( 'snarkyjs', () => ( {
    isReady: mockIsReady,
    shutdown: mockShutdown,
    Mina: {
        BerkeleyQANet: mockBerkeleyQANet,
        setActiveInstance: mockSetActiveInstance
    },
    AccountUpdate: {
        fundNewAccount: jest.fn()
    },
    PrivateKey: {
        random: mockPrivateKeyRandom,
        fromBase58: mockPrivateKeyFromBase58
    },
    fetchAccount: mockFetchAccount,
    Field: jest.fn( ( v ) => v ),
    Signature: {
        fromJSON: jest.fn()
    }
} ) )


const { EasyMina, aggregation } = await import( '../../src/EasyMina.js' )


describe( 'EasyMina', () => {
    let instance

    beforeEach( () => {
        jest.clearAllMocks()
        instance = new EasyMina()
        instance.silent = true
        instance.snarkyjs = {
            isReady: Promise.resolve(),
            shutdown: mockShutdown,
            Mina: {
                BerkeleyQANet: mockBerkeleyQANet,
                setActiveInstance: mockSetActiveInstance
            },
            PrivateKey: {
                random: mockPrivateKeyRandom,
                fromBase58: mockPrivateKeyFromBase58
            },
            fetchAccount: mockFetchAccount
        }
        instance.config = {
            'meta': {
                'name': 'test-project',
                'unix': 1234567890,
                'format': '2009-02-13T23:31:30+00:00'
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
                    'transaction_fee': 100000000
                }
            },
            'contracts': {
                'use': 'oracle',
                'oracle': {
                    'path': './test-contract.js',
                    'classes': ['OracleExample']
                }
            },
            'envs': {
                'deployer': {
                    'use': 'latestAddress',
                    'public': 'B62qtest1publickey',
                    'private': 'EKEtest1privatekey'
                },
                'contractCreation': {
                    'public': null,
                    'private': null
                },
                'contractTransaction': {
                    'use': 'latestCreation',
                    'public': null,
                    'private': null
                }
            },
            'path': {
                'mina': {
                    'folder': '.mina/',
                    'deployers': {
                        'folder': 'deployers/',
                        'folderFull': '.mina/deployers/',
                        'filename': 'deployer--{{unix}}.json',
                        'full': '.mina/deployers/deployer--1234567890.json'
                    },
                    'contracts': {
                        'folder': 'contracts/',
                        'folderFull': '.mina/contracts/',
                        'filename': 'contract--{{unix}}.json',
                        'full': '.mina/contracts/contract--1234567890.json'
                    }
                }
            },
            'symbols': {
                'neutral': 'N',
                'onProgress1': 'P',
                'onProgress2': 'P',
                'ok1': 'OK',
                'ok2': 'OK',
                'split': '',
                'failed': 'FAIL'
            }
        }
        instance.encoded = {
            'deployer': { 'address': null },
            'contractCreation': { 'address': null, 'zkApp': null },
            'contractTransaction': { 'address': null, 'zkApp': null }
        }
        instance.state = {
            'deployer': {},
            'contract': {},
            'time': { 'start': new Date() }
        }
    } )


    describe( 'aggregation', () => {
        test( 'should create a class extending base with mixins', () => {
            class Base {
                constructor() {
                    this.base = true
                }
            }

            class MixinA {
                constructor() {
                    this.mixinA = true
                }
                methodA() {
                    return 'A'
                }
            }

            class MixinB {
                constructor() {
                    this.mixinB = true
                }
                methodB() {
                    return 'B'
                }
            }

            const Combined = aggregation( Base, MixinA, MixinB )
            const obj = new Combined()

            expect( obj.base ).toBe( true )
            expect( obj.mixinA ).toBe( true )
            expect( obj.mixinB ).toBe( true )
            expect( obj.methodA() ).toBe( 'A' )
            expect( obj.methodB() ).toBe( 'B' )
        } )


        test( 'should copy static methods from mixins', () => {
            class Base {}
            class MixinA {
                static staticA() {
                    return 'staticA'
                }
            }

            const Combined = aggregation( Base, MixinA )

            expect( Combined.staticA() ).toBe( 'staticA' )
        } )
    } )


    describe( 'shrinkAddress', () => {
        test( 'should shrink a long address to abbreviated form', () => {
            const addr = 'B62qoAE4rBRuTgC42vqvEyUqCGhaZsW58SKVW4Ht8aYqP9UTvxFWBgy'
            const result = instance.shrinkAddress( addr )

            expect( result ).toBe( 'B62qoAE4...WBgy' )
        } )


        test( 'should handle short addresses', () => {
            const addr = 'ABCDEFGHIJKL'
            const result = instance.shrinkAddress( addr )

            expect( result ).toBe( 'ABCDEFGH...IJKL' )
        } )
    } )


    describe( 'addEnvironment', () => {
        test( 'should create directories when they do not exist', () => {
            mockExistsSync.mockReturnValue( false )

            const result = instance.addEnvironment()

            expect( result ).toBe( true )
            expect( mockMkdirSync ).toHaveBeenCalledTimes( 2 )
        } )


        test( 'should not create directories when they already exist', () => {
            mockExistsSync.mockReturnValue( true )

            const result = instance.addEnvironment()

            expect( result ).toBe( true )
            expect( mockMkdirSync ).not.toHaveBeenCalled()
        } )
    } )


    describe( 'addNetwork', () => {
        test( 'should set up berkeley network', async () => {
            mockBerkeleyQANet.mockReturnValue( {} )
            mockFetchAccount.mockResolvedValue( { error: null } )

            const result = await instance.addNetwork()

            expect( result ).toBe( true )
            expect( mockBerkeleyQANet ).toHaveBeenCalledWith(
                'https://proxy.berkeley.minaexplorer.com/graphql'
            )
            expect( mockSetActiveInstance ).toHaveBeenCalled()
        } )
    } )


    describe( 'accountExists', () => {
        test( 'should return true when account exists', async () => {
            mockFetchAccount.mockResolvedValue( { account: {} } )

            const result = await instance.accountExists( 'B62qtest' )

            expect( result['accountExists'] ).toBe( true )
            expect( result['error'] ).toBe( false )
        } )


        test( 'should return false when account has error', async () => {
            mockFetchAccount.mockResolvedValue( { error: 'not found' } )

            const result = await instance.accountExists( 'B62qtest' )

            expect( result['accountExists'] ).toBe( false )
            expect( result['error'] ).toBe( false )
        } )


        test( 'should handle exceptions', async () => {
            mockFetchAccount.mockRejectedValue( new Error( 'network error' ) )

            const result = await instance.accountExists( 'B62qtest' )

            expect( result['error'] ).toBe( true )
            expect( result['accountExists'] ).toBe( false )
        } )
    } )


    describe( 'generateAddress', () => {
        test( 'should generate deployer address with public and private keys', () => {
            const mockToBase58 = jest.fn().mockReturnValue( 'B62qPublicKey' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58 } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKEPrivateKey' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( { toPublicKey: mockToPublicKey } )

            const result = instance.generateAddress()

            expect( result['name'] ).toBe( 'test-project' )
            expect( result['time']['unix'] ).toBe( 1234567890 )
            expect( result['deployer']['private'] ).toBe( 'EKEPrivateKey' )
            expect( result['deployer']['public'] ).toBe( 'B62qPublicKey' )
        } )
    } )


    describe( 'addDeployer', () => {
        test( 'should load deployer from latest address file', () => {
            const mockToPublicKey = jest.fn()
            mockPrivateKeyFromBase58.mockReturnValue( { toPublicKey: mockToPublicKey } )

            mockReaddirSync.mockReturnValue( ['deployer--1234567890.json'] )
            mockReadFileSync.mockReturnValue( JSON.stringify( {
                'deployer': {
                    'public': 'B62qLoadedPublic',
                    'private': 'EKELoadedPrivate'
                }
            } ) )

            const result = instance.addDeployer()

            expect( result ).toBe( true )
            expect( instance.config['envs']['deployer']['public'] ).toBe( 'B62qLoadedPublic' )
            expect( instance.config['envs']['deployer']['private'] ).toBe( 'EKELoadedPrivate' )
        } )


        test( 'should generate new address when no files exist', () => {
            const mockToBase58Public = jest.fn().mockReturnValue( 'B62qNewPublic' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58Public } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKENewPrivate' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( { toPublicKey: mockToPublicKey } )

            mockReaddirSync
                .mockReturnValueOnce( [] )
                .mockReturnValueOnce( ['deployer--1234567890.json'] )

            mockReadFileSync.mockReturnValue( JSON.stringify( {
                'deployer': {
                    'public': 'B62qNewPublic',
                    'private': 'EKENewPrivate'
                }
            } ) )

            const result = instance.addDeployer()

            expect( result ).toBe( true )
            expect( mockWriteFileSync ).toHaveBeenCalled()
        } )
    } )


    describe( 'transactionReceipt', () => {
        test( 'should return transaction URL when hash exists', async () => {
            const mockResponse = {
                hash: jest.fn().mockResolvedValue( 'abc123hash' )
            }

            const result = await instance.transactionReceipt( mockResponse )

            expect( result ).toBe(
                'https://berkeley.minaexplorer.com/transaction/abc123hash'
            )
        } )


        test( 'should return error message when hash is null', async () => {
            const mockResponse = {
                hash: jest.fn().mockResolvedValue( null )
            }

            const result = await instance.transactionReceipt( mockResponse )

            expect( result ).toBe( 'Error sending transaction' )
        } )
    } )


    describe( 'constructor', () => {
        test( 'should create an instance', () => {
            const em = new EasyMina()

            expect( em ).toBeInstanceOf( EasyMina )
        } )
    } )


    describe( 'addSnarkyjs', () => {
        test( 'should import and initialize snarkyjs', async () => {
            instance.config['symbols'] = { 'ok1': 'OK' }

            await instance.addSnarkyjs()

            expect( instance.snarkyjs ).toBeDefined()
        } )
    } )


    describe( 'addMinaCleanUp', () => {
        test( 'should register process event handlers', () => {
            const originalOn = process.on
            const mockOn = jest.fn()
            process.on = mockOn

            instance.addMinaCleanUp()

            expect( mockOn ).toHaveBeenCalledTimes( 6 )
            expect( mockOn ).toHaveBeenCalledWith( 'exit', expect.any( Function ) )
            expect( mockOn ).toHaveBeenCalledWith( 'SIGINT', expect.any( Function ) )
            expect( mockOn ).toHaveBeenCalledWith( 'SIGTERM', expect.any( Function ) )

            process.on = originalOn
        } )
    } )


    describe( 'close', () => {
        test( 'should call snarkyjs shutdown', async () => {
            instance.state['time']['start'] = new Date()

            await instance.close()

            expect( mockShutdown ).toHaveBeenCalled()
        } )
    } )


    describe( 'stateDeployer', () => {
        test( 'should set deployer state when account exists with balance', async () => {
            mockFetchAccount.mockResolvedValue( {
                error: null,
                account: {
                    balance: 500000000,
                    nonce: 5
                }
            } )

            const result = await instance.stateDeployer()

            expect( result ).toBe( true )
            expect( instance.state['deployer']['deployerAccountExist'] ).toBe( true )
            expect( instance.state['deployer']['deployerBalance'] ).toBe( 500000000 )
            expect( instance.state['deployer']['deploy'] ).toBe( true )
            expect( instance.state['deployer']['write'] ).toBe( true )
            expect( instance.state['deployer']['read'] ).toBe( true )
        } )


        test( 'should handle non-existent deployer account', async () => {
            instance.encoded['deployer']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qDeployerPublic' )
                } )
            }

            mockFetchAccount.mockResolvedValue( {
                error: 'account not found'
            } )

            const result = await instance.stateDeployer()

            expect( result ).toBe( true )
            expect( instance.state['deployer']['deployerAccountExist'] ).toBe( false )
            expect( instance.state['deployer']['deploy'] ).toBe( false )
            expect( instance.state['deployer']['write'] ).toBe( false )
            expect( instance.state['deployer']['read'] ).toBe( false )
        } )


        test( 'should handle fetch account error', async () => {
            instance.encoded['deployer']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qDeployerPublic' )
                } )
            }

            mockFetchAccount.mockRejectedValue( new Error( 'connection refused' ) )

            const result = await instance.stateDeployer()

            expect( result ).toBe( true )
        } )


        test( 'should detect insufficient funds', async () => {
            mockFetchAccount.mockResolvedValue( {
                error: null,
                account: {
                    balance: 10,
                    nonce: 1
                }
            } )

            instance.encoded['deployer']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qtest' )
                } )
            }

            const result = await instance.stateDeployer()

            expect( result ).toBe( true )
            expect( instance.state['deployer']['contractCreationEnoughFund'] ).toBe( false )
        } )
    } )


    describe( 'stateContract', () => {
        test( 'should check contract state for both keys', async () => {
            instance.encoded['contractTransaction']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qContractTransaction' )
                } )
            }
            instance.encoded['contractCreation']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qContractCreation' )
                } )
            }
            instance.config['envs']['contractTransaction'] = {
                'public': 'B62qContractTransaction'
            }
            instance.config['envs']['contractCreation'] = {
                'public': 'B62qContractCreation'
            }

            mockFetchAccount
                .mockResolvedValueOnce( { account: {} } )
                .mockResolvedValueOnce( { error: 'not found' } )

            const result = await instance.stateContract()

            expect( result ).toBe( true )
        } )


        test( 'should handle both contracts not existing', async () => {
            instance.encoded['contractTransaction']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qCT' )
                } )
            }
            instance.encoded['contractCreation']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qCC' )
                } )
            }
            instance.config['envs']['contractTransaction'] = {
                'public': 'B62qCT'
            }
            instance.config['envs']['contractCreation'] = {
                'public': 'B62qCC'
            }

            mockFetchAccount
                .mockResolvedValueOnce( { error: 'not found' } )
                .mockResolvedValueOnce( { error: 'not found' } )

            const result = await instance.stateContract()

            expect( result ).toBe( true )
        } )


        test( 'should handle fetch error', async () => {
            instance.encoded['contractTransaction']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qCT' )
                } )
            }
            instance.encoded['contractCreation']['address'] = {
                toPublicKey: jest.fn().mockReturnValue( {
                    toBase58: jest.fn().mockReturnValue( 'B62qCC' )
                } )
            }
            instance.config['envs']['contractTransaction'] = {
                'public': 'B62qCT'
            }
            instance.config['envs']['contractCreation'] = {
                'public': 'B62qCC'
            }

            mockFetchAccount
                .mockRejectedValueOnce( new Error( 'network' ) )
                .mockRejectedValueOnce( new Error( 'network' ) )

            const result = await instance.stateContract()

            expect( result ).toBe( true )
        } )
    } )


    describe( 'addAddresses', () => {
        test( 'should generate contract creation keys and handle missing transaction keys', () => {
            const mockToBase58 = jest.fn().mockReturnValue( 'B62qGeneratedPublic' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58 } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( {
                toPublicKey: mockToPublicKey,
                toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' )
            } )

            mockExistsSync.mockReturnValue( true )
            mockReaddirSync.mockReturnValue( [] )

            const result = instance.addAddresses()

            expect( result ).toBe( true )
            expect( instance.config['envs']['contractCreation']['private'] ).toBe( 'EKEGeneratedPrivate' )
            expect( instance.config['envs']['contractCreation']['public'] ).toBe( 'B62qGeneratedPublic' )
        } )


        test( 'should load contract transaction keys from latest file', () => {
            const mockToBase58 = jest.fn().mockReturnValue( 'B62qGeneratedPublic' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58 } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( {
                toPublicKey: mockToPublicKey,
                toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' )
            } )

            mockExistsSync.mockReturnValue( true )
            mockReaddirSync.mockReturnValue( ['contract--1234567890.json'] )
            mockReadFileSync.mockReturnValue( JSON.stringify( {
                'contract': {
                    'private': 'EKEContractPrivate',
                    'public': 'B62qContractPublic'
                }
            } ) )

            const result = instance.addAddresses()

            expect( result ).toBe( true )
            expect( instance.config['envs']['contractTransaction']['private'] ).toBe( 'EKEContractPrivate' )
            expect( instance.config['envs']['contractTransaction']['public'] ).toBe( 'B62qContractPublic' )
        } )


        test( 'should handle customPath for contract transaction', () => {
            instance.config['envs']['contractTransaction']['use'] = 'customPath'
            instance.config['envs']['contractTransaction']['customPath'] = '/tmp/test-keys.json'

            const mockToBase58 = jest.fn().mockReturnValue( 'B62qGeneratedPublic' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58 } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( {
                toPublicKey: mockToPublicKey,
                toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' )
            } )

            mockReadFileSync.mockReturnValue( JSON.stringify( {
                'contract': {
                    'private': 'EKECustomPrivate',
                    'public': 'B62qCustomPublic'
                }
            } ) )

            const result = instance.addAddresses()

            expect( result ).toBe( true )
            expect( instance.config['envs']['contractTransaction']['private'] ).toBe( 'EKECustomPrivate' )
        } )


        test( 'should handle non-existent contracts folder', () => {
            const mockToBase58 = jest.fn().mockReturnValue( 'B62qGeneratedPublic' )
            const mockToPublicKey = jest.fn().mockReturnValue( { toBase58: mockToBase58 } )
            const mockRandomKey = { toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' ) }

            mockPrivateKeyRandom.mockReturnValue( mockRandomKey )
            mockPrivateKeyFromBase58.mockReturnValue( {
                toPublicKey: mockToPublicKey,
                toBase58: jest.fn().mockReturnValue( 'EKEGeneratedPrivate' )
            } )

            mockExistsSync.mockReturnValue( false )

            const result = instance.addAddresses()

            expect( result ).toBe( true )
        } )
    } )


    describe( 'addDeployer with customPath', () => {
        test( 'should load deployer from custom env file', () => {
            instance.config['envs']['deployer']['use'] = 'customPath'
            instance.config['envs']['deployer']['customPath'] = '/tmp/.env'
            instance.config['envs']['deployer']['public'] = 'MINA_PUBLIC_KEY'
            instance.config['envs']['deployer']['private'] = 'MINA_PRIVATE_KEY'

            const mockToPublicKey = jest.fn()
            mockPrivateKeyFromBase58.mockReturnValue( { toPublicKey: mockToPublicKey } )

            mockReadFileSync.mockReturnValue( 'MINA_PUBLIC_KEY=B62qCustomPublic\nMINA_PRIVATE_KEY=EKECustomPrivate\n' )

            const result = instance.addDeployer()

            expect( result ).toBe( true )
        } )
    } )


    describe( 'addContract', () => {
        test( 'should handle missing contract module gracefully', async () => {
            const mockToPublicKey = jest.fn().mockReturnValue( 'publicKeyObj' )
            instance.encoded['contractTransaction']['address'] = {
                toPublicKey: mockToPublicKey
            }
            instance.encoded['contractCreation']['address'] = {
                toPublicKey: mockToPublicKey
            }

            await expect(
                instance.addContract()
            ).rejects.toThrow()
        } )
    } )


    describe( 'addVerificationKey', () => {
        test( 'should compile smart contract and store verification key', async () => {
            instance.SmartContract = {
                compile: jest.fn().mockResolvedValue( {
                    'verificationKey': { data: 'test-vk-data' }
                } )
            }

            const result = await instance.addVerificationKey()

            expect( result ).toBe( true )
            expect( instance.verificationKey ).toEqual( { data: 'test-vk-data' } )
        } )
    } )


    describe( 'transactionReceipt with error', () => {
        test( 'should handle hash throwing an error', async () => {
            const mockResponse = {
                hash: jest.fn().mockRejectedValue( new Error( 'hash error' ) )
            }

            const result = await instance.transactionReceipt( mockResponse )

            expect( result ).toBe( 'Error sending transaction' )
        } )
    } )
} )
