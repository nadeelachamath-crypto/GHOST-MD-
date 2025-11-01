const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

const GEMINI_API_KEY = config.GEMINI_API_KEY;  // 🔑 Add this to config.js
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

cmd({
  pattern: "gemini",
  alias: ["ai", "chatgpt", "gpt"],
  react: "🤖",
  desc: "Ask anything to Google Gemini AI.",
  category: "ai",
  use: ".gemini <your question>",
  filename: __filename
}, async (conn, m, msg, {
  args,
  pushname,
  reply
}) => {
  const text = args.join(" ");
  if (!text) return reply("❗ Please give me a question.");

  const prompt = `My name is ${pushname}. You are Robin AI, a friendly WhatsApp bot created by Nadeela Chamath. Always reply in the same language as the user. Don’t sound like a bot. Use helpful emojis. Here's my question: ${text}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  try {
    const response = await axios.post(GEMINI_API_URL, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) return reply("❌ AI did not return a proper answer.");

    return reply(result);
  } catch (err) {
    console.error("Gemini Error:", err.response?.data || err.message);
    return reply("❌ Gemini API error. Try again later.");
  }
});
