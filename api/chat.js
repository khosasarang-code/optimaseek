export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body;

    const lastText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "You are OptimaSeek AI, a helpful assistant. Answer clearly and helpfully.\n\n" +
                    lastText
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response received from AI.";

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "AI request failed",
      detail: error.message
    });
  }
}
