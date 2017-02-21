import HookedWalletSubprovider from "web3-provider-engine/subproviders/hooked-wallet.js";
import LedgerWallet from "./LedgerWallet";

function LedgerWalletSubproviderFactory(){
    const LedgerWalletSubprovider = new HookedWalletSubprovider(new LedgerWallet());

    //So that you can check before registering and handle an error.
    //Otherwise constructor will throw.
    LedgerWalletSubprovider.isSupported = LedgerWallet.isSupported;

    return LedgerWalletSubprovider;
}

export default LedgerWalletSubproviderFactory;