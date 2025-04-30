/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Autodesk Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

'use strict';

// 首先加载 .env 文件到环境变量
try {
  const dotenvPath = require('path').resolve(__dirname, '.env');
  require('dotenv').config({ path: dotenvPath });
  console.log('【dotenv】已加载 .env 文件');
} catch (err) {
  console.warn(`【dotenv】加载 .env 文件失败: ${err.message}`);
  // 尝试无路径加载
  try {
    require('dotenv').config();
    console.log('【dotenv】已加载默认位置的 .env 文件');
  } catch (err2) {
    console.warn(`【dotenv】默认加载也失败: ${err2.message}`);
  }
}

var app = require('./server/server');
const config = require('./server/config');
const fs = require('fs');
const path = require('path');

let logger;
try {
  logger = require('./api/logger');
} catch (e) {
  logger = console;
}

// 检测各种可能的 .env 文件位置
const rootPath = __dirname;
const possibleEnvPaths = [
  path.join(rootPath, '.env'),
  path.join(rootPath, '.env.local'),
  path.join(rootPath, '.env.development'),
  path.join(rootPath, '.env.production'),
  path.join(rootPath, 'server', '.env')
];

let envFound = [];
let envContents = {};

// 检查每个可能的 .env 文件，读取并打印内容
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    envFound.push(envPath);
    try {
      // 读取 .env 文件内容
      const content = fs.readFileSync(envPath, 'utf8');
      envContents[envPath] = content;

      // 打印文件内容（可能的敏感信息用星号遮盖）
      const maskedContent = content.replace(/(APS_CLIENT_SECRET=)[^\n]+/g, '$1********');
      console.log(`\n【ENV文件内容】${envPath}:\n${maskedContent}`);
    } catch (err) {
      console.error(`【无法读取ENV文件】${envPath}: ${err.message}`);
    }
  }
}

// 检测环境变量
const hasEnvVars = !!(process.env.APS_CLIENT_ID && process.env.APS_CLIENT_SECRET);

// 输出环境变量的值（敏感信息用星号遮盖）
console.log('\n【环境变量值】');
console.log(`APS_CLIENT_ID=${process.env.APS_CLIENT_ID || '未设置'}`);
console.log(`APS_CLIENT_SECRET=${process.env.APS_CLIENT_SECRET ? '********' : '未设置'}`);

// 检测 config.js 配置
let configSource = '未知';
if (hasEnvVars) {
  configSource = '环境变量（process.env）';
} else if (
  config.credentials.client_id &&
  config.credentials.client_secret &&
  !config.credentials.client_id.startsWith('<replace') &&
  !config.credentials.client_secret.startsWith('<replace')
) {
  configSource = 'config.js 文件硬编码值';
}

const hasCred = !!(config.credentials.client_id && config.credentials.client_secret &&
  !config.credentials.client_id.startsWith('<replace') &&
  !config.credentials.client_secret.startsWith('<replace'));

// 输出 config.js 中的值（敏感信息用星号遮盖）
console.log('\n【config.js 配置值】');
console.log(`client_id=${config.credentials.client_id}`);
console.log(`client_secret=${config.credentials.client_secret.startsWith('<replace') ? config.credentials.client_secret : '********'}`);

// 生成详细的检测报告
const envFilesMsg = envFound.length > 0
  ? `发现 .env 文件：${envFound.join(', ')}`
  : `未发现 .env 文件，已检测位置：${possibleEnvPaths.join(', ')}`;

const envVarsMsg = hasEnvVars
  ? '从环境变量中检测到 APS_CLIENT_ID 和 APS_CLIENT_SECRET'
  : '环境变量中未设置 APS_CLIENT_ID 和 APS_CLIENT_SECRET';

const configMsg = hasCred
  ? `APS 凭证配置来源：${configSource}`
  : 'config.js 中未找到有效的 APS 凭证';

// 输出到控制台和日志
if (hasCred) {
  const message = `【启动检测】检测到 APS_CLIENT_ID 和 APS_CLIENT_SECRET，已配置。
  - ${envFilesMsg}
  - ${envVarsMsg}
  - ${configMsg}`;

  logger.info(message);
  // 确保终端也能看到
  console.log(message);
} else {
  const message = `【启动检测】未检测到 APS_CLIENT_ID 或 APS_CLIENT_SECRET，未配置。
  - ${envFilesMsg}
  - ${envVarsMsg}
  - ${configMsg}
  - 请检查 .env 文件或系统环境变量，并确保 APS_CLIENT_ID 和 APS_CLIENT_SECRET 已正确设置`;

  logger.warn(message);
  // 确保终端也能看到
  console.warn(message);
}

// start server
var server = app.listen(app.get('port'), function () {
  console.log('Starting at ' + (new Date()).toString());
  console.log('Server listening on port ' + server.address().port);
});