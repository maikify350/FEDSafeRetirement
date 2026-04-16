/**
 * /swagger — Serves Swagger UI loading the OpenAPI spec from /api/openapi
 * Uses swagger-ui CDN for zero local dependencies.
 */

import { NextResponse } from 'next/server'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FEDSafe Retirement — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { background: #6366f1 !important; }
    .topbar .download-url-wrapper { display: none !important; }
    .swagger-ui .info .title { color: #312e81; }
    .swagger-ui .scheme-container { background: #f1f5f9; padding: 12px 24px; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    })
  </script>
</body>
</html>`

export async function GET() {
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
