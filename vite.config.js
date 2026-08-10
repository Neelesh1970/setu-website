import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Dev proxy: all SETU microservice paths → staging gateway.
 * Override: VITE_PROXY_API_HOST (and optional VITE_PROXY_AUTH_HOST / VITE_PROXY_VLE_HOST).
 * Local service override: VITE_PROXY_AUTH_HOST=http://localhost:7005
 */
const STAGING_HOST = 'https://staging.setuai.com'

function isLocalServiceHost(host) {
  return /localhost|127\.0\.0\.1|:7005\b|:7035\b/.test(host)
}

/** VLE microservice API only — do not proxy /vle/dashboard etc. (SPA routes). */
function vleProxy(vleHost) {
  const local = isLocalServiceHost(vleHost)
  return {
    '/vle/api': {
      target: vleHost,
      changeOrigin: true,
      secure: !local,
      rewrite: local ? (path) => path.replace(/^\/vle/, '') || '/' : undefined,
    },
  }
}

/** Proxy SETU service prefixes to the API host (mirrors RN .env bases). */
function apiProxy(pathPrefix, apiHost) {
  return {
    [pathPrefix]: {
      target: apiHost,
      changeOrigin: true,
      secure: !isLocalServiceHost(apiHost),
    },
  }
}

/**
 * /auth → SETU-AUTH. Staging gateway keeps /auth prefix; local SETU-AUTH (port 7005)
 * serves routes at / (e.g. /api/vle, /otp/send) so strip /auth when target is local.
 */
function authProxy(authHost) {
  const local = isLocalServiceHost(authHost)
  return {
    '/auth': {
      target: authHost,
      changeOrigin: true,
      secure: !local,
      rewrite: local ? (path) => path.replace(/^\/auth/, '') || '/' : undefined,
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiHost = (env.VITE_PROXY_API_HOST || STAGING_HOST).replace(/\/+$/, '')
  const authHost = (env.VITE_PROXY_AUTH_HOST || apiHost).replace(/\/+$/, '')
  const vleHost = (env.VITE_PROXY_VLE_HOST || apiHost).replace(/\/+$/, '')
  const assetsHost = (env.VITE_ASSETS_API_HOST || apiHost).replace(/\/+$/, '')

  if (mode === 'development' && isLocalServiceHost(authHost)) {
    console.info(`[vite] SETU-AUTH proxy → ${authHost} (strips /auth prefix)`)
  }
  if (mode === 'development' && isLocalServiceHost(vleHost)) {
    console.info(`[vite] SETU-VLE proxy → ${vleHost} (/vle/api only; SPA routes like /vle/dashboard stay on Vite)`)
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'setu-html-asset-fixes',
        transformIndexHtml(html) {
          // crossorigin breaks CSS on some Apache/GoDaddy setups without CORS headers
          return html
            .replace(/\s+crossorigin/g, '')
            .replace(
              /(\/(?:assets\/[^"']+\.(?:css|js)|brand\/setu-(?:favicon|apple-touch-icon)[^"']*))(?:\?[^"']*)?"/g,
              '$1?v=20260718"',
            )
        },
      },
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        ...authProxy(authHost),
        ...vleProxy(vleHost),
        ...apiProxy('/dashboard', apiHost),
        ...apiProxy('/sos', apiHost),
        ...apiProxy('/booktest', apiHost),
        ...apiProxy('/abha', apiHost),
        ...apiProxy('/drug', apiHost),
        ...apiProxy('/telemedicine', apiHost),
        ...apiProxy('/generic', apiHost),
        ...apiProxy('/mental', apiHost),
        ...apiProxy('/agri', apiHost),
        ...apiProxy('/schemes', apiHost),
        ...apiProxy('/fitness', apiHost),
        // Payment verify + fee breakdown (telemedicine / book-test flows)
        ...apiProxy('/pay', apiHost),
        ...apiProxy('/amount-breakdown', apiHost),
        ...apiProxy('/assets/api', assetsHost),
        ...apiProxy('/jobs', apiHost),
        ...apiProxy('/notification', apiHost),
        ...apiProxy('/userprofile', apiHost),
        ...apiProxy('/preventive-health', apiHost),
        ...apiProxy('/reports', apiHost),
        ...apiProxy('/healthcard', apiHost),
        ...apiProxy('/phr', apiHost),
        ...apiProxy('/matrujyoti', apiHost),
        ...apiProxy('/matrimony', apiHost),
        ...apiProxy('/temple', apiHost),
        ...apiProxy('/language', apiHost),
        ...apiProxy('/doctor', apiHost),
      },
    },
  }
})
