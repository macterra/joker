import axios from 'axios';
import Hyperswarm from 'hyperswarm';
import goodbye from 'graceful-goodbye';
import b4a from 'b4a';
import { sha256 } from '@noble/hashes/sha256';
import canonicalize from 'canonicalize';

import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 100;

const swarm = new Hyperswarm();
goodbye(() => swarm.destroy())

const mockIPFS = {};
const nodes = {};

// Keep track of all connections
const conns = [];
swarm.on('connection', conn => {
    const name = b4a.toString(conn.remotePublicKey, 'hex');
    console.log('* got a connection from:', name, '*');
    conns.push(conn);
    conn.once('close', () => conns.splice(conns.indexOf(conn), 1));
    conn.on('data', data => receiveJoke(name, data));
});

async function getJoke() {
    const response = await axios.get('https://icanhazdadjoke.com/', {
        headers: {
            "User-Agent": 'joker (https://github.com/macterra/joker)',
            "Accept": 'application/json',
        }
    });

    return {
        ...response.data,
        time: new Date().toISOString(),
    };
}

function hashJSON(json) {
    const msg = canonicalize(json);
    const hash = sha256(msg);
    return Buffer.from(hash).toString('hex');
}

async function publishJoke(joke) {
    try {
        //const cid = await ipfs.add(joke);
        const cid = hashJSON(joke);

        mockIPFS[cid] = joke;
        logJoke(cid, 'local');

        const msg = {
            cid: cid.toString(),
            data: joke,
            relays: [],
        };

        await relayJoke(msg);
    }
    catch (error) {
        console.log(error);
    }
}

async function republishJoke(msg) {
    try {
        mockIPFS[msg.cid] = msg.data;
        logJoke(msg.cid, msg.relays[0]);
        await relayJoke(msg);
    }
    catch (error) {
        console.log(error);
    }
}

async function relayJoke(msg) {
    const json = JSON.stringify(msg);

    for (const conn of conns) {
        const name = b4a.toString(conn.remotePublicKey, 'hex');

        if (!msg.relays.includes(name)) {
            conn.write(json);
        }
    }
}

async function receiveJoke(name, json) {
    try {
        const msg = JSON.parse(json);
        const data = mockIPFS[msg.cid];

        if (!data) {
            msg.relays.push(name);
            await republishJoke(msg);
        }
    }
    catch (error) {
        console.log('receiveJoke error:', error);
    }
}

function logJoke(cid, name) {
    const joke = mockIPFS[cid];

    nodes[name] = (nodes[name] || 0) + 1;
    const detected = Object.keys(nodes).length;

    console.log(`from: ${name}`);
    console.log(cid);
    console.log(joke.joke);
    console.log(`--- ${conns.length} nodes connected, ${detected} nodes detected`);
}

setInterval(async () => {
    try {
        const joke = await getJoke();
        await publishJoke(joke);
    }
    catch (error) {
        console.error(`Error: ${error}`);
    }
}, 10000);

// Join a common topic
const networkID = 'c588086b88e10499e68857354647c6b70c198998a6cd1f23c43958765ccc4c5f';
const topic = b4a.from(networkID, 'hex');
const discovery = swarm.join(topic, { client: true, server: true });

// The flushed promise will resolve when the topic has been fully announced to the DHT
discovery.flushed().then(() => {
    console.log('joined topic:', b4a.toString(topic, 'hex'));
});

process.on('uncaughtException', (error) => {
    console.error('Unhandled exception caught');
});

process.on('unhandledRejection', (reason, promise) => {
    //console.error('Unhandled rejection at:', promise, 'reason:', reason);
    console.error('Unhandled rejection caught');
});

process.stdin.on('data', d => {
    if (d.toString().startsWith('q')) {
        process.exit();
    }
});
