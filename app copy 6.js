const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const request = require('request');

dotenv.config();

const app = express();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const userLanguage = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.send('Messenger bot is running.');
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Webhook to receive messages
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      } else if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(senderPsid, message) {
  sendLanguageSelection(senderPsid);
}

function handlePostback(senderPsid, postback) {
  const payload = postback.payload;

  switch (payload) {
    case 'GET_STARTED':
      sendLanguageSelection(senderPsid);
      break;

    case 'LANG_BANGLA':
      userLanguage[senderPsid] = 'bangla';
      sendMainMenuAsCarousel(senderPsid, 'bangla');
      break;

    case 'LANG_ENGLISH':
      userLanguage[senderPsid] = 'english';
      sendMainMenuAsCarousel(senderPsid, 'english');
      break;

    case 'BTRC':
      sendBTRCOptions(senderPsid, userLanguage[senderPsid]);
      break;

    // Optional: add handlers for other menu options here
    default:
      sendText(senderPsid, "Thanks! We are working on that feature.");
  }
}

// 1. Language Selection
function sendLanguageSelection(senderPsid) {
  const text = "Hello! Welcome to BTRC. Please select your language.\nহ্যালো! বিটিআরসিতে আপনাকে স্বাগতম। অনুগ্রহপূর্বক আপনার ভাষা নির্বাচন করুন।";
  const buttons = [
    {
      type: "postback",
      title: "বাংলা 🇧🇩",
      payload: "LANG_BANGLA"
    },
    {
      type: "postback",
      title: "English 🇬🇧",
      payload: "LANG_ENGLISH"
    }
  ];

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons
      }
    }
  };
  callSendAPI(senderPsid, response);
}

// 2. Main Menu
function sendMainMenuAsCarousel(senderPsid, lang) {
  const isBangla = lang === 'bangla';

  const elements = [
    {
      title: isBangla ? "বিটিআরসি" : "BTRC",
      subtitle: isBangla
        ? "আপনার অভিযোগ, প্রশ্ন, অনুরোধ ঝামেলাবিহীন জমা দিন।"
        : "Submit your complaints, questions, and requests hassle-free.",
      buttons: [
        {
          type: "postback",
          title: isBangla ? "বিস্তারিত দেখুন" : "View Details",
          payload: "BTRC"
        }
      ]
    },
    {
      title: isBangla ? "মোবাইল অপারেটর" : "Mobile Operator",
      subtitle: isBangla
        ? "মোবাইল অপারেটর সম্পর্কিত তথ্য পান।"
        : "Get information about mobile operators.",
      buttons: [
        {
          type: "postback",
          title: isBangla ? "বিস্তারিত দেখুন" : "View Details",
          payload: "MOBILE_OPERATOR"
        }
      ]
    },
    {
      title: isBangla ? "হেল্পলাইন নম্বর" : "Helpline Number",
      subtitle: isBangla
        ? "সকল জরুরি হেল্পলাইন নম্বর দেখুন।"
        : "See all important helpline numbers.",
      buttons: [
        {
          type: "postback",
          title: isBangla ? "বিস্তারিত দেখুন" : "View Details",
          payload: "HELPLINE"
        }
      ]
    },
    {
      title: isBangla ? "এমএনপি (MNP)" : "MNP (Mobile Number Portability)",
      subtitle: isBangla
        ? "নাম্বার পরিবর্তন না করে অপারেটর পরিবর্তন করুন।"
        : "Change your operator without changing your number.",
      buttons: [
        {
          type: "postback",
          title: isBangla ? "বিস্তারিত দেখুন" : "View Details",
          payload: "MNP"
        }
      ]
    }
  ];

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: elements
      }
    }
  };

  callSendAPI(senderPsid, response);
}


// 3. BTRC Options
function sendBTRCOptions(senderPsid, lang) {
  let text, buttons;

  if (lang === 'bangla') {
    text = "আপনার অভিযোগ, প্রশ্ন, অনুরোধ ঝামেলাবিহীন জমা দিন:";
    buttons = [
      {
        type: "web_url",
        url: "https://crm.btrc.gov.bd/",
        title: "অভিযোগ ফর্ম"
      },
      {
        type: "phone_number",
        title: "বিটিআরসি হেল্পলাইন",
        payload: "+880123456789"
      },
      {
        type: "web_url",
        url: "https://www.btrc.gov.bd",
        title: "বিটিআরসি ওয়েবসাইট"
      }
    ];
  } else {
    text = "Submit your complaints, questions, and requests hassle-free.";
    buttons = [
      {
        type: "web_url",
        url: "https://www.btrc.gov.bd/complaint-form",
        title: "Complaint Form"
      },
      {
        type: "phone_number",
        title: "BTRC Helpline",
        payload: "+880123456789"
      },
      {
        type: "web_url",
        url: "https://www.btrc.gov.bd",
        title: "BTRC Website"
      }
    ];
  }

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons
      }
    }
  };

  callSendAPI(senderPsid, response);
}

// Text sender
function sendText(senderPsid, text) {
  const response = { text };
  callSendAPI(senderPsid, response);
}

// Messenger API caller
function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response
  };

  request({
    uri: "https://graph.facebook.com/v18.0/me/messages",
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: "POST",
    json: requestBody
  }, (err, res, body) => {
    if (!err) {
      console.log("Message sent!");
    } else {
      console.error("Unable to send message:", err);
    }
  });
}

function sendComplainFormButton(senderPsid, lang) {
    const response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": lang === 'bangla' ? 
                    'অভিযোগ ফর্ম পেতে নিচের বাটন ক্লিক করুন:' : 
                    'Click the button below to access the complaint form:',
                "buttons": [
                    {
                        "type": "web_url",
                        "url": "https://crm.btrc.gov.bd/",
                        "title": lang === 'bangla' ? 'অভিযোগ ফর্ম' : 'Complaint Form',
                        "webview_height_ratio": "tall", // or "full", "compact"
                        "messenger_extensions": true, // Enable messenger extensions
                        "fallback_url": "https://crm.btrc.gov.bd/" // Fallback for unsupported devices
                    }
                ]
            }
        }
    };
    callSendAPI(senderPsid, response);
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
