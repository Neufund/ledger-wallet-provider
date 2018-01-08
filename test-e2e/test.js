/* eslint-disable no-alert, no-console */

const Web3 = require("web3");
const ProviderEngine = require("web3-provider-engine");
const FetchSubprovider = require("web3-provider-engine/subproviders/fetch");
const HookedWalletSubprovider = require("web3-provider-engine/subproviders/hooked-wallet");
const { promisify } = require("bluebird");

const LedgerWallet = require("../src/LedgerWallet");
const { config } = require("./config");

const isNode = typeof window === "undefined";

// Public keys of accounts setup in ganache-cli.sh
const ganacheAcc1 = isNode
  ? "0x7bd1e022bdfbd45d77913bec1582dc095cb5fa31"
  : "0x627d795782f653c8ea5e7a63b9cdfe5cb6846d9f";
const ganacheAcc2 = isNode
  ? "0x2e6d01625685281a1e3d10e4b41a61b4e6acb55f"
  : "0xf40011040398947b3c6b7532ed23fbc8c19c9654";

const rpcUrl = isNode
  ? "http://localhost:8545"
  : "https://localhost:8080/node/";

async function main() {
  const engine = new ProviderEngine();
  const web3 = new Web3(engine);
  web3.eth.getAccountsAsync = promisify(web3.eth.getAccounts);
  web3.eth.getBalanceAsync = promisify(web3.eth.getBalance);
  web3.eth.sendTransactionAsync = promisify(web3.eth.sendTransaction);
  web3.eth.signAsync = promisify(web3.eth.sign);

  const ledger = new LedgerWallet(() => 44, config.dp0);
  await ledger.init();
  engine.addProvider(new HookedWalletSubprovider(ledger));
  engine.addProvider(new FetchSubprovider({ rpcUrl }));

  engine.start();

  console.log('Signing message "hello world"');
  const sha3 = web3.sha3("hello world");
  const signedMsg = await web3.eth.signAsync(config.dp0Acc0, sha3);
  console.log(signedMsg);

  const ledgerDp0Acc0 = (await web3.eth.getAccountsAsync())[0];
  console.log(
    `First account from ledger: ${ledgerDp0Acc0} on derivation path: ${
      config.dp0
    }`
  );
  if (config.dp0Acc0.toLowerCase() !== ledgerDp0Acc0.toLowerCase()) {
    engine.stop();
    throw new Error("Account dp0Acc0 mismatch when using web3.eth.getAccounts");
  }

  const ledgerDp0Accs = await ledger.getMultipleAccounts(config.dp0, 0, 2);
  const ledgerDp0Acc1 = ledgerDp0Accs[Object.keys(ledgerDp0Accs)[1]];
  console.log(
    `Second account from ledger: ${ledgerDp0Acc1} on derivation path: ${
      config.dp0
    }`
  );
  if (config.dp0Acc1.toLowerCase() !== ledgerDp0Acc1.toLowerCase()) {
    engine.stop();
    throw new Error(
      "Account dp1Acc1 mismatch when using ledger.MultipleAccounts"
    );
  }

  await web3.eth.sendTransactionAsync({
    from: ledgerDp0Acc0,
    to: ganacheAcc1,
    value: web3.toWei(0.5, "ether")
  });

  ledger.setDerivationPath(config.dp1);

  const ledgerDp1Acc0 = (await web3.eth.getAccountsAsync())[0];
  console.log(
    `First account from ledger: ${ledgerDp1Acc0} on derivation path: ${
      config.dp1
    }`
  );
  if (config.dp1Acc0.toLowerCase() !== ledgerDp1Acc0.toLowerCase()) {
    engine.stop();
    throw new Error("Account dp1Acc0 mismatch when using web3.eth.getAccounts");
  }

  const ledgerDp1Accs = await ledger.getMultipleAccounts(config.dp1, 0, 2);
  const ledgerDp1Acc1 = ledgerDp1Accs[Object.keys(ledgerDp1Accs)[1]];
  console.log(
    `Second account from ledger: ${ledgerDp1Acc1} on derivation path: ${
      config.dp1
    }`
  );
  if (config.dp1Acc1.toLowerCase() !== ledgerDp1Acc1.toLowerCase()) {
    engine.stop();
    throw new Error(
      "Account dp1Acc1 mismatch when using ledger.MultipleAccounts"
    );
  }

  await web3.eth.sendTransactionAsync({
    from: ledgerDp1Acc0,
    to: ganacheAcc2,
    value: web3.toWei(0.5, "ether")
  });

  console.log(
    web3
      .fromWei(await web3.eth.getBalanceAsync(ganacheAcc1), "ether")
      .toString()
  );
  console.log(
    web3
      .fromWei(await web3.eth.getBalanceAsync(ganacheAcc2), "ether")
      .toString()
  );

  engine.stop();
}

main().catch(err => {
  console.log(err);
  if (isNode) {
    process.exit(1);
  }
});
