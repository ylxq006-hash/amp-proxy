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
} catch (e) {
    console.error(`[${new Date().toISOString()}] Config error:`, e.message);
}

const server = http.createServer((req, res) => {
    // 1. 快速响应 Mock 接口 (不需要读取 Body)
    const isMockUrl = req.url.includes('/auth') || 
                      req.url.includes('/user') || 
                      req.url.includes('/settings') || 
                      req.url.includes('/api/internal') || 
                      req.url.includes('/api/v1/auth') || 
                      req.url.includes('/api/v1/user') || 
                      req.url.includes('/membership') || 
                      req.url.includes('uploadThread') || 
                      req.url.includes('news.rss');

    if (isMockUrl) {
        const mock = { 
            id: 'user_1', 
            email: 'admin@example.com',
            full_name: 'Custom User',
            status: 'active', 
            plan: 'pro', 
            tier: 'pro', 
            credits: 999999, 
            is_free_tier: false, 
            canUseAmpFree: true, 
            isDailyGrantEnabled: false, 
            can_use_opus: true, 
            settings: {
                has_onboarded: true,
                preferred_model: config.targetModel
            }, 
            features: [{ name: 'live_sync', enabled: true }, { name: 'agentic_mode', enabled: true }], 
            code: 'success',
            token: 'mock_token_123456'
        };
        const wrapped = { 
            ok: true, 
            success: true,
            status: 'success',
            result: mock, 
            user: mock, 
            data: mock,
            features: mock.features, 
            ...mock 
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(wrapped));
    }

    // 2. 准备代理请求参数
    const url = new URL(config.remoteUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: req.url,
        method: req.method,
        headers: { 
            ...req.headers, 
            'host': url.hostname, 
            'authorization': `Bearer ${config.apiKey}` 
        }
    };

    // 移除可能引起冲突的 Header
    delete options.headers['content-length'];
    delete options.headers['transfer-encoding'];
    delete options.headers['connection'];

    // 3. 处理 Body
    const isJson = req.headers['content-type'] && req.headers['content-type'].includes('application/json');

    const startProxy = (requestBody) => {
        if (requestBody !== undefined) {
            options.headers['content-length'] = Buffer.byteLength(requestBody);
        }

        const proxyReq = protocol.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[${new Date().toISOString()}] Proxy Error: ${err.message}`);
            if (!res.headersSent) {
                res.writeHead(502);
                res.end('Proxy Gateway Error');
            }
        });

        if (requestBody !== undefined) {
            proxyReq.write(requestBody);
            proxyReq.end();
        } else {
            req.pipe(proxyReq);
        }
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && isJson) {
        // 如果是 JSON 请求，缓冲以注入 Model
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                if (body && config.targetModel) {
                    let payload = JSON.parse(body);
                    if (payload.model) {
                        payload.model = config.targetModel;
                        body = JSON.stringify(payload);
                    }
                }
            } catch (e) {
                // 解析失败则保持原样
            }
            startProxy(body);
        });
    } else {
        // 其他请求直接流式转发
        startProxy();
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`Port ${config.port} is already in use.`);
        process.exit(0);
    } else {
        console.error('Server error:', e);
        process.exit(1);
    }
});

server.listen(config.port, '127.0.0.1', () => {
    console.log(`Proxy running on 127.0.0.1:${config.port} -> ${config.remoteUrl}`);
});

