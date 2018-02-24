# Etherbay Smart Contracts And Unit Tests
This repo contains the smart contracts for [Etherbay](https://www.etherbay.com). Etherbay is a decentralized marketplace for digital assets stored on the Ethereum Blockchain.


## Installation
If all you want to do is read the contract, there is no installation required; just go to the **contracts** directory. 

If you want to run the contract locally or run the tests, you need to install  [Truffle](http://truffleframework.com/):

```bash
npm install -g truffle
```
You also need to install testrpc for running the tests:
```bash
npm install -g ethereumjs-testrpc
```
Lastly, you need to do an npm install on the repo itself:

```bash
npm install
```
## The Contracts
The contracts  rely on the inheritance feature of Solidity to pull in several other Solidity files, all from the [Open Zeppelin](https://github.com/OpenZeppelin/zeppelin-solidity) project. You can read these files by drilling into the **node_modules\zeppelin-solidity** directory. 

Contracts with **-etherscan** denote contracts that have had their import statements replaced for the purpose of publishing the source code on [Etherscan](https://etherscan.io).

Mainnet addresses for all contracts can be found on the [Etherbay](https://www.etherbay.com) category pages for each contract type.

## Running Tests

To run the unit tests on the contract, run
```bash
truffle test
```
Make sure that testrpc is running before you run the tests.