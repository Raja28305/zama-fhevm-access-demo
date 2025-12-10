// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title AccessControlledCipher
/// @notice Store ciphertext on-chain, request decryption, and accept decryption results from an authorized decryptor.
/// @dev This contract stores opaque ciphertext as bytes. Decryption itself happens off-chain by a trusted decryptor service.
contract AccessControlledCipher {
    address public owner;
    // single decryptor address (could be a multisig or a contract)
    address public decryptor;

    struct CipherEntry {
        bytes ciphertext;
        address uploader; // who uploaded
        bool exists;
    }

    // mapping id => cipher entry
    mapping(uint256 => CipherEntry) public ciphers;

    // mapping id => (requester => requested)
    mapping(uint256 => mapping(address => bool)) public requested;

    // mapping id => decrypted value (string for simplicity)
    mapping(uint256 => string) public decryptedResult;

    event CipherStored(uint256 indexed id, address indexed uploader);
    event DecryptionRequested(uint256 indexed id, address indexed requester);
    event DecryptionSubmitted(uint256 indexed id, string plaintext, address indexed submitter);
    event DecryptorUpdated(address indexed oldDecryptor, address indexed newDecryptor);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    modifier onlyDecryptor() {
        require(msg.sender == decryptor, "decryptor only");
        _;
    }

    constructor(address _decryptor) {
        owner = msg.sender;
        decryptor = _decryptor;
    }

    /// @notice Store a ciphertext blob for an id.
    function storeCiphertext(uint256 id, bytes calldata ciphertext) external {
        require(!ciphers[id].exists, "id exists");
        ciphers[id] = CipherEntry({ciphertext: ciphertext, uploader: msg.sender, exists: true});
        emit CipherStored(id, msg.sender);
    }

    /// @notice Request decryption of ciphertext `id` for the caller.
    function requestDecryption(uint256 id) external {
        require(ciphers[id].exists, "no cipher");
        requested[id][msg.sender] = true;
        emit DecryptionRequested(id, msg.sender);
    }

    /// @notice Decryptor posts a plaintext result on-chain. Could include a signature or proof in a real setup.
    /// @dev Only the authorized decryptor may call this (or this function may verify a signature).
    function submitDecryptionResult(uint256 id, string calldata plaintext) external onlyDecryptor {
        require(ciphers[id].exists, "no cipher");
        decryptedResult[id] = plaintext;
        emit DecryptionSubmitted(id, plaintext, msg.sender);
    }

    /// @notice Owner can change the authorized decryptor.
    function setDecryptor(address newDecryptor) external onlyOwner {
        address old = decryptor;
        decryptor = newDecryptor;
        emit DecryptorUpdated(old, newDecryptor);
    }

    /// @notice Read ciphertext (for developers/testing only). In real systems you might restrict this.
    function getCiphertext(uint256 id) external view returns (bytes memory) {
        require(ciphers[id].exists, "no cipher");
        return ciphers[id].ciphertext;
    }
}
