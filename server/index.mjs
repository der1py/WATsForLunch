import { createServer } from 'node:http';

const PORT = Number(process.env.CAFETERIA_SERVER_PORT ?? 8787);
const MAX_BODY_BYTES = 50_000;
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_COMBOS = 3;
const debug = process.env.OPENAI_DEBUG === 'true';

const mealSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['meals'],
  properties: {
    meals: {
      type: 'array',
      maxItems: MAX_COMBOS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['proteinItemId', 'carbItemId', 'vegetableItemId', 'healthTag'],
        properties: {
          proteinItemId: { type: ['string', 'null'] },
          carbItemId: { type: ['string', 'null'] },
          vegetableItemId: { type: ['string', 'null'] },
          healthTag: { type: 'string', enum: ['Healthy', 'Kinda Healthy', 'Unhealthy'] },
        },
      },
    },
  },
};

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (isAllowedOrigin(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/cafeteria-meals') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 500, { error: 'OPENAI_API_KEY is not configured.' });
    return;
  }

  try {
    const payload = await readJson(request);
    if (!isValidRequest(payload)) {
      sendJson(response, 400, { error: 'Invalid cafeteria meal request.' });
      return;
    }

    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content:
              'You construct cafeteria meals. Return only the requested JSON. Select only supplied item IDs. A meal should contain one protein food, one grain/starch, and one vegetable or fruit when those categories exist. Never include drinks, desserts, sauces, condiments, or arbitrary extras. Return exactly three distinct combinations when three valid combinations exist; otherwise return as many as possible. Each meal object must place the exact supplied item ID for its protein, carb/starch, and vegetable/fruit in `proteinItemId`, `carbItemId`, and `vegetableItemId`. Set a category field to null only when no suitable supplied item exists for that category. Classify each completed meal as Healthy, Kinda Healthy, or Unhealthy using ordinary general nutrition expectations, not relative ranking among the supplied choices. For Healthy, favor vegetables, whole grains, minimally processed or lean proteins, and avoid fried/heavy items. For Unhealthy, less nutritious available choices are acceptable, while still retaining the required meal components. Kinda Healthy should be a reasonable middle ground.',
          },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'cafeteria_meals',
            strict: true,
            schema: mealSchema,
          },
        },
      }),
    });

    const openAiBody = await openAiResponse.json();
    const outputText = getOutputText(openAiBody);
    if (debug) {
      console.log('[cafeteria-server] OpenAI output:', outputText ?? openAiBody.error ?? openAiBody);
    }

    if (!openAiResponse.ok || !outputText) {
      sendJson(response, openAiResponse.status || 502, {
        error: openAiBody.error?.message ?? 'OpenAI did not return meal combinations.',
      });
      return;
    }

    sendJson(response, 200, JSON.parse(outputText));
  } catch (error) {
    if (debug) console.error('[cafeteria-server] Request failed:', error);
    sendJson(response, 500, { error: 'Unable to generate cafeteria meals.' });
  }
});

server.listen(PORT, () => {
  console.log(`Cafeteria AI server listening at http://localhost:${PORT}`);
});

function isAllowedOrigin(origin) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        tooLarge = true;
        request.destroy();
      }
    });
    request.on('end', () => {
      if (tooLarge) return reject(new Error('Request body is too large.'));
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body is not valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function isValidRequest(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.healthPreference) &&
    value.healthPreference.every((preference) => typeof preference === 'string') &&
    Array.isArray(value.availableMenuItems) &&
    value.availableMenuItems.length <= 100 &&
    value.availableMenuItems.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.section === 'string'
    )
  );
}

function getOutputText(body) {
  if (typeof body.output_text === 'string') return body.output_text;

  for (const output of body.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string') return content.text;
    }
  }

  return undefined;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}
