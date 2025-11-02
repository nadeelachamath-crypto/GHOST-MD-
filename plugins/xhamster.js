const { cmd } = require("../command");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

cmd(
  {
    pattern: "xhamster",
    react: "🎥",
    desc: "Download XHamster videos (max 720p) using yt-dlp with cookies",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, reply, from }) => {
    try {
      if (!q) return reply("❗ Provide an XHamster link (optionally with resolution like `360p`).");

      const args = q.trim().split(" ");
      let quality = "720";
      let url = "";

      if (/^\d{3,4}p$/.test(args[0])) {
        quality = args[0].replace("p", "");
        url = args[1];
      } else {
        url = args[0];
      }

      if (!url || !url.includes("xhamster.com")) {
        return reply("❌ Provide a valid XHamster video link.");
      }

      reply("🎬 Fetching video info...");

      const outputDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

      const outputFile = path.join(outputDir, "xhamster_video.mp4");
      const cookiesFile = path.join(__dirname, "../cookies/xhamster.txt"); // ✅ Corrected path

      const command = `yt-dlp -f "best[height<=${quality}]" "${url}" --cookies "${cookiesFile}" -o "${outputFile}" --write-info-json --quiet`;

      exec(command, async (error) => {
        if (error) {
          console.error("yt-dlp error:", error.message);
          return reply(`❌ Failed to download video.\n${error.message}`);
        }

        const infoFile = outputFile.replace(".mp4", ".info.json");
        let title = "XHamster Video";
        let thumb = null;

        if (fs.existsSync(infoFile)) {
          const info = JSON.parse(fs.readFileSync(infoFile));
          title = info.title || title;
          thumb = info.thumbnail || info.thumbnails?.[0]?.url || null;
        }

        if (thumb) {
          await robin.sendMessage(from, {
            image: { url: thumb },
            caption: `👻 *GHOST xHamster Downloader*\n\n📝 *Title:* ${title}\n🎞 *Quality:* ${quality}p\n\n📥 Downloading video...`,
          }, { quoted: mek });
        }

        const videoData = fs.readFileSync(outputFile);
        const fileName = `${title.replace(/[^a-z0-9]/gi, "_").slice(0, 50)}.mp4`;

        await robin.sendMessage(from, {
          document: videoData,
          mimetype: "video/mp4",
          fileName,
          caption: `🎥 *XHamster ${quality}p Video*\n📝 ${title}\n🔗 ${url}`,
        }, { quoted: mek });

        fs.unlinkSync(outputFile);
        if (fs.existsSync(infoFile)) fs.unlinkSync(infoFile);

        reply("✅ Video sent successfully!");
      });

    } catch (err) {
      console.error("xhamster downloader error:", err);
      reply(`❌ Error: ${err.message}`);
    }
  }
);
 
