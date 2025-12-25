import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import getAppConfig from './app.config';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // 1. 加载环境变量（从 .env 文件）
  const env = loadEnv(mode, process.cwd(), '');
  
  // 2. 获取 .env 中的版本配置
  const appEdition = env.VITE_APP_EDITION || 'cn';

  // 3. 根据版本获取应用配置
  const appConfig = getAppConfig(env.UNI_UTS_PLATFORM as any, appEdition as any);

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
