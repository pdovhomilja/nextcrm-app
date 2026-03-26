/** Returns the complete Node.js enrichment agent script as a string.
 *  All runtime values are read from process.env inside the script — nothing
 *  is interpolated into the script source, which prevents script-injection
 *  via user-controlled strings (backticks, ${...}, etc.).
 *
 *  Expected env vars (set by the Inngest caller via sandbox.commands.run envs):
 *    COMPANY_NAME, COMPANY_WEBSITE, TARGET_EMAIL, TARGET_NAME, KNOWN_DOMAIN
 */
export function getAgentScript(): string {
  return `
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';

const companyName    = process.env.COMPANY_NAME    || '';
const companyWebsite = process.env.COMPANY_WEBSITE || '';
const email          = process.env.TARGET_EMAIL    || '';
const targetName     = process.env.TARGET_NAME     || '';
const knownDomain    = process.env.KNOWN_DOMAIN    || '';

const domainInstruction = companyWebsite
  ? \`The company website is known: \${companyWebsite}. Open it directly — do not search for the domain.\`
  : knownDomain
  ? \`Derive the company domain from the email: \${knownDomain}. Open https://\${knownDomain} directly.\`
  : \`Search for "\${companyName} official website" to discover the company domain.\`;

const contactInstruction = targetName
  ? \`Also specifically find \${targetName}'s job title and LinkedIn URL.\`
  : '';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'browser_open',
    description: 'Navigate to a URL in the browser',
    input_schema: { type: 'object', properties: { url: { type: 'string', description: 'Full URL including https://' } }, required: ['url'] },
  },
  {
    name: 'browser_snapshot',
    description: 'Get the accessible text tree of the current page with interactive element refs like @e1, @e2',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_click',
    description: 'Click an element by its ref from the snapshot (e.g. @e3)',
    input_schema: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] },
  },
  {
    name: 'browser_extract',
    description: 'Extract specific information from the current page using a natural language prompt',
    input_schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
  },
  {
    name: 'web_search',
    description: 'Search the web and return results',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
];

function runBrowser(args) {
  try {
    return execSync('agent-browser ' + args.map(a => JSON.stringify(a)).join(' '), {
      encoding: 'utf8',
      timeout: 30000,
    });
  } catch (e) {
    return e.stdout || e.stderr || 'error: ' + e.message;
  }
}

function executeTool(name, input) {
  if (name === 'browser_open')     return runBrowser(['open', input.url]);
  if (name === 'browser_snapshot') return runBrowser(['snapshot']);
  if (name === 'browser_click')    return runBrowser(['click', input.ref]);
  if (name === 'browser_extract')  return runBrowser(['extract', input.prompt]);
  if (name === 'web_search')       return runBrowser(['search', input.query]);
  return 'unknown tool';
}

const systemPrompt = \`You are an expert B2B researcher. Your job is to find all data needed to start outreach to a company.

Known information:
- Company name: \${companyName || 'unknown'}
- Company website: \${companyWebsite || 'not known'}
- Contact email: \${email || 'not known'}
- Contact name: \${targetName || 'not known'}

Research strategy (follow this order):
1. \${domainInstruction}
2. From the company homepage, extract: company description, industry, employee count, HQ location/city, main phone number, LinkedIn company URL, Twitter/X URL.
3. Open /contact or /about pages if homepage lacks address or phone.
4. Search for C-level contacts at "\${companyName}": search "CEO OR CTO OR CFO OR CMO OR \\"VP Sales\\" OR \\"Head of Sales\\" \${companyName} site:linkedin.com".
5. For each C-level person found in search results, record their name, title, and LinkedIn URL.
\${contactInstruction}

When you have gathered sufficient data (or exhausted reasonable research steps), output ONLY a valid JSON object in this exact format and nothing else:

{
  "target": {
    "company_website": "string or null",
    "industry": "string or null",
    "employees": "string or null",
    "city": "string or null",
    "company_phone": "string or null",
    "social_linkedin": "string or null",
    "social_x": "string or null",
    "description": "string or null"
  },
  "contacts": [
    {
      "name": "string",
      "email": null,
      "title": "string or null",
      "linkedinUrl": "string or null",
      "phone": null,
      "source": "enriched"
    }
  ],
  "confidence": {
    "fieldName": 0.9
  }
}

Rules:
- Output ONLY the JSON — no explanation, no markdown, no code fences
- Set confidence for any field you are not certain about (0.0 to 1.0)
- Set null for fields you could not find
- Do not search for information you already have
\`;

async function main() {
  const messages = [{ role: 'user', content: 'Research this company and return the JSON result.' }];

  for (let i = 0; i < 25; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock) {
        const text = textBlock.text.trim();
        const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          process.stdout.write(jsonMatch[0]);
          process.exit(0);
        }
      }
      process.stderr.write('No JSON in agent response\\n');
      process.exit(1);
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = {
        role: 'user',
        content: response.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: executeTool(b.name, b.input),
          })),
      };
      messages.push(toolResults);
    }
  }

  process.stderr.write('Max iterations reached\\n');
  process.exit(1);
}

main().catch(e => { process.stderr.write(e.message + '\\n'); process.exit(1); });
`.trim();
}
