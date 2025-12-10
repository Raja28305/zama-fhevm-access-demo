import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  // set decryptor to deployer for demo; in production this is a key owned by your off-chain service
  const AccessFactory = await ethers.getContractFactory("AccessControlledCipher");
  const contract = await AccessFactory.deploy(deployer.address);
  await contract.deployed();

  console.log("AccessControlledCipher:", contract.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
