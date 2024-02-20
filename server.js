// import { createHelia } from 'helia';
// import { FsBlockstore } from 'blockstore-fs';
// import { json } from '@helia/json';

import axios from 'axios';

async function getJoke() {
    const response = await axios.get('https://icanhazdadjoke.com/', {
        headers: {
            Accept: 'application/json',
        }});

    console.log(response.data);
    return response.data;
}

getJoke();
