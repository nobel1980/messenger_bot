const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const bodyParser = require('body-parser');
const request = require('request');

dotenv.config();

const app = express();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const userLanguage = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/images', express.static('public/images'));

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

        getUserProfile(senderPsid, (user) => {
        console.log(`User clicked: ${user.first_name} ${user.last_name}`);
        // You can also reply with:
        `Hi ${user.first_name}, thanks for your message!`
      });
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(senderPsid, message) {
  sendLanguageSelection(senderPsid);
}

function handleMessage(senderPsid, receivedMessage) {
  const lang = userLanguage[senderPsid] || 'english'; // default to English
  const isBangla = lang === 'bangla';

  // Handle quick replies
  if (receivedMessage.quick_reply) {
    const payload = receivedMessage.quick_reply.payload;

    switch (payload) {
      case 'OPERATOR_GP':
        sendText(senderPsid, isBangla
          ? "📞 গ্রামীণফোন হেল্পলাইন: ১২১ অথবা ০১৭০০১০০১২১"
          : "📞 Grameenphone helpline: 121 or 01700100121");
        break;

      case 'OPERATOR_ROBI':
        sendText(senderPsid, isBangla
          ? "📞 রবি হেল্পলাইন: ১২৩ অথবা ০১৮১৯৪০০৪০০"
          : "📞 Robi helpline: 123 or 01819400400");
        break;

      case 'OPERATOR_BANGLALINK':
        sendText(senderPsid, isBangla
          ? "📞 বাংলালিংক হেল্পলাইন: ১২১ অথবা ০১৯১১৩০৪১২১"
          : "📞 Banglalink helpline: 121 or 01911304121");
        break;

      case 'OPERATOR_TELETALK':
        sendText(senderPsid, isBangla
          ? "📞 টেলিটক হেল্পলাইন: ১২১ অথবা ০১৫০০১২১১২১"
          : "📞 Teletalk helpline: 121 or 01500121121");
        break;

      default:
        sendText(senderPsid, isBangla
          ? "দুঃখিত, অপারেটরটি শনাক্ত করা যায়নি।"
          : "Sorry, unrecognized operator.");
    }

  // Handle text messages
  } else if (receivedMessage.text) {
    const userMessage = receivedMessage.text.toLowerCase();

    if (userMessage.includes("hello") || userMessage.includes("hi")) {
      sendText(senderPsid, isBangla
        ? "হ্যালো! কিভাবে সাহায্য করতে পারি?"
        : "Hi there! How can I assist you today?");
    } else {
      sendText(senderPsid, isBangla
        ? "দুঃখিত, আমি বুঝতে পারিনি। নিচের মেনু থেকে একটি অপশন বেছে নিন।"
        : "Sorry, I didn't understand that. Please select an option from the menu.");
      sendMainMenuAsCarousel(senderPsid, lang);
    }

  // Unsupported message type
  } else {
    sendText(senderPsid, isBangla
      ? "দুঃখিত, আমি শুধু টেক্সট ও কুইক রিপ্লাই বুঝতে পারি।"
      : "Sorry, I can only understand text or quick replies.");
  }
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

    case 'MOBILE_OPERATOR':
      console.log('Mobile Operator button clicked by:', senderPsid, userLanguage[senderPsid]);
      sendMobileOperatorAsCarousel(senderPsid, userLanguage[senderPsid]);
      // sendMobileOperatorQuickReplies(senderPsid, userLanguage[senderPsid]);
    break;

    // Optional: add handlers for other menu options here
    default:
      sendText(senderPsid, "Thanks! We are working on that feature.");
  }
}

// 1. Language Selection
async function sendLanguageSelection(senderPsid) {
  const user = await getUserProfile(senderPsid);
  const text = `Hello, ${user.first_name}! Welcome to BTRC. Please select your language.\nহ্যালো, ${user.first_name}! বিটিআরসিতে আপনাকে স্বাগতম। অনুগ্রহপূর্বক আপনার ভাষা নির্বাচন করুন।👇`; 
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
      image_url: `${process.env.BASE_URL}/images/BTRC.png`,
      subtitle: isBangla
        ? "আপনার অভিযোগ, প্রশ্ন, অনুরোধ ঝামেলাবিহীন জমা দিন।"
        : "Submit your complaints, questions, and requests hassle-free.",
      buttons: [
        {
        type: "web_url",
        url: "https://crm.btrc.gov.bd/",
        title: isBangla ? "অভিযোগ ফর্ম" : "Complaint Form"
      },
      {
        type: "phone_number",
        title: isBangla ? "📞 বিটিআরসি হেল্পলাইন" : "📞 BTRC Helpline",
        payload: "+880123456789"
      },
      {
        type: "web_url",
        url: "https://www.btrc.gov.bd",
        title: isBangla ? "বিটিআরসি ওয়েবসাইট" : "BTRC Website"
      }
      ]
    },
    {
      title: isBangla ? "মোবাইল অপারেটর" : "Mobile Operator",
      image_url: `${process.env.BASE_URL}/images/mobile_operator.png`,
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
      title: isBangla ? "এমএনপি (MNP)" : "MNP (Mobile Number Portability)",
      image_url: `${process.env.BASE_URL}/images/mnp.png`,
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
    },
    {
      title: isBangla ? "হেল্পলাইন নম্বর" : "Govt",
      subtitle: isBangla
        ? "সকল জরুরি হেল্পলাইন নম্বর দেখুন।"
        : "See all important helpline numbers.",
      buttons: [
        {
          type: "postback",
          title: isBangla ? "সরকার এবং টেলপো হেল্পলাইন" : "Govt. & Telpo Helpline",
          payload: "GOVT_TELPO_HELPLINE"
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
    text = "আপনার অভিযোগ, প্রশ্ন, অনুরোধ ঝামেলাবিহীন জমা দিন: 👇";
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
    text = "Submit your complaints, questions, and requests hassle-free.👇";
    buttons = [
      {
        type: "web_url",
        url: "https://crm.btrc.gov.bd/",
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

function sendMobileOperatorQuickReplies(senderPsid, lang = 'english') {
  console.log('Sending mobile operator quick replies to:', senderPsid, 'Language:', lang);
  const isBangla = lang === 'bangla';

  const message = {
    recipient: {
      id: senderPsid
    },
    message: {
      text: isBangla
        ? "আপনার মোবাইল অপারেটর নির্বাচন করুন:"
        : "Please select your mobile operator:",
      quick_replies: [
        {
          content_type: "text",
          title: isBangla ? "গ্রামীণফোন" : "Grameenphone",
          payload: "OPERATOR_GP"
        },
        {
          content_type: "text",
          title: isBangla ? "রবি" : "Robi",
          payload: "OPERATOR_ROBI"
        },
        {
          content_type: "text",
          title: isBangla ? "বাংলালিংক" : "Banglalink",
          payload: "OPERATOR_BANGLALINK"
        },
        {
          content_type: "text",
          title: isBangla ? "টেলিটক" : "Teletalk",
          payload: "OPERATOR_TELETALK"
        }
      ]
    }
  };
 sendText(senderPsid, text);
  // callSendAPI(senderPsid, message);
}
//2.1 Mobile Operator Carousel
function sendMobileOperatorAsCarousel(senderPsid, lang = 'english') {
  console.log('Sending mobile operator carousel to:', senderPsid, 'Language:', lang);
  const isBangla = lang === 'bangla';

  const elements = [
    {
      title: isBangla ? "গ্রামীণফোন" : "Grameenphone",
      image_url: `${process.env.BASE_URL}/images/grameenphone.png`,
      subtitle: isBangla ? "📞 গ্রামীণফোন হেল্পলাইন: 121 বা 01700100121" : "📞 Grameenphone Helpline: 121 or 01700100121",
      buttons: [
            {
              type: "web_url",
              url: "https://www.grameenphone.com",
              title: isBangla ? "ওয়েবসাইট" : "🌐 Visit Website"
            },
            {
                type: "phone_number",
                title: isBangla ? "📞 হেল্পলাইন" : "📞 GP Helpline",
                payload: "+8801700000000"
              }       
      ]
    },
    {
      title: isBangla ? "রবি" : "Robi",
      image_url: `${process.env.BASE_URL}/images/robi.png`,
      subtitle: isBangla ? "📞 রবি হেল্পলাইন: 123 বা 01819400400" : "📞 Robi Helpline: 123 or 01819400400",
      buttons: [
        { type: "web_url",
          url: "https://www.robi.com.bd",
          title: isBangla ? "ওয়েবসাইট" : "🌐 Visit Website"},
        { type: "phone_number", title: isBangla ? "হেল্পলাইন দেখুন" : "View Helpline", payload: "+8801819400400" }
      ]
    },
    {
      title: isBangla ? "বাংলালিংক" : "Banglalink",
      image_url: `${process.env.BASE_URL}/images/banglalink.png`,
      subtitle: isBangla ? "📞 বাংলালিংক হেল্পলাইন: 121 বা 01911304121" : "📞 Banglalink Helpline: 121 or 01911304121",
      buttons: [
        { type: "postback", title: isBangla ? "হেল্পলাইন দেখুন" : "View Helpline", payload: "OPERATOR_BANGLALINK" }
      ]
    },
    {
      title: isBangla ? "টেলিটক" : "Teletalk",
      image_url: `${process.env.BASE_URL}/images/teletalk.png`,
      subtitle: isBangla ? "📞 টেলিটক হেল্পলাইন: 121 বা 01500121121" : "📞 Teletalk Helpline: 121 or 01500121121",
      buttons: [
        { type: "postback", title: isBangla ? "হেল্পলাইন দেখুন" : "View Helpline", payload: "OPERATOR_TELETALK" }
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

  callSendAPI(senderPsid, response); // Keep message format simple
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


// function getUserProfile(psid, callback) {
//   const url = `https://graph.facebook.com/${psid}?fields=first_name,last_name,profile_pic&access_token=${process.env.PAGE_ACCESS_TOKEN}`;

//   request({
//     uri: url,
//     method: 'GET',
//   }, (err, res, body) => {
//     if (!err) {
//       const user = JSON.parse(body);
//       callback(user);
//     } else {
//       console.error("Error fetching user profile: ", err);
//     }
//   });
// }

async function getUserProfile(psid) {
  const url = `https://graph.facebook.com/${psid}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const response = await axios.get(url);
  console.log(`User profile fetched: ${response.data.first_name} ${response.data.last_name}`);
  return response.data;
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
