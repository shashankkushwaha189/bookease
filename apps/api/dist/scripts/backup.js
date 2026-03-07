"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BACKUP_CONFIG = exports.BackupManager = void 0;
exports.createBackupCommand = createBackupCommand;
exports.restoreBackupCommand = restoreBackupCommand;
exports.listBackupsCommand = listBackupsCommand;
exports.cleanupBackupsCommand = cleanupBackupsCommand;
exports.verifyBackupCommand = verifyBackupCommand;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const logger_1 = require("@bookease/logger");
const client_1 = require("@prisma/client");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupManager {
    config;
    prisma;
    constructor(config) {
        this.config = config;
        this.prisma = new client_1.PrismaClient();
    }
    async createBackup(type = 'full') {
        const startTime = Date.now();
        const timestamp = new Date();
        const filename = this.generateFilename(type, timestamp);
        logger_1.logger.info({ type, filename }, 'Starting backup creation');
        try {
            // Create backup directory if it doesn't exist
            if (this.config.storage.type === 'local' && this.config.storage.localPath) {
                await this.ensureDirectory(this.config.storage.localPath);
            }
            // Generate database backup
            const dumpFile = await this.dumpDatabase(filename, type);
            // Compress if enabled
            const finalFile = this.config.compression
                ? await this.compressFile(dumpFile)
                : dumpFile;
            // Encrypt if enabled
            const encryptedFile = this.config.encryption
                ? await this.encryptFile(finalFile)
                : finalFile;
            // Upload to storage
            const location = await this.uploadToStorage(encryptedFile, filename);
            // Calculate checksum
            const checksum = await this.calculateChecksum(encryptedFile);
            // Clean up temporary files
            await this.cleanupTempFiles([dumpFile, finalFile, encryptedFile]);
            const duration = Date.now() - startTime;
            const stats = await this.getFileStats(encryptedFile);
            const result = {
                success: true,
                timestamp,
                filename,
                size: stats.size,
                duration,
                type,
                location,
                checksum,
            };
            logger_1.logger.info(result, 'Backup completed successfully');
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const result = {
                success: false,
                timestamp,
                filename,
                size: 0,
                duration,
                type,
                location: '',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            logger_1.logger.error(result, 'Backup failed');
            return result;
        }
    }
    async restoreFromBackup(filename) {
        const startTime = Date.now();
        const timestamp = new Date();
        logger_1.logger.info({ filename }, 'Starting backup restoration');
        try {
            // Download backup from storage
            const backupFile = await this.downloadFromStorage(filename);
            // Decrypt if needed
            const decryptedFile = this.config.encryption && filename.endsWith('.enc')
                ? await this.decryptFile(backupFile)
                : backupFile;
            // Decompress if needed
            const sqlFile = this.config.compression && (filename.endsWith('.gz') || filename.endsWith('.enc.gz'))
                ? await this.decompressFile(decryptedFile)
                : decryptedFile;
            // Restore database
            const restoreResult = await this.restoreDatabase(sqlFile);
            // Clean up temporary files
            await this.cleanupTempFiles([backupFile, decryptedFile, sqlFile]);
            const duration = Date.now() - startTime;
            const result = {
                success: true,
                timestamp,
                filename,
                duration,
                recordsRestored: restoreResult.recordsRestored,
                tablesRestored: restoreResult.tablesRestored,
            };
            logger_1.logger.info(result, 'Backup restoration completed successfully');
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const result = {
                success: false,
                timestamp,
                filename,
                duration,
                recordsRestored: 0,
                tablesRestored: [],
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            logger_1.logger.error(result, 'Backup restoration failed');
            return result;
        }
    }
    async listBackups() {
        try {
            if (this.config.storage.type === 'local') {
                return this.listLocalBackups();
            }
            else if (this.config.storage.type === 's3') {
                return this.listS3Backups();
            }
            else if (this.config.storage.type === 'gcs') {
                return this.listGCSBackups();
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to list backups');
            return [];
        }
    }
    async deleteOldBackups() {
        logger_1.logger.info('Starting cleanup of old backups');
        try {
            const backups = await this.listBackups();
            const now = new Date();
            let deletedCount = 0;
            for (const backup of backups) {
                const ageInDays = this.getAgeInDays(backup.timestamp, now);
                let shouldDelete = false;
                // Check retention policy
                if (backup.type === 'full' && ageInDays > this.config.retention.daily) {
                    shouldDelete = true;
                }
                else if (backup.type === 'incremental' && ageInDays > this.config.retention.weekly * 7) {
                    shouldDelete = true;
                }
                if (shouldDelete) {
                    await this.deleteBackup(backup.filename);
                    deletedCount++;
                }
            }
            logger_1.logger.info({ deletedCount }, 'Old backups cleanup completed');
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to cleanup old backups');
            throw error;
        }
    }
    async verifyBackup(filename) {
        try {
            // Download backup
            const backupFile = await this.downloadFromStorage(filename);
            // Calculate checksum
            const checksum = await this.calculateChecksum(backupFile);
            // Get file stats
            const stats = await this.getFileStats(backupFile);
            // Verify backup integrity
            const isValid = await this.verifyBackupIntegrity(backupFile);
            // Clean up
            await this.cleanupTempFiles([backupFile]);
            return {
                valid: isValid,
                checksum,
                size: stats.size,
            };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    generateFilename(type, timestamp) {
        const date = timestamp.toISOString().split('T')[0];
        const time = timestamp.toISOString().split('T')[1].replace(/[:.]/g, '-');
        const extension = this.config.compression ? '.sql.gz' : '.sql';
        const encryptionSuffix = this.config.encryption ? '.enc' : '';
        return `backup-${type}-${date}-${time}${extension}${encryptionSuffix}`;
    }
    async dumpDatabase(filename, type) {
        const { host, port, database, username, password } = this.config.database;
        const filepath = (0, path_1.join)('/tmp', filename);
        let command = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${username} -d ${database}`;
        if (type === 'incremental') {
            // For incremental backups, we might use different options
            command += ' --data-only --exclude-table=*_archived';
        }
        command += ` > ${filepath}`;
        await execAsync(command);
        return filepath;
    }
    async restoreDatabase(sqlFile) {
        const { host, port, database, username, password } = this.config.database;
        // Drop existing database and recreate
        await execAsync(`PGPASSWORD=${password} dropdb -h ${host} -p ${port} -U ${username} ${database}`);
        await execAsync(`PGPASSWORD=${password} createdb -h ${host} -p ${port} -U ${username} ${database}`);
        // Restore from backup
        const command = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database} < ${sqlFile}`;
        await execAsync(command);
        // Get restored tables and record count
        const tables = await this.prisma.$queryRaw `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        const records = await this.prisma.$queryRaw `SELECT COUNT(*) as total FROM appointments`;
        return {
            recordsRestored: Number(records[0]?.total || 0),
            tablesRestored: tables.map(t => t.table_name),
        };
    }
    async compressFile(filepath) {
        const compressedPath = `${filepath}.gz`;
        await execAsync(`gzip -c ${filepath} > ${compressedPath}`);
        return compressedPath;
    }
    async decompressFile(filepath) {
        const decompressedPath = filepath.replace('.gz', '');
        await execAsync(`gunzip -c ${filepath} > ${decompressedPath}`);
        return decompressedPath;
    }
    async encryptFile(filepath) {
        const encryptedPath = `${filepath}.enc`;
        // Simple XOR encryption for demo (use proper encryption in production)
        const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key';
        await execAsync(`openssl enc -aes-256-cbc -salt -in ${filepath} -out ${encryptedPath} -pass pass:${key}`);
        return encryptedPath;
    }
    async decryptFile(filepath) {
        const decryptedPath = filepath.replace('.enc', '');
        const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key';
        await execAsync(`openssl enc -aes-256-cbc -d -in ${filepath} -out ${decryptedPath} -pass pass:${key}`);
        return decryptedPath;
    }
    async uploadToStorage(filepath, filename) {
        if (this.config.storage.type === 'local') {
            const localPath = (0, path_1.join)(this.config.storage.localPath, filename);
            await execAsync(`cp ${filepath} ${localPath}`);
            return localPath;
        }
        else if (this.config.storage.type === 's3') {
            const { bucket, region, accessKeyId, secretAccessKey } = this.config.storage.s3Config;
            await execAsync(`AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} aws s3 cp ${filepath} s3://${bucket}/${filename} --region ${region}`);
            return `s3://${bucket}/${filename}`;
        }
        else if (this.config.storage.type === 'gcs') {
            const { bucket, keyFilename } = this.config.storage.gcsConfig;
            await execAsync(`gcloud auth activate-service-account --key-file=${keyFilename} && gsutil cp ${filepath} gs://${bucket}/${filename}`);
            return `gs://${bucket}/${filename}`;
        }
        return '';
    }
    async downloadFromStorage(filename) {
        const filepath = (0, path_1.join)('/tmp', filename);
        if (this.config.storage.type === 'local') {
            const localPath = (0, path_1.join)(this.config.storage.localPath, filename);
            await execAsync(`cp ${localPath} ${filepath}`);
        }
        else if (this.config.storage.type === 's3') {
            const { bucket, region, accessKeyId, secretAccessKey } = this.config.storage.s3Config;
            await execAsync(`AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} aws s3 cp s3://${bucket}/${filename} ${filepath} --region ${region}`);
        }
        else if (this.config.storage.type === 'gcs') {
            const { bucket, keyFilename } = this.config.storage.gcsConfig;
            await execAsync(`gcloud auth activate-service-account --key-file=${keyFilename} && gsutil cp gs://${bucket}/${filename} ${filepath}`);
        }
        return filepath;
    }
    async deleteBackup(filename) {
        if (this.config.storage.type === 'local') {
            const localPath = (0, path_1.join)(this.config.storage.localPath, filename);
            await execAsync(`rm ${localPath}`);
        }
        else if (this.config.storage.type === 's3') {
            const { bucket, region, accessKeyId, secretAccessKey } = this.config.storage.s3Config;
            await execAsync(`AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} aws s3 rm s3://${bucket}/${filename} --region ${region}`);
        }
        else if (this.config.storage.type === 'gcs') {
            const { bucket, keyFilename } = this.config.storage.gcsConfig;
            await execAsync(`gcloud auth activate-service-account --key-file=${keyFilename} && gsutil rm gs://${bucket}/${filename}`);
        }
    }
    async listLocalBackups() {
        if (!this.config.storage.localPath)
            return [];
        const { stdout } = await execAsync(`ls -la ${this.config.storage.localPath} | grep 'backup-'`);
        const lines = stdout.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const parts = line.trim().split(/\s+/);
            const filename = parts[parts.length - 1];
            const size = parseInt(parts[4]);
            const type = filename.includes('full') ? 'full' : 'incremental';
            return {
                filename,
                size,
                type,
                location: (0, path_1.join)(this.config.storage.localPath, filename),
                timestamp: this.parseTimestampFromFilename(filename),
            };
        });
    }
    async listS3Backups() {
        const { bucket, region, accessKeyId, secretAccessKey } = this.config.storage.s3Config;
        const { stdout } = await execAsync(`AWS_ACCESS_KEY_ID=${accessKeyId} AWS_SECRET_ACCESS_KEY=${secretAccessKey} aws s3 ls s3://${bucket}/ --region ${region} | grep 'backup-'`);
        const lines = stdout.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const parts = line.trim().split(/\s+/);
            const filename = parts[3];
            const size = parseInt(parts[2]);
            const type = filename.includes('full') ? 'full' : 'incremental';
            return {
                filename,
                size,
                type,
                location: `s3://${bucket}/${filename}`,
                timestamp: this.parseTimestampFromFilename(filename),
            };
        });
    }
    async listGCSBackups() {
        const { bucket, keyFilename } = this.config.storage.gcsConfig;
        const { stdout } = await execAsync(`gcloud auth activate-service-account --key-file=${keyFilename} && gsutil ls gs://${bucket}/ | grep 'backup-'`);
        const lines = stdout.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const parts = line.trim().split(/\s+/);
            const filename = parts[2];
            const size = parseInt(parts[1]);
            const type = filename.includes('full') ? 'full' : 'incremental';
            return {
                filename,
                size,
                type,
                location: `gs://${bucket}/${filename}`,
                timestamp: this.parseTimestampFromFilename(filename),
            };
        });
    }
    parseTimestampFromFilename(filename) {
        const match = filename.match(/backup-(\w+)-(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2}-\d{3})/);
        if (!match)
            return new Date();
        const [, , dateStr, timeStr] = match;
        return new Date(`${dateStr}T${timeStr.replace(/-/g, ':')}Z`);
    }
    getAgeInDays(date1, date2) {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    async calculateChecksum(filepath) {
        const { stdout } = await execAsync(`sha256sum ${filepath}`);
        return stdout.split(' ')[0];
    }
    async getFileStats(filepath) {
        const { stdout } = await execAsync(`stat -c "%s %Y" ${filepath}`);
        const [size, modified] = stdout.trim().split(' ');
        return {
            size: parseInt(size),
            modified: new Date(parseInt(modified) * 1000),
        };
    }
    async verifyBackupIntegrity(filepath) {
        try {
            // Try to parse the SQL file to verify it's valid
            const { stdout } = await execAsync(`head -n 10 ${filepath}`);
            return stdout.includes('PostgreSQL database dump') || stdout.includes('CREATE TABLE');
        }
        catch {
            return false;
        }
    }
    async ensureDirectory(path) {
        try {
            await (0, promises_1.access)(path);
        }
        catch {
            await (0, promises_1.mkdir)(path, { recursive: true });
        }
    }
    async cleanupTempFiles(files) {
        for (const file of files) {
            try {
                await execAsync(`rm -f ${file}`);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
}
exports.BackupManager = BackupManager;
// Default backup configuration
exports.DEFAULT_BACKUP_CONFIG = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'bookease',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    },
    storage: {
        type: 'local',
        localPath: process.env.BACKUP_PATH || './backups',
    },
    retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
    },
    compression: true,
    encryption: false,
};
// CLI command functions
async function createBackupCommand(type = 'full') {
    const backupManager = new BackupManager(exports.DEFAULT_BACKUP_CONFIG);
    console.log(`🔄 Creating ${type} backup...`);
    try {
        const result = await backupManager.createBackup(type);
        if (result.success) {
            console.log('✅ Backup created successfully!');
            console.log(`📁 Filename: ${result.filename}`);
            console.log(`📏 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
            console.log(`📍 Location: ${result.location}`);
            if (result.checksum) {
                console.log(`🔐 Checksum: ${result.checksum}`);
            }
        }
        else {
            console.error('❌ Backup failed:', result.error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}
async function restoreBackupCommand(filename) {
    const backupManager = new BackupManager(exports.DEFAULT_BACKUP_CONFIG);
    console.log(`🔄 Restoring from backup: ${filename}`);
    try {
        const result = await backupManager.restoreFromBackup(filename);
        if (result.success) {
            console.log('✅ Backup restored successfully!');
            console.log(`📁 Filename: ${result.filename}`);
            console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
            console.log(`📊 Records restored: ${result.recordsRestored.toLocaleString()}`);
            console.log(`📋 Tables restored: ${result.tablesRestored.join(', ')}`);
        }
        else {
            console.error('❌ Backup restoration failed:', result.error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Backup restoration failed:', error);
        process.exit(1);
    }
}
async function listBackupsCommand() {
    const backupManager = new BackupManager(exports.DEFAULT_BACKUP_CONFIG);
    console.log('📋 Listing available backups...');
    try {
        const backups = await backupManager.listBackups();
        if (backups.length === 0) {
            console.log('No backups found.');
            return;
        }
        console.log(`Found ${backups.length} backups:\n`);
        backups.forEach(backup => {
            console.log(`📁 ${backup.filename}`);
            console.log(`   Type: ${backup.type}`);
            console.log(`   Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Date: ${backup.timestamp.toLocaleString()}`);
            console.log(`   Location: ${backup.location}`);
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ Failed to list backups:', error);
        process.exit(1);
    }
}
async function cleanupBackupsCommand() {
    const backupManager = new BackupManager(exports.DEFAULT_BACKUP_CONFIG);
    console.log('🧹 Cleaning up old backups...');
    try {
        const deletedCount = await backupManager.deleteOldBackups();
        console.log(`✅ Cleanup completed. Deleted ${deletedCount} old backups.`);
    }
    catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}
async function verifyBackupCommand(filename) {
    const backupManager = new BackupManager(exports.DEFAULT_BACKUP_CONFIG);
    console.log(`🔍 Verifying backup: ${filename}`);
    try {
        const result = await backupManager.verifyBackup(filename);
        if (result.valid) {
            console.log('✅ Backup is valid!');
            console.log(`📏 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
            if (result.checksum) {
                console.log(`🔐 Checksum: ${result.checksum}`);
            }
        }
        else {
            console.error('❌ Backup is invalid:', result.error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}
// Run commands if called directly
if (require.main === module) {
    const command = process.argv[2];
    const param = process.argv[3];
    switch (command) {
        case 'create':
            createBackupCommand(param || 'full');
            break;
        case 'restore':
            if (!param) {
                console.error('Please provide backup filename');
                process.exit(1);
            }
            restoreBackupCommand(param);
            break;
        case 'list':
            listBackupsCommand();
            break;
        case 'cleanup':
            cleanupBackupsCommand();
            break;
        case 'verify':
            if (!param) {
                console.error('Please provide backup filename');
                process.exit(1);
            }
            verifyBackupCommand(param);
            break;
        default:
            console.log('Usage: npm run backup [create|restore|list|cleanup|verify]');
            console.log('  create [type] - Create backup (full or incremental)');
            console.log('  restore <file> - Restore from backup');
            console.log('  list - List available backups');
            console.log('  cleanup - Clean up old backups');
            console.log('  verify <file> - Verify backup integrity');
            process.exit(1);
    }
}
