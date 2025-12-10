import fs from "fs";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function uploadPublicKey() {
  try {
    const publicKey = fs.readFileSync(
      path.join(__dirname, "keys", "public.pem"),
      "utf-8"
    );

    console.log("🔑 Public Key Loaded");
    console.log("TOKEN LENGTH:", process.env.WHATSAPP_PERMANENT_TOKEN?.length);
console.log("TOKEN START:", process.env.WHATSAPP_PERMANENT_TOKEN?.substring(0, 20));

    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WABA_ID}/key_pair`,
      {
        public_key: publicKey,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_PERMANENT_TOKEN}`,
        },
      }
    );

    console.log("✅ Public Key Uploaded:", res.data);
  } catch (err) {
    if (err && typeof err === "object" && "response" in err && err.response && typeof err.response === "object" && "data" in err.response) {
      console.error("❌ Upload Error:", err.response.data);
    } else {
      console.error("❌ Upload Error:", err);
    }
  }
}

uploadPublicKey();
