/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { WorkerEntrypoint } from "cloudflare:workers";

function base64urlEncode(str) {
	return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

async function generateJWT(privateKey, payload) {
	const header = {
		alg: 'RS256',
		typ: 'JWT'
	};

	const encodedHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
	const encodedPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));

	const token = `${encodedHeader}.${encodedPayload}`;

	// 获取 PEM 字符串在头部和尾部之间的部分
	const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\r|\n|\\n/g, "");
	// 将字符串通过 base64 解码为二进制数据
	const binaryDerString = atob(pemContents);
	// 将二进制字符串转换为 ArrayBuffer
	const binaryDer = str2ab(binaryDerString);

	const key = await crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{
			name: "RSASSA-PKCS1-v1_5",
			hash: "SHA-256",
		},
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(token)
	);

	return `${token}.${base64urlEncode(signature)}`;
}


async function getAccessToken(jwtToken, authUrl) {
	const response = await fetch(authUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwtToken
		})
	});
	return response;
}

function str2ab(str) {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

async function updateAccessToken(env) {
	const authUrl = "https://www.googleapis.com/oauth2/v4/token";
	const ONE_HOUR_IN_SECONDS = 3600;
	const expirationTime = ONE_HOUR_IN_SECONDS * 1000; // 1 hour

	let access_token = '';
	let isValid = false;
	let tokenData = {};
	const now = Math.floor(Date.now() / 1000);

	try {
		const serviceAccountKey = JSON.parse(env.SERVICE_ACCOUNT_KEY);
		const rawPrivateKey = serviceAccountKey.private_key;
		const payload = {
			iss: serviceAccountKey.client_email,
			scope: 'https://www.googleapis.com/auth/cloud-platform',
			aud: authUrl,
			exp: now + ONE_HOUR_IN_SECONDS,
			iat: now
		};

		const jwtToken = await generateJWT(rawPrivateKey, payload);

		const response = await getAccessToken(jwtToken, authUrl)

		if (!response.ok) {
			const errorData = await response.json();
			const errorMessage = errorData.error_description || errorData.error || 'Unknown error';
			access_token = `Failed to fetch access token: ${errorMessage}`;
		} else {
			const data = await response.json();
			access_token = data.access_token;
			isValid = true;
		}
	} catch (error) {
		access_token = `Error updating access token: ${error.message}`;
	}
	tokenData = {
		token: access_token,
		isValid: isValid,
		timestamp: Date.now(),
		expirationTime: expirationTime
	};
	await env.VERTEX_TOKENS.put('access_token', JSON.stringify(tokenData));
	return tokenData;
}

function validateApiKey(providedKey, expectedKey) {
	if (providedKey !== expectedKey) {
		throw new Error('Invalid API key');
	}
}

async function getVertexAiToken(env) {
	let tokenData = await env.VERTEX_TOKENS.get('access_token', { type: 'json' });
	const now = Date.now();

	if (!tokenData || !tokenData.isValid || (now - tokenData.timestamp) >= tokenData.expirationTime) {
		tokenData = await updateAccessToken(env);
	}
	return tokenData;
};

export class GAI extends WorkerEntrypoint {
	async run(model_name, options) {
		const { reqs, stream, api_key } = options;
		try {
			// 验证 api_key
			validateApiKey(api_key, this.env.API_KEY);
		} catch (error) {
			return {
				status: 'error',
				statusCode: 401, // 未授权
				message: 'API key validation failed'
			};
		}

		// 获取 token
		const tokenData = await getVertexAiToken(this.env);
		const vertex_api_key = tokenData.token;

		const account_id = this.env.ACCOUNT_ID;
		const gateway_id = this.env.GATEWAY_ID;
		const project_name = this.env.PROJECT_NAME;
		const region = this.env.REGION;
		const model_method = stream ? "streamGenerateContent" : "generateContent";
		// const content_type = stream ? "text/event-stream" : "application/json";
		const url = `https://gateway.ai.cloudflare.com/v1/${account_id}/${gateway_id}/google-vertex-ai/v1/projects/${project_name}/locations/${region}/publishers/google/models/${model_name}:${model_method}`;

		const headers = {
			'Authorization': `Bearer ${vertex_api_key}`,
			'Content-Type': 'application/json'
		};

		try {
			return await fetch(url, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(reqs)
			});
		} catch (error) {
			// 构造一个异常的 Response 实例，状态码为 500，主体为空
			return new Response(null, {
				status: 500,
				statusText: 'Internal Server Error',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	};
};


export default class extends WorkerEntrypoint {
	async fetch(request, env) {
		return new Response("Hello from vertex ai worker!");
	}
}