export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing STABILITY_API_KEY in Vercel Environment Variables"
    });
  }

  try {
    const { prompt = "" } = req.body || {};
    if (!prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const form = new FormData();
    form.append("prompt", prompt.replace(/^create image:/i, "").trim());
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "png");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*"
      },
      body: form
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: "Stability image request failed",
        detail: errorText
      });
    }

    if (!contentType.startsWith("image/")) {
      const text = await response.text();
      return res.status(502).json({
        error: "Stability did not return an image",
        detail: text
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return res.status(200).json({
      text: "Image created.",
      image: `data:${contentType};base64,${base64}`
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error while creating image",
      detail: error.message
    });
  }
}
