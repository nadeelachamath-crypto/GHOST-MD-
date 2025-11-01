const axios = require('axios');
const cheerio = require('cheerio');
const { cmd } = require('../command');

async function searchAPKCombo(query) {
  const searchUrl = `https://apkcombo.com/en/search?q=${encodeURIComponent(query)}`;

  const res = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const $ = cheerio.load(res.data);

  // Get first app link from search results
  const firstAppLink = $('.app-info a').attr('href');
  if (!firstAppLink) return null;

  // Return full URL to app detail page
  return 'https://apkcombo.com' + firstAppLink;
}

async function getAPKDownloadLink(appPageUrl) {
  const res = await axios.get(appPageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const $ = cheerio.load(res.data);

  // The download link is inside a button or anchor with data-download-url attribute
  // or you may find it in a link like: a[href*="/apk-download/"]
  // Let's try to find a download button link first:

  // Try to find the download button URL
  let downloadPageLink = $('a#btn-download').attr('href');

  // If not found, try alternative selector
  if (!downloadPageLink) {
    downloadPageLink = $('a.btn-primary[href*="/apk-download/"]').attr('href');
  }

  if (!downloadPageLink) return null;

  // The download page URL (usually a relative link)
  const fullDownloadPageUrl = downloadPageLink.startsWith('http') ? downloadPageLink : 'https://apkcombo.com' + downloadPageLink;

  // Now get the actual APK download link from the download page
  const downloadPageRes = await axios.get(fullDownloadPageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const $$ = cheerio.load(downloadPageRes.data);

  // The real APK download link is usually in a button with id "download_link"
  const apkLink = $$('a#download_link').attr('href');

  if (!apkLink) return null;

  return apkLink;
}

cmd({
  pattern: 'apk',
  alias: ['apkcm'],
  react: '📲',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('❌ Please provide the app name or package.');

    const appPage = await searchAPKCombo(q);
    if (!appPage) return reply('❌ App not found on APKCombo.');

    const downloadLink = await getAPKDownloadLink(appPage);
    if (!downloadLink) return reply('❌ Could not find APK download link.');

    reply(`📲 *APKCombo Download Link for:* ${q}\n\n${downloadLink}`);

  } catch (e) {
    console.error(e);
    reply('❌ Failed to fetch APK from APKCombo.');
  }
});

