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
      callSendAPI(senderPsid, {
        text: 'আপনি বাংলা ভাষা নির্বাচন করেছেন। এখন আপনি কোন সেবা নিতে চান? 👇'
      });
      sendMainMenuAsCarousel(senderPsid, 'bangla');
      break;

    case 'LANG_ENGLISH':
      userLanguage[senderPsid] = 'english';
      callSendAPI(senderPsid, {
        text: 'You have selected English. What service do you want next? 👇'
      });
      sendMainMenuAsCarousel(senderPsid, 'english');
      break;

    case 'BTRC':
      (async () => {
        if (userLanguage[senderPsid] === "bangla") {
          await sendText(senderPsid, "আপনার অভিযোগ, প্রশ্ন, অনুরোধ ঝামেলাবিহীন জমা দিন: 👇")  ;
        } else {
          await sendText(senderPsid, "Submit your complaints, questions, and requests hassle-free.👇");
        }
        btrcCarousel(senderPsid, userLanguage[senderPsid]);
      })();
      break;

    case 'MOBILE_OPERATOR':
      (async () => {
        if (userLanguage[senderPsid] === "bangla") {
          await sendText(senderPsid, "মোবাইল অপারেটর সম্পর্কে জানতে নিচের তালিকা থেকে অপারেটর নির্বাচন করুন 👇");
        } else {
          await sendText(senderPsid, "To learn about mobile operators, select an operator from the list below. 👇");
        }    
        
        sendMobileOperatorAsCarousel(senderPsid, userLanguage[senderPsid]);
        // sendMobileOperatorQuickReplies(senderPsid, userLanguage[senderPsid]);    
      })();
      break;

    case 'SHOW_MAIN_MENU':
        sendMobileOperatorQuickReplies(senderPsid, userLanguage[senderPsid]);
      break;
    // Optional: add handlers for other menu options here
    default:
      if (userLanguage[senderPsid] === "bangla") {
        sendText(senderPsid, "ধন্যবাদ! আমরা এই ফিচারটির উপর কাজ করছি।");
      } else {
        sendText(senderPsid, "Thanks! We are working on that feature.");
      }
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
        title: isBangla ? "📝 অভিযোগ ফর্ম" : "📝 Complaint Form"
      },
      {
        type: "phone_number",
        title: isBangla ? "📞 কল বিটিআরসি হেল্পলাইন : ১০০" : "📞 Call BTRC Helpline: 100",
        payload: "100"
      },
      {
        // type: "web_url",
        // url: "https://www.btrc.gov.bd",
        // title: isBangla ? "🌐 বিটিআরসি ওয়েবসাইট" : "🌐 BTRC Website"
          type: "postback",
          title: isBangla ? "অন্যান্য পরিষেবা" : "Other Services",
          payload: "BTRC"
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
      title: isBangla ? "হেল্পলাইন নম্বর" : "Helpline Numbers",
      image_url: `${process.env.BASE_URL}/images/helpline.png`,
      subtitle: isBangla
        ? "সরকারি এবং টেলকো হেল্পলাইন" : "Govt. & Telco Helpline",
      buttons: [
        {
          type: "phone_number",
          title: isBangla ? "📞 সরকারি হেল্পলাইন" : "📞 Govt. Helpline",
          payload: "+880123456789"
        },
        {
          type: "phone_number",
          title: isBangla ? "📞 টেলকো হেল্পলাইন" : "📞 Telco Helpline",
          payload: "+880123456789"
        },
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

function btrcCarousel(senderPsid, lang) {
  const isBangla = lang === 'bangla';

  const elements = [
    {
      title: isBangla ? "বিটিআরসি অভিযোগ এবং অবস্থা" : "BTRC Complain and Status",
      // image_url: `${process.env.BASE_URL}/images/BTRC.png`,
      subtitle: isBangla
        ? "বিটিআরসি সম্পর্কিত আপনার পছন্দের পরিষেবা সম্পর্কে জানুন।"
        : "Learn about your favorite BTRC related services.",
      buttons: [
        {
          type: "web_url",
          url: "https://crm.btrc.gov.bd/",
          title: isBangla ? "📝 অভিযোগ ফর্ম" : "📝 Complaint Form"
        }
      ]
    },
    {
      title: isBangla ? "ডিএনডি অ্যাক্টিভেশন" : "DND Activation",
      // image_url: `${process.env.BASE_URL}/images/mobile_operator.png`,
      subtitle: isBangla
        ? "গ্রামীনফোনের গ্রাহকদের *১২১*১১০১#, বাংলালিংক এর গ্রাহকদের *১২১*৮*৬#  এবং রবির গ্রাহকদের *৭# ডায়াল করে সেবাটি গ্রহণ করতে পারবে।"
        : "Grameenphone customers can avail the service by dialing *121*1101#, Banglalink customers *121*8*6#, and Robi customers *7#.",
      buttons: [
        {
          type: "web_url",
          url: "https://btrc.gov.bd/site/page/e360dbf7-0886-4839-ac00-8b3e80384c47/Do-Not-Disturb-(DND)",
          title: isBangla ? "🌐 ক্লিক করুন" : "🌐 Click Here"
        }
      ]
    },
    {
      title: isBangla ? "সংক্ষিপ্ত-কোড পদ্ধতি" : "Short-Code Procedure",
      // image_url: `${process.env.BASE_URL}/images/mobile_operator.png`,
      subtitle: isBangla
        ? "শর্ট কোড বরাদ্দ পদ্ধতি নির্দেশিকা/শর্ট কোড আবেদন ফর্ম/শর্ট কোড বরাদ্দের শর্তাবলী এবং শর্টকোড বরাদ্দ ও নবায়নের নিয়মাবলী"
        : "Short code allocation procedure guidelines/Short code application form/Short code allocation terms and conditions and short code allocation and renewal rules",
      buttons: [
        {
          type: "web_url",
          url: "https://btrc.gov.bd/site/page/05a6a990-5687-4a51-860c-e67ca9487fba/Short-code-Allocation",
          title: isBangla ? "🌐 ক্লিক করুন" : "🌐 Click Here"
        }
      ]
    },
    {
      title: isBangla ? "অননুমোদিত হ্যান্ডসেট নিবন্ধন" : "Unauthorized Handset registration",
      // image_url: `${process.env.BASE_URL}/images/mobile_operator.png`,
      subtitle: isBangla
        ? "অননুমোদিত হ্যান্ডসেট নিবন্ধনের জন্য নির্দেশিকা/আবেদন ফর্ম/শর্তাবলী"
        : "Guidelines/Application Form/Terms and Conditions for Unauthorized Handset Registration",
      buttons: [
        {
          type: "web_url",
          url: "https://neir.btrc.gov.bd/auth/login",
          title: isBangla ? "🌐 ক্লিক করুন" : "🌐 Click Here"
        }
      ]
    },
    {
      title: isBangla ? "লাইসেন্স-সম্পর্কিত তথ্য" : "Licence-Related Info",
      // image_url: `${process.env.BASE_URL}/images/mobile_operator.png`,
      subtitle: isBangla
        ? "লাইসেন্স -সম্পর্কিত তথ্য, নির্দেশিকা, আবেদন ফর্ম এবং শর্তাবলী।"
        : "Licence-related information including guidelines, application forms, and terms and conditions.",
      buttons: [
        {
          type: "web_url",
          url: "https://lims.btrc.gov.bd",
          title: isBangla ? "🌐 ক্লিক করুন" : "🌐 Click Here"
        }
      ]
    },
    {
      title: isBangla ? "এমএনপি (MNP)" : "MNP (Mobile Number Portability)",
      // image_url: `${process.env.BASE_URL}/images/mnp.png`,
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
      title: isBangla ? "হেল্পলাইন নম্বর" : "Helpline Numbers",
      // image_url: `${process.env.BASE_URL}/images/helpline.png`,
      subtitle: isBangla
        ? "সরকারি এবং টেলকো হেল্পলাইন" : "Govt. & Telco Helpline",
      buttons: [
        {
          type: "phone_number",
          title: isBangla ? "📞 সরকারি হেল্পলাইন" : "📞 Govt. Helpline",
          payload: "+880123456789"
        },
        {
          type: "phone_number",
          title: isBangla ? "📞 টেলকো হেল্পলাইন" : "📞 Telco Helpline",
          payload: "MOBILE_OPERATOR"
        },
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

function sendMobileOperatorQuickReplies(senderPsid, lang = 'english') {
  console.log('Sending mobile operator quick replies to:', senderPsid, 'Language:', lang);
  const isBangla = lang === 'bangla';

  const response = {
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
  };

  return callSendAPI(senderPsid, response);
}

//2.1 Mobile Operator Carousel
function sendMobileOperatorAsCarousel(senderPsid, lang = 'english') {
  console.log('Sending mobile operator carousel to:', senderPsid, 'Language:', lang);
  const isBangla = lang === 'bangla';

  const elements = [
    {
      title: isBangla ? "গ্রামীণফোন" : "Grameenphone",
      image_url: `${process.env.BASE_URL}/images/grameenphone.png`,
      subtitle: isBangla ? "📞 গ্রামীণফোন হেল্পলাইন: ১২১ বা গ্রাহক অভিযোগ নম্বর: ১৫৮, একই অপারেটরের সিম ব্যবহার করুন" : "📞 Grameenphone Helpline: 121,  Customer Complaint: 158, use same operator SIM",
      buttons: [
            {
              type: "web_url",
              url: "https://www.grameenphone.com",
              title: isBangla ? "🌐 ওয়েবসাইট" : "🌐 Visit Website"
            },
            {
                type: "phone_number",
                title: isBangla ? "📞 কল ১২১" : "📞 Call 121",
                payload: "121"
              }       
      ]
    },
        {
      title: isBangla ? "বাংলালিংক" : "Banglalink",
      image_url: `${process.env.BASE_URL}/images/banglalink.png`,
      subtitle: isBangla ? "📞 বাংলালিংক হেল্পলাইন: ১২১, একই অপারেটরের সিম ব্যবহার করুন" : "📞 Banglalink Helpline: 121, use same operator SIM",
      buttons: [
            {
              type: "web_url",
              url: "https://www.banglalink.net",
              title: isBangla ? "🌐 ওয়েবসাইট" : "🌐 Visit Website"
            },
            {
                type: "phone_number",
                title: isBangla ? "📞 কল ১২১" : "📞 Call 121",
                payload: "121"
              }       
      ]
    },
    {
      title: isBangla ? "রবি" : "Robi",
      image_url: `${process.env.BASE_URL}/images/robi.png`,
      subtitle: isBangla ? "📞 রবি হেল্পলাইন: ১২১ বা ০১৮১৯৪০০৪০০, একই অপারেটরের সিম ব্যবহার করুন" : "📞 Robi Helpline: 121 or 01819400400, use same operator SIM",
      buttons: [
        { type: "web_url",
          url: "https://www.robi.com.bd",
          title: isBangla ? "🌐 ওয়েবসাইট" : "🌐 Visit Website"},
        { type: "phone_number", title: isBangla ? "📞 কল ১২১" : "📞 Call 121", payload: "121" }
      ]
    },
    {
      title: isBangla ? "এয়ারটেল" : "Airtel",
      image_url: `${process.env.BASE_URL}/images/airtel.png`,
      subtitle: isBangla ? "📞 এয়ারটেল হেল্পলাইন: ১২১ বা ০১৬৭৮৬০০৭৮৬, একই অপারেটরের সিম ব্যবহার করুন" : "📞 Airtel Helpline: 121 or 01678600786, use same operator SIM",
      buttons: [
        { type: "web_url",
          url: "https://www.bd.airtel.com",
          title: isBangla ? "🌐 ওয়েবসাইট" : "🌐 Visit Website"},
        { type: "phone_number", title: isBangla ? "📞 কল ১২১" : "📞 Call 121", payload: "121" }
      ]
    },
    {
      title: isBangla ? "টেলিটক" : "Teletalk",
      image_url: `${process.env.BASE_URL}/images/teletalk.png`,
      subtitle: isBangla ? "📞 টেলিটক হেল্পলাইন: ১২১ বা ০১৫০০১২১১২১-৯, একই অপারেটরের সিম ব্যবহার করুন" : "📞 Teletalk Helpline: 121 or 01500121121-9, use same operator SIM",
      buttons: [
        { type: "web_url",
          url: "https://www.teletalk.com.bd",
          title: isBangla ? "🌐 ওয়েবসাইট" : "🌐 Visit Website"},
        { type: "phone_number", title: isBangla ? "📞 কল ১২১" : "📞 Call 121", payload: "121" }
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



// Messenger API caller with Promise
function callSendAPI(senderPsid, response) {
  return new Promise((resolve, reject) => {
    const requestBody = {
      recipient: { id: senderPsid },
      message: response
    };

    request({
      uri: "https://graph.facebook.com/v23.0/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: requestBody
    }, (err, res, body) => {
      if (!err) {
        console.log("Message sent!");
        resolve(body);
      } else {
        console.error("Unable to send message:", err);
        reject(err);
      }
    });
  });
}

// sendText now async/await compatible
function sendText(senderPsid, text) {
  const response = { text };
  return callSendAPI(senderPsid, response);
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
                        "title": lang === 'bangla' ? '📝 অভিযোগ ফর্ম' : '📝 Complaint Form',
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

async function setMessengerProfile() {
  const url = `https://graph.facebook.com/v23.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`;

  const body = {
    get_started: {
      payload: "GET_STARTED"
    },
    greeting: [
      {
        locale: "default",
        text: "Hi! Welcome to BTRC. Please avoid sharing personal data (NID, phone, password).\nহ্যালো! বিটিআরসিতে আপনাকে স্বাগতম। দয়া করে ব্যক্তিগত তথ্য শেয়ার করবেন না।"
      }
    ],
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            type: "postback",
            title: "🏠 Main Menu",
            payload: "SHOW_MAIN_MENU"
          },
          {
            type: "web_url",
            title: "🌐 Powered by Genex Infosys PLC",
            url: "https://genexinfosys.com",
            webview_height_ratio: "full"
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });
    console.log("Messenger profile set:", response.data);
  } catch (error) {
    console.error("Error setting profile:", error.response?.data || error.message);
  }
}

app.get("/set-profile", async (req, res) => {
  await setMessengerProfile();
  res.send("Messenger profile setup triggered.");
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
