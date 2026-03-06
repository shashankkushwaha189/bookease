import { Router } from 'express';
import multer from 'multer';
import { importController } from './import.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { AppError } from '../../lib/errors';
import { UserRole } from '@prisma/client';

const router = Router();

// Configure Multer (Memory allocation, 50MB limit for large files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB - increased for large CSV files
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
router.use(requireRole(UserRole.ADMIN)); // ADMIN only

// Validation endpoints
router.post('/customers/validate', upload.single('file'), importController.validateCustomers);
router.post('/services/validate', upload.single('file'), importController.validateServices);
router.post('/staff/validate', upload.single('file'), importController.validateStaff);

// Import endpoints with partial support
router.post('/customers', upload.single('file'), importController.customers);
router.post('/services', upload.single('file'), importController.services);
router.post('/staff', upload.single('file'), importController.staff);

// Utility endpoints
router.get('/history', importController.getHistory);
router.get('/templates', importController.getTemplates);

export default router;
