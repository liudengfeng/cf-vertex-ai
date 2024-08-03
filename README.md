# Construct your own Google AI Cloudflare AI instance using the Cloudflare AI Gateway.

## Example Code

```
const stream = await env.GAI.run(model_name,messages,stream:true)
```

## Before you start

## worker

```
npm create cloudflare@latest

worker name: cf-vertex-ai
```

## Secrets

### Background

Secrets are a type of binding that allow you to attach encrypted text values to your Worker. You cannot see secrets after you set them and can only access secrets via Wrangler or programmatically via the env parameter. Secrets are used for storing sensitive information like API keys and auth tokens. Secrets are available on the env parameter passed to your Worker’s fetch event handler.

```
npx wrangler secret put API_KEY
<!-- 根据提示输入 -->
npx wrangler secret put SERVICE_ACCOUNT_KEY
<!-- 根据提示输入，注意将JSON转换为一行文本 -->
npx wrangler secret put ACCOUNT_ID
npx wrangler secret put GATEWAY_ID
npx wrangler secret put PROJECT_NAME
npx wrangler secret put REGION
```

## KV

1. To create a KV namespace via Wrangler:

Open your terminal and run the following command:
The `npx wrangler kv namespace create VERTEX_TOKENS` subcommand takes a new binding name as its argument. A KV namespace will be created using a concatenation of your Worker’s name (from your wrangler.toml file) and the binding name you provide. The id will be randomly generated for you.

```
npx wrangler kv namespace create VERTEX_TOKENS

```

2. In your wrangler.toml file, add the following with the values generated in your terminal:

```
wrangler.toml
kv_namespaces = [
    { binding = "<YOUR_BINDING>", id = "<YOUR_ID>" }
]
```

## deploy

```
npx wrangler deploy
```
