# LedgerWalletProvider

Ledger Nano S wallet provider for the Web3 ProviderEngine

# Building

```
npm install; npm run build
```

# Using

```
const Web3 = require('web3');
const ProviderEngine = require('web3-provider-engine')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')
const LedgerWalletSubproviderFactory = require('ledger-wallet-provider')

var engine = new ProviderEngine();
web3 = new Web3(engine);

// id mgmt
engine.addProvider(new LedgerWalletSubprovider());

web3.eth.getAccounts(console.log);
```