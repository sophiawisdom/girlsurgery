// Cloudflare Worker for sending Sopho-Bills via Lob API

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Enable CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "address_line1",
      "address_city",
      "address_state",
      "address_zip",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({
            error: `Missing required field: ${field}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Lob API configuration
    const LOB_API_KEY = "YOUR_LOB_TEST_API_KEY"; // Replace with your Lob API key
    const LOB_API_URL = "https://api.lob.com/v1/postcards";

    // Create the postcard HTML content
    // Note: You'll need to host the Sopho-Bill image and update the URL
    const frontHtml = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; width: 6.25in; height: 4.25in; }
            .sopho-bill {
              width: 100%;
              height: 100%;
              background-image: url('YOUR_SOPHO_BILL_IMAGE_URL');
              background-size: cover;
              background-position: center;
            }
          </style>
        </head>
        <body>
          <div class="sopho-bill"></div>
        </body>
      </html>
    `;

    const backHtml = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body {
              margin: 0;
              padding: 0;
              width: 6.25in;
              height: 4.25in;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Georgia, serif;
              background: #f5f5dc;
            }
            .message {
              text-align: center;
              padding: 20px;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <h2>Sophologische Forschungsgesellschaft</h2>
            <p>Mit freundlichen Grüßen aus San Francisco</p>
            <p>Ein Geschenk von girl.surgery</p>
          </div>
        </body>
      </html>
    `;

    // Prepare Lob API request
    const lobData = new URLSearchParams({
      description: "Sopho-Bill from girl.surgery",
      to: {
        name: data.name,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || "",
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        address_country: data.address_country || "US",
      },
      from: {
        name: "Sophologische Forschungsgesellschaft",
        address_line1: "56 Sycamore Street",
        address_city: "San Francisco",
        address_state: "CA",
        address_zip: "94110",
        address_country: "US",
      },
      front: frontHtml,
      back: backHtml,
      size: "4x6",
      mail_type: "usps_first_class",
    });

    // Make request to Lob API
    const lobResponse = await fetch(LOB_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(LOB_API_KEY + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: lobData,
    });

    const lobResult = await lobResponse.json();

    if (!lobResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to create postcard",
          details: lobResult,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Sopho-Bill is being sent!",
        postcard_id: lobResult.id,
        expected_delivery: lobResult.expected_delivery_date,
        tracking_number: lobResult.tracking_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

// Alternative implementation using PrintNode or other services
// Note: This is commented out but shows how you could use other services

/*
// PrintNode implementation
async function sendViaePrintNode(data) {
  const PRINTNODE_API_KEY = 'YOUR_PRINTNODE_API_KEY'

  const printJob = {
    printerId: YOUR_PRINTER_ID,
    title: 'Sopho-Bill',
    contentType: 'pdf_uri',
    content: 'URL_TO_SOPHO_BILL_PDF',
    source: 'girl.surgery'
  }

  const response = await fetch('https://api.printnode.com/printjobs', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(PRINTNODE_API_KEY + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(printJob)
  })

  return response.json()
}
*/

// Environment variables you'll need to set in Cloudflare:
// - LOB_API_KEY: Your Lob API key (get from https://dashboard.lob.com)
// - SOPHO_BILL_IMAGE_URL: URL to your hosted Sopho-Bill image
