"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (web3, path_override) {
  var ledger = new _LedgerWallet2.default(web3, path_override);
  var LedgerWalletSubprovider = new _hookedWallet2.default(ledger);

  // This convenience method lets you handle the case where your users browser doesn't support U2F
  // before adding the LedgerWalletSubprovider to a providerEngine instance.
  LedgerWalletSubprovider.isSupported = ledger.isU2FSupported;
  LedgerWalletSubprovider.ledger = ledger;

  return LedgerWalletSubprovider;
};

var _hookedWallet = require("web3-provider-engine/subproviders/hooked-wallet");

var _hookedWallet2 = _interopRequireDefault(_hookedWallet);

var _LedgerWallet = require("./LedgerWallet");

var _LedgerWallet2 = _interopRequireDefault(_LedgerWallet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }