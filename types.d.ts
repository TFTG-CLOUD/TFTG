// types.d.ts
import { Request } from 'express';
import type { User } from './models/User';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    token?: string;
    user: User & {
      _id: ObjectId;
    },
  }
}