import { type Request, type Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import redisClient from '../redis';
import type { UserPayload } from '../type/types';
import { Setting } from '../models/Setting';
import { Telegram } from '../models/Telegram';
import { setupBot } from '../helper/telegramBot';
import { Video } from '../models/Video';

export const index = async (req: Request, res: Response) => {
  res.render('index', { title: 'Dashboard' });
}

export const upload = async (req: Request, res: Response) => {
  const token = await redisClient.get('token');
  res.render('upload', { title: 'Upload', token, uploadUrl: process.env.TUS_HOST })
}

export const tgSetting = async (req: Request, res: Response) => {
  const setting = await Telegram.findOne();
  res.render('telegram', { title: 'Telegram Setting', setting, message: req.flash('error') })
}

export const setting = async (req: Request, res: Response) => {
  const setting = await Setting.findOne();
  res.render('setting', { title: 'Setting', setting, message: req.flash('error') })
}

export const postTgSetting = async (req: Request, res: Response) => {
  const { TranscodingBotToken, maxVideoDuration } = req.body;
  if (!TranscodingBotToken || !maxVideoDuration) {
    req.flash('error', 'Please fill in all fields');
    return res.redirect('/admin/tgSetting');
  }
  const settingData = { TranscodingBotToken, maxVideoDuration: Number(maxVideoDuration) };
  try {
    let setting = await Telegram.findOne();
    if (setting) {

      setting = await Telegram.findOneAndUpdate({}, settingData, { new: true });
    } else {

      setting = new Telegram(settingData);
      await setting.save();
      setupBot();
    }
    res.redirect('/admin/telegram');
  } catch (error) {
    console.error('Error in postSetting:', error);
    res.status(500).send({ success: 0, message: 'An error occurred while processing your request.' });
  }
}

export const postSetting = async (req: Request, res: Response) => {
  try {
    const {
      resolution,
      bitrate,
      frameRate,
      generatePreviewVideo,
      watermarkImage,
      watermarkPosition,
      screenshotCount,
      previewVideoWidth,
      previewVideoHeight,
      posterWidth,
      posterHeight,
      generateThumbnailMosaic
    } = req.body;
    const settingData = {
      resolution,
      bitrate: Number(bitrate),
      frameRate: Number(frameRate),
      generatePreviewVideo: Boolean(generatePreviewVideo),
      watermarkImage,
      watermarkPosition,
      screenshotCount: Number(screenshotCount),
      previewVideoSize: {
        width: Number(previewVideoWidth),
        height: Number(previewVideoHeight)
      },
      posterSize: {
        width: Number(posterWidth),
        height: Number(posterHeight)
      },
      generateThumbnailMosaic: Boolean(generateThumbnailMosaic)
    };

    // 尝试查找现有设置
    let setting = await Setting.findOne();

    if (setting) {
      // 如果设置存在，则更新
      setting = await Setting.findOneAndUpdate({}, settingData, { new: true });
    } else {
      // 如果设置不存在，则创建新的
      setting = new Setting(settingData);
      await setting.save();
    }
    res.redirect('/admin/setting');
  } catch (error) {
    console.error('Error in postSetting:', error);
    res.status(500).send({ success: 0, message: 'An error occurred while processing your request.' });
  }
}

export const login = async (req: Request, res: Response) => {
  res.render('login', { title: 'Login', message: req.flash('error') })
}

export const postLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'User not exists');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Password is incorrect');
      return res.redirect('/login');
    }

    req.session.user = user._id.toString();  // 确保将 _id 转换为字符串
    const token = jwt.sign({ id: user._id.toString() } as UserPayload, process.env.JWTSECRET as string, { expiresIn: '7d' });
    await redisClient.setEx('token', 60 * 60 * 24 * 7, token);
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Server error');
    res.redirect('/login');
  }
}

export const logout = (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) {
      req.flash('error', 'logout failed');
      return res.redirect('/');
    }
    res.redirect('/login');
  });
}

export const getUsers = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = parseInt(req.query.skip as string, 10) || 0;
  const users = await User.find().limit(limit).skip(skip).sort('-createdAt');
  res.json({ success: 1, users });
}

export const getUser = async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await User.findOne({ _id: id });
  res.json({ success: 1, user });
}

export const updateUser = async (req: Request, res: Response) => {
  const { id, phone, username, countryCode, avatarUrl, type, isAuthenticated } = req.body;
  await User.updateOne({ _id: id }, { phone, username, countryCode, avatarUrl, type, isAuthenticated });
  res.json({ success: 1, user: id });
}

export const stats = async (req: Request, res: Response) => {
  const now = new Date();
  const startOfDayToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDayToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  const startOfDayYesterday = new Date(startOfDayToday);
  startOfDayYesterday.setDate(startOfDayYesterday.getDate() - 1);
  const endOfDayYesterday = new Date(endOfDayToday);
  endOfDayYesterday.setDate(endOfDayYesterday.getDate() - 1);

  try {
    const [countVideos, countVideosToday, countVideosYesterday, countUsers, countUsersToday, countUsersYesterday] = await Promise.all([
      Video.countDocuments(),
      Video.countDocuments({ createdAt: { $gte: startOfDayToday, $lte: endOfDayToday } }),
      Video.countDocuments({ createdAt: { $gte: startOfDayYesterday, $lte: endOfDayYesterday } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDayToday, $lte: endOfDayToday } }),
      User.countDocuments({ createdAt: { $gte: startOfDayYesterday, $lte: endOfDayYesterday } })
    ]);
    res.json({
      success: 1,
      countVideos,
      countVideosToday,
      countVideosYesterday,
      countUsers,
      countUsersToday,
      countUsersYesterday
    });
  } catch (err) {
    console.error('Error counting videos:', err);
  }
}