# joker

## Goal

Fork and improve this repo so that anyone can clone and run there own server node that
* automatically joins the network of joker nodes (OK to use a hard-coded bootstrap node)
* publishes the CID of a joke every minute
* logs the jokes of every other node on the network

If 10 joker nodes join the network, then every node should log the same 10 jokes per minute.

## Getting Started

```
fork this repo
clone your fork
cd joker
npm install
npm run server
```

