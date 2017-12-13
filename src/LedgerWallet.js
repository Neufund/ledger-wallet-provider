import ledger from "ledgerco/src/index";
import EthereumTx from "ethereumjs-tx";
import { timeout } from "promise-timeout";

import u2f from "./u2f-api";

const isNode = typeof window === "undefined";

if (!isNode && window.u2f === undefined) {
  window.u2f = u2f;
}

const NOT_SUPPORTED_ERROR_MSG =
  "LedgerWallet uses U2F which is not supported by your browser. " +
  "Use Chrome, Opera or Firefox with a U2F extension." +
  "Also make sure you're on an HTTPS connection";
/**
 *  @class LedgerWallet
 *
 *
 *  Paths:
 *  Minimum Nano Ledger S accepts are:
 *
 *   * 44'/60'
 *   * 44'/61'
 *
 *  MyEtherWallet.com by default uses the range
 *
 *   * 44'/60'/0'/n
 *
 *  Note: no hardend derivation on the `n`
 *
 *  BIP44/EIP84 specificies:
 *
 *  * m / purpose' / coin_type' / account' / change / address_index
 *
 *  @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 *  @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 *  @see https://github.com/MetaMask/provider-engine
 *  @see https://github.com/ethereum/wiki/wiki/JavaScript-API
 *
 *  Implementations:
 *  https://github.com/MetaMask/metamask-plugin/blob/master/app/scripts/keyrings/hd.js
 *
 */
const allowedHdPaths = ["44'/60'", "44'/61'"];

class LedgerWallet {
  constructor(getNetworkId, path, askForOnDeviceConfirmation = false) {
    this.askForOnDeviceConfirmation = askForOnDeviceConfirmation;
    this.getNetworkId = getNetworkId;
    // we store just one account that correspond to current derivation path.
    // It's set after first getAccounts call
    this.accounts = null;
    this.isU2FSupported = null;
    this.connectionOpened = false;
    this.getAppConfig = this.getAppConfig.bind(this);
    this.getAccounts = this.getAccounts.bind(this);
    this.getMultipleAccounts = this.getMultipleAccounts.bind(this);
    this.signTransaction = this.signTransaction.bind(this);
    this.getLedgerConnection = this.getLedgerConnection.bind(this);
    this.setDerivationPath = this.setDerivationPath.bind(this);
    this.setDerivationPath(path);
  }

  async init() {
    this.isU2FSupported = await LedgerWallet.isSupported();
  }

  /**
   * Checks if the browser supports u2f.
   * Currently there is no good way to do feature-detection,
   * so we call getApiVersion and wait for 100ms
   */
  static isSupported() {
    return new Promise(resolve => {
      if (isNode) {
        resolve(true);
      }
      if (window.u2f && !window.u2f.getApiVersion) {
        // u2f object is found (Firefox with extension)
        resolve(true);
      } else {
        // u2f object was not found. Using Google polyfill
        const intervalId = setTimeout(() => {
          resolve(false);
        }, 3000);
        u2f.getApiVersion(() => {
          clearTimeout(intervalId);
          resolve(true);
        });
      }
    });
  }

  async getLedgerConnection() {
    if (this.connectionOpened) {
      throw new Error(
        "You can only have one ledger connection active at a time"
      );
    } else {
      this.connectionOpened = true;
      // eslint-disable-next-line new-cap
      return new ledger.eth(
        isNode
          ? await ledger.comm_node.create_async()
          : await ledger.comm_u2f.create_async()
      );
    }
  }

  async closeLedgerConnection(eth) {
    this.connectionOpened = false;
    await eth.comm.close_async();
  }

  setDerivationPath(path) {
    const newPath = path || "44'/60'/0'/0";
    if (!allowedHdPaths.some(hdPref => newPath.startsWith(hdPref))) {
      throw new Error(
        `hd derivation path for Nano Ledger S may only start [${allowedHdPaths}], ${newPath} was provided`
      );
    }
    this.path = newPath;
    this.accounts = null;
  }

  /**
   * @typedef {function} failableCallback
   * @param error
   * @param result
   * */

  /**
   * Gets the version of installed Ethereum app
   * Check the isSupported() before calling that function
   * otherwise it never returns
   * @param {failableCallback} callback
   * @param ttl - timeout
   */
  // TODO: order of parameters should be reversed so it follows pattern parameter callback and can be promisfied
  async getAppConfig(callback, ttl) {
    if (!this.isU2FSupported) {
      callback(new Error(NOT_SUPPORTED_ERROR_MSG), null);
      return;
    }
    const eth = await this.getLedgerConnection();
    const cleanupCallback = (error, data) => {
      this.closeLedgerConnection(eth);
      callback(error, data);
    };
    timeout(eth.getAppConfiguration_async(), ttl)
      .then(config => cleanupCallback(null, config))
      .catch(error => cleanupCallback(error));
  }

  /**
   * Gets a list of accounts from a device - currently it's returning just
   * first one according to derivation path
   * @param {failableCallback} callback
   */
  async getAccounts(callback) {
    if (!this.isU2FSupported) {
      callback(new Error(NOT_SUPPORTED_ERROR_MSG), null);
      return;
    }
    if (this.accounts !== null) {
      callback(null, this.accounts);
      return;
    }
    const chainCode = false; // Include the chain code
    const eth = await this.getLedgerConnection();
    const cleanupCallback = (error, data) => {
      this.closeLedgerConnection(eth);
      callback(error, data);
    };
    eth
      .getAddress_async(this.path, this.askForOnDeviceConfirmation, chainCode)
      .then(result => {
        this.accounts = [result.address.toLowerCase()];
        cleanupCallback(null, this.accounts);
      })
      .catch(error => cleanupCallback(error));
  }

  async getMultipleAccounts(
    derivationPath,
    startingIndex,
    accountsNo,
    callback
  ) {
    if (!this.isU2FSupported) {
      callback(new Error(NOT_SUPPORTED_ERROR_MSG), null);
      return;
    }
    const chainCode = false; // Include the chain code
    const eth = await this.getLedgerConnection();
    const cleanupCallback = (error, data) => {
      this.closeLedgerConnection(eth);
      callback(error, data);
    };
    const addresses = {};
    for (let i = startingIndex; i < startingIndex + accountsNo; i += 1) {
      const path = `${derivationPath}${i}`;
      // eslint-disable-next-line no-await-in-loop
      const address = await eth.getAddress_async(
        path,
        this.askForOnDeviceConfirmation,
        chainCode
      );
      addresses[path] = address.address;
    }
    cleanupCallback(null, addresses);
  }

  async signTransactionAsync(txData) {
    let eth = null;
    try {
      if (!this.isU2FSupported) {
        return Promise.reject(new Error(NOT_SUPPORTED_ERROR_MSG));
      }
      // Encode using ethereumjs-tx
      const tx = new EthereumTx(txData);
      const chainId = parseInt(await this.getNetworkId(), 10);

      // Set the EIP155 bits
      tx.raw[6] = Buffer.from([chainId]); // v
      tx.raw[7] = Buffer.from([]); // r
      tx.raw[8] = Buffer.from([]); // s

      // Encode as hex-rlp for Ledger
      const hex = tx.serialize().toString("hex");

      eth = await this.getLedgerConnection();

      // Pass to _ledger for signing
      const result = await eth.signTransaction_async(this.path, hex);

      // Store signature in transaction
      /* eslint-disable no-buffer-constructor */
      tx.v = new Buffer(result.v, "hex");
      tx.r = new Buffer(result.r, "hex");
      tx.s = new Buffer(result.s, "hex");
      /* eslint-enable no-buffer-constructor */

      // EIP155: v should be chain_id * 2 + {35, 36}
      const signedChainId = Math.floor((tx.v[0] - 35) / 2);
      if (signedChainId !== chainId) {
        return Promise.reject(
          new Error(
            "Invalid signature received. Please update your Ledger Nano S."
          )
        );
      }

      // Return the signed raw transaction
      const rawTx = `0x${tx.serialize().toString("hex")}`;
      return Promise.resolve(rawTx);
    } catch (e) {
      return Promise.reject(e);
    } finally {
      if (eth !== null) {
        this.closeLedgerConnection(eth);
      }
    }
  }

  /**
   * Signs txData in a format that ethereumjs-tx accepts
   * @param {object} txData - transaction to sign
   * @param {failableCallback} callback - callback
   */
  signTransaction(txData, callback) {
    this.signTransactionAsync(txData)
      .then(res => callback(null, res))
      .catch(err => callback(err, null));
  }
}

module.exports = LedgerWallet;
