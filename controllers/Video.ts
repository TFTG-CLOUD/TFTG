import { type Request, type Response } from 'express';
import { Video } from '../models/Video';
import type { DataTablesRequest } from '../type/types';
import fs from 'fs';
import { deleteAll } from '../helper/utils';

export const getMore = async (req: Request, res: Response) => {
  const { draw, columns, order, start, length, search } = req.query as DataTablesRequest;
  let sort = '-createdAt';
  if (order && order.length && columns && columns[order[0].column] && columns[order[0].column].orderable && columns[order[0].column].data) {
    const column = columns[order[0].column];
    const sortby = order[0].dir;
    sort = sortby === 'asc' ? column.data : `-${column.data}`;
  }

  // console.log(sort);

  let find: { [key: string]: any } = {};
  if (search && search.value) {
    find = { title: { $regex: search.value, $options: 'i' } }; // 添加正则表达式的忽略大小写选项
  }

  const startValue = start ? parseInt(start, 10) : 0;
  const lengthValue = length ? parseInt(length, 10) : 10;

  const counts = await Video.countDocuments();
  const filterCounts = await Video.countDocuments(find);
  const videos = await Video.find(find)
    .skip(startValue)
    .limit(lengthValue)
    .sort(sort)
    .select('_id title status originalSize afterSize duration poster previewVideo createdAt notTranscoding');

  res.json({ draw, data: videos, recordsTotal: counts, recordsFiltered: filterCounts });
}

export const getOne = async (req: Request, res: Response) => {
  const id = req.params.id;
  const video = await Video.findOne({ _id: id });
  res.json({ data: video });
}

export const deleteOne = async (req: Request, res: Response) => {
  const id = req.query.id;
  const video = await Video.findOne({ _id: id });
  if (!video) {
    return res.status(404).json({ success: 0, message: 'Video not found' });
  }
  const originalPath = video.originalPath;
  const transcodedPath = video.transcodedPath;
  if (originalPath) {
    fs.existsSync(originalPath) && fs.unlinkSync(originalPath);
    fs.existsSync(originalPath + '.json') && fs.unlinkSync(originalPath + '.json');
  }
  if (transcodedPath) {
    deleteAll(transcodedPath);
  }
  await Video.deleteOne({ _id: id });
  res.json({ success: 1 });
}

export const updateOne = async (req: Request, res: Response) => {
  const title = req.body.title;
  const id = req.body.id;
  await Video.updateOne({ _id: id }, { title })
  res.json({ success: 1 });
}

export const transcode = async (req: Request, res: Response) => {
  const id = req.body.id;
  await Video.updateOne({ _id: id }, { notTranscoding: false });
  res.json({ success: 1 });
}