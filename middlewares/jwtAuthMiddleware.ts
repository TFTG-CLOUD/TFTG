import jwt from 'jsonwebtoken';
import type { UserPayload } from '../type/types';
import { type Request, type Response, type NextFunction } from 'express';
import { User } from '../models/User';
import redisClient from '../redis';

export const jwtAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const redisToken = await redisClient.get('token');
  const token = req.headers['authorization']?.split(' ')[1] || redisToken;
  if (!token) {
    return res.status(403).send({ message: "A token is required for authentication" });
  }
  console.log(token);

  try {
    const decoded = jwt.verify(token, process.env.JWTSECRET!) as UserPayload;
    req.userId = decoded.id; // 将用户信息附加到请求对象
    next();
  } catch (err) {
    return res.status(401).send({ message: "Invalid Token" });
  }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const id = req.userId;
  if (!id) {
    return res.status(401).send({ message: 'Have no this user!' })
  }
  const user = await User.findOne({ _id: id });
  if (!user) {
    return res.status(401).send({ message: 'Have no this user!' })
  }
  // console.log(user);
  if (user.type != 'admin') {
    return res.status(401).send({ message: 'Not Admin User!' })
  }
  req.user = user;
  next();
}

// export const isAuthenticatedUP = async (req: Request, res: Response, next: NextFunction) => {
//   const userId = req.userId;
//   const user = await User.findOne({ _id: userId });
//   // 合并了检查用户存在和用户类型的逻辑
//   if (!user || !user.isAuthenticated || user.type !== 'up') {
//     return res.status(401).send({ message: 'Not Authenticated Up!' });
//   }
//   req.user = user;
//   next();
// }

// export const isAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
//   const userId = req.userId;
//   const user = await User.findOne({ _id: userId });
//   // 合并了检查用户存在和用户类型的逻辑
//   if (!user || !user.isAuthenticated) {
//     return res.status(401).send({ message: 'Not Authenticated Up!' });
//   }
//   req.user = user;
//   next();
// }

// export const isAuthenticatedBrand = async (req: Request, res: Response, next: NextFunction) => {
//   const userId = req.userId;
//   const user = await User.findOne({ _id: userId });
//   // 合并了检查用户存在和用户类型的逻辑
//   if (!user || !user.isAuthenticated || user.type !== 'brand') {
//     return res.status(401).send({ message: 'Not Authenticated Brand!' });
//   }
//   req.user = user;
//   next();
// }