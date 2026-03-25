import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadRecording, listRecordings, downloadRecording, deleteRecording, startRecording, stopRecording, getRecordingStatus } from '../controllers/recordingController';
import { requireAuth } from '../middleware/auth';

const router = Router();

const recDir = path.join(__dirname, '../../recordings');
if (!fs.existsSync(recDir)) fs.mkdirSync(recDir, { recursive: true });

const storage = multer.diskStorage({
  destination: recDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadRecording);
router.post('/start', startRecording);
router.post('/stop', stopRecording);
router.get('/status/:egressId', getRecordingStatus);
router.get('/list/:officeId', listRecordings);
router.get('/:id/download', downloadRecording);
router.delete('/:id', deleteRecording);

export default router;
