const CATEGORY_MAP = {
  '1': 'New Construction',
  '2': 'Renovation',
  '3': 'Interior Design',
};

function cleanHeaderValue(value) {
  return String(value ?? '').replace(/[\r\n]+/g, '').trim();
}

function htmlResponse(title, body, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 720px;
      margin: 4rem auto;
      padding: 0 1.5rem;
      line-height: 1.5;
      color: #2f2f2f;
    }

    h1 {
      margin-bottom: 1rem;
    }

    a {
      color: #7a6200;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const name = String(formData.get('demo-name') ?? '').trim();
  const email = String(formData.get('demo-email') ?? '').trim();
  const categoryValue = String(formData.get('demo-category') ?? '').trim();
  const message = String(formData.get('demo-message') ?? '').trim();
  const humanSelected = formData.has('demo-human');
  const copyRequested = formData.has('demo-copy');

  const errors = [];

  if (!name) {
    errors.push('Please enter your name.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address.');
  }

  if (!CATEGORY_MAP[categoryValue]) {
    errors.push('Please choose a category.');
  }

  if (!message) {
    errors.push('Please enter a message.');
  }

  if (!humanSelected) {
    errors.push('Please confirm you are not a robot before sending.');
  }

  if (errors.length > 0) {
    return htmlResponse(
      'Contact Form Error',
      `<h1>We could not send your message.</h1>
       <ul>${errors.map((error) => `<li>${error}</li>`).join('')}</ul>
       <p><a href="/contact.html">Go back to the contact form</a></p>`,
      400
    );
  }

  const apiKey = env.RESEND_API_KEY;
  const fromAddress = env.FROM_EMAIL || 'Stevie Bones <info@steviebones.com>';
  const ownerAddress = env.TO_EMAIL || 'info@steviebones.com';

  if (!apiKey) {
    return htmlResponse(
      'Mail Not Configured',
      '<h1>Mail sending is not configured yet.</h1><p>Set the RESEND_API_KEY environment variable in Cloudflare Pages.</p><p><a href="/contact.html">Back to the contact form</a></p>',
      500
    );
  }

  const lastNameParts = name.split(/\s+/).filter(Boolean);
  const lastName = (lastNameParts.at(-1) || name).toUpperCase();
  const subject = `${lastName} - ${CATEGORY_MAP[categoryValue]}`;

  const sendEmail = async ({ to, replyTo }) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        reply_to: replyTo,
        text: message,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend request failed: ${response.status} ${details}`);
    }
  };

  try {
    await sendEmail({ to: ownerAddress, replyTo: cleanHeaderValue(email) });

    if (copyRequested) {
      await sendEmail({ to: cleanHeaderValue(email), replyTo: ownerAddress });
    }
  } catch (error) {
    return htmlResponse(
      'Message Not Sent',
      `<h1>We were not able to send your message.</h1>
       <p>Please try again in a moment.</p>
       <p><a href="/contact.html">Back to the contact form</a></p>`,
      500
    );
  }

  return htmlResponse(
    'Message Sent',
    '<h1>Your message has been sent.</h1><p>We will reply to your email address shortly.</p><p><a href="/contact.html">Send another message</a></p>'
  );
}
