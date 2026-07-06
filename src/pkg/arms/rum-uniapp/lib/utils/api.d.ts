import { IViewData, ResourceStatus } from "@arms/rum-core";
export interface IMeasure {
    [key: string]: number;
}
export interface IApiBaseAttr {
    name?: string;
    message?: string;
    success?: ResourceStatus;
    duration?: number;
    size?: number;
    status_code?: number | string;
    snapshots?: string;
}
export interface IApiAttr extends IApiBaseAttr {
    view: IViewData;
    url: string;
    name?: string;
    timestamp: number;
    method: string;
    trace_id?: string;
    trace_data?: string;
}
export interface Options {
    url: string;
    method?: string;
    header?: any;
    success?: (res: any) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
}
export declare function reviseApiAttr(attrs: IApiBaseAttr): IApiBaseAttr;
