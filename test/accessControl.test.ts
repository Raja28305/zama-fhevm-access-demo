import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { Contract } from "ethers";

describe("AccessControlledCipher", function () {
  let owner: SignerWithAddress;
  let decryptor: SignerWithAddress;
  let alice: SignerWithAddress;
  let contract: Contract;

  beforeEach(async function () {
    [owner, decryptor, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AccessControlledCipher", owner);
    contract = await Factory.deploy(decryptor.address);
    await contract.deployed();
  });

  it("allows storing ciphertext and requesting decryption", async function () {
    const id = 1;
    // create a mock ciphertext: for our mock decryptor we reverse plaintext bytes
    const plaintext = "salary:1000";
    const ciphertextHex = "0x" + Buffer.from(plaintext).reverse().toString("hex");

    // store ciphertext
    await expect(contract.connect(owner).storeCiphertext(id, ciphertextHex))
      .to.emit(contract, "CipherStored")
      .withArgs(id, owner.address);

    // request decryption by alice
    await expect(contract.connect(alice).requestDecryption(id))
      .to.emit(contract, "DecryptionRequested")
      .withArgs(id, alice.address);

    // simulate decryptor submitting result (decryptor signer)
    const expectedPlain = plaintext; // because mock decryptor will reverse again
    await expect(contract.connect(decryptor).submitDecryptionResult(id, expectedPlain))
      .to.emit(contract, "DecryptionSubmitted")
      .withArgs(id, expectedPlain, decryptor.address);

    // verify stored result
    const stored = await contract.decryptedResult(id);
    expect(stored).to.equal(expectedPlain);
  });

  it("prevents non-decryptor from submitting", async function () {
    const id = 2;
    const ciphertextHex = "0x" + Buffer.from("secret").reverse().toString("hex");
    await contract.connect(owner).storeCiphertext(id, ciphertextHex);
    await contract.connect(alice).requestDecryption(id);
    await expect(contract.connect(alice).submitDecryptionResult(id, "nope")).to.be.revertedWith("decryptor only");
  });

  it("lets owner change decryptor", async function () {
    const newDec = (await ethers.getSigners())[3];
    await expect(contract.connect(owner).setDecryptor(newDec.address))
      .to.emit(contract, "DecryptorUpdated")
      .withArgs(decryptor.address, newDec.address);

    // now newDec can submit
    const id = 3;
    const ciphertextHex = "0x" + Buffer.from("abc").reverse().toString("hex");
    await contract.connect(owner).storeCiphertext(id, ciphertextHex);
    await contract.connect(alice).requestDecryption(id);
    await expect(contract.connect(newDec).submitDecryptionResult(id, "abc"))
      .to.emit(contract, "DecryptionSubmitted");
  });
});
