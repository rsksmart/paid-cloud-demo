import { ethers } from "hardhat";

async function main() {
  const [,user] = await ethers.getSigners()
  const serviceAgreement = await ethers.getContractAt('ServiceAgreement', '0x5FbDB2315678afecb367f032d93F642f64180aa3', user)
  const period = Math.ceil(Math.random() * 1000)
  const tx = await serviceAgreement.payPeriod(user.address, period, { value: ethers.utils.parseEther('0.1') })
  await tx.wait()
  console.log(`Paid period ${period}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
