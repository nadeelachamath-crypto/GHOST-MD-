const { cmd } = require("../command");
const { File } = require("megajs");
const fs = require("fs");
const os = require("os");
const path = require("path");
const FileType = require("file-type");

function isMegaUrl(str) {
  try {
    const url = new URL(str);
    return url.hostname.includes("mega.nz");
  } catch (_) {
    return false;
  }
}

function parseMegaUrl(link) {
  const parts = link.split("#");
  if (parts.length !== 2) return null;
  const fileUrl = parts[0];
  const key = parts[1];
  return { fileUrl, key };
}

cmd(
  {
    pattern: "mega",
    desc: "Download MEGA files (no % display)",
    react: "📦",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Please provide a MEGA file link.");
    if (!isMegaUrl(q)) return reply("❌ That doesn't look like a valid MEGA link.");

    const parsed = parseMegaUrl(q);
    if (!parsed) return reply("❌ MEGA link is missing the decryption key (after #).");

    const { fileUrl, key } = parsed;

    try {
      await reply("📥 Connecting to MEGA...");

      const file = File.fromURL(`${fileUrl}#${key}`);
      await new Promise((resolve, reject) => {
        file.loadAttributes((err) => (err ? reject(err) : resolve()));
      });

      const fileName = file.name || "mega_file";
      const totalBytes = file.size || 0;
      const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
      const tmpPath = path.join(os.tmpdir(), fileName);
      const writeStream = fs.createWriteStream(tmpPath);

      await robin.sendMessage(
        from,
        {
          text: `📄 *Name:* ${fileName}\n📦 *Size:* ${totalMB} MB\n⏬ Downloading...`,
        },
        { quoted: mek }
      );

      const downloadStream = file.download();

      await new Promise((resolve, reject) => {
        downloadStream.pipe(writeStream);
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
        writeStream.on("error", reject);
      });

      const bufferStart = fs.readFileSync(tmpPath, { start: 0, end: 4100 });
      const fileType = await FileType.fromBuffer(bufferStart);
      const mimetype = fileType?.mime || "application/octet-stream";

      await robin.sendMessage(
        from,
        {
          document: { url: tmpPath },
          fileName,
          mimetype,
          caption: `📦 *Downloaded from MEGA*\n📁 *File:* ${fileName}`,
        },
        { quoted: mek }
      );

      await robin.sendMessage(from, { text: "✅ File sent successfully." }, { quoted: mek });

      fs.unlinkSync(tmpPath); // cleanup
    } catch (error) {
      console.error("❌ MEGA download error:", error);
      reply("❌ Download failed: " + (error.message || error));
    }
  }
);
