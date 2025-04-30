// aps_extract.js - APS 属性/层次/图片/文字提取与本地保存
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const APS_BASE_URL = 'https://developer.api.autodesk.com';

// 提取 APS 属性、层次结构、图片、文字等，保存到本地
async function extractAll({ urn, token, jobId, outDir }) {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    // 1. 获取属性
    const properties = await getProperties(urn, token);
    fs.writeFileSync(path.join(outDir, 'properties.json'), JSON.stringify(properties, null, 2));
    // 2. 获取层次结构
    const hierarchy = await getHierarchy(urn, token);
    fs.writeFileSync(path.join(outDir, 'hierarchy.json'), JSON.stringify(hierarchy, null, 2));
    // 3. 获取缩略图（如可用）
    const thumbnail = await getThumbnail(urn, token);
    if (thumbnail) {
        fs.writeFileSync(path.join(outDir, 'thumbnail.png'), thumbnail);
    }
    // 4. 提取文字内容（简单示例：遍历属性树，收集所有字符串属性）
    const textArr = [];
    if (properties && properties.data && properties.data.collection) {
        for (const item of properties.data.collection) {
            for (const key in item) {
                if (typeof item[key] === 'string') {
                    textArr.push(item[key]);
                }
            }
        }
    }
    fs.writeFileSync(path.join(outDir, 'all_text.txt'), textArr.join('\n'));
}

async function getProperties(urn, token) {
    const url = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata`;
    const metaResp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const meta = metaResp.data;
    if (!meta.data || !meta.data.metadata || !meta.data.metadata[0]) return {};
    const guid = meta.data.metadata[0].guid;
    const propUrl = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${guid}`;
    const propResp = await axios.get(propUrl, { headers: { Authorization: `Bearer ${token}` } });
    return propResp.data;
}

async function getHierarchy(urn, token) {
    const url = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata`;
    const metaResp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const meta = metaResp.data;
    if (!meta.data || !meta.data.metadata || !meta.data.metadata[0]) return {};
    const guid = meta.data.metadata[0].guid;
    const hierUrl = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${guid}/properties`;
    const hierResp = await axios.get(hierUrl, { headers: { Authorization: `Bearer ${token}` } });
    return hierResp.data;
}

async function getThumbnail(urn, token) {
    const url = `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(urn)}/thumbnail?width=400&height=400`;
    try {
        const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' });
        return resp.data;
    } catch {
        return null;
    }
}

module.exports = {
    extractAll
}; 