export type LLM = any;
export type Voice = {
  id: number;
  voiceId: string;
  voiceName: string;
  customVoice: boolean;
  demoUrl: string;
  header_image_url: string;
  isPublic: boolean;
  language: string;
  state: string;
  createTime: Date;
  syncTime: Date;
  updateTime: Date;
  userId: number;
  userName: string;
  config?: {
    tags: any;
  };
};

export type PageOptions = {
  /**
   * 数据库id
   */
  id: number;
  /**
   * 智能体id
   */
  agentId: string;
};
