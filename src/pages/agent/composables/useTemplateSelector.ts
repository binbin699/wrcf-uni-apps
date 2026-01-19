import { ref, computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { agentApi } from '@/api/index';
import { useToast } from '@/uni_modules/wot-design-uni';
import { getChatLanguageOptions, backendLangToLangCode, getSystemLangCode, type ChatLanguageOption } from '../lang_opts';

export function useTemplateSelector(
  formData: Ref<{ langCode: string }>,
  $t: (key: string) => string,
  toast: any
) {
  const templateModalVisible = ref(false);
  const allTemplates = ref<any[]>([]);
  const selectedTemplateLang = ref('all');
  const loadingTemplates = ref(false);

  const chatLanguageOptions = ref<ChatLanguageOption[]>([]);

  // 加载语言选项
  async function loadLanguageOptions() {
    try {
      chatLanguageOptions.value = await getChatLanguageOptions($t);
    } catch (error) {
      console.error('加载语言选项失败:', error);
    }
  }

  const templateCategories = computed(() => {
    // 1. 收集所有模板的 languageCode，转换为前端标准格式
    const langCodeSet = new Set<string>();
    allTemplates.value.forEach(t => {
      if (t.languageCode) {
        const standardLangCode = backendLangToLangCode(t.languageCode);
        langCodeSet.add(standardLangCode);
      }
    });

    // 2. 获取完整的语言选项列表
    const allLangOptions = chatLanguageOptions.value;

    // 3. 筛选出模板中存在的语言（保持 getChatLanguageOptions 的顺序）
    const availableLangOptions = allLangOptions.filter(opt =>
      langCodeSet.has(opt.langCode)
    );

    // 4. 构建分类列表："全部"在最前面，其他语言按 getChatLanguageOptions 顺序
    return [
      { label: $t('create_agent.all_languages'), value: 'all' },
      ...availableLangOptions.map(opt => ({
        label: opt.label,
        value: opt.langCode // 使用 langCode 作为 value（如 'zh_CN', 'en_US'）
      }))
    ];
  });

  const filteredTemplates = computed(() => {
    if (selectedTemplateLang.value === 'all') {
      return allTemplates.value;
    }

    // 筛选：将模板的 languageCode 转换为标准格式后比较
    return allTemplates.value.filter(t => {
      if (!t.languageCode) return false;
      const standardLangCode = backendLangToLangCode(t.languageCode);
      return standardLangCode === selectedTemplateLang.value;
    });
  });

  // 辅助函数：检查指定 langCode 是否在筛选项中存在
  function isLanguageInCategories(langCode: string): boolean {
    return templateCategories.value.some(cat => cat.value === langCode);
  }

  async function fetchTemplates() {
    // 如果正在加载中，直接返回，避免并发请求（请求锁机制）
    if (loadingTemplates.value) {
      return;
    }

    try {
      loadingTemplates.value = true;
      // 传递 'all' 获取所有模板，不在后端筛选
      const res = await agentApi.getTemplateAgents('all');
      if (res.code === 1000) {
        allTemplates.value = res.data || [];
      } else {
        // API 返回错误码
        toast.warning({
          msg: res.message || $t('index.get_templates_failed'),
          duration: 2000
        });
      }
    } catch (e) {
      console.error('Fetch templates failed', e);
      // 网络错误或其他异常
      toast.error({
        msg: $t('index.get_templates_failed'),
        duration: 2000
      });
    } finally {
      loadingTemplates.value = false;
    }
  }

  async function openTemplateModal() {
    templateModalVisible.value = true;

    // 加载语言选项（如果还未加载）
    if (chatLanguageOptions.value.length === 0) {
      await loadLanguageOptions();
    }

    // 每次打开弹窗都获取最新的模板列表，确保筛选项能够及时更新
    await fetchTemplates();

    // 确定默认选中的筛选项（按优先级顺序检查：用户选择的对话语言 > 系统语言 > 英文 > '全部'）
    let defaultLangValue = 'all'; // 最终兜底值

    // 优先级1：用户选择的对话语言
    const userSelectedLangCode = formData.value.langCode;
    if (userSelectedLangCode && isLanguageInCategories(userSelectedLangCode)) {
      defaultLangValue = userSelectedLangCode;
    } else {
      // 优先级2：系统语言
      const systemLangCode = getSystemLangCode();
      if (isLanguageInCategories(systemLangCode)) {
        defaultLangValue = systemLangCode;
      } else {
        // 优先级3：英文
        if (isLanguageInCategories('en_US')) {
          defaultLangValue = 'en_US';
        }
        // 优先级4：'all' 作为兜底（已在初始化时设置）
      }
    }

    // 设置默认选中的筛选项
    selectedTemplateLang.value = defaultLangValue;
  }

  function selectTemplateCategory(lang: string) {
    selectedTemplateLang.value = lang;
  }

  return {
    templateModalVisible,
    templateCategories,
    filteredTemplates,
    loadingTemplates,
    selectedTemplateLang,
    openTemplateModal,
    selectTemplateCategory,
    fetchTemplates,
    loadLanguageOptions
  };
}

