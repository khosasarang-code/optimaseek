export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing ANTHROPIC_API_KEY in Vercel Environment Variables"
    });
  }

  try {
    const { messages = [] } = req.body || {};

    const cleanMessages = messages
      .filter(message => message && message.content && message.role !== "system")
      .map(message => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content)
      }))
      .slice(-20);

    if (!cleanMessages.length) {
      cleanMessages.push({ role: "user", content: "Hello" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
        max_tokens: 1400,
        system:
          "You are OptimaSeek AI, a helpful assistant inside optimaseek.com. Answer clearly, use clean formatting, and help users with search, writing, planning, documents, and everyday questions.",
        messages: cleanMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Anthropic API request failed",
        detail: data
      });
    }

    const reply = (data.content || [])
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("")
      .trim();

    return res.status(200).json({
      reply: reply || "Claude returned an empty response. Please try again."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error while contacting Anthropic",
      detail: error.message
    });
  }
}
