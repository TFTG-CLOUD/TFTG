import ffmpeg from 'tftg-fluent-ffmpeg';
import { ffmpegPath, ffprobePath } from 'ffmpeg-ffprobe-static';
import { Video } from '../models/Video';
import { Setting } from '../models/Setting';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Telegram } from '../models/Telegram';
import { createBot } from './telegramBot';
import { TelegramMessage } from '../models/TelegramMessage';
import type { InputMediaPhoto } from 'node-telegram-bot-api';

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath!);


/**
 * Initiates the video transcoding process for the next waiting video.
 * Fetches a video with 'waiting' status and updates its status to 'transcoding'.
 * If an error occurs during transcoding, the video status is updated to 'error'.
 */
export const transcoding = async function () {
  const video = await Video.findOne({ status: 'waiting' });
  const setting = await Setting.findOne();
  if (!video) return;
  if (!setting) return;
  try {
    await Video.updateOne({ _id: video._id }, { status: 'transcoding' });
    transcodeVideo(video.originalPath, setting, video._id.toString());
  } catch (error) {
    console.log(error);
    await Video.updateOne({ _id: video._id }, { status: 'error', errorMessage: error });
  }
}

/**
 * Transcodes a video file based on the provided settings.
 * 
 * @param {string} videoPath - The path to the original video file.
 * @param {Setting} options - The transcoding settings.
 * @param {string} id - The unique identifier for the video.
 * @returns {Promise<string>} A promise that resolves with a success message or rejects with an error.
 */
async function transcodeVideo(videoPath: string, options: Setting, id: string): Promise<string> {
  const {
    resolution,
    bitrate,
    frameRate,
    generatePreviewVideo,
    watermarkImage,
    watermarkPosition,
    screenshotCount,
    previewVideoSize,
    posterSize,
    generateThumbnailMosaic
  } = options;


  const resolutionMap = {
    '480p': { width: 640, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4K': { width: 3840, height: 2160 }
  };

  const outputResolution = resolutionMap[resolution];


  const watermarkScale = (resolution === '1080p') ? 1 : (outputResolution.width / resolutionMap['1080p'].width);
  const watermarkFilter = watermarkImage ? `scale=${Math.round(100 * watermarkScale)}:-1` : null;


  const watermarkPositionMap = {
    topLeft: '10:10',
    topRight: `main_w-overlay_w-10:10`,
    bottomLeft: `10:main_h-overlay_h-10`,
    bottomRight: `main_w-overlay_w-10:main_h-overlay_h-10`
  };

  return new Promise(async (resolve, reject) => {
    const validVideo = await validateVideoFile(videoPath);
    if (!validVideo) {
      await Video.updateOne({ _id: id }, { status: 'error', errorMessage: 'Not a valid video!' });
    };
    const isVertical = await isPortraitVideo(videoPath).catch(err => console.error(err));
    await readMetadataAndSave(videoPath, id).catch(err => console.error(err));
    const size = isVertical ? `-2:${outputResolution.width}` : `${outputResolution.width}:-2`;

    const date = new Date().toISOString().split('T')[0];
    const outputDir = path.join('public', 'videos', date, id);

    // console.log(outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await Video.updateOne({ _id: id }, { transcodedPath: outputDir });

    await screenshots(videoPath, outputDir, options, id).catch(err => console.error(err));

    if (generatePreviewVideo) {
      const width = previewVideoSize!.width;
      const height = previewVideoSize!.height;
      await generateVideoPreview(id, videoPath, outputDir, width!, height!).catch((err: { message: any; }) => console.log(err.message));
    }

    const outputFilePath = path.join(outputDir, 'tftg.tv.mp4');

    let command = ffmpeg(videoPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioChannels(2)
      .videoBitrate(bitrate)
      .audioBitrate(128)
      .fps(frameRate);

    if (watermarkImage) {
      command = command.input(watermarkImage)
        .complexFilter([
          `[0:v]scale=${size}[scaled]`,
          `[1:v]${watermarkFilter}[wm]`,
          `[scaled][wm]overlay=${watermarkPositionMap[watermarkPosition]}`
        ]);
    }

    // if (generatePreviewVideo) {
    //   command = command.output('preview.mp4')
    //     .size(`${previewVideoSize!.width}x${previewVideoSize!.height}`);
    // }

    command.output(outputFilePath)
      .on('end', async () => {
        const stats = fs.statSync(outputFilePath);
        const size = stats.size;
        await Video.updateOne({ _id: id }, { status: 'finished', afterSize: size, afterPath: outputFilePath })
        if (videoPath) {
          fs.existsSync(videoPath) && fs.unlinkSync(videoPath);
          fs.existsSync(videoPath + '.json') && fs.unlinkSync(videoPath + '.json');
        }
        const telegram = await Telegram.findOne();
        if (telegram) {
          const telegramMessage = await TelegramMessage.findOne({ videoId: id }).sort('-createdAt');
          if (telegramMessage) {
            const bot = await createBot();
            if (!bot) {
              return;
            }
            const video = await Video.findOne({ _id: id });
            bot.sendVideo(telegramMessage.chatId, outputFilePath, { caption: 'Your video has been transcoded.', reply_to_message_id: telegramMessage.messageId });
            if (video && video.previewVideo) {
              bot.sendVideo(telegramMessage.chatId, video.previewVideo, { caption: 'A preview of your video has been generated!', reply_to_message_id: telegramMessage.messageId });
            }
            if (video && video.thumbnail) {
              bot.sendPhoto(telegramMessage.chatId, video.thumbnail, { caption: 'A thumbnail of your video has been generated!', reply_to_message_id: telegramMessage.messageId });
            }
            if (video && video.screenshots) {
              const media: InputMediaPhoto[] = video.screenshots.map(path => {
                return {
                  type: 'photo',
                  media: fs.createReadStream(path) as any
                };
              });
              bot.sendMediaGroup(telegramMessage.chatId, media, { reply_to_message_id: telegramMessage.messageId });
            }
          }
        }
        resolve('Transcoding succeeded!');
      })
      .on('error', async (err: { message: any; }) => {
        await Video.updateOne({ _id: id }, { status: 'error', errorMessage: err.message });
        console.error(err);
      }).run();
  });
}

/**
 * Checks if the video is in portrait orientation.
 * 
 * @param {string} videoPath - The path to the video file.
 * @returns {Promise<boolean>} A promise that resolves with true if the video is portrait, false otherwise.
 */
function isPortraitVideo(videoPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(`Error fetching metadata: ${err.message}`);
      } else {
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject('No video stream found');
        } else {
          const { width, height } = videoStream;
          if (height && width) {
            return resolve(height > width);
          }
          reject(`Video dimensions not found`);
        }
      }
    });
  });
}

/**
 * Validates if the file is a valid video.
 * 
 * @param {string} videoPath - The path to the video file.
 * @returns {Promise<boolean>} A promise that resolves with true if the file is a valid video, false otherwise.
 */
function validateVideoFile(videoPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        resolve(false);
      } else {
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

        if (!videoStream) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  });
}

/**
 * Reads video metadata and saves it to the database.
 * 
 * @param {string} videoPath - The path to the video file.
 * @param {string} videoId - The unique identifier for the video.
 * @returns {Promise<void>} A promise that resolves when the metadata is saved.
 */
async function readMetadataAndSave(videoPath: string, videoId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) {
        return reject(`Error fetching metadata: ${err.message}`);
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return reject('No video stream found');
      }

      const { width, height } = videoStream;
      const updateData = {
        dimensions: {
          width,
          height
        },
        duration: metadata.format.duration,
        metadata
      };

      try {
        await Video.findByIdAndUpdate(videoId, updateData);
        resolve();
      } catch (updateErr) {
        reject(`Error updating video document: ${updateErr}`);
      }
    });
  });
}

/**
 * Generates screenshots, poster, and thumbnail mosaic for the video.
 * 
 * @param {string} videoPath - The path to the video file.
 * @param {string} outputDir - The directory to save the generated files.
 * @param {Setting} setting - The settings for screenshot generation.
 * @param {string} id - The unique identifier for the video.
 */
async function screenshots(videoPath: string, outputDir: string, setting: Setting, id: string) {
  try {

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotCount = setting.screenshotCount!;

    const duration = await getVideoDuration(videoPath);
    const screenshotPaths = await generateScreenshots(videoPath, screenshotCount, duration, outputDir);

    const rows = Math.ceil(screenshotCount / 4);
    const outputPoster = path.join(outputDir, 'poster.jpg');
    let videoObj = { screenshots: screenshotPaths, poster: outputPoster } as {
      screenshots: string[];
      poster: string;
      thumbnail?: string;  // 使用 ? 表示这是一个可选属性
    }
    if (setting.generateThumbnailMosaic) {
      const outputThumbnail = path.join(outputDir, 'thumbnail.jpg');
      if (screenshotPaths.length >= 12) {
        await createThumbnailMosaic(screenshotPaths, rows, 4, outputThumbnail);
        videoObj.thumbnail = outputThumbnail;
      }
    }
    await generatePoster(screenshotPaths[0], { height: setting.posterSize!.height!, width: setting.posterSize!.width! }, outputPoster);
    await Video.updateOne({ _id: id }, videoObj)
    console.log('Screenshots and thumbnail created successfully.');
  } catch (error) {
    console.error(error);
  }
}

/**
 * Gets the duration of a video.
 * 
 * @param {string} videoPath - The path to the video file.
 * @returns {Promise<number>} A promise that resolves with the duration of the video in seconds.
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(`Error fetching metadata: ${err.message}`);
      } else {
        resolve(metadata.format.duration as number);
      }
    });
  });
}

/**
 * Generates screenshots from the video.
 * 
 * @param {string} videoPath - The path to the video file.
 * @param {number} screenshotCount - The number of screenshots to generate.
 * @param {number} duration - The duration of the video in seconds.
 * @param {string} outputDir - The directory to save the screenshots.
 * @returns {Promise<string[]>} A promise that resolves with an array of paths to the generated screenshots.
 */
async function generateScreenshots(videoPath: string, screenshotCount: number, duration: number, outputDir: string): Promise<string[]> {
  const interval = duration / screenshotCount;
  const screenshotPaths: string[] = [];

  for (let i = 0; i < screenshotCount; i++) {
    const ss = (i * interval).toFixed(2);
    const screenshotPath = path.join(outputDir, `${i}.jpg`);
    screenshotPaths.push(screenshotPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .addInputOption('-ss', ss)
        .addOptions(['-vframes:v 1'])
        .output(screenshotPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(`Error generating screenshot: ${err.message}`))
        .run();
    });
  }

  return screenshotPaths;
}

/**
 * Creates a thumbnail mosaic from the generated screenshots.
 * 
 * @param {string[]} screenshotPaths - An array of paths to the screenshots.
 * @param {number} rows - The number of rows in the mosaic.
 * @param {number} cols - The number of columns in the mosaic.
 * @param {string} outputThumbnail - The path to save the output thumbnail.
 * @returns {Promise<void>} A promise that resolves when the thumbnail is created.
 */
async function createThumbnailMosaic(screenshotPaths: string[], rows: number, cols: number, outputThumbnail: string): Promise<void> {
  // Limit the number of screenshots to MAX_IMAGES
  if (screenshotPaths.length < 12) {
    return;
  }
  const limitedPaths = screenshotPaths.slice(0, 12);
  const images = limitedPaths.map(path => sharp(path));
  const { width, height } = await images[0].metadata();

  if (!width || !height) {
    throw new Error('Unable to get dimensions of screenshot');
  }

  const compositeImages = [];

  for (let i = 0; i < images.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    compositeImages.push({
      input: await images[i].toBuffer(),
      top: row * height,
      left: col * width
    });
  }

  await sharp({
    create: {
      width: width * cols,
      height: height * rows,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite(compositeImages)
    .toFile(outputThumbnail);
}

/**
 * Generates a preview video from the original video.
 * 
 * @param {string} id - The unique identifier for the video.
 * @param {string} inputPath - The path to the input video file.
 * @param {string} outputPath - The path to save the output preview video.
 * @param {number} width - The width of the preview video.
 * @param {number} height - The height of the preview video.
 * @param {number} segmentDuration - The duration of each segment.
 * @param {number} segmentCount - The number of segments to generate.
 * @returns {Promise<string>} A promise that resolves with the path of the generated preview video.
 */
function generateVideoPreview(id: string, inputPath: string, outputDir: string, width: number, height: number, segmentDuration: number = 2, segmentCount: number = 5): Promise<string> {
  const previewVideo = path.join(outputDir, 'preview.mp4');
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration!;
      if (duration < segmentDuration * segmentCount) {
        reject(`Cannot generate video preview, video is shorter than ${segmentDuration * segmentCount} seconds`);
        return;
      }

      const interval = (duration - segmentDuration) / (segmentCount - 1);

      const segmentPromises: Promise<string>[] = [];

      for (let i = 0; i < segmentCount; i++) {
        const startTime = i * interval;
        const segmentOutputPath = path.join(outputDir, `preview${i + 1}.mp4`);
        segmentPromises.push(generateSegment(inputPath, segmentOutputPath, startTime, segmentDuration, width, height));
      }

      Promise.all(segmentPromises)
        .then(segmentPaths => concatenateVideos(segmentPaths, previewVideo, outputDir))
        .then(async () => {
          await Video.updateOne({ _id: id }, { previewVideo })
          resolve(previewVideo)
        })
        .catch(reject);
    });
  });
}

function generateSegment(inputPath: string, outputPath: string, startTime: number, duration: number, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-movflags faststart',
        `-vf scale=${width === 0 ? -2 : width}:${height === 0 ? -2 : height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1:color=black`
      ])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

function concatenateVideos(inputPaths: string[], outputPath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const listFile = path.join(outputDir, 'filelist.txt');
    const fileListContent = inputPaths.map(p => `file '${path.resolve(p)}'`).join('\n');

    fs.writeFileSync(listFile, fileListContent);

    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath)
      .on('end', () => {
        fs.unlinkSync(listFile);
        inputPaths.forEach(p => fs.unlinkSync(p));
        resolve(outputPath);
      })
      .on('error', err => {
        fs.unlinkSync(listFile);
        reject(err);
      })
      .run();
  });
}
/**
 * Generates a poster image from a screenshot.
 * 
 * @param {string} screenshotPath - The path to the screenshot image.
 * @param {Object} posterSize - An object containing the width and height of the poster.
 * @param {number} posterSize.width - The width of the poster.
 * @param {number} posterSize.height - The height of the poster.
 * @param {string} outputPosterPath - The path to save the generated poster.
 * @returns {Promise<void>} A promise that resolves when the poster is generated.
 */
async function generatePoster(screenshotPath: string, posterSize: { width: number; height: number }, outputPosterPath: string): Promise<void> {
  const width = posterSize.width === 0 ? null : posterSize.width;
  const height = posterSize.height === 0 ? null : posterSize.height;
  await sharp(screenshotPath)
    .resize(width, height)
    .toFile(outputPosterPath);
}