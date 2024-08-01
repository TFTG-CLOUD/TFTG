import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { Telegram } from '../models/Telegram';
import { Video } from '../models/Video';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { TelegramMessage } from '../models/TelegramMessage';


async function getSetting() {
  const setting = await Telegram.findOne();
  if (!setting) {
    return;
  }
  return setting;
}

export async function createBot() {
  const setting = await getSetting();
  if (!setting) {
    return;
  }
  const bot = new TelegramBot(setting.TranscodingBotToken!, { polling: true, baseApiUrl: process.env.LOCAL_TG_SERVER });
  return bot;
}

export async function setupBot() {
  const setting = await getSetting();
  if (!setting) {
    return;
  }
  const bot = await createBot();
  if (!bot) {
    console.error('Failed to create bot');
    return;
  }
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
  });

  bot.on('error', (error) => {
    console.error('General error:', error.message);
  });
  // 处理视频转发消息
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
      const newUser = new User({ email: user_id + '@' + email_url, password: hashedPassword, username, isAuthenticated: true });
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
        let localFilePath = path.join('uploads');

        const realPath = await bot.downloadFile(videoId, localFilePath);
        console.log(realPath);
        // local api server will exists
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        // await downloadFile(filePath, localFilePath);

        const videoObj = {
          status: 'waiting',
          title: caption || videoId,
          originalPath: localFilePath,
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

        // await bot.sendVideo(chatId, transcodedFilePath);


        // await bot.sendVideo(chatId, transcodedFilePath, { caption: 'Preview Video' });
        // await bot.sendPhoto(chatId, transcodedFilePath, { caption: 'Thumbnail' });


        // fs.unlinkSync(localFilePath);
        // fs.unlinkSync(transcodedFilePath);
      }
    });
  });
}

// async function downloadFile(filePath: string, localFilePath: string) {
//   const setting = await getSetting();
//   if (!setting) {
//     return;
//   }
//   try {
//     const url = `https://api.telegram.org/file/bot${setting!.TranscodingBotToken}/${filePath}`;
//     const response = await fetch(url);

//     if (!response.ok) {
//       throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
//     }

//     const arrayBuffer = await response.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     fs.writeFileSync(localFilePath, buffer);
//     console.log(`File downloaded and saved to ${localFilePath}`);
//   } catch (error) {
//     console.error(`Error downloading file: ${error}`);
//   }
// }

