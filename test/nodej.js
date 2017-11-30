const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
const HookedWalletSubprovider  = require('web3-provider-engine/subproviders/hooked-wallet');
const promisify = require('bluebird').promisify;

const LedgerWallet  = require("../src/LedgerWallet");

const dp1 = "44'/60'/0'/0";
const dp2 = "44'/60'/0'/1";

async function main () {

  // is doesen't work with my https proxy!
  const web3Classic = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  web3Classic.eth.getAccountsAsync = promisify(web3Classic.eth.getAccounts);
  web3Classic.eth.sendTransactionAsync = promisify(web3Classic.eth.sendTransaction);

  const engine = new ProviderEngine();
  const web3 = new Web3(engine);
  web3.eth.getAccountsAsync = promisify(web3.eth.getAccounts);
  web3.eth.getBalanceAsync = promisify(web3.eth.getBalance);
  web3.eth.sendTransactionAsync = promisify(web3.eth.sendTransaction);


  const ledger = new LedgerWallet(() => 44, dp1);
  await ledger.init();
  engine.addProvider(new HookedWalletSubprovider(ledger));
  engine.addProvider(
      new RpcSubprovider({rpcUrl: "https://localhost:8555"}));

  engine.start();

  try {
    const account0 = (await web3Classic.eth.getAccountsAsync())[0];
    const ledgerAccount = (await web3.eth.getAccountsAsync())[0];

    console.log(account0);
    console.log(ledgerAccount);

    console.log(web3.fromWei(await web3.eth.getBalanceAsync(account0), "ether").toString());
    console.log(web3.fromWei(await web3.eth.getBalanceAsync(ledgerAccount), "ether").toString());

    await web3Classic.eth.sendTransactionAsync({
      from: account0,
      to: ledgerAccount,
      value: web3.toWei(10, "ether"),
    });

    console.log(web3.fromWei(await web3.eth.getBalanceAsync(account0), "ether").toString());
    console.log(web3.fromWei(await web3.eth.getBalanceAsync(ledgerAccount), "ether").toString());

    await web3.eth.sendTransactionAsync({
      from: ledgerAccount,
      to: account0,
      value: web3.toWei(0.5, "ether"),
    });

    console.log(web3.fromWei(await web3.eth.getBalanceAsync(account0), "ether").toString());
    console.log(web3.fromWei(await web3.eth.getBalanceAsync(ledgerAccount), "ether").toString());

    } catch (e) {
    console.log(e);
  }

  engine.stop();
}

main().catch(err => console.log(err));
