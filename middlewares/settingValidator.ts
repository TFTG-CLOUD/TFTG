import { body, validationResult, type ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const videoTranscodingValidator: ValidationChain[] = [
  body('resolution').notEmpty().withMessage('Resolution is required'),
  body('bitrate').notEmpty().isInt({ min: 0 }).withMessage('Bitrate must be a non-negative integer'),
  body('frameRate').notEmpty().isIn([25, 30, 60]).withMessage('Frame Rate must be 25, 30, or 60'),
  body('generatePreviewVideo')
    .custom((value: any) => value === undefined || value === 'on')
    .withMessage('Generate Preview Video must be either unchecked or "on"'),
  body('generateThumbnailMosaic')
    .custom((value: any) => value === undefined || value === 'on')
    .withMessage('Generate Thumbnail Mosaic must be either unchecked or "on"'),
  body('watermarkImage').notEmpty().withMessage('Watermark Image is required'),
  body('watermarkPosition').notEmpty().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight']).withMessage('Invalid Watermark Position'),
  body('screenshotCount').notEmpty().isInt({ min: 0 }).withMessage('Screenshot Count must be a non-negative integer'),
  body('previewVideoWidth').notEmpty().isInt({ min: 0 }).withMessage('Preview Video Width must be a non-negative integer'),
  body('previewVideoHeight').notEmpty().isInt({ min: 0 }).withMessage('Preview Video Height must be a non-negative integer'),
  body('posterWidth').notEmpty().isInt({ min: 0 }).withMessage('Poster Width must be a non-negative integer'),
  body('posterHeight').notEmpty().isInt({ min: 0 }).withMessage('Poster Height must be a non-negative integer'),

  body(['previewVideoWidth', 'previewVideoHeight']).custom((value, { req }) => {
    const width = parseInt(req.body.previewVideoWidth);
    const height = parseInt(req.body.previewVideoHeight);
    if ((width === 0 && height === 0)) {
      throw new Error('Only one of Preview Video Width or Height can be 0');
    }
    return true;
  }),

  body(['posterWidth', 'posterHeight']).custom((value, { req }) => {
    const width = parseInt(req.body.posterWidth);
    const height = parseInt(req.body.posterHeight);
    if ((width === 0 && height === 0)) {
      throw new Error('Only one of Poster Width or Height can be 0');
    }
    return true;
  }),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/admin/setting');
  }
  next();
};

export const convertCheckboxesToBoolean = (req: Request, res: Response, next: NextFunction): void => {
  req.body.generatePreviewVideo = req.body.generatePreviewVideo === 'on';
  req.body.generateThumbnailMosaic = req.body.generateThumbnailMosaic === 'on';
  next();
};