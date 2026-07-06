import { Vue } from "../types/client";
type Callback = (that: any, ev: any) => void;
export declare function mixin(vue: Vue): void;
export declare function addEventListener(key: string, listener: Callback): void;
export declare function removeEventListener(key: string, listener: Callback): boolean;
export {};
