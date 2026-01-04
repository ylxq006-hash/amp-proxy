const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

let config = {
    remoteUrl: 'http://192.168.2.138:8317',
    apiKey: 'sk-123456',
    targetModel: 'gemini-3-flash-preview',
    port: 8321
};

try {
    const configPath = path.join(__dirname, '../config/config.json');
    if (fs.existsSync(configPath)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
} catch (e) { console.error('Config error:', e.message); }

const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        if (req.url.includes('/auth') || req.url.includes('/user') || req.url.includes('/settings') || req.url.includes('/api/internal') || req.url.includes('uploadThread') || req.url.includes('news.rss')) {
            const mock = { id: 'user_1', status: 'active', plan: 'pro', tier: 'pro', credits: 999999, is_free_tier: false, canUseAmpFree: true, isDailyGrantEnabled: false, can_use_opus: true, settings: {}, features: [{ name: 'live_sync', enabled: true }], code: 'success' };
            const wrapped = { ok: true, result: mock, user: mock, features: mock.features, ...mock };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(wrapped));
        }
        let payload;
        try { if (body) { payload = JSON.parse(body); if (payload.model) payload.model = config.targetModel; } } catch (e) { payload = body; }
        const url = new URL(config.remoteUrl);
        const options = { hostname: url.hostname, port: url.port, path: req.url, method: req.method, headers: { ...req.headers, 'host': url.hostname, 'authorization': `Bearer ${config.apiKey}` } };
        const updatedBody = payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : '';
        if (updatedBody) options.headers['content-length'] = Buffer.byteLength(updatedBody);
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => { res.writeHead(500); res.end('Proxy Error'); });
        if (updatedBody) proxyReq.write(updatedBody);
        proxyReq.end();
    });
});

server.listen(config.port, '127.0.0.1', () => console.log('Proxy running on port', config.port));
