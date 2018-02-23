import ledger from "ledgerco";
import stripHexPrefix from "strip-hex-prefix";
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
 *  MyEtherWallet.com by default uses the range which is not compatible with
 *  BIP44/EIP84
 *
 *   * 44'/60'/0'/n
 *
 *  Note: no hardened derivation on the `n`
 *
 *  @see https://github.com/MetaMask/provider-engine
 *  @see https://github.com/ethereum/wiki/wiki/JavaScript-API
 */
const allowedHdPaths = ["44'/60'", "44'/61'"];

class LedgerWallet {
  constructor(getNetworkId, path, askForOnDeviceConfirmation = false) {
    this.askForOnDeviceConfirmation = askForOnDeviceConfirmation;
    this.getNetworkId = getNetworkId;
    this.isU2FSupported = null;
    this.connectionOpened = false;
    this.getAppConfig = this.getAppConfig.bind(this);
    this.getAccounts = this.getAccounts.bind(this);
    this.getMultipleAccounts = this.getMultipleAccounts.bind(this);
    this.signTransaction = this.signTransaction.bind(this);
    this.signMessage = this.signMessage.bind(this);
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

  async getMultipleAccounts(derivationPath, indexOffset, accountsNo) {
    let eth = null;
    if (!this.isU2FSupported) {
      throw new Error(NOT_SUPPORTED_ERROR_MSG);
    }
    try {
      const pathComponents = LedgerWallet.obtainPathComponentsFromDerivationPath(
        derivationPath
      );

      const chainCode = false; // Include the chain code
      eth = await this.getLedgerConnection();
      const addresses = {};
      for (let i = indexOffset; i < indexOffset + accountsNo; i += 1) {
        const path =
          pathComponents.basePath + (pathComponents.index + i).toString();
        // eslint-disable-next-line no-await-in-loop
        const address = await eth.getAddress_async(
          path,
          this.askForOnDeviceConfirmation,
          chainCode
        );
        addresses[path] = address.address;
      }
      return addresses;
    } finally {
      if (eth !== null) {
        // This is fishy but currently ledger library always returns empty
        // resolved promise when closing connection so there is no point in
        // doing anything with returned Promise.
        await this.closeLedgerConnection(eth);
      }
    }
  }

  /**
   * PathComponent contains derivation path divided into base path and index.
   * @typedef {Object} PathComponent
   * @property {string} basePath - Base path of derivation path.
   * @property {number} index - index of addresses.
   */

  /**
   * Returns derivation path components: base path (ex 44'/60'/0'/) and index
   * used by getMultipleAccounts.
   * @param derivationPath
   * @returns {PathComponent} PathComponent
   */
  static obtainPathComponentsFromDerivationPath(derivationPath) {
    // check if derivation path follows 44'/60'/x'/n pattern
    const regExp = /^(44'\/6[0|1]'\/\d+'?\/)(\d+)$/;
    const matchResult = regExp.exec(derivationPath);
    if (matchResult === null) {
      throw new Error(
        "To get multiple accounts your derivation path must follow pattern 44'/60|61'/x'/n "
      );
    }

    return { basePath: matchResult[1], index: parseInt(matchResult[2], 10) };
  }

  async signTransactionAsync(txData) {
    let eth = null;
    if (!this.isU2FSupported) {
      throw new Error(NOT_SUPPORTED_ERROR_MSG);
    }
    try {
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
      tx.v = Buffer.from(result.v, "hex");
      tx.r = Buffer.from(result.r, "hex");
      tx.s = Buffer.from(result.s, "hex");

      // EIP155: v should be chain_id * 2 + {35, 36}
      const signedChainId = Math.floor((tx.v[0] - 35) / 2);
      if (signedChainId !== chainId) {
        throw new Error(
          "Invalid signature received. Please update your Ledger Nano S."
        );
      }

      // Return the signed raw transaction
      return `0x${tx.serialize().toString("hex")}`;
    } finally {
      if (eth !== null) {
        // This is fishy but currently ledger library always returns empty
        // resolved promise when closing connection so there is no point in
        // doing anything with returned Promise.
        await this.closeLedgerConnection(eth);
      }
    }
  }

  async signMessageAsync(msgData) {
    if (!this.isU2FSupported) {
      throw new Error(NOT_SUPPORTED_ERROR_MSG);
    }
    let eth = null;

    try {
      eth = await this.getLedgerConnection();

      const result = await eth.signPersonalMessage_async(
        this.path,
        stripHexPrefix(msgData.data)
      );
      // v should be tranmitted with chainCode (27) still added to be compatible with most signers like metamask, parity and geth
      const v = parseInt(result.v, 10);
      let vHex = v.toString(16);
      if (vHex.length < 2) {
        vHex = `0${v}`;
      }
      return `0x${result.r}${result.s}${vHex}`;
    } finally {
      if (eth !== null) {
        // This is fishy but currently ledger library always returns empty
        // resolved promise when closing connection so there is no point in
        // doing anything with returned Promise.
        await this.closeLedgerConnection(eth);
      }
    }
  }

  /**
   * Gets a list of accounts from a device - currently it's returning just
   * first one according to derivation path
   * @param {failableCallback} callback
   */
  getAccounts(callback) {
    this.getMultipleAccounts(this.path, 0, 1)
      .then(res => callback(null, Object.values(res)))
      .catch(err => callback(err, null));
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

  signMessage(txData, callback) {
    this.signMessageAsync(txData)
      .then(res => callback(null, res))
      .catch(err => callback(err, null));
  }
}

module.exports = LedgerWallet;
