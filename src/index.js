import https from 'https'
import fs, { exists } from 'fs'
import socket from 'socket.io'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { handleFaucetTransfer, setApi } from './handleFaucetTransfer'
import types from './utils/totem-polkadot-js-types'
import { setDefaultConfig } from './utils/polkadotHelper'

// Environment variables
const NODE_URL = process.env.NODE_URL || 'wss://node1.totem.live'
const FAUCET_PORT = process.env.FAUCET_PORT || 3002
const FAUCET_CERT_PATH = process.env.FAUCET_CERT_PATH || './sslcert/fullchain.pem'
const FAUCET_KEY_PATH = process.env.FAUCET_KEY_PATH || './sslcert/privkey.pem'

// Setup server to use SSL certificate
const server = https.createServer({
    cert: fs.readFileSync(FAUCET_CERT_PATH),
    key: fs.readFileSync(FAUCET_KEY_PATH)
})
const io = socket.listen(server)

// Authentication middleware: prevent conneting if authentication fails
// ToDo: use signed message and verify?
// io.use((socket, next) => {
//     let token = socket.handshake.query.token //socket.handshake.headers['x-auth-token']
//     if (token === 'this_is_a_test_token') { //isValid(token)
//         console.log('Authentication success. Token', token)
//         return next()
//     }
//     console.log('Authentication failed. Token', token)
//     return next(new Error('authentication error'))
// })

// Setup websocket request handlers
io.on('connection', client => {
    console.log('Connected to', client.id)
    client.on('disonnect', () => { console.log('Client disconnected', client.id) })

    client.on('faucet', handleFaucetTransfer)
})

async function connect() {
    console.log('Connecting to Totem Blockchain Network...')
    // connect to node
    const provider = new WsProvider(NODE_URL)
    // Create the API and wait until ready
    const api = await ApiPromise.create({ provider, types })
    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ])

    console.log(`Connected to chain "${chain}" using "${nodeName}" v${nodeVersion}`)
    // Set @api object for handleFaucetTransfer to use when needed
    setApi(api)
}
connect().catch((err) => {
    console.error('Connection failed! Error:\n', err)
    exists(1)
}).finally(() => {
    // Start server
    server.listen(FAUCET_PORT, () => console.log('\nFaucet server websocket listening on port ', FAUCET_PORT))
})