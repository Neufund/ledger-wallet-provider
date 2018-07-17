import { expect } from "chai";

import { obtainPathComponentsFromDerivationPath } from "../src/LedgerWallet";

describe("LedgerWallet", () => {
  describe("obtainPathComponentsFromDerivationPath()", () => {
    it("should parse correctly", () => {
      const correctDps = [
        ["44'/60'/0'/0/", 0],
        ["44'/61'/0'/0/", 0],
        ["44'/60'/0/0/", 0],
        ["44'/60'/0'/1/", 0],
        ["44'/60'/0'/0/", 999],
        ["44'/60'/999'/0/", 0],
        ["44'/60'/0'/", 0],
        ["44'/61'/0'/", 0],
        ["44'/60'/0'/", 999],
        ["44'/60'/0/", 0],
        ["44'/60'/32'/", 0]
      ];

      for (const correctDp of correctDps) {
        const pathComponents = obtainPathComponentsFromDerivationPath(
          correctDp[0] + correctDp[1]
        );
        expect(pathComponents.basePath).to.be.equal(correctDp[0]);
        expect(pathComponents.index).to.be.equal(correctDp[1]);
      }
    });
    it("should fail for derivation path not matching pattern", () => {
      const incorrectDps = [
        "44'/60'/0'/2/0",
        "44'/62'/0'/0",
        "44'/60'/0'/",
        "44'/60'/0'/0'",
        "44'/60'/0'/0a",
        "a44'/60'/0'/0",
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
