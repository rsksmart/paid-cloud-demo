import { ethers } from "hardhat";

async function main() {
  for (const to of ['0x8494a98f2aeC3fBB54538446Ea7B1205E2940A9F', '0x2D4fAaEb47A60c4b20f84FF05e1d8Cc179aAF5a2']) {
    const value = ethers.utils.parseEther('1')
    const [,user] = await ethers.getSigners()

    const tx = await user.sendTransaction({ to, value })
    console.log(tx)
    const receipt = await tx.wait()
    console.log(receipt)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
