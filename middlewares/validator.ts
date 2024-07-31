import type { NextFunction, Request, Response } from "express";
import { body, check, header, param, query, validationResult, type CustomValidator } from "express-validator";
import mongoose from "mongoose";
import { User } from "../models/User";
import redisClient from "../redis";

// 自定义验证器，确保taskId和requirementId至少存在一个
const eitherTaskOrRequirementExists: CustomValidator = (value, { req }) => {
  if (!req.query) {
    throw new Error('Must have query!');
  }
  if (!req.query.taskId && !req.query.requirementId) {
    throw new Error('Either taskId or requirementId must be provided');
  }
  // 验证为有效的MongoDB ObjectId
  if (req.query.taskId && !mongoose.Types.ObjectId.isValid(req.query.taskId)) {
    throw new Error('taskId must be a valid MongoDB ObjectId');
  }
  if (req.query.requirementId && !mongoose.Types.ObjectId.isValid(req.query.requirementId)) {
    throw new Error('requirementId must be a valid MongoDB ObjectId');
  }
  // 如果其中一个存在，则返回true表示验证通过
  return true;
};

export const validateMatchingRequest = [
  body('taskId')
    .isMongoId()
    .notEmpty()
    .withMessage('Must be valid mongodb ID！'),

  body('requirementId')
    .isMongoId()
    .notEmpty()
    .withMessage('Must be valid mongodb ID！'),

  body('actionType')
    .isIn(['offerHelp', 'match']).withMessage('Invalid actionType, must be one of [offerHelp, match]'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
export const validateProducts = [
  param('id').isMongoId().withMessage('无效的ID格式'),
  body('products').isArray({ min: 1 }).withMessage('产品列表不能为空'),
  body('products.*.title').not().isEmpty().withMessage('产品标题不能为空'),
  body('products.*.image').not().isEmpty().withMessage('产品图片链接不能为空'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: 0, errors: errors.array() });
    }
    next();
  }
];

export const validateMatchingQuery = [
  query('taskId')
    .optional()
    .custom(eitherTaskOrRequirementExists),

  query('requirementId')
    .optional()
    .custom(eitherTaskOrRequirementExists),

  query('actionType')
    .isIn(['offerHelp', 'match']).withMessage('Invalid actionType, must be one of [offerHelp, match]'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateMessageIds = [
  body('ids')
    .isArray().withMessage('ids must be an array of strings'),
  // 验证 "ids" 数组中的每个元素是否为有效的MongoDB ObjectId
  body('ids.*')
    .isMongoId().withMessage('Each id must be a valid MongoDB ObjectId'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validatePrivateMessage = [
  body('receiver')
    .isMongoId().withMessage('Receiver must be a valid MongoDB ObjectId'),

  body('content')
    .isString().withMessage('Content must be a string')
    .notEmpty().withMessage('Content is required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateReviewAuthencation = [
  body('id')
    .isMongoId().withMessage('Id must is mongodb id')
    .notEmpty().withMessage('Id is required'),

  body('status')
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid type'),

  body('message')
    .optional()
    .isString().withMessage('Description must be a string'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateReviewClaimRequest = [
  body('id')
    .isMongoId().withMessage('Id must is mongodb id')
    .notEmpty().withMessage('Id is required'),

  body('status')
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid type'),

  body('message')
    .optional()
    .isString().withMessage('Description must be a string'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateAuthentication = [
  body()
    .custom((value: any) => {
      // const { details } = value;
      // if (!details) {
      //   return false; // 如果没有details对象，则验证失败
      // }
      const { platformScreenshot, businessLicense, companyName, unifiedSocialCreditCode, creatorName, creatorLink } = value;
      if (!platformScreenshot && !businessLicense) {
        return false; // 如果两者都不存在，则验证失败
      }
      if (platformScreenshot) {
        if (!creatorLink || !creatorName) {
          return false;
        }
      }
      if (businessLicense) {
        if (!companyName || !unifiedSocialCreditCode) {
          return false
        }
      }
      return true; // 否则，验证通过
    })
    .withMessage('Either platformScreenshot or businessLicense must be provided'),
  body('type')
    .isIn(["up", "brand"])
    .withMessage('type must in up or brand'),
  body('companyName')
    .optional()
    .isString().withMessage('CompanyName must be a string'),

  body('unifiedSocialCreditCode')
    .optional()
    .isString().withMessage('UnifiedSocialCreditCode must be a string'),

  body('platformScreenshot')
    .optional()
    .isString().withMessage('PlatformScreenshot must be a string'),

  body('businessLicense')
    .optional()
    .isString().withMessage('BusinessLicense must be a string'),

  body('creatorName')
    .optional()
    .isString().withMessage('CreatorName must be a string'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateCreator = [
  body('creatorName')
    .isString().withMessage('Creator name must be a string')
    .notEmpty().withMessage('Creator name is required'),

  body('avatar')
    .isString().withMessage('Avatar must be a string')
    .isURL().withMessage('Avatar must be a valid URL'),

  body('description')
    .isString().withMessage('Description must be a string'),

  body('city')
    .optional()
    .isString().withMessage('City must be a string'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags: string[]) => tags.every(tag => typeof tag === 'string'))
    .withMessage('Each tag must be a string'),

  body('platforms')
    .optional()
    .isArray().withMessage('Platforms must be an array')
    .custom((platforms: any[]) =>
      platforms.every(platform =>
        'platformUserName' in platform &&
        'platformName' in platform &&
        'followers' in platform &&
        'worksCount' in platform &&
        typeof platform.platformUserName === 'string' &&
        typeof platform.platformName === 'string' &&
        typeof platform.followers === 'number' &&
        typeof platform.worksCount === 'number'
      )
    ).withMessage('Each platform must include valid platformUserName, platformName, followers, and worksCount fields'),

  body('platforms.*.host')
    .optional()
    .isString().withMessage('Platform host must be a string')
    .isURL().withMessage('Platform host must be a valid URL'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateBrand = [
  body('brandName')
    .trim()
    .isString().withMessage('Brand name must be a string.')
    .notEmpty().withMessage('Brand name is required.'),

  body('description')
    .trim()
    .isString().withMessage('Description must be a string.')
    .notEmpty().withMessage('Description is required.'),

  body('logo')
    .isString().withMessage('Logo must be a URL string.')
    .notEmpty().withMessage('Logo URL is required.')
    .isURL().withMessage('Logo must be a valid URL.'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array.')
    .custom(tags => tags.every((tag: any) => typeof tag === 'string')).withMessage('All tags must be strings.'),

  body('host')
    .optional()
    .trim()
    .isURL().withMessage('Host must be a valid URL.'),

  body('ecommerceLinks.taobao')
    .optional()
    .trim()
    .isURL().withMessage('Taobao link must be a valid URL.'),

  body('ecommerceLinks.jd')
    .optional()
    .trim()
    .isURL().withMessage('JD link must be a valid URL.'),

  body('ecommerceLinks.pinduoduo')
    .optional()
    .trim()
    .isURL().withMessage('Pinduoduo link must be a valid URL.'),

  body('ecommerceLinks.douyin')
    .optional()
    .trim()
    .isURL().withMessage('Douyin link must be a valid URL.'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateEcommercelink = [
  body('link')
    .isURL()
    .withMessage('Link must be a valid URL.'),
  body('type')
    .isIn(['taobao', 'jd', 'pinduoduo', 'douyin']),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const platformValidationRules = [
  body('platformUserName').isString().withMessage('Platform user name must be a string').notEmpty().withMessage('Platform user name is required'),
  body('platformName').isString().withMessage('Platform name must be a string').notEmpty().withMessage('Platform name is required'),
  body('followers').isInt({ min: 0 }).withMessage('Followers must be a non-negative integer').notEmpty().withMessage('Followers are required'),
  body('worksCount').isInt({ min: 0 }).withMessage('Works count must be a non-negative integer').notEmpty().withMessage('Works count is required'),
  body('host').optional().isString().withMessage('Host must be a string'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateJwtHeader = [
  header('authorization', 'Authorization header is missing or empty')
    .exists()
    .notEmpty()
    .withMessage('Authorization header must not be empty')
    .matches(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .withMessage('Invalid Authorization header format'),
  async (req: Request, res: Response, next: NextFunction) => {
    const token = await redisClient.get('token');
    if (token) {
      req.token = token;
      return next();
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]
// 定义验证规则
export const validateRequirementCreation = [
  header('authorization', 'Authorization header is missing or empty')
    .exists()
    .notEmpty()
    .withMessage('Authorization header must not be empty')
    .matches(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .withMessage('Invalid Authorization header format'),
  body('type').isIn(['food', 'clothing', 'housing', 'transportation', 'virtual']).withMessage('Invalid type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('expectedFeedback').optional().isString().withMessage('Expected feedback is required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// 定义发布任务的验证规则
export const validateTask = [
  header('authorization', 'Authorization header is missing or empty')
    .exists()
    .notEmpty()
    .withMessage('Authorization header must not be empty')
    .matches(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .withMessage('Invalid Authorization header format'),
  body('type')
    .isIn(['food', 'clothing', 'housing', 'transportation', 'virtual'])
    .withMessage('Invalid type'),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required'),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required'),
  body('desiredOutcome.views')
    .optional()
    .isNumeric().withMessage('Views must be a number'),
  body('desiredOutcome.likes')
    .optional()
    .isNumeric().withMessage('Likes must be a number'),
  body('desiredOutcome.other')
    .optional() // 表示这个字段是可选的
    .isString().withMessage('Other must be a string'),
  // 验证stages数组
  body('stages')
    .optional()
    .custom(value => {
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        return true; // 允许stages为undefined, null或空数组
      }
      if (!Array.isArray(value)) {
        throw new Error('Stages must be an array');
      }
      return true;
    }),
  // 验证stages数组中的每个对象
  body('stages.*.stage')
    .isNumeric().withMessage('Stage must be a number'),

  body('stages.*.criteria.views')
    .optional() // 如果提供，验证为数字
    .isNumeric().withMessage('Views must be a number'),

  body('stages.*.criteria.likes')
    .optional() // 如果提供，验证为数字
    .isNumeric().withMessage('Likes must be a number'),

  body('stages.*.criteria.mentions')
    .optional() // 如果提供，验证为布尔值
    .isBoolean().withMessage('Mentions must be a boolean'),

  body('stages.*.reward')
    .notEmpty().withMessage('Reward is required')
    .isNumeric().withMessage('Reward must be a number'),

  body('stages.*.completed')
    .optional() // 如果提供，验证为布尔值
    .isBoolean().withMessage('Completed must be a boolean'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateIsMongoID = [
  check('id').isMongoId().notEmpty().withMessage('Not validate id!'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.token) {
      return next();
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]

export const validateIds = [
  query('ids')
    .notEmpty().withMessage('ids is required')
    .custom((value) => {
      // 分割字符串得到数组
      const idsArray = value.split(',');
      // 检查数组中的每个元素是否都符合ObjectId的格式
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      return idsArray.every((id: string) => objectIdRegex.test(id));
    }).withMessage('ids must be a comma separated list of valid MongoDB ObjectId strings'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateAuthenticationsQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be validate string!'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]

export const validateSortQuery = [
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt'])
    .withMessage('Sort must be in createdAt/-createdAt'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateUserIdQuery = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('useId must be a mongodb id!'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateTypeQuery = [
  query('type')
    .optional()
    .isIn(['food', 'clothing', 'housing', 'transportation', 'virtual'])
    .withMessage('Invalid type'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]
export const validateDataTablesRequest = [
  query('draw').optional().isInt({ min: 0 }).toInt(),
  query('start').optional().isInt({ min: 0 }).toInt(),
  query('length').optional().isInt({ min: 0 }).toInt(),
  query('search.value').optional().isString(),
  query('order').optional().isArray(),
  query('order.*.column').optional().isInt({ min: 0 }).toInt(),
  query('order.*.dir').optional().isIn(['asc', 'desc']),
  query('columns').optional().isArray(),
  query('columns.*.data').optional().isString(),
  query('columns.*.name').optional().isString(),
  query('columns.*.searchable').optional().isBoolean().toBoolean(),
  query('columns.*.orderable').optional().isBoolean().toBoolean(),
  query('columns.*.search.value').optional().isString(),
  query('columns.*.search.regex').optional().isBoolean().toBoolean(),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validatePaginationQuery = [
  query('q')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1 }).withMessage('Query must be at least 1 character long'),
  query('limit')
    .optional()
    .isNumeric().withMessage('limit must be a number')
    .toInt() // 转换为整数
    .isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('skip')
    .optional()
    .isNumeric().withMessage('skip must be a number')
    .toInt() // 转换为整数
    .isInt({ min: 0, max: 5000 }).withMessage('skip must be between 0 and 5000'),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateUser = [
  body('phone')
    .notEmpty()
    .withMessage('Phone is required')
    .isMobilePhone('any').withMessage('Invalid mobile phone number'),
  body('username')
    .isString()
    .withMessage('Username must be a string')
    .notEmpty()
    .withMessage('Username is required'),
  body('countryCode')
    .isNumeric()
    .withMessage('Country Code must be a number')
    .optional()
    .default(86),
  body('avatarUrl').isString().optional(),
  body('type')
    .isString()
    .withMessage('Type must be a string')
    .isIn(['up', 'brand', 'mcn', 'admin'])
    .withMessage('Type must be one of "up", "brand", "mcn", "admin"')
    .optional()
    .default('up'),
  body('isAuthenticated')
    .isBoolean()
    .withMessage('isAuthenticated must be a boolean')
    .optional()
    .default(false),
  (req: Request, res: Response, next: NextFunction) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 如果有验证错误，返回400状态码和错误信息
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export async function checkNotLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.user);
  if (!user) {
    return res.status(401).send({ message: 'Have no this user!' })
  }
  if (user.type != 'admin') {
    return res.status(401).send({ message: 'Not Admin User!' })
  }
  req.user = user;
  next();
}