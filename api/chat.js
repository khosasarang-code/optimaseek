module.exports = async function handler(req, res) {

  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },

        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,

          messages: [
            {
              role: "user",
              content: body.message
            }
          ]
        })

      }
    );

    const data = await response.json();

    res.status(200).json({
      reply: data.content[0].text
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

}
