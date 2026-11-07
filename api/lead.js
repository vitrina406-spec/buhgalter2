// Vercel serverless-функція: приймає заявку з сайту і надсилає її в Telegram.
// Токен і chat_id беруться зі змінних середовища Vercel, у коді їх немає.

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  let d = req.body;
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch { d = {}; }
  }
  d = d || {};

  // захист від спам-ботів: приховане поле має бути порожнім
  if (d.company_site) return res.status(200).json({ ok: true });

  const name = String(d.name || '').trim().slice(0, 100);
  const phone = String(d.phone || '').trim().slice(0, 30);
  if (name.length < 2 || phone.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Не задано TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID');
    return res.status(500).json({ ok: false });
  }

  const services = Array.isArray(d.services) ? d.services.join(', ') : String(d.services || '');
  const quiz = typeof d.quiz === 'object' ? JSON.stringify(d.quiz) : String(d.quiz || '');

  const lines = [
    '🔔 <b>Нова заявка HAPPY FINANCE</b>',
    '',
    `👤 <b>Ім’я:</b> ${esc(name)}`,
    `📞 <b>Телефон:</b> ${esc(phone)}`,
    `🏢 <b>Форма:</b> ${esc(d.business || '—')}`,
    `🧾 <b>Що потрібно:</b> ${esc(services || '—')}`,
    `📍 <b>Звідки:</b> ${esc(d.source || '—')}`,
  ];
  if (quiz) lines.push(`📊 <b>Тест:</b> ${esc(quiz)}`);
  if (d.created_at) lines.push(`🕒 ${esc(d.created_at)}`);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      console.error('Telegram error', r.status, await r.text());
      return res.status(502).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false });
  }
};
