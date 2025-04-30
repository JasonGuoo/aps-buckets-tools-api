// aps.js - APS 相关 API 封装
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../server/config');

const APS_BASE_URL = 'https://developer.api.autodesk.com';

// 获取 APS token（两腿认证）
async function getApsToken() {
    const client_id = config.credentials.client_id;
    const client_secret = config.credentials.client_secret;
    const scopes = config.scopeInternal.join(' ');
    const resp = await axios.post(
        `${APS_BASE_URL}/authentication/v2/token`,
        new URLSearchParams({
            client_id,
            client_secret,
            grant_type: 'client_credentials',
            scope: scopes
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return resp.data.access_token;
}

// 上传文件到 APS OSS（简化版，适合小文件）
async function uploadObject(bucketKey, objectName, filePath, token) {
    const url = `${APS_BASE_URL}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectName)}`;
    const fileStream = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);
    const resp = await axios.put(url, fileStream, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': stat.size
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });
    return resp.data;
}

// 发起模型转换
async function translate(urn, token) {
    const url = `${APS_BASE_URL}/modelderivative/v2/designdata/job`;
    const payload = {
        input: { urn },
        output: {
            formats: [
                { type: 'svf', views: ['2d', '3d'] }
            ]
        }
    };
    const resp = await axios.post(url, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return resp.data;
}

// 查询转换状态
async function getManifest(urn, token) {
    const url = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`;
    const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
}

module.exports = {
    getApsToken,
    uploadObject,
    translate,
    getManifest
}; 