import express from 'express';
import { getMore, getOne } from '../controllers/User';
import { body, query, validationResult } from 'express-validator';
import { validateIsMongoID, validateJwtHeader, validatePaginationQuery } from '../middlewares/validator';
import { jwtAuthMiddleware } from '../middlewares/jwtAuthMiddleware';

const router = express.Router();

router.get('/', validatePaginationQuery, getMore);
router.get('/:id', validateIsMongoID, getOne);

export default router;