import { Router } from 'express';
import multer from 'multer';
import { importController } from './import.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { AppError } from '../../lib/errors';

const router = Router();

// Configure Mutler (Memory allocation, 5MB limit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new AppError('Only CSV files are allowed', 400, 'INVALID_FILE_TYPE'));
        }
    }
});

router.use(authMiddleware);
router.use(requireRole('ADMIN')); // ADMIN only

router.post('/customers', upload.single('file'), importController.customers);
router.post('/services', upload.single('file'), importController.services);
router.post('/staff', upload.single('file'), importController.staff);

export default router;
