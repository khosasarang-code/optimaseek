export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = "https://optimaseek.com/api/auth/callback";

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokens = await tokenRes.json();

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const user = await userRes.json();

    // Store user in cookie
    const userData = JSON.stringify({
      name: user.name,
      email: user.email,
      picture: user.picture
    });

    const encoded = Buffer.from(userData).toString("base64");

    res.setHeader("Set-Cookie", 
      `os_user=${encoded}; Path=/; Max-Age=86400; SameSite=Lax`
    );

    res.redirect("/?login=success");

  } catch (err) {
    res.redirect("/?login=error");
  }
}
