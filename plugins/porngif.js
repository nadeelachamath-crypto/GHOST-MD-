const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "porngif",
    react: "🖼️",
    desc: "Send a short real porn clip as GIF (from RedGifs)",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, reply, from }) => {
    try {
      const tag = q?.trim().toLowerCase() || "ass";
      reply(`🔍 Searching RedGifs for tag: *${tag}*...`);

      const authRes = await axios.get("https://api.redgifs.com/v2/auth/temporary");
      const token = authRes.data?.token;
      if (!token) return reply("❌ Failed to authenticate with RedGifs.");

      const searchRes = await axios.get(
        `https://api.redgifs.com/v2/gifs/search?search_text=${encodeURIComponent(tag)}&count=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const gifs = searchRes.data?.gifs;
      if (!gifs || gifs.length === 0) return reply(`❌ No results for: *${tag}*`);

      // Try to find gif, else fallback to .sd
      const selected = gifs.find(v => v?.urls?.gif || v?.urls?.sd);
      const gifUrl = selected?.urls?.gif || selected?.urls?.sd;
      const title = selected?.title || tag;
      const pageUrl = `https://redgifs.com/watch/${selected.id}`;

      if (!gifUrl) return reply("❌ Could not get a valid GIF or video.");

      // Send as short video (WhatsApp shows it like a GIF)
      await robin.sendMessage(
        from,
        {
          video: { url: gifUrl },
          caption: `🎞️ *${title}*\n🔗 ${pageUrl}`,
          mimetype: "video/mp4",
          gifPlayback: true,
        },
        { quoted: mek }
      );

    } catch (err) {
      console.error("realgif error:", err.message);
      reply("❌ Failed to fetch media.");
    }
  }
);
