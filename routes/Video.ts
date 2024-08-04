import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { checkNotLogin, validateDataTablesRequest, validateIsMongoID, validateJwtHeader, validatePaginationQuery } from '../middlewares/validator';
import { jwtAuthMiddleware } from '../middlewares/jwtAuthMiddleware';
import { deleteOne, getMore, getOne, transcode, updateOne } from '../controllers/Video';

const router = express.Router();

router.get('/', validateDataTablesRequest, getMore);
router.get('/:id', validateIsMongoID, checkNotLogin, getOne);
router.post('/transcode', validateIsMongoID, checkNotLogin, transcode);
router.patch('/', validateIsMongoID, checkNotLogin, updateOne);
router.delete('/', validateJwtHeader, jwtAuthMiddleware, validateIsMongoID, deleteOne);

export default router;