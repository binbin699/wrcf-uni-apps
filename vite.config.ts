import { defineConfig, UserConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadBrandConfig, resolveChannel, toLegacyAppConfig } from './scripts/brand/lib/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. 加载环境变量（从 .env 文件）
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env
  };
  const isDev = env.VITE_USER_NODE_ENV === 'development';
  const brand = env.BRAND || 'linx';
  const channel = resolveChannel(env, __dirname);
  const resolvedBrandConfig = loadBrandConfig({
    brand,
    channel,
    cwd: __dirname,
    env
  });
  const appConfig = toLegacyAppConfig(resolvedBrandConfig);

  // 4. 读取 manifest.json 中的版本号
  let appVersion = '1.0.0';
  try {
    const manifestPath = resolve(__dirname, 'src/manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    appVersion = manifest.versionName || '1.0.0';
  } catch (e) {
    console.warn('Failed to read version from manifest.json:', e);
  }

  // 4. 如果开发环境且环境变量中配置了 BASE_API_URL，则使用环境变量中的值，优先级高于品牌配置中的值
  if (isDev && env.VITE_BASE_API_URL) {
    appConfig.BASE_API_URL = env.VITE_BASE_API_URL;
  }

  const config: UserConfig = {
    css: {
      preprocessorOptions: {
        scss: {
          // @ts-ignore
          api: 'modern-compiler'
        }
      },
      // 禁用 CSS sourcemap
      devSourcemap: false
    },

    // 5. 使用 define 将配置注入到代码中（编译时替换）
    define: {
      APP_CONFIG: JSON.stringify(appConfig),
      APP_VERSION: JSON.stringify(appVersion)
    },

    plugins: [uni()],

    build: {
      // 禁用生产环境 sourcemap
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true
        }
      },
      // 禁用 CSS sourcemap
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          sourcemap: false
        }
      }
    },
  };

  return config;
});
