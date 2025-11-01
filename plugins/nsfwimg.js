const { cmd } = require("../command");
const axios = require("axios");
const xml2js = require("xml2js");

cmd(
  {
    pattern: "nsfwimg",
    react: "🍑",
    desc: "Get 3 NSFW images by keyword or random (yande.re)",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, from, reply }) => {
    try {
      const tag = q?.trim().replace(/\s+/g, "_") || "";
      const limit = 100; // max posts to fetch

      const apiUrl = `https://yande.re/post.xml?limit=${limit}${tag ? `&tags=${encodeURIComponent(tag)}` : ""}`;

      const res = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Referer: "https://www.google.com/",
        },
      });

      // Parse XML response
      const parsed = await xml2js.parseStringPromise(res.data);
      const posts = parsed.posts.post;
      if (!posts || posts.length === 0) {
        return reply(`❌ No images found for: ${q || "random"}`);
      }

      // Pick 3 random images
      const selectedImages = [];
      const usedIndexes = new Set();
      while (selectedImages.length < 3 && selectedImages.length < posts.length) {
        const randomIndex = Math.floor(Math.random() * posts.length);
        if (!usedIndexes.has(randomIndex)) {
          usedIndexes.add(randomIndex);
          selectedImages.push(posts[randomIndex]);
        }
      }

      // Send images
      for (const post of selectedImages) {
        const imageUrl = post.$.file_url;
        const rating = post.$.rating.toUpperCase();
        const tags = post.$.tags;

        const caption = `🍑 *NSFW Image*\n🔍 *Tags:* ${tags}\n🔞 *Rating:* ${rating}`;
        await robin.sendMessage(
          from,
          {
            image: { url: imageUrl },
            caption,
          },
          { quoted: mek }
        );
      }
    } catch (err) {
      console.error("NSFW Yande error:", err.message);
      reply("❌ Failed to fetch images. Try another keyword.");
    }
  }
);
