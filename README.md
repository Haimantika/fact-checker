# fact-checker

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/Haimantika/fact-checker/tree/main)

A fact-checking web app that lets users paste text or links and get a verdict on whether the content is **true**, **false**, **AI-generated hoax**, or **unknown**, using:

- Exa for web search
- DigitalOcean serverless inference for model reasoning

## Deploy to DigitalOcean

Click the **Deploy to DO** button above to create the app on App Platform. You’ll be prompted to set `EXA_API_KEY`, `DO_INFERENCE_API_KEY`, and `DO_INFERENCE_MODEL`; `DO_INFERENCE_URL` defaults to `https://inference.do-ai.run/v1`.

## Setup (If you want to run it locally)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
EXA_API_KEY=your_exa_api_key
DO_INFERENCE_API_KEY=your_digitalocean_inference_key
DO_INFERENCE_URL=https://inference.do-ai.run/v1
DO_INFERENCE_MODEL=your-model-name
```

- **`EXA_API_KEY`**: from [Exa dashboard](https://dashboard.exa.ai/).
- **DigitalOcean serverless inference endpoint key**: From [DigitalOcean Control Panel](https://cloud.digitalocean.com/gen-ai/model-access-keys).

### 3. Run the app

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## How it works

1. The frontend (Next.js + Shadcn components) sends the user’s text or link to `/api/fact-check`.
2. The API route uses **Exa** to search the web and collect a small set of relevant sources.
3. It calls **DigitalOcean serverless inference** with:
   - The original claim
   - A summary of the retrieved sources
4. The model returns a JSON verdict (`true`, `false`, `hoax`, or `unknown`) plus an explanation, confidence score, and referenced sources, which are rendered in the UI.
