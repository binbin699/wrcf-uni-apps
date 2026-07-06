// #ifdef APP-HARMONY
import { openMailto } from '@/uni_modules/linx-open-mail';
// #endif

export type OpenFeedbackMailHandlers = {
  /** 邮件应用打开失败且邮箱已复制到剪贴板 */
  onCopied?: () => void;
  /** 邮件应用打开失败且复制也失败 */
  onOpenFailed?: (email: string) => void;
};

/**
 * 打开用户反馈邮件（鸿蒙走 UTS startAbility，其他平台走 mailto）
 */
export async function openFeedbackMail(
  email: string,
  subject: string,
  handlers?: OpenFeedbackMailHandlers
): Promise<void> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    console.warn('[openFeedbackMail] empty email, skip');
    return;
  }

  const mailtoUrl = `mailto:${trimmedEmail}?subject=${encodeURIComponent(subject)}`;
  console.log('[openFeedbackMail] start', trimmedEmail);

  // #ifdef APP-HARMONY
  try {
    const result = await openMailto({ email: trimmedEmail, subject });
    console.log('[openFeedbackMail] harmony result', JSON.stringify(result));
    if (!result.success) {
      await copyFeedbackEmail(trimmedEmail, handlers);
    }
  } catch (err) {
    console.error('[openFeedbackMail] harmony error', err);
    await copyFeedbackEmail(trimmedEmail, handlers);
  }
  return;
  // #endif

  // #ifdef APP-PLUS
  plus.runtime.openURL(mailtoUrl);
  // #endif

  // #ifndef APP-PLUS || APP-HARMONY
  window.location.href = mailtoUrl;
  // #endif
}

function copyFeedbackEmail(
  email: string,
  handlers?: OpenFeedbackMailHandlers
): Promise<void> {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: email,
      success: () => {
        handlers?.onCopied?.();
        resolve();
      },
      fail: (err) => {
        console.error('[openFeedbackMail] setClipboardData failed', err);
        handlers?.onOpenFailed?.(email);
        resolve();
      }
    });
  });
}
