import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { swaggerSpec } from '../src/config/swagger';

const outputDir = path.resolve(process.cwd(), 'swagger-static');
const openApiPath = path.join(outputDir, 'openapi.json');
const htmlPath = path.join(outputDir, 'index.html');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zorvyn Finance Backend API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #f8fafc;
      }

      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: './openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
        });
      };
    </script>
  </body>
</html>
`;

async function main() {
  await mkdir(outputDir, { recursive: true });
  await writeFile(openApiPath, `${JSON.stringify(swaggerSpec, null, 2)}\n`, 'utf8');
  await writeFile(htmlPath, html, 'utf8');

  process.stdout.write(`Swagger site written to ${outputDir}\n`);
}

void main();