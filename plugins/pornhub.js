const { cmd } = require("../command");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const ytdlp = require("yt-dlp-exec");

// Paths
const cookiesPath = path.resolve(__dirname, "../cookies/pornhubcookies.txt");
const tempFolder = path.resolve(__dirname, "../temp");

if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);

function parseNetscapeCookies(filePath, domain = "pornhub.com") {
  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    throw new Error("Invalid cookies file path: " + JSON.stringify(filePath));
  }
  if (!fs.existsSync(filePath)) {
    throw new Error("Cookies file does not exist: " + filePath);
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const cookies = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[0].includes(domain)) {
      cookies.push(`${parts[5]}=${parts[6]}`);
    }
  }
  return cookies.join("; ");
}

cmd(
  {
    pattern: "pornhub",
    alias: ["ph", "pornhubdl"],
    react: "💦",
    desc: "Download Pornhub video as document (max 720p, saved temp file, requires cookies)",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!fs.existsSync(cookiesPath))
        return reply(
          "⚠️ Pornhub cookies not found. Please add `pornhubcookies.txt` to the `/cookies` folder."
        );

      if (!q || !q.includes("pornhub.com"))
        return reply("❌ Please provide a valid Pornhub video URL.");

      console.log("Fetching video metadata with yt-dlp...");
      const info = await ytdlp(q, {
        dumpSingleJson: true,
        cookies: cookiesPath,
        noCheckCertificate: true,
      });

      // Select best mp4 with audio+video ≤ 720p
      let format =
        info.formats.find(
          (f) =>
            f.ext === "mp4" &&
            f.acodec !== "none" &&
            f.vcodec !== "none" &&
            f.height === 720 &&
            f.url
        ) ||
        info.formats
          .filter(
            (f) =>
              f.ext === "mp4" &&
              f.acodec !== "none" &&
              f.vcodec !== "none" &&
              f.height &&
              f.height <= 720 &&
              f.url
          )
          .sort((a, b) => b.height - a.height)[0] ||
        info.formats.find(
          (f) =>
            f.ext === "mp4" &&
            f.acodec !== "none" &&
            f.vcodec !== "none" &&
            f.url
        );

      if (!format || !format.url)
        return reply("❌ No suitable mp4 video format found.");

      const sizeMB = format.filesize
        ? (format.filesize / 1048576).toFixed(2) + " MB"
        : "Unknown";
      const views = info.view_count
        ? info.view_count.toLocaleString()
        : "Unknown";
      const duration = info.duration
        ? new Date(info.duration * 1000).toISOString().substr(11, 8)
        : "Unknown";

      const metadata = `👻 *GHOST PORNHUB DOWNLOADER*

🎥 *Title:* ${info.title}
🕒 *Duration:* ${duration}
👁 *Views:* ${views}
📦 *Quality:* ${format.height || "?"}p
📁 *Size:* ${sizeMB}
🔗 *URL:* ${q}`;

      if (info.thumbnail) {
        await robin.sendMessage(
          from,
          { image: { url: info.thumbnail }, caption: metadata },
          { quoted: mek }
        );
      } else {
        await reply(metadata);
      }

      // Download video to temp file
      const tempFile = path.join(tempFolder, `${uuidv4()}.mp4`);
      console.log("Downloading video to:", tempFile);

      const cookieHeader = parseNetscapeCookies(cookiesPath);

      const response = await axios.get(format.url, {
        responseType: "stream",
        headers: {
          Referer: "https://www.pornhub.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
          Cookie: cookieHeader,
        },
        timeout: 180000,
      });

      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log("Download complete, reading file to buffer...");

      // Read entire video file into buffer
      const buffer = fs.readFileSync(tempFile);

      console.log("Sending video as document...");
      await robin.sendMessage(
        from,
        {
          document: buffer,
          mimetype: "video/mp4",
          fileName: `${info.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60)}.mp4`,
          caption: `🎬 *${info.title}*\n📦 ${format.height || "?"}p • ${sizeMB}`,
        },
        { quoted: mek }
      );

      // Clean up temp file
      fs.unlink(tempFile, (err) => {
        if (err) console.warn("Failed to delete temp file:", err);
        else console.log("Temp file deleted:", tempFile);
      });
    } catch (error) {
      console.error("Pornhub downloader error:", error);
      reply(`❌ Error: ${error.message || "Unknown error"}`);
    }
  }
);
