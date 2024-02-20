import { createHelia } from 'helia';
import { FsBlockstore } from 'blockstore-fs';
import { json } from '@helia/json';
import axios from 'axios';

const blockstore = new FsBlockstore('./ipfs');
const helia = await createHelia({ blockstore });
const ipfs = json(helia);

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
    await logJoke(cid);
}

setInterval(async () => {
    try {
        await main();
    }
    catch (error) {
        console.error(`Error: ${error}`);
    }
}, 60000);

main();
