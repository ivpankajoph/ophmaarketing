const Storage = require('../storage');
const { sendWhatsAppMessage, markMessageAsRead } = require('../utils/whatsapp');
const { sendToOpenAI } = require('../utils/openai');
const config = require('../config');

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const message of messages) {
      await processIncomingMessage(message, value);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.sendStatus(500);
  }
};

const processIncomingMessage = async (message, value) => {
  const senderId = message.from;
  const messageId = message.id;
  const messageType = message.type;
  const timestamp = message.timestamp;
  
  let messageContent = '';
  
  if (messageType === 'text') {
    messageContent = message.text.body;
  } else if (messageType === 'button') {
    messageContent = message.button.text;
  } else if (messageType === 'interactive') {
    messageContent = message.interactive?.button_reply?.title || 
                     message.interactive?.list_reply?.title || '';
  }

  const senderInfo = value.contacts?.[0] || {};
  
  await Storage.messages.create({
    id: messageId,
    senderId,
    senderName: senderInfo.profile?.name || senderId,
    content: messageContent,
    type: messageType,
    direction: 'inbound',
    timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
    raw: message
  });

  const mapping = await Storage.mapping.findAll();
  const agentMapping = mapping.find(m => m.senderId === senderId);
  
  if (agentMapping) {
    const agent = await Storage.agents.findById(agentMapping.agentId);
    if (agent) {
      try {
        const aiResponse = await sendToOpenAI(
          agent.model,
          agent.prompt,
          messageContent
        );
        
        await sendWhatsAppMessage(senderId, aiResponse);
        
        await Storage.messages.create({
          senderId,
          content: aiResponse,
          type: 'text',
          direction: 'outbound',
          agentId: agent.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error generating AI response:', error);
      }
    }
  } else {
    const defaultAgent = await Storage.agents.findOne({ isDefault: true });
    if (defaultAgent) {
      try {
        const aiResponse = await sendToOpenAI(
          defaultAgent.model,
          defaultAgent.prompt,
          messageContent
        );
        
        await sendWhatsAppMessage(senderId, aiResponse);
        
        await Storage.messages.create({
          senderId,
          content: aiResponse,
          type: 'text',
          direction: 'outbound',
          agentId: defaultAgent.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error generating AI response:', error);
      }
    }
  }

  try {
    await markMessageAsRead(messageId);
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Storage.messages.findAll();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const messages = await Storage.messages.findAll();
    
    const conversations = {};
    messages.forEach(msg => {
      if (!conversations[msg.senderId]) {
        conversations[msg.senderId] = {
          senderId: msg.senderId,
          senderName: msg.senderName || msg.senderId,
          messages: [],
          lastMessage: null,
          lastMessageTime: null
        };
      }
      conversations[msg.senderId].messages.push(msg);
    });
    
    Object.values(conversations).forEach(conv => {
      conv.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const lastMsg = conv.messages[conv.messages.length - 1];
      conv.lastMessage = lastMsg.content;
      conv.lastMessageTime = lastMsg.timestamp;
    });
    
    res.json(Object.values(conversations));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing "to" or "message" field' });
    }

    const result = await sendWhatsAppMessage(to, message);
    
    await Storage.messages.create({
      senderId: to,
      content: message,
      type: 'text',
      direction: 'outbound',
      timestamp: new Date().toISOString(),
      waMessageId: result.messages?.[0]?.id
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  getMessages,
  getConversations,
  sendMessage
};
