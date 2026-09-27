const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {
  let supplyChain, owner, farmer, partner;

  beforeEach(async function () {
    [owner, farmer, partner] = await ethers.getSigners();
    const SupplyChain = await ethers.getContractFactory("SupplyChain");
    supplyChain = await SupplyChain.deploy();
    await supplyChain.waitForDeployment();
  });

  it("creates a product batch", async function () {
    await expect(supplyChain.createProduct("ORG-BAS-001", farmer.address))
      .to.emit(supplyChain, "ProductCreated");

    const product = await supplyChain.products("ORG-BAS-001");
    expect(product.exists).to.equal(true);
    expect(product.farmer).to.equal(farmer.address);
  });

  it("prevents duplicate batch IDs", async function () {
    await supplyChain.createProduct("ORG-BAS-001", farmer.address);
    await expect(
      supplyChain.createProduct("ORG-BAS-001", farmer.address)
    ).to.be.revertedWith("SupplyChain: batch already exists");
  });

  it("adds a supply chain event to an existing batch", async function () {
    await supplyChain.createProduct("ORG-BAS-001", farmer.address);
    await expect(
      supplyChain.addSupplyChainEvent(
        "ORG-BAS-001",
        "DISPATCHED",
        partner.address,
        ethers.ZeroHash,
        "Karnal Warehouse"
      )
    ).to.emit(supplyChain, "SupplyChainEventAdded");

    const count = await supplyChain.getEventCount("ORG-BAS-001");
    expect(count).to.equal(1);
  });

  it("rejects events for a non-existent batch", async function () {
    await expect(
      supplyChain.addSupplyChainEvent(
        "DOES-NOT-EXIST",
        "DISPATCHED",
        partner.address,
        ethers.ZeroHash,
        ""
      )
    ).to.be.revertedWith("SupplyChain: batch does not exist");
  });

  it("records a certificate hash for a batch", async function () {
    await supplyChain.createProduct("ORG-BAS-001", farmer.address);
    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("certificate-content"));

    await expect(
      supplyChain.addCertificateHash("ORG-BAS-001", "CERT-001", fakeHash, owner.address)
    ).to.emit(supplyChain, "CertificateHashAdded");

    const cert = await supplyChain.certificates("ORG-BAS-001");
    expect(cert.certificateHash).to.equal(fakeHash);
    expect(cert.status).to.equal(1); // VERIFIED
  });

  it("returns full product history via events", async function () {
    await supplyChain.createProduct("ORG-BAS-001", farmer.address);
    await supplyChain.addSupplyChainEvent("ORG-BAS-001", "PACKAGED", partner.address, ethers.ZeroHash, "Unit A");
    await supplyChain.addSupplyChainEvent("ORG-BAS-001", "DISPATCHED", partner.address, ethers.ZeroHash, "Unit A");

    const count = await supplyChain.getEventCount("ORG-BAS-001");
    expect(count).to.equal(2);

    const [eventType] = await supplyChain.getEvent("ORG-BAS-001", 0);
    expect(eventType).to.equal("PACKAGED");
  });
});
