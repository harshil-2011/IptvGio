import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

function iptvProxyPlugin() {
  return {
    name: 'iptv-proxy-plugin',
    configureServer(server: any) {
      // 0. Direct APK Download Middleware (Fixes downloading giving HTML)
      server.middlewares.use('/jiotv-android-tv.apk', (req: any, res: any) => {
        const apkPath = path.resolve(import.meta.dirname, 'public/jiotv-android-tv.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment; filename="jiotv-android-tv.apk"');
          res.setHeader('Content-Length', stat.size);
          res.statusCode = 200;
          fs.createReadStream(apkPath).pipe(res);
        } else {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('APK not built yet. Run ./build_apk.sh');
        }
      });

      // 1. M3U Playlist Proxy
      server.middlewares.use('/api/proxy-m3u', async (req: any, res: any) => {
        try {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.statusCode = 204;
            res.end();
            return;
          }

          const urlParamIdx = req.url.indexOf('url=');
          if (urlParamIdx === -1) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Missing url parameter');
            return;
          }

          let targetUrl = decodeURIComponent(req.url.slice(urlParamIdx + 4)).trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Invalid URL format');
            return;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const fetchRes = await fetch(targetUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
            },
          });
          clearTimeout(timeoutId);

          if (!fetchRes.ok) {
            res.statusCode = fetchRes.status;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Upstream server returned error HTTP ${fetchRes.status}`);
            return;
          }

          const text = await fetchRes.text();
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(text);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Proxy error: ${err.message || String(err)}`);
        }
      });

      // 2. Universal Stream & Video Segment Proxy (CORS & Mixed-Content bypass)
      server.middlewares.use('/api/proxy-stream', async (req: any, res: any) => {
        try {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.statusCode = 204;
            res.end();
            return;
          }

          const urlParamIdx = req.url.indexOf('url=');
          if (urlParamIdx === -1) {
            res.statusCode = 400;
            res.end('Missing url');
            return;
          }

          let targetUrl = decodeURIComponent(req.url.slice(urlParamIdx + 4)).trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            res.statusCode = 400;
            res.end('Invalid URL');
            return;
          }

          let targetOrigin = '';
          try {
            targetOrigin = new URL(targetUrl).origin;
          } catch {
            targetOrigin = '*';
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const fetchRes = await fetch(targetUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Referer': targetOrigin,
            },
          });
          clearTimeout(timeoutId);

          if (!fetchRes.ok) {
            res.statusCode = fetchRes.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(`Upstream error ${fetchRes.status}`);
            return;
          }

          const contentType = fetchRes.headers.get('content-type') || '';
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          const isM3U8 = targetUrl.includes('.m3u8') || 
                         contentType.includes('mpegurl') || 
                         contentType.includes('text/plain') ||
                         contentType.includes('application/vnd.apple.mpegurl');

          if (isM3U8) {
            const bodyText = await fetchRes.text();
            if (bodyText.includes('#EXTM3U')) {
              // Rewrite child links (keys, media playlists, segments) to route through /api/proxy-stream
              const lines = bodyText.split(/\r?\n/);
              const rewritten = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;

                // Rewrite URI="..." attributes in tags
                if (trimmed.startsWith('#')) {
                  return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                    try {
                      const fullUri = new URL(uri, targetUrl).href;
                      return `URI="/api/proxy-stream?url=${encodeURIComponent(fullUri)}"`;
                    } catch {
                      return _;
                    }
                  });
                }

                // Child segment / playlist URL
                try {
                  const fullUrl = new URL(trimmed, targetUrl).href;
                  return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
                } catch {
                  return line;
                }
              });

              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
              res.statusCode = 200;
              res.end(rewritten.join('\n'));
              return;
            }
          }

          // Video chunk (.ts, .mp4, audio, key)
          res.setHeader('Content-Type', contentType || 'video/mp2t');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const arrayBuffer = await fetchRes.arrayBuffer();
          res.statusCode = 200;
          res.end(Buffer.from(arrayBuffer));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(`Proxy stream error: ${err.message || String(err)}`);
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './', // Relative asset paths for Android WebView & APK
    plugins: [react(), tailwindcss(), iptvProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
