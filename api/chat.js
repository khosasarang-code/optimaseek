const xlsx = require('xlsx');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, image, mode } = req.body;

    // IMAGE GENERATION MODE
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
      } else {
        return res.status(200).json({ reply: "Image error: " + JSON.stringify(data) });
      }
    }

    // EXCEL GENERATION MODE
    if (mode === "excel") {
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
            content: `Create a JSON array for an Excel spreadsheet based on this request: "${message}". 
            Return ONLY a JSON object with this structure, no other text:
            {
              "sheetName": "Sheet name here",
              "headers": ["Col1", "Col2", "Col3"],
              "rows": [
                ["data1", "data2", "data3"],
                ["data4", "data5", "data6"]
              ]
            }`
          }]
        })
      });
      const claudeData = await claudeRes.json();
      let jsonText = claudeData.content[0].text.trim();
      jsonText = jsonText.replace(/```json|```/g, '').trim();
      const sheetData = JSON.parse(jsonText);
      
      const wb = xlsx.utils.book_new();
      const wsData = [sheetData.headers, ...sheetData.rows];
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, sheetData.sheetName || 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      return res.status(200).json({
        type: "excel",
        data: buffer,
        filename: (sheetData.sheetName || 'spreadsheet') + '.xlsx'
      });
    }

    // CHAT MODE
    let content = [];
    if (image) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.data }
      });
    }
    content.push({ type: "text", text: message || "What is in this image?" });

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
    
    // CHECK IF USER IS ASKING FOR EXCEL/WORD/PDF
    const msgLower = message.toLowerCase();
    if(msgLower.includes('excel') || msgLower.includes('spreadsheet') || msgLower.includes('xlsx')) {
      const reply = data.content[0].text;
      return res.status(200).json({ 
        reply: reply + '\n\n💡 **Tip:** Click the **📎 Create Excel** button below to download a real Excel file!',
        suggestExcel: true,
        originalMessage: message
      });
    }

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
