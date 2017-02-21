const Ledger3 = require("./vendor/ledger3.js");
const LedgerEth = require("./vendor/ledger-eth.js");
const Tx = require("ethereumjs-tx");
const u2fApi = require("u2f-api");

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
class LedgerWallet {
    constructor() {
        this._path = "44'/60'/0'/0";
        this._accounts = undefined;
        this._scrambleKey = "w0w"; // Hardcoded key for the Ledger Nano S
        this._ledger3 = new Ledger3(this._scrambleKey);
        this._ledger = new LedgerEth(this._ledger3);
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
    }

    /**
     * Checks if the browser supports u2f.
     * Currently there is no god way to do feature-detection,
     * so we do user-agent detection
     * and have a special case for firefox FIDO extension
     * @param cb
     */
    static isSupported(cb) {
        if (window.u2f.getApiVersion) {
            // u2f object was not found. Using Google polyfill
            // Use user-agent based check
            u2fApi.isSupported().then((supported)=>cb(supported));
        } else {
            // u2f object is found (Firefox with extension)
            cb(true);
        }
    }

    /**
     * Gets the version of installed ethereum app
     * Check the isSupported() before calling that function
     * otherwise it never returns
     * @param cb
     */
    getAppConfig(cb) {
        this._ledger.getAppConfiguration((config)=> {
            // TODO: Need at least version 1.0.4 for EIP155 signing
            cb(config);
        });
    }

    /**
     @typedef {function} failableCallback
     @param error
     @param result
     */

    /**
     * Gets a list of accounts from a device
     * @param {failableCallback} callback
     * @param askForOnDeviceConfirmation
     */
    getAccounts(callback, askForOnDeviceConfirmation = true) {
        var self = this;
        if (this._accounts !== undefined) {
            callback(undefined, this._accounts);
            return;
        }

        const chainCode = false; // Include the chain code
        this._ledger.getAddress(this._path, (result, error)=> {
            if (typeof result === undefined) {
                callback(error, result);
            }
            // Ledger returns checksumed addresses (https://github.com/ethereum/EIPs/issues/55)
            // and Provider engine doesn't handle them correctly, that's why we coerce them to usual addresses
            self._accounts = [result.address.toLowerCase()];
            callback(error, self._accounts);
        }, askForOnDeviceConfirmation, chainCode);
    }

    /**
     * Signs txData in a format that ethereumjs-tx accepts
     * @param {object} txData - transaction to sign
     * @param {failableCallback} callback - callback
     */
    signTransaction(txData, callback) {
        var self = this;

        // Encode using ethereumjs-tx
        var tx = new Tx(txData);

        // Fetch the chain id
        web3.version.getNetwork((error, chain_id)=> {
            if (error) callback(error);

            // Force chain_id to int
            chain_id = 0 | chain_id;

            // Set the EIP155 bits
            tx.raw[6] = Buffer.from([chain_id]); // v
            tx.raw[7] = Buffer.from([]);         // r
            tx.raw[8] = Buffer.from([]);         // s

            // Encode as hex-rlp for Ledger
            const hex = tx.serialize().toString("hex");

            // Pass to _ledger for signing
            self._ledger.signTransaction(self._path, hex, (result, error)=> {
                if (error) callback(error);

                // Store signature in transaction
                tx.v = new Buffer(result.v, "hex");
                tx.r = new Buffer(result.r, "hex");
                tx.s = new Buffer(result.s, "hex");

                // EIP155: v should be chain_id * 2 + {35, 36}
                const signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
                if (signed_chain_id !== chain_id) {
                    callback("Invalid signature received. Please update your Ledger Nano S.");
                }

                // Return the signed raw transaction
                var rawTx = "0x" + tx.serialize().toString("hex");
                callback(undefined, rawTx);
            })
        })
    }
}

module.exports = LedgerWallet;