export type VoiceprintRecord = {
  voice_id: string;
  voice_name: string;
  voice_url: string;
  status: string;
  threshold: number;
  created_at: Date;
  role_id?: string;
};

export type Device = {
  agentId: number | null;
  agentName: string | null;
  createTime: string;
  deviceName: string;
  id: number;
  macAddress: string;
  remark: string | null;
  tenantId: number | null;
  updateTime: string;
  userId: number;
  userName: string;
  voiceprintRecords?: VoiceprintRecord[];
};
