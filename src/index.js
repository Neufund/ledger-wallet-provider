import HookedWalletSubprovider from "web3-provider-engine/subproviders/hooked-wallet.js";
import LedgerWallet from "./LedgerWallet";

function LedgerWalletSubproviderFactory(){
    const LedgerWalletSubprovider = new HookedWalletSubprovider(new LedgerWallet());

    // This convenience method lets you handle the case where your users browser doesn't support U2F
    // before adding the LedgerWalletSubprovider to a providerEngine instance.
    LedgerWalletSubprovider.isSupported = LedgerWallet.isSupported;

    return LedgerWalletSubprovider;
}

export default LedgerWalletSubproviderFactory;