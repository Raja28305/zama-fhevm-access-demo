/**
 * decryptor.ts
 *
 * Minimal off-chain decryptor:
 * - Connects to a local Hardhat network
 * - Listens for DecryptionRequested events
 * - Performs a mock "decrypt" (replace mockDecrypt with Zama SDK calls)
 * - Calls submitDecryptionResult on-chain as the authorized decryptor
 *
 * TODO: Replace mockDecrypt with Zama FHEVM SDK calls (example comments included).
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import AccessControlledArtifact from "../artifacts/contracts/AccessControlledCipher.sol/AccessControlledCipher.json";
dotenv.config();

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.DECRYPTOR_PRIVATE_KEY || ""; // decryptor key for submitting results
const CONTRACT_ADDR = process.env.CONTRACT_ADDR || "";

async function main() {
  if (!PRIVATE_KEY || !CONTRACT_ADDR) {
    console.error("Set DECRYPTOR_PRIVATE_KEY and CONTRACT_ADDR in .env (see .env.example)");
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDR, AccessControlledArtifact.abi, wallet);

  console.log("Decryptor running as", wallet.address, "listening to DecryptionRequested...");

  contract.on("DecryptionRequested", async (id: ethers.BigNumber, requester: string, event: any) => {
    console.log(`Decryption requested for id=${id.toString()} by ${requester}`);

    // 1) Access check: can be on-chain (uploader) or off-chain policy
    const ciphertext: string = await contract.getCiphertext(id);
    console.log("Fetched ciphertext (hex len):", (ciphertext || "").length);

    // 2) AUTHORIZE: Decide whether requester may see plaintext.
    // For demo, allow all requests. Replace with real policy check (off-chain DB or on-chain mapping).
    const allowed = true;
    if (!allowed) {
      console.log("Requester not allowed; skipping");
      return;
    }

    // 3) Decrypt (mock) — REPLACE this with Zama FHEVM SDK usage.
    // Example (pseudocode):
    //   const cipherBytes = Buffer.from(ciphertext.replace(/^0x/, ""), "hex");
    //   const zamaResult = await zama.fhe.decrypt(cipherBytes, { keyId: SOME_KEY_ID, requester });
    //   const plaintext = zamaResult.toString();
    const plaintext = await mockDecrypt(ciphertext, requester);
    console.log("Decrypted plaintext:", plaintext);

    // 4) Submit result on-chain (decryptor must be the authorized address)
    try {
      const tx = await contract.submitDecryptionResult(id, plaintext);
      await tx.wait();
      console.log("Submitted decryption result on-chain tx:", tx.hash);
    } catch (err) {
      console.error("Submit failed:", err);
    }
  });
}

/**
 * MOCK decryption function.
 * Replace this with actual calls to Zama FHE SDK:
 *
 * Example placeholder:
 * // const bytes = Buffer.from(ciphertextHex.replace(/^0x/, ''), 'hex');
 * // const result = await zama.fhe.decrypt(bytes, { keyId: requesterKeyId });
 * // return result.toString();
 */
async function mockDecrypt(ciphertextHex: string, requester: string): Promise<string> {
  try {
    const buf = Buffer.from(ciphertextHex.replace(/^0x/, ""), "hex");
    // In our tests we store ciphertext as reversed plaintext bytes.
    const reversed = Buffer.from(buf).reverse();
    return reversed.toString("utf8");
  } catch (e) {
    return `error-decrypt:${e}`;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
