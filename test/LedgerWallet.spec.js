import { expect } from "chai";

import { obtainPathComponentsFromDerivationPath } from "../src/LedgerWallet";

describe("LedgerWallet", () => {
  describe("obtainPathComponentsFromDerivationPath()", () => {
    it("should parse correctly", () => {
      const dp = "44'/60'/0'/0";
      const pathComponetns = obtainPathComponentsFromDerivationPath(dp);
      expect(pathComponetns.basePath).to.equal("44'/60'/0'/");
      expect(pathComponetns.index).to.equal(0);
    });
    it("should fail for derivation path not matching pattern", () => {
      const incorrectDps = [
        "44'/62'/0'/0",
        "44'/60'/0'/",
        "44'/60'/0'/0'",
        "44'/60'/0'/0a",
        "a44'/60'/0'/0",
        "44'/60'/0'/0/1",
        "44'/60'/0'/0'/s",
        "44'/60'/0'/0/"
      ];

      for (const incorrectDp of incorrectDps) {
        const f = () => obtainPathComponentsFromDerivationPath(incorrectDp);
        expect(f, `should throw on ${incorrectDp}`).to.throw();
      }
    });
  });
});
