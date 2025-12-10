# Zama FHEVM — Access Control Demo (standalone)

A minimal demo showing a pattern for **on-chain ciphertext storage + off-chain decryption** suitable for Zama FHEVM integration.

## What this repo shows
- Solidity contract to store ciphertext and handle decryption requests.
- Off-chain "decryptor" service that listens for requests and posts back plaintext.
- Clean tests using Hardhat.

## Run locally
1. Clone & install
   ```bash
   git clone <this-repo>
   cd zama-fhevm-access-demo
   npm install
   ```

2. Run Hardhat node (in one terminal)
   ```
   npx hardhat node
   ```

4. Deploy contract (another terminal)
   ```
   npx hardhat run --network localhost scripts/deploy.ts
    ```

Save the deployed contract address.


4. Start the decryptor service (optional demo)
   
   Create .env from .env.example:
    ```
    RPC_URL=http://127.0.0.1:8545
    DECRYPTOR_PRIVATE_KEY=<private key of the decryptor account from Hardhat>
    CONTRACT_ADDR=<deployed contract address>
    ```

 Start:
         ```
         npm run start:decryptor
         ```



5. Run tests
```
npm test

```

Where to plug Zama FHEVM:

server/decryptor.ts — replace mockDecrypt with the actual Zama SDK call. Example pseudocode:

```
// const bytes = Buffer.from(ciphertextHex.replace(/^0x/, ''), 'hex');
// const result = await zama.fhe.decrypt(bytes, { keyId: requesterKeyId });
// const plaintext = result.toString();  
```
Or: call Zama runtime to compute over ciphertext and return an attestation/proof which the contract can verify.


Security notes:
This demo uses a single decryptor address and posts plaintext on-chain. In production, prefer returning signatures/attestations or zero-knowledge proofs rather than raw plaintext.
Keep private keys and secret shares out of the repo. Use KMS/HSM for key storage.
Consider threshold KMS / multi-party decryption for stronger security.


Next steps
1. Replace mockDecrypt with Zama SDK calls (I can produce exact code if you say “Use Zama SDK” and provide preferred API shape).
2. Add signature-based attestation to submitDecryptionResult (verify decryptor signature on-chain).
3. Extend to compute-on-encrypted-data (aggregate, filter) and return resulting attestation/proof.

---

# How to run (quick)
1. `npm install` (in repo root)
2. `npx hardhat node` (run a local node)
3. In another terminal: `npx hardhat run --network localhost scripts/deploy.ts` — take note of the contract address printed.
4. Populate `.env` with `DECRYPTOR_PRIVATE_KEY` (one of Hardhat's account private keys) and `CONTRACT_ADDR`.
5. `npm run start:decryptor` to run the mock decryptor (optional).
6. `npm test` to run the Hardhat tests.

---

# Integration pointers (where to change for Zama)
- **Replace `mockDecrypt`** in `server/decryptor.ts` with actual Zama FHEVM SDK:
  - convert `ciphertextHex` to raw bytes
  - call the SDK (example names: `zama.fhe.decrypt` or `zama.runtime.evaluate`) — I can add concrete code if you want me to assume a typical API.
- **Avoid posting plaintext on-chain** — instead:
  - have decryptor produce a signature over the result (EIP-191/EIP-712) and submit `{resultHash, signature}`; on-chain contract verifies signature and stores the attestation only.
  - or submit a zero-knowledge proof / attestations that the verifier can check.
- **Key management**: store keys in KMS/HSM or use threshold key sharing.

---
