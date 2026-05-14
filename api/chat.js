const xlsx = require('xlsx');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, image, mode } = req.body;
    const msgLower = (message || '').toLowerCase();

    // IMAGE GENERATION
    if (mode === "image") {
      const formData = new FormData();
      formData.append("prompt", message);
      formData.append("output_format", "jpeg");
      const response = await fetch(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.STABILITY_API_KEY}`,
            "Accept": "application/json"
          },
          body: formData
        }
      );
      const data = await response.json();
      if (data.image) {
        return res.status(200).json({
          type: "image",
          image: `data:image/jpeg;base64,${data.image}`
        });
      }
      return res.status(200).json({ reply: "Image generation failed. Try again." });
    }

    // EXCEL GENERATION
    if (mode === "excel" || msgLower.includes('create excel') || msgLower.includes('make excel') || msgLower.includes('excel sheet') || msgLower.includes('spreadsheet') && msgLower.includes('create')) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: `Create a JSON for an Excel spreadsheet for: "${message}". Return ONLY this JSON, no other text:
            {"sheetName":"Sheet name","headers":["Col1","Col2","Col3"],"rows":[["data1","data2","data3"],["data4","data5","data6"]]}`
          }]
        })
      });
      const claudeData = await claudeRes.json();
      let jsonText = claudeData.content[0].text.trim().replace(/```json|```/g, '').trim();
      const sheetData = JSON.parse(jsonText);
      const wb = xlsx.utils.book_new();
      const wsData = [sheetData.headers, ...sheetData.rows];
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, sheetData.sheetName || 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'base64', bookType: 'xlsx' });
      return res.status(200).json({
        type: "excel",
        data: buffer,
        filename: (sheetData.sheetName || 'spreadsheet').replace(/\s+/g, '_') + '.xlsx'
      });
    }

    // WORD/PDF - generate as downloadable HTML that opens as document
    if (msgLower.includes('create word') || msgLower.includes('make word') || msgLower.includes('word document') || msgLower.includes('create pdf') || msgLower.includes('make pdf') || msgLower.includes('pdf file') || msgLower.includes('create letter') || msgLower.includes('create resume') || msgLower.includes('create cv')) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: `Create a professional document for: "${message}". Format it nicely with proper sections, headings and content. Return the full document content in HTML format with basic styling (use inline styles). Make it look professional and complete.`
          }]
        })
      });
      const claudeData = await claudeRes.json();
      const content = claudeData.content[0].text;
      const htmlDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:40px;line-height:1.6;}h1,h2,h3{color:#333;}table{width:100%;border-collapse:collapse;}td,th{border:1px solid #ddd;padding:8px;}</style></head><body>${content}</body></html>`;
      const base64 = Buffer.from(htmlDoc).toString('base64');
      const filename = message.substring(0, 30).replace(/[^a-z0-9]/gi, '_') + '.html';
      return res.status(200).json({
        type: "document",
        data: base64,
        filename: filename,
        mimeType: "text/html"
      });
    }

    // NORMAL CHAT
    let content = [];
    if (image) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.data }
      });
    }
    content.push({ type: "text", text: message || "Hello" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: content }]
      })
    });

    const data = await response.json();
    if (data.content && data.content[0] && data.content[0].text) {
      res.status(200).json({ reply: data.content[0].text });
    } else {
      res.status(200).json({ reply: "Error: " + JSON.stringify(data) });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
