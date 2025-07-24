const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const request = require('request');
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
const webhookVerifyToken = process.env.VERIFY_TOKEN|| 'Pass@123';
const userLanguagePreference = {}; 
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Health check
app.get('/', (req, res) => res.send('Messenger Server Running'));

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    console.log(`Received verification request: mode=${mode}, token=${token}, challenge=${challenge}, verify_token=${webhookVerifyToken}`);

    if (mode && token) {
        if (mode === 'subscribe' && token === webhookVerifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        console.log('MISSING_PARAMETERS');
        res.sendStatus(400);
    }
});
// Message handling endpoint
app.post('/webhook', (req, res) => {
    console.log('Received webhook event');
  const body = req.body;

  // Check if this is a page subscription
  if (body.object === 'page') {
    // Iterate over each entry (there may be multiple if batched)
    body.entry.forEach(entry => {
      // Gets the body of the webhook event
      const webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      const senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPsid);

      // Check if the event is a message or postback
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Handles messages events
// Handle message events
function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Check if the message contains text
  if (receivedMessage.text) {
    const text = receivedMessage.text.toLowerCase();
    const lang = userLanguagePreference[senderPsid] || 'english';

    if (text === 'hello') {
      languageButtons(senderPsid);
    } else if (text === 'list') {
      response = {
        text: lang === 'bangla' ? 'এটি বাংলা সার্ভিস তালিকা।' : 'This is the English service list.'
      };
      callSendAPI(senderPsid, response);
    } else {
      response = {
        text: lang === 'bangla' ? 'আপনার বার্তা বুঝতে পারিনি। দয়া করে সঠিক ইনপুট দিন।' : 'Sorry, I did not understand your message.'
      };
      callSendAPI(senderPsid, response);
    }
  }
}

// Handle postback events (equivalent to WhatsApp's interactive messages)
function handlePostback(senderPsid, receivedPostback) {
  const payload = receivedPostback.payload;
  const lang = userLanguagePreference[senderPsid] || 'english';

  // Handle get started
  if (payload === 'GET_STARTED_PAYLOAD') {
    console.log('Get Started button clicked by:', senderPsid);
    languageButtons(senderPsid);
    return;
  }

  // Handle language selection
  if (payload === 'OPTION_BANGLA') {
    userLanguagePreference[senderPsid] = 'bangla';
    callSendAPI(senderPsid, {
      text: 'আপনি বাংলা ভাষা নির্বাচন করেছেন। এখন আপনি কোন সেবা নিতে চান?'
    });
    serviceList(senderPsid, 'bangla');
  } else if (payload === 'OPTION_ENGLISH') {
    userLanguagePreference[senderPsid] = 'english';
    callSendAPI(senderPsid, {
      text: 'You have selected English. What service do you want next?'
    });
    serviceList(senderPsid, 'english');
  }

  // Handle service options
  else if (payload === 'BTRC_COMPLAIN_FORM') {
    sendComplainFormButton(senderPsid, lang);
  } else if (payload === 'BTRC_HELPLINE') {
    sendBtrcHelplineCallButton(senderPsid, lang);
  }
  // Add other service options similarly
}

// Sends response messages via the Send API
// Send language selection buttons
function languageButtons(senderPsid) {
  const response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Please select your language / দয়া করে আপনার ভাষা নির্বাচন করুন",
        "buttons": [
          {
            "type": "postback",
            "title": "English",
            "payload": "OPTION_ENGLISH"
          },
          {
            "type": "postback",
            "title": "বাংলা",
            "payload": "OPTION_BANGLA"
          }
        ]
      }
    }
  };
  
  callSendAPI(senderPsid, response);
}

// Send service list (as quick replies)
function serviceList(senderPsid, lang) {
  const text = lang === 'bangla' ? 
    'নিচের বিকল্প থেকে আপনার পছন্দের সেবা নির্বাচন করুন:' : 
    'Please choose your preferred service from below:';

  const response = {
    "text": text,
    "quick_replies": [
      {
        "content_type": "text",
        "title": lang === 'bangla' ? 'বিটিআরসি সেবা' : 'BTRC Services',
        "payload": "OPTION_BTRC"
      },
      {
        "content_type": "text",
        "title": lang === 'bangla' ? 'মোবাইল অপারেটর সেবা' : 'Mobile Operator Services',
        "payload": "OPTION_MOBILE_OPERATOR"
      },
      {
        "content_type": "text",
        "title": lang === 'bangla' ? 'এমএনপি সেবা' : 'MNP Services',
        "payload": "OPTION_MNP"
      }
    ]
  };

  callSendAPI(senderPsid, response);
}

// Send BTRC options
function btrcOptions(senderPsid, lang) {
  const response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": lang === 'bangla' ? 
          'বিটিআরসি সম্পর্কিত কোন সেবা চান?' : 
          'Which BTRC service do you need?',
        "buttons": [
          {
            "type": "postback",
            "title": lang === 'bangla' ? 'অভিযোগ ফর্ম' : 'Complain Form',
            "payload": "BTRC_COMPLAIN_FORM"
          },
          {
            "type": "postback",
            "title": lang === 'bangla' ? 'হেল্পলাইন' : 'Helpline',
            "payload": "BTRC_HELPLINE"
          }
        ]
      }
    }
  };
  
  callSendAPI(senderPsid, response);
}

// Send API wrapper
function callSendAPI(senderPsid, response) {
  const requestBody = {
    "recipient": {
      "id": senderPsid
    },
    "message": response
  };

  request({
    "uri": "https://graph.facebook.com/v12.0/me/messages",
    "qs": { "access_token": pageAccessToken },
    "method": "POST",
    "json": requestBody
  }, (err, res, body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});