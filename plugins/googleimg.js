const { cmd } = require("../command");
const gis = require("g-i-s");

// Promise wrapper for g-i-s
function gisAsync(query) {
  return new Promise((resolve, reject) => {
    gis(query, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

cmd(
  {
    pattern: "img",
    alias: ["googleimg"],
    react: "🔍",
    desc: "Search and send images from Google",
    category: "search",
    filename: __filename,
  },
  async (bot, mek, m, context) => {
    try {
      // Defensive way to get 'q' from context object
      const q = (context.q && typeof context.q === "string") ? context.q.trim() : "";

      if (!q) {
        return context.reply("❌ Please provide a search query.");
      }

      const results = await gisAsync(q);

      if (!results || results.length === 0) {
        return context.reply("❌ No images found for your query.");
      }

      const imagesToSend = results.slice(0, 3);

      for (const img of imagesToSend) {
        try {
          await bot.sendMessage(context.from, { image: { url: img.url } }, { quoted: mek });
        } catch (sendErr) {
          console.error("[Google Image Search] Failed to send image:", sendErr.message);
        }
      }
    } catch (err) {
      console.error("[Google Image Search] Error:", err.message);
      context.reply("❌ Failed to fetch images. Please try again later.");
    }
  }
);
