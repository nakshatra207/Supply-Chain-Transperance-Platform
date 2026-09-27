const crypto = require("crypto");

function sha256Hex(buffer) {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = { sha256Hex };
