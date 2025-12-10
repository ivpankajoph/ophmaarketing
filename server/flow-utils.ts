import crypto from "crypto";
import fs from "fs";

const PRIVATE_KEY = fs.readFileSync("./keys/private.pem", "utf-8");

export function decryptAESKey(encryptedKey:any) {
  return crypto.privateDecrypt(
    {
      key: PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedKey, "base64")
  );
}

export function decryptPayload(aesKey:any, encryptedData:any, iv:any) {
  const data = Buffer.from(encryptedData, "base64");
  const ivBuffer = Buffer.from(iv, "base64");

  const tag = data.slice(data.length - 16);
  const encryptedContent = data.slice(0, data.length - 16);

  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, ivBuffer);
  decipher.setAuthTag(tag);

  return JSON.parse(Buffer.concat([decipher.update(encryptedContent), decipher.final()]).toString());
}

export function encryptResponse(responseJSON:any, aesKey:any, iv:any) {
  const flippedIV = Buffer.from(iv.map((b: any) => ~b));

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIV);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(responseJSON), "utf8"),
    cipher.final(),
    cipher.getAuthTag()
  ]);

  return encrypted.toString("base64");
}
