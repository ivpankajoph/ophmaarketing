import { Router } from "express";
import * as controller from "./fb.controller";
import {
  decryptAESKey,
  decryptPayload,
  encryptResponse,
} from "server/flow-utils.ts";
import FlowSession from "server/models/FlowSession.ts";

const router = Router();

router.post("/forms/sync", controller.syncForms);
router.get("/forms", controller.listForms);
router.get("/forms/:id", controller.getForm);
router.post("/forms/:formId/sync-leads", controller.syncLeads);
router.get("/leads", controller.listLeads);
router.get("/leads/:id", controller.getLead);

router.get("/flow", (req, res) => {
  return res.json({ status: "active" });
});

router.post("/flow", async (req, res) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    // 1. Decrypt AES Key
    const aesKey = decryptAESKey(encrypted_aes_key);

    // 2. Decrypt WhatsApp Encrypted Data
    const decrypted = decryptPayload(
      aesKey,
      encrypted_flow_data,
      initial_vector
    );

    console.log("📥 Incoming Flow Data:", decrypted);

    // 3. Save to DB
    await FlowSession.create({
      flow_token: decrypted.flow_token,
      action: decrypted.action,
      screen: decrypted.screen,
      data: decrypted.data,
    });

    // 4. Create Response
    const responseBody = {
      // version: "1.0",
      // screen: "FINAL_SCREEN",
      // data: {
      //   message: "Your flow has been processed successfully 🎉",
      //   echo: decrypted.data,
      // },
      data: { status: "active" },
    };

    // 5. Encrypt response
    const encryptedResponse = encryptResponse(
      responseBody,
      aesKey,
      Buffer.from(initial_vector, "base64")
    );

    res.send(encryptedResponse);
  } catch (err) {
    console.error("❌ Flow Error", err);
    return res.status(421).send("Unable to decrypt payload");
  }
});
export default router;
