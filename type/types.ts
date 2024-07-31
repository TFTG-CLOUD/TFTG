import session from 'express-session';
import type { User } from '../models/User';
// 假设这是你期望的数据结构
export interface DouyinAccessTokenResponse {
  data: {
    access_token: string;
    captcha: string;
    desc_url: string;
    description: string;
    error_code: number;
    expires_in: number;
    log_id: string;
    open_id: string;
    refresh_expires_in: number;
    refresh_token: string;
    scope: string;
  };
  message: string;
}
export interface DouyinUserInfoResponse {
  data: {
    avatar: string;
    avatar_larger: string;
    client_key: string;
    e_account_role: string;
    error_code: number;
    log_id: string;
    nickname: string;
    open_id: string;
    union_id: string;
    encrypt_mobile: string,
    description: string,
  };
  message: string;
}
export interface UserPayload {
  id: string;
}

declare module 'express-session' {
  interface SessionData { user: string }
}

interface Column {
  data: string;
  name: string;
  searchable: boolean;
  orderable: boolean;
  search: {
    value: string;
    regex: boolean;
  };
}

interface Order {
  column: number;
  dir: string;
}

export interface DataTablesRequest {
  draw?: string;
  columns?: Column[];
  order?: Order[];
  start?: string;
  length?: string;
  search?: {
    value: string;
    regex: boolean;
  };
}