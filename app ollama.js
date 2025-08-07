const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'your_verify_token';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

function sendTextMessage(senderId, text) {
  return axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: senderId },
    message: { text }
  });
}

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const messagingEvent of entry.messaging) {
        const senderId = messagingEvent.sender.id;
        const messageText = messagingEvent.message?.text;

        if (messageText) {
          try {
            const aiResponse = await axios.post(OLLAMA_URL, {
              model: 'llama3',
              prompt: messageText,
              stream: false
            });

            const reply = aiResponse.data.response;
            await sendTextMessage(senderId, reply);
          } catch (err) {
            console.error('AI Error:', err.message);
            await sendTextMessage(senderId, "Sorry, something went wrong with AI.");
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Verify webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Messenger bot running on port ${PORT}`));
