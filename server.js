import { createHelia } from 'helia';
import { FsBlockstore } from 'blockstore-fs';
import { json } from '@helia/json';

import axios from 'axios';
import cron from 'node-cron';

const blockstore = new FsBlockstore('./ipfs');
const helia = await createHelia({ blockstore });
let ipfs = json(helia);

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
    const cid = await ipfs.add(joke);
    return cid;
}

async function logJoke(cid) {
    const joke = await ipfs.get(cid);
    console.log(cid);
    console.log(joke.joke);
    console.log('---');
}

async function main() {
    const joke = await getJoke();
    const cid = await publishJoke(joke);
    logJoke(cid);
}

cron.schedule('* * * * *', async () => {
    try {
        await main();
    }
    catch (error) {
        console.error(`Error in cron job: ${error}`);
    }
});

main();
