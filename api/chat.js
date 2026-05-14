const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const { message, image, mode } = req.body;
    const msgLower = (message || '').toLowerCase();

    // =========================
    // WORD DOCUMENT (.docx)
    // =========================

    const isWord =
      msgLower.includes('word') ||
      msgLower.includes('resume') ||
      msgLower.includes('cv') ||
      msgLower.includes('cover letter') ||
      msgLower.includes('contract');

    if (isWord) {

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: `Create a professional document for: ${message}`
          }]
        })
      });

      const aiData = await aiRes.json();

      const text = aiData.content[0].text;

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    size: 24
                  })
                ]
              })
            ]
          }
        ]
      });

      const buffer = await Packer.toBuffer(doc);

      return res.status(200).json({
        type: "word",
        data: buffer.toString("base64"),
        filename: "document.docx"
      });
    }

    // =========================
    // PDF FILE
    // =========================

    const isPdf =
      msgLower.includes('pdf');

    if (isPdf) {

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: `Create a professional PDF document for: ${message}`
          }]
        })
      });

      const aiData = await aiRes.json();

      const text = aiData.content[0].text;

      const doc = new PDFDocument();

      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));

      doc.on('end', () => {

        const pdfData = Buffer.concat(buffers);

        return res.status(200).json({
          type: "pdf",
          data: pdfData.toString('base64'),
          filename: "document.pdf"
        });
      });

      doc.fontSize(14).text(text, {
        align: 'left'
      });

      doc.end();

      return;
    }

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
}
