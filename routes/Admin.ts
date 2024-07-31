import express from 'express';
import { index, postSetting, postTgSetting, setting, stats, tgSetting, upload } from '../controllers/Admin';
import { convertCheckboxesToBoolean, handleValidationErrors, videoTranscodingValidator } from '../middlewares/settingValidator';

const router = express.Router();

router.get('/', index);
router.get('/stats', stats);
router.get('/upload', upload);
router.get('/setting', setting);
router.post('/setting', videoTranscodingValidator, handleValidationErrors, convertCheckboxesToBoolean, postSetting);
router.get('/telegram', tgSetting);
router.post('/telegram', postTgSetting);

export default router;