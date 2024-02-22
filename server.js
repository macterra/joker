import { createHelia } from 'helia';
import { FsBlockstore } from 'blockstore-fs';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';
import axios from 'axios';
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';

const swarm = new Hyperswarm();
const blockstore = new FsBlockstore('./ipfs');
const helia = await createHelia({ blockstore });
const ipfs = json(helia);

// Keep track of all connections and console.log incoming data
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

    return response.data;
}

async function publishJoke(joke) {
    try {
        const cid = await ipfs.add(joke);

        const msg = JSON.stringify({
            cid: cid.toString(),
            data: joke,
        });

        await receiveJoke('local', msg);

        for (const conn of conns) {
            conn.write(msg);
        }

        return cid;
    }
    catch (error) {
        console.log(error);
    }
}

async function receiveJoke(name, json) {
    try {
        const msg = JSON.parse(json);
        const msgCID = CID.parse(msg.cid);
        const data = await ipfs.get(msgCID);

        if (msg.data.joke === data.joke) {
            await logJoke(msgCID, name);
        }
        else {
            await publishJoke(data.joke);
        }
    }
    catch (error) {
        console.log(error);
    }
}

async function logJoke(cid, name) {
    const joke = await ipfs.get(cid);
    console.log(`from: ${name}`);
    console.log(cid);
    console.log(joke.joke);
    console.log(`--- ${conns.length} nodes connected`);
}

async function main() {
    const joke = await getJoke();
    await publishJoke(joke);
}

setInterval(async () => {
    try {
        await main();
    }
    catch (error) {
        console.error(`Error: ${error}`);
    }
}, 5000);

// Join a common topic
const secret = 'c588086b88e10499e68857354647c6b70c198998a6cd1f23c43958765ccc4c5f';
const topic = b4a.from(secret, 'hex');
const discovery = swarm.join(topic, { client: true, server: true });

// The flushed promise will resolve when the topic has been fully announced to the DHT
discovery.flushed().then(() => {
    console.log('joined topic:', b4a.toString(topic, 'hex'));
    main();
});

process.on('uncaughtException', (error) => {
    console.error('Unhandled exception caught');
});

process.on('unhandledRejection', (reason, promise) => {
    //console.error('Unhandled rejection at:', promise, 'reason:', reason);
    console.error('Unhandled rejection caught');
});
