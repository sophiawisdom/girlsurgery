import { EmailMessage } from "cloudflare:email";

// cd /Users/sophiawisdom/sophia_calendar/email_worker && npx -y wrangler deploy

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://girl.surgery",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    // Log request details
    console.log('Request origin:', request.headers.get('Origin'));
    console.log('Request method:', request.method);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const data = await request.json();
      const message = data.message?.trim();

      if (!message) {
        return new Response("Message is required", { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Get IP address from request
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
      
      // Format current time
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

      // Create email content with proper headers and unique subject
      const emailContent = 
`From: dating@girl.surgery
To: sophia.wisdom1999@gmail.com
Message-Id: blargl
Subject: Dating Page Message [${timestamp}] from ${ip}

Someone sent a message from your dating page:
${message}

Metadata:
IP: ${ip}
Time: ${timestamp}
User Agent: ${request.headers.get('user-agent') || 'unknown'}`;

      // Create and send email
      const emailMessage = new EmailMessage(
        "dating@girl.surgery",
        "sophia.wisdom1999@gmail.com",
        emailContent
      );

      try {
        await env.DATING_PAGE_EMAIL.send(emailMessage);
      } catch (emailError) {
        console.error('Email error details:', emailError);
        return new Response(`Email sending failed: ${emailError.message}`, { 
          status: 500,
          headers: corsHeaders
        });
      }

      return new Response("Message sent successfully", {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error('Request processing error:', error);
      return new Response(`Request processing failed: ${error.message}`, { 
        status: 500,
        headers: corsHeaders
      });
    }
  },
}