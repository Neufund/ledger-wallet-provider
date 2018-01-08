# LedgerWalletProvider

The LedgerWalletProvider lets your dapp communicate directly with a user's [Ledger Nano S](https://www.ledgerwallet.com/products/ledger-nano-s) using the [zero client provider engine](https://github.com/MetaMask/provider-engine) developed by Metamask.

Instead of setting your web3's provider to an HttpProvider or IpcProvider, you can create a custom provider using the [provider engine](https://github.com/MetaMask/provider-engine) and tell it to use LedgerWalletProvider for all id management requests (e.g getAccounts, approveTransaction and signTransaction). This way, your users can confirm your dapp's transactions directly from their Ledger Nano S!

# Requirements

In order for your dapp to play nicely with the LedgerWallet over U2F, it will need to be served over https. In addition to this, your browser must support U2F. Firefox users can use this [U2F extension](https://addons.mozilla.org/en-US/firefox/addon/u2f-support-add-on/). If on chrome or opera, LedgerWalletProvider will automatically polyfill U2F support for you.

# Installation

```
npm install ledger-wallet-provider --save
```

# Usage

In order to have a working provider you can pass to your web3, you will need these additional dependencies installed:

```
npm install web3-provider-engine --save
```
```
npm install web3 --save
```

In your project, add the following:

```
var Web3 = require('web3');
var ProviderEngine = require('web3-provider-engine');
var RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
var LedgerWalletSubproviderFactory = require('ledger-wallet-provider').default;

var engine = new ProviderEngine();
var web3 = new Web3(engine);

var ledgerWalletSubProvider = async LedgerWalletSubproviderFactory();
engine.addProvider(ledgerWalletSubProvider);
engine.addProvider(new RpcSubprovider({rpcUrl: '/api'})); // you need RPC endpoint
engine.start();

web3.eth.getAccounts(console.log);
```

To change derivation path that will be used to derive private/public keys on your nano, modify snippet above as follows

```
var derivation_path = "44'/60'/103'/0'";
var ledgerWalletSubProvider = async LedgerWalletSubproviderFactory(derivation_path);
```

All paths must start with `44'/60'` or `44'/61'`.

**Note:** In order to send requests to the Ledger wallet, the user must have done the following:
- Plugged-in their Ledger Wallet Nano S
- Input their 4 digit pin
- Navigated to the Ethereum app on their device
- Enabled 'browser' support from the Ethereum app settings

It is your responsibility to show the user a friendly message, instructing them to do so. In order to detect when they have completed these steps, you can poll `web3.eth.getAccounts` which will return `undefined` until the Ledger Wallet is accessible.

If you would like to detect whether or not a user's browser supports U2F, you can call the `isSupported` convenience method on the `ledgerWalletSubProvider`:

```
var LedgerWalletSubproviderFactory = require('ledger-wallet-provider').default;

var ledgerWalletSubProvider = LedgerWalletSubproviderFactory();
ledgerWalletSubProvider.isSupported()
    .then(function(isSupported) {
        console.log(isSupported ? 'Yes' : 'No');
    });
```

This might be helpful if you want to conditionally show Ledger Nano S support to users who could actually take advantage of it.

# Development
## Running tests
Currently we provide only kind of end to end tests. As we are testing integration with physical device it has to be manual process.
There are following steps:
### Obtain dependencies
Run `yarn` command.
### Prepare `config.js`
Copy `config.js.example` to `config.js` and edit it setting up your Nano's public keys. You can obtain them using [myetherwallet](https://www.myetherwallet.com/).
### Run ganche-cli (former testrpc)
Run `yarn ganache` command.
### Transfer test ether to Nano accounts that will be used in tests
Run `yarn test-e2e-setup` command.
### Run tests using node
Change Nano's settings - disable browser support.  
Run `yarn test-e2e-node` command.
### Run tests in browser
Change Nano's settings - enable browser support.  
Run `yarn test-e2e-web` command
Browser should open on url `https://localhost:8080`. Open dev console (`F12`) and check console for errors.
