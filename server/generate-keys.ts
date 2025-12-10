import crypto from "crypto";
import fs from "fs";

export function generateKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  if (!fs.existsSync("./keys")) fs.mkdirSync("./keys");

  fs.writeFileSync("./keys/public.pem", publicKey);
  fs.writeFileSync("./keys/private.pem", privateKey);

  console.log("🔑 RSA keys generated in /keys/");
}
generateKeys();