const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const SupplyChain = await hre.ethers.getContractFactory("SupplyChain");
  const contract = await SupplyChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SupplyChain deployed to:", address);

  // Write/patch CONTRACT_ADDRESS into the root .env so the backend can pick it up.
  const envPath = path.join(__dirname, "..", "..", ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  if (envContent.match(/^CONTRACT_ADDRESS=.*$/m)) {
    envContent = envContent.replace(/^CONTRACT_ADDRESS=.*$/m, `CONTRACT_ADDRESS=${address}`);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`Wrote CONTRACT_ADDRESS to ${envPath}`);
  console.log("Restart the backend so it picks up the new contract address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
