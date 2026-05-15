export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { plan } = req.body;
  const prices = {
    go: process.env.STRIPE_PRICE_GO,
    plus: process.env.STRIPE_PRICE_PLUS,
    pro: process.env.STRIPE_PRICE_PRO
  };

  if (!prices[plan]) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price]': prices[plan],
        'line_items[0][quantity]': '1',
        'mode': 'subscription',
        'success_url': 'https://optimaseek.com/?payment=success',
        'cancel_url': 'https://optimaseek.com/?payment=cancelled'
      })
    });

    const session = await response.json();
    if (session.error) return res.status(400).json({ error: session.error.message });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
