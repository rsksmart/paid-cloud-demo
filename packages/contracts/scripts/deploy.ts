import { ethers } from "hardhat";

async function main() {
  const ServiceAgreement = await ethers.getContractFactory("ServiceAgreement");
  const serviceAgreement = await ServiceAgreement.deploy();

  await serviceAgreement.deployed();

  console.log(`service Agreement contract deployed to ${serviceAgreement.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
