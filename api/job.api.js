const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDb } = require('./db');
const aps = require('./aps');
const apsExtract = require('./aps_extract');
const archiver = require('archiver');
const logger = require('./logger');

const router = express.Router();

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '../jobs/uploaded');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 配置，先存到内存，后续重命名
const storage = multer.memoryStorage();
const upload = multer({ storage });

// APS bucket 配置（可根据实际情况调整）
const BUCKET_KEY = 'aps-buckets-tools-demo'; // 必须全小写，且全局唯一

// Job 创建与 DWG 文件上传
router.post('/job', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            logger.warn('No file uploaded in job creation');
            return res.status(400).json({ success: false, error_code: 'NO_FILE', message: 'No file uploaded.' });
        }
        const db = getDb();
        const originalName = req.file.originalname;
        db.run(
            'INSERT INTO job (filename, status, progress) VALUES (?, ?, ?)',
            [originalName, 'uploading', 0],
            function (err) {
                if (err) {
                    logger.error(`DB_ERROR creating job: ${err.message}`);
                    db.close();
                    return res.status(500).json({ success: false, error_code: 'DB_ERROR', message: 'Failed to create job.' });
                }
                const jobId = this.lastID;
                const savePath = path.join(UPLOAD_DIR, `job_${jobId}.dwg`);
                fs.writeFile(savePath, req.file.buffer, (err) => {
                    if (err) {
                        logger.error(`SAVE_ERROR job ${jobId}: Failed to save file: ${err.message}`);
                        db.run('UPDATE job SET status=?, error_msg=? WHERE id=?', ['error', 'File save failed', jobId]);
                        db.close();
                        return res.status(500).json({ success: false, error_code: 'SAVE_ERROR', message: 'Failed to save file.' });
                    }
                    logger.info(`Job ${jobId} created and file saved: ${originalName}`);
                    db.run('UPDATE job SET status=?, progress=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['uploaded', 10, jobId], () => {
                        db.close();
                        setImmediate(() => startJobProcessing(jobId, savePath, originalName));
                        return res.json({ success: true, job_id: jobId });
                    });
                });
            }
        );
    } catch (err) {
        logger.error(`UNCAUGHT job creation: ${err.stack || err.message}`);
        return res.status(500).json({ success: false, error_code: 'INTERNAL_ERROR', message: 'Internal server error.' });
    }
});

async function startJobProcessing(jobId, localFilePath, originalName) {
    const db = getDb();
    try {
        logger.info(`Job ${jobId} start APS processing`);
        await updateJob(jobId, 'preparing', 15);
        const token = await aps.getApsToken();
        logger.info(`Job ${jobId} got APS token`);
        await updateJob(jobId, 'uploading_aps', 20);
        const objectName = `job_${jobId}_${Date.now()}_${originalName}`;
        await aps.uploadObject(BUCKET_KEY, objectName, localFilePath, token);
        logger.info(`Job ${jobId} uploaded to APS OSS as ${objectName}`);
        await updateJob(jobId, 'converting', 30);
        const urn = Buffer.from(`${BUCKET_KEY}/${objectName}`).toString('base64');
        await aps.translate(urn, token);
        logger.info(`Job ${jobId} APS translate requested, urn=${urn}`);
        let progress = 35;
        let status = 'converting';
        let manifest;
        for (let i = 0; i < 60; i++) {
            await sleep(5000);
            manifest = await aps.getManifest(urn, token);
            if (manifest.status === 'success') {
                status = 'converted';
                progress = 60;
                logger.info(`Job ${jobId} APS conversion success`);
                break;
            } else if (manifest.status === 'failed') {
                status = 'error';
                progress = 100;
                logger.error(`Job ${jobId} APS conversion failed`);
                await updateJob(jobId, status, progress, 'APS 转换失败');
                db.close();
                return;
            }
            await updateJob(jobId, 'converting', progress);
            progress = Math.min(progress + 2, 59);
        }
        if (status !== 'converted') {
            logger.error(`Job ${jobId} APS conversion timeout`);
            await updateJob(jobId, 'error', 100, 'APS 转换超时');
            db.close();
            return;
        }
        await updateJob(jobId, 'converted', 60);
        logger.info(`Job ${jobId} start extracting APS data`);
        await updateJob(jobId, 'parsing', 70);
        const outDir = path.join(__dirname, `../jobs/job_${jobId}`);
        await apsExtract.extractAll({ urn, token, jobId, outDir });
        await updateJob(jobId, 'parsed', 80);
        logger.info(`Job ${jobId} APS data extracted`);
        await updateJob(jobId, 'zipping', 90);
        const zipPath = path.join(__dirname, `../jobs/job_${jobId}.zip`);
        await createZip([outDir, localFilePath], zipPath);
        await updateJob(jobId, 'finished', 100, null, zipPath);
        logger.info(`Job ${jobId} finished, zip created at ${zipPath}`);
        db.close();
    } catch (err) {
        logger.error(`Job ${jobId} failed: ${err.stack || err.message}`);
        await updateJob(jobId, 'error', 100, err.message || 'Job failed');
        db.close();
    }
}

function createZip(srcArr, zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        for (const src of srcArr) {
            if (fs.statSync(src).isDirectory()) {
                archive.directory(src, path.basename(src));
            } else {
                archive.file(src, { name: path.basename(src) });
            }
        }
        archive.finalize();
    });
}

// 修改 updateJob 支持 zip_path
function updateJob(jobId, status, progress, error_msg = null, zip_path = null) {
    return new Promise((resolve) => {
        const db = getDb();
        let sql, params;
        if (zip_path) {
            sql = 'UPDATE job SET status=?, progress=?, updated_at=CURRENT_TIMESTAMP, error_msg=?, zip_path=? WHERE id=?';
            params = [status, progress, error_msg, zip_path, jobId];
        } else {
            sql = 'UPDATE job SET status=?, progress=?, updated_at=CURRENT_TIMESTAMP, error_msg=? WHERE id=?';
            params = [status, progress, error_msg, jobId];
        }
        db.run(sql, params, () => {
            db.close();
            resolve();
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Job 状态查询
router.get('/job/:id', (req, res) => {
    try {
        const jobId = req.params.id;
        const db = getDb();
        db.get('SELECT * FROM job WHERE id = ?', [jobId], (err, row) => {
            db.close();
            if (err) {
                logger.error(`DB_ERROR get job ${jobId}: ${err.message}`);
                return res.status(500).json({ success: false, error_code: 'DB_ERROR', message: 'Database error.' });
            }
            if (!row) {
                return res.status(404).json({ success: false, error_code: 'NOT_FOUND', message: 'Job not found.' });
            }
            return res.json({
                success: true,
                job_id: row.id,
                filename: row.filename,
                status: row.status,
                progress: row.progress,
                created_at: row.created_at,
                updated_at: row.updated_at,
                zip_path: row.zip_path,
                error_msg: row.error_msg
            });
        });
    } catch (err) {
        logger.error(`UNCAUGHT get job: ${err.stack || err.message}`);
        return res.status(500).json({ success: false, error_code: 'INTERNAL_ERROR', message: 'Internal server error.' });
    }
});

// Job 结果下载
router.get('/job/:id/download', (req, res) => {
    try {
        const jobId = req.params.id;
        const db = getDb();
        db.get('SELECT * FROM job WHERE id = ?', [jobId], (err, row) => {
            db.close();
            if (err) {
                logger.error(`DB_ERROR download job ${jobId}: ${err.message}`);
                return res.status(500).json({ success: false, error_code: 'DB_ERROR', message: 'Database error.' });
            }
            if (!row || !row.zip_path) {
                return res.status(404).json({ success: false, error_code: 'NOT_FOUND', message: 'Result not found.' });
            }
            if (!fs.existsSync(row.zip_path)) {
                return res.status(404).json({ success: false, error_code: 'NOT_FOUND', message: 'Zip file not found.' });
            }
            res.download(row.zip_path, `job_${jobId}.zip`, (err) => {
                if (err) {
                    logger.error(`DOWNLOAD_ERROR job ${jobId}: ${err.message}`);
                }
            });
        });
    } catch (err) {
        logger.error(`UNCAUGHT download job: ${err.stack || err.message}`);
        return res.status(500).json({ success: false, error_code: 'INTERNAL_ERROR', message: 'Internal server error.' });
    }
});

module.exports = router; 