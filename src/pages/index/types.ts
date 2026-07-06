export type Agent = AgentTemplate & {
  userId: number;
  isTemplate: boolean;
  isDeleted: boolean;
  createTime: Date;
  updateTime: Date;
  description: string;
  summary?: string;
  config: any;
  isPublic: boolean;
  lang: string[];
  syncTime: Date;
  tenantId: null;
  userName: string;
};

export type AgentTemplate = {
  id: number;
  agentId: string;
  agentName: string;
  lang: string[];
};

export enum groupType {
  My = 'my',
  Others = 'others'
}

export const groupNameKey: Record<groupType, string> = {
  [groupType.My]: 'index.my_agents',
  [groupType.Others]: 'index.others_agents'
};

export const groupOptions = Object.values(groupType);
