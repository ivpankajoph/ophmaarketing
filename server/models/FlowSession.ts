import mongoose from "mongoose";

const FlowSchema = new mongoose.Schema({
  flow_token: String,
  action: String,
  screen: String,
  data: Object,
  timestamp: { type: Date, default: Date.now }
});

const FlowSession = mongoose.model("Flow", FlowSchema);
export default FlowSession;

