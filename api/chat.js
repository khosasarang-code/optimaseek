module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, image } = req.body;

    let content = [];

    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data
        }
      });
    }

    content.push({
      type: "text",
      text: message || "What is in this image?"
    });

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
