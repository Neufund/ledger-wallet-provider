'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _indexBrowserify = require('ledgerco/src/index-browserify');

var _indexBrowserify2 = _interopRequireDefault(_indexBrowserify);

var _ethereumjsTx = require('ethereumjs-tx');

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

var _u2fApi = require('./u2f-api');

var _u2fApi2 = _interopRequireDefault(_u2fApi);

var _promiseTimeout = require('promise-timeout');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (window.u2f === undefined) window.u2f = _u2fApi2.default;

var NOT_SUPPORTED_ERROR_MSG = "LedgerWallet uses U2F which is not supported by your browser. " + "Use Chrome, Opera or Firefox with a U2F extension." + "Also make sure you're on an HTTPS connection";
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
var allowed_hd_paths = ["44'/60'", "44'/61'"];

var LedgerWallet = function () {
    function LedgerWallet(path) {
        var askForOnDeviceConfirmation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        (0, _classCallCheck3.default)(this, LedgerWallet);

        path = path || allowed_hd_paths[0];
        if (!allowed_hd_paths.some(function (hd_pref) {
            return path.startsWith(hd_pref);
        })) throw new Error('hd derivation path for Nano Ledger S may only start [' + allowed_hd_paths + '], ' + path + ' was provided');
        this._path = path;
        this._askForOnDeviceConfirmation = askForOnDeviceConfirmation;
        this._accounts = null;
        this.isU2FSupported = null;
        this.getAppConfig = this.getAppConfig.bind(this);
        this.getAccounts = this.getAccounts.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this._getLedgerConnection = this._getLedgerConnection.bind(this);
        this.connectionOpened = false;
    }

    (0, _createClass3.default)(LedgerWallet, [{
        key: 'init',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return LedgerWallet.isSupported();

                            case 2:
                                this.isU2FSupported = _context.sent;

                            case 3:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function init() {
                return _ref.apply(this, arguments);
            }

            return init;
        }()

        /**
         * Checks if the browser supports u2f.
         * Currently there is no good way to do feature-detection,
         * so we call getApiVersion and wait for 100ms
         */

    }, {
        key: '_getLedgerConnection',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.connectionOpened) {
                                    _context2.next = 4;
                                    break;
                                }

                                throw new Error("You can only have one ledger connection active at a time");

                            case 4:
                                this.connectionOpened = true;
                                _context2.t0 = _indexBrowserify2.default.eth;
                                _context2.next = 8;
                                return _indexBrowserify2.default.comm_u2f.create_async();

                            case 8:
                                _context2.t1 = _context2.sent;
                                return _context2.abrupt('return', new _context2.t0(_context2.t1));

                            case 10:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function _getLedgerConnection() {
                return _ref2.apply(this, arguments);
            }

            return _getLedgerConnection;
        }()
    }, {
        key: '_closeLedgerConnection',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(eth) {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                this.connectionOpened = false;
                                _context3.next = 3;
                                return eth.comm.close_async();

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _closeLedgerConnection(_x2) {
                return _ref3.apply(this, arguments);
            }

            return _closeLedgerConnection;
        }()

        /**
         @typedef {function} failableCallback
         @param error
         @param result
         */

        /**
         * Gets the version of installed ethereum app
         * Check the isSupported() before calling that function
         * otherwise it never returns
         * @param {failableCallback} callback
         * @param ttl - timeout
         */

    }, {
        key: 'getAppConfig',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(callback, ttl) {
                var _this = this;

                var eth, cleanupCallback;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (this.isU2FSupported) {
                                    _context4.next = 3;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context4.abrupt('return');

                            case 3:
                                _context4.next = 5;
                                return this._getLedgerConnection();

                            case 5:
                                eth = _context4.sent;

                                cleanupCallback = function cleanupCallback(error, data) {
                                    _this._closeLedgerConnection(eth);
                                    callback(error, data);
                                };

                                (0, _promiseTimeout.timeout)(eth.getAppConfiguration_async(), ttl).then(function (config) {
                                    return cleanupCallback(null, config);
                                }).catch(function (error) {
                                    return cleanupCallback(error);
                                });

                            case 8:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getAppConfig(_x3, _x4) {
                return _ref4.apply(this, arguments);
            }

            return getAppConfig;
        }()

        /**
         * Gets a list of accounts from a device
         * @param {failableCallback} callback
         */

    }, {
        key: 'getAccounts',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(callback) {
                var _this2 = this;

                var chainCode, eth, cleanupCallback;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (this.isU2FSupported) {
                                    _context5.next = 3;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context5.abrupt('return');

                            case 3:
                                if (!(this._accounts !== null)) {
                                    _context5.next = 6;
                                    break;
                                }

                                callback(null, this._accounts);
                                return _context5.abrupt('return');

                            case 6:
                                chainCode = false; // Include the chain code

                                _context5.next = 9;
                                return this._getLedgerConnection();

                            case 9:
                                eth = _context5.sent;

                                cleanupCallback = function cleanupCallback(error, data) {
                                    _this2._closeLedgerConnection(eth);
                                    callback(error, data);
                                };

                                eth.getAddress_async(this._path, this._askForOnDeviceConfirmation, chainCode).then(function (result) {
                                    this._accounts = [result.address.toLowerCase()];
                                    cleanupCallback(null, this._accounts);
                                }.bind(this)).catch(function (error) {
                                    return cleanupCallback(error);
                                });

                            case 12:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function getAccounts(_x5) {
                return _ref5.apply(this, arguments);
            }

            return getAccounts;
        }()

        /**
         * Signs txData in a format that ethereumjs-tx accepts
         * @param {object} txData - transaction to sign
         * @param {failableCallback} callback - callback
         */

    }, {
        key: 'signTransaction',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(txData, callback) {
                var tx;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                if (this.isU2FSupported) {
                                    _context7.next = 3;
                                    break;
                                }

                                callback(new Error(NOT_SUPPORTED_ERROR_MSG));
                                return _context7.abrupt('return');

                            case 3:
                                // Encode using ethereumjs-tx
                                tx = new _ethereumjsTx2.default(txData);

                                // Fetch the chain id

                                web3.version.getNetwork(function () {
                                    var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(error, chain_id) {
                                        var _this3 = this;

                                        var hex, eth, cleanupCallback;
                                        return _regenerator2.default.wrap(function _callee6$(_context6) {
                                            while (1) {
                                                switch (_context6.prev = _context6.next) {
                                                    case 0:
                                                        if (error) callback(error);

                                                        // Force chain_id to int
                                                        chain_id = 0 | chain_id;

                                                        // Set the EIP155 bits
                                                        tx.raw[6] = Buffer.from([chain_id]); // v
                                                        tx.raw[7] = Buffer.from([]); // r
                                                        tx.raw[8] = Buffer.from([]); // s

                                                        // Encode as hex-rlp for Ledger
                                                        hex = tx.serialize().toString("hex");
                                                        _context6.next = 8;
                                                        return this._getLedgerConnection();

                                                    case 8:
                                                        eth = _context6.sent;

                                                        cleanupCallback = function cleanupCallback(error, data) {
                                                            _this3._closeLedgerConnection(eth);
                                                            callback(error, data);
                                                        };
                                                        // Pass to _ledger for signing


                                                        eth.signTransaction_async(this._path, hex).then(function (result) {
                                                            // Store signature in transaction
                                                            tx.v = new Buffer(result.v, "hex");
                                                            tx.r = new Buffer(result.r, "hex");
                                                            tx.s = new Buffer(result.s, "hex");

                                                            // EIP155: v should be chain_id * 2 + {35, 36}
                                                            var signed_chain_id = Math.floor((tx.v[0] - 35) / 2);
                                                            if (signed_chain_id !== chain_id) {
                                                                cleanupCallback("Invalid signature received. Please update your Ledger Nano S.");
                                                            }

                                                            // Return the signed raw transaction
                                                            var rawTx = "0x" + tx.serialize().toString("hex");
                                                            cleanupCallback(undefined, rawTx);
                                                        }).catch(function (error) {
                                                            return cleanupCallback(error);
                                                        });

                                                    case 11:
                                                    case 'end':
                                                        return _context6.stop();
                                                }
                                            }
                                        }, _callee6, this);
                                    }));

                                    return function (_x8, _x9) {
                                        return _ref7.apply(this, arguments);
                                    };
                                }().bind(this));

                            case 5:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function signTransaction(_x6, _x7) {
                return _ref6.apply(this, arguments);
            }

            return signTransaction;
        }()
    }], [{
        key: 'isSupported',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                return _context8.abrupt('return', new _promise2.default(function (resolve, reject) {
                                    if (window.u2f && !window.u2f.getApiVersion) {
                                        // u2f object is found (Firefox with extension)
                                        resolve(true);
                                    } else {
                                        // u2f object was not found. Using Google polyfill
                                        var intervalId = setTimeout(function () {
                                            resolve(false);
                                        }, 3000);
                                        _u2fApi2.default.getApiVersion(function (version) {
                                            clearTimeout(intervalId);
                                            resolve(true);
                                        });
                                    }
                                }));

                            case 1:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function isSupported() {
                return _ref8.apply(this, arguments);
            }

            return isSupported;
        }()
    }]);
    return LedgerWallet;
}();

module.exports = LedgerWallet;