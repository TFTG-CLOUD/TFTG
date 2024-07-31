import { type Request, type Response } from 'express';
import { User } from '../models/User';
import { Video } from '../models/Video';
import path from 'path';
import fs from 'fs';


export const getMore = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = parseInt(req.query.skip as string, 10) || 0;
  const users = await User.find().limit(limit).skip(skip).sort('-createdAt').select('username avatarUrl isAuthenticated type');
  res.json({ success: 1, users });
}

export const getOne = async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await User.findOne({ _id: id }).select('username avatarUrl isAuthenticated type');
  res.json({ success: 1, user });
}

export const upload = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }
  const user = await User.findOne({ _id: req.userId });
  if (!user) {
    return res.status(404).send({ message: 'No validate user!' });
  }
  if (!req.file) {
    return res.status(400).send({ message: 'Invalid file type' });
  }
  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join('public', 'images', date, req.file.filename);
  res.json({ success: 1, message: 'File uploaded successfully', filePath });
}

export const createJob = async (req: Request, res: Response) => {
  const { id, name, size } = req.body;
  let des = './uploads/' + id;
  if (!fs.existsSync(des)) {
    return res.json({ success: 0 });
  }
  const videoObj = {
    status: 'waiting',
    title: name,
    originalPath: des,
    originalSize: size,
  };
  const video = await Video.create(videoObj);
  return res.json({ success: 1 });
};