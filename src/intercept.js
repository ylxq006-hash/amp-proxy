const http = require('http');
const https = require('https');

const MOCK_TARGET = '127.0.0.1';
const MOCK_PORT = new URL(process.env.AMP_URL || 'http://127.0.0.1:9001').port;

// 需要拦截的域名列表
const INTERCEPT_DOMAINS = ['ampcode.com', 'anthropic.com'];

function shouldIntercept(options) {
    let hostname = '';
    
    if (typeof options === 'string') {
        hostname = options;
    } else if (options && typeof options === 'object') {
        hostname = options.hostname || options.host || '';
        
        // 如果有完整的 href，优先使用
        if (options.href) {
            try {
                const parsedUrl = new URL(options.href);
                hostname = parsedUrl.hostname;
            } catch (e) {
                // 忽略解析错误
            }
        }
    }
    
    // 检查是否匹配需要拦截的域名
    return INTERCEPT_DOMAINS.some(domain => hostname.includes(domain));
}

function wrapRequest(originalRequest) {
    return function(options, callback) {
        // 只拦截特定域名的请求
        if (shouldIntercept(options)) {
            if (typeof options === 'object') {
                const originalHost = options.hostname || options.host;
                console.log(`[Hook] Intercepting request to ${originalHost} -> ${MOCK_TARGET}:${MOCK_PORT}`);
                
                options.protocol = 'http:';
                options.hostname = MOCK_TARGET;
                options.host = `${MOCK_TARGET}:${MOCK_PORT}`;
                options.port = MOCK_PORT;
                
                // 移除 https 特有的设置
                delete options.agent;
                delete options.rejectUnauthorized;
            }
        }
        
        return originalRequest.apply(this, arguments);
    };
}

// 劫持全局请求
http.request = wrapRequest(http.request);
https.request = wrapRequest(https.request);
// 兼容 get 方法
http.get = wrapRequest(http.get);
https.get = wrapRequest(https.get);

console.log(`[Hook] Network interception active. Only intercepting: ${INTERCEPT_DOMAINS.join(', ')}`);
