import express, { type Request, type Response, type NextFunction } from 'express';
import morgan from 'morgan';
import userRouter from './routes/User';
import adminRouter from './routes/Admin';
import videoRouter from './routes/Video';
import mongoose from 'mongoose';
import './helper/agenda';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

import multer from 'multer';
import { createJob, upload } from './controllers/User';
import { checkNotLogin, validateJwtHeader } from './middlewares/validator';
import { jwtAuthMiddleware } from './middlewares/jwtAuthMiddleware';
import { nanoid } from 'nanoid';
import { User } from './models/User';
import sessionMiddleware from './session';
import flash from 'connect-flash';

import { login, logout, postLogin } from './controllers/Admin';
import { Setting } from './models/Setting';
import { getBot } from './helper/telegramBot';

mongoose.connect(process.env.MONGO_URL!)
  .then(async () => {
    console.log('MongoDB connect success');
    const email = process.env.INITEMAIL;
    const plainPassword = process.env.INITPASSWORD;

    const user = await User.findOne({ email });
    const setting = await Setting.findOne();

    if (!user) {
      const hashedPassword = await bcrypt.hash(plainPassword!, 10);
      const newUser = new User({ email, password: hashedPassword, username: 'admin', type: 'admin', isAuthenticated: true });
      await newUser.save();
      console.log('Init user success');
    } else {
      console.log('User exits');
    }

    if (!setting) {
      const initSetting = {
        resolution: '720p',
        bitrate: '2000',
        watermarkImage: 'public/images/logo.png',
        frameRate: 30,
        generatePreviewVideo: true,
        watermarkPosition: 'topRight',
        screenshotCount: 12,
        previewVideoSize: {
          width: 1280,
          height: 720
        },
        posterSize: {
          width: 1280,
          height: 720
        },
        generateThumbnailMosaic: true,
      };
      await Setting.create(initSetting);
    }
    const bot = await getBot();
    if (bot) {
      // 使用 bot 实例
      console.log('Bot init');
    } else {
      console.error('Failed to get bot instance');
    }
  })
  .catch(err => console.error('MongoDB connect failed', err));

Bun.serve({
  websocket: {
    message(ws, msg) {
      console.log("Echoing: %s", msg);
      ws.send(msg);
    },
    close(ws) {
      console.log("Client has disconnected");
    },
  },
  fetch(req, server) {
    if (!server.upgrade(req)) {
      return new Response(null, { status: 404 });
    }
  },
  port: 3334,
});

// 创建uploads目录，如果不存在则创建
const createUploadsFolder = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 设置Multer的文件存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 获取当前日期，格式为 YYYY-MM-DD
    const date = new Date().toISOString().split('T')[0];
    const uploadPath = path.join(__dirname, 'public', 'images', date);
    createUploadsFolder(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    // 从原始文件名中提取文件后缀
    const ext = path.extname(originalName);
    // 使用 nanoid 生成随机字符串
    const randomName = nanoid();
    const fileName = `${randomName}${ext}`;
    cb(null, fileName);
  }
});

// Multer配置，包括文件大小限制和文件类型过滤
const cloudUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp' ||
      file.mimetype === 'image/gif') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: { fileSize: 1024 * 1024 * 5 } // 限制文件大小为5MB
});

const app = express(); // 使用Morgan中间件 

app.set('trust proxy', 1);
// 设置 Pug 作为模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// console.log(process.env.NODE_ENV);

// import './helper/telegramBot';
// 静态文件目录
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 10000 }));
app.use(sessionMiddleware);
app.use(flash());
app.use(morgan('dev')); // 'dev'是预定义的日志格式之一 // 其余的应用设置..

app.use((req, res, next) => {
  res.locals.currentPath = req.path; // 将当前路径传递给所有模板
  next();
});
app.get('/', async (req, res) => res.redirect('/admin'));
app.get('/login', login);
app.post('/login', postLogin);
app.get('/logout', logout);
app.use('/users', userRouter);
app.use('/admin', checkNotLogin, adminRouter);
app.use('/videos', videoRouter);
app.get("/ping", (_, res) => {
  res.send("🏓 pong 111!");
});
app.post('/upload', validateJwtHeader, jwtAuthMiddleware, cloudUpload.single('file'), upload);
app.post('/createJob', checkNotLogin, createJob);

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(3333, () => {
  console.log('The magic happens on port 3333!');
});