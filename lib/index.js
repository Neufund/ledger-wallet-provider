"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _hookedWallet = require("web3-provider-engine/subproviders/hooked-wallet.js");

var _hookedWallet2 = _interopRequireDefault(_hookedWallet);

var _LedgerWallet = require("./LedgerWallet");

var _LedgerWallet2 = _interopRequireDefault(_LedgerWallet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(getNetworkId, path_override, askForOnDeviceConfirmation) {
        var ledger, LedgerWalletSubprovider;
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        ledger = new _LedgerWallet2.default(getNetworkId, path_override, askForOnDeviceConfirmation);
                        _context.next = 3;
                        return ledger.init();

                    case 3:
                        LedgerWalletSubprovider = new _hookedWallet2.default(ledger);

                        // This convenience method lets you handle the case where your users browser doesn't support U2F
                        // before adding the LedgerWalletSubprovider to a providerEngine instance.

                        LedgerWalletSubprovider.isSupported = ledger.isU2FSupported;
                        LedgerWalletSubprovider.ledger = ledger;

                        return _context.abrupt("return", LedgerWalletSubprovider);

                    case 7:
                    case "end":
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x, _x2, _x3) {
        return _ref.apply(this, arguments);
    };
}();