import TelegramBot, { type KeyboardButton, type ReplyKeyboardMarkup, type SendMessageOptions } from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { Telegram } from '../models/Telegram';
import { Video } from '../models/Video';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { TelegramMessage } from '../models/TelegramMessage';

class BotSingleton {
  private static instance: TelegramBot | null = null;
  private static isInitializing = false;

  private constructor() { }

  static async getInstance(): Promise<TelegramBot | null> {
    if (BotSingleton.instance) {
      return BotSingleton.instance;
    }

    if (BotSingleton.isInitializing) {
      // 如果正在初始化，等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
      return BotSingleton.getInstance();
    }

    BotSingleton.isInitializing = true;

    try {
      const setting = await getSetting();
      if (!setting || !setting.TranscodingBotToken) {
        console.error('Bot settings not found or invalid');
        return null;
      }

      BotSingleton.instance = new TelegramBot(setting.TranscodingBotToken, {
        polling: true,
        baseApiUrl: process.env.LOCAL_TG_SERVER
      });

      console.log('Bot instance created successfully');
      await setupBotHandlers(BotSingleton.instance, setting);

      return BotSingleton.instance;
    } catch (error) {
      console.error('Error creating bot instance:', error);
      return null;
    } finally {
      BotSingleton.isInitializing = false;
    }
  }
}

async function getSetting() {
  return await Telegram.findOne();
}

async function setupBotHandlers(bot: TelegramBot, setting: any) {

  // 处理 /start 命令
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    // 创建欢迎消息
    let welcomeMessage = `Welcome to our bot, ${username || 'dear user'}! 👋\n\n`;
    welcomeMessage += "Here's what I can do for you:\n";
    welcomeMessage += "• Handle video transcoding\n";
    welcomeMessage += "• Provide information about our services\n";
    welcomeMessage += "• And more!\n\n";
    welcomeMessage += "Feel free to send me a video or use the commands below to get started.";


    const replyMarkup: ReplyKeyboardMarkup = {
      keyboard: [
        [{ text: '📹 Send a video' }],
        [{ text: 'ℹ️ About us' }, { text: '📞 Contact support' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    const options: SendMessageOptions = {
      reply_markup: replyMarkup
    };

    // 发送欢迎消息和菜单
    await bot.sendMessage(chatId, welcomeMessage, options);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    switch (text) {
      case '📹 Send a video':
        await bot.sendMessage(chatId, "Great! Please send me the video you'd like to transcode.");
        break;
      case 'ℹ️ About us':
        await bot.sendMessage(chatId, "We are a video transcoding service. We help you convert your videos to different formats and qualities.");
        break;
      case '📞 Contact support':
        await bot.sendMessage(chatId, "If you need help, please contact our support team at tftg.cloud");
        break;
      // 可以添加更多自定义按钮的处理逻辑
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
  });

  bot.on('error', (error) => {
    console.error('General error:', error.message);
  });

  bot.on('video', async (msg) => {
    const chatId = msg.chat.id;
    const message_id = msg.message_id;

    if (!msg.from) {
      bot.sendMessage(chatId, 'Error: User is undefined.');
      return;
    }

    const user_id = msg.from.id;

    const username = msg.from.username;

    const email_url = process.env.EMAIL_URL;

    const user = await User.findOne({ telegramId: user_id });

    if (!user) {
      const hashedPassword = await bcrypt.hash(user_id + '', 10);
      const newUser = new User({ telegramId: user_id, email: user_id + '@' + email_url, password: hashedPassword, username, isAuthenticated: true });
      await newUser.save();
    }
    if (!msg.video) {
      // 处理 msg.video 为 undefined 的情况
      bot.sendMessage(chatId, 'Error: Video message is undefined.');
      return;
    }
    const videoDuration = msg.video.duration;
    const videoId = msg.video.file_id;
    const caption = msg.caption

    if (videoDuration > setting!.maxVideoDuration) {
      bot.sendMessage(chatId, `Error: Video duration is too long. Please upload a video with a duration of less than ${setting!.maxVideoDuration} seconds.`, {
        reply_to_message_id: message_id
      });
      return;
    }



    // 发送菜单选项
    bot.sendMessage(chatId, 'Video received. What would you like to do?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Download and Transcode', callback_data: 'download_and_transcode' }]
        ]
      },
      reply_to_message_id: message_id
    });

    // 处理菜单选项回调
    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const message = callbackQuery.message;
      if (message) {
        await bot.editMessageReplyMarkup({
          inline_keyboard: []
        }, {
          chat_id: chatId,
          message_id: message.message_id
        });
      }
      if (action === 'download_and_transcode') {
        if (callbackQuery.message) {
          bot.sendMessage(chatId, 'Downloading and transcoding video...', {
            reply_to_message_id: callbackQuery.message ? callbackQuery.message.message_id : undefined
          });
        }



        const file = await bot.getFile(videoId);
        const filePath = file.file_path;
        if (!filePath) {
          bot.sendMessage(chatId, "Can't get file url, please retry...", {
            reply_to_message_id: callbackQuery.message ? callbackQuery.message.message_id : undefined
          });
          return;
        }
        console.log(filePath);
        // let localFilePath = path.join('uploads');

        // const realPath = await bot.downloadFile(videoId, localFilePath);
        // console.log(realPath);
        // local api server will exists
        // if (fs.existsSync(filePath)) {
        //   fs.unlinkSync(filePath);
        // }
        // await downloadFile(filePath, localFilePath);

        const videoObj = {
          status: 'waiting',
          title: caption || videoId,
          originalPath: filePath,
          originalSize: msg.video?.file_size,
        };
        const video = await Video.create(videoObj);

        await TelegramMessage.create({
          chatId: chatId,
          messageId: message_id,
          videoId: video._id,
        })

        bot.sendMessage(chatId, "The video file is downloaded successfully. After transcoding is completed, the transcoded video, thumbnail, preview video, etc. will be returned to you.", {
          reply_to_message_id: callbackQuery.message ? callbackQuery.message.message_id : undefined
        });
      }
    });
  });
}

export async function getBot(): Promise<TelegramBot | null> {
  return BotSingleton.getInstance();
}
