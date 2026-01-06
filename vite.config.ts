import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import getAppConfig from './app.config';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // 1. 加载环境变量（从 .env 文件）
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = env.VITE_USER_NODE_ENV === 'development';

  // 2. 获取 .env 中的版本配置
  const appEdition = env.VITE_APP_EDITION || 'cn';
  // 云打包的方式都可以正常拿到 UNI_UTS_PLATFORM，本地打包拿不到值，需要手动处理
  const platform = env.UNI_UTS_PLATFORM || 'app-android';

  // 3. 根据版本获取应用配置
  const appConfig = getAppConfig(platform as any, appEdition as any);

  // 4. 如果开发环境且环境变量中配置了 BASE_API_URL，则使用环境变量中的值，优先级高于 app.config.ts 中的值
  if (isDev && env.VITE_BASE_API_URL) {
    appConfig.BASE_API_URL = env.VITE_BASE_API_URL;
  }

  return {
    css: {
      preprocessorOptions: {
        scss: {
          // @ts-ignore
          api: 'modern-compiler'
        }
      }
    },

    // 4. 使用 define 将配置注入到代码中（编译时替换）
    define: {
      APP_CONFIG: JSON.stringify(appConfig)
    },

    plugins: [uni()],

    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true
        }
      }
    }
  };
});
