import { IContext, IRumSession, RumEvent, SessionConfig } from "@arms/rum-core";
interface SessionInfo {
    sessionId: string;
    sampled: boolean;
    startTime: number;
    lastTime: number;
    isNew?: boolean;
}
export declare class RumSession implements IRumSession {
    ctx: IContext;
    sessionConfig: SessionConfig;
    init(ctx: IContext): void;
    getSessionId(): string;
    getSampled(): boolean;
    checkSession(info: SessionInfo): boolean;
    updateSession(): void;
    getSessionInfo(): SessionInfo;
    getEventId(): string;
    getViewId(): string;
    getUserId(): any;
    private resetSession;
    private getUUID;
    private fixSessionConfig;
    getBaseEvent(): RumEvent;
}
export {};
