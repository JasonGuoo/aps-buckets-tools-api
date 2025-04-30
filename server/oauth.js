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

'use strict'; // http://www.w3schools.com/js/js_strict.asp

// web framework
var express = require('express');
var router = express.Router();

var apsSDK = require('forge-apis');

// 添加日志
let logger;
try {
  logger = require('../api/logger');
} catch (e) {
  logger = console;
}

router.use(express.json());

// this end point will logoff the user by destroying the session
// as of now there is no endpoint to invalidate tokens
router.get('/user/logoff', function (req, res) {
  req.session.destroy();
  res.end('/');
});

router.post('/user/token', function (req, res) {
  logger.info('【认证】/user/token 接口被调用');

  try {
    var client_id = req.body.client_id;
    var client_secret = req.body.client_secret;
    var scopes = req.body.scopes;

    // 检查参数
    logger.info(`【认证】参数: client_id=${client_id ? (client_id === '********' ? '掩码值' : '有值') : '无值'}, scopes=${scopes || '无值'}`);

    // 如果前端传递的是掩码值（即从 .env 加载的配置），使用 .env 的实际值
    if (client_id === '********') {
      logger.info('【认证】使用 .env 文件配置的 APS 凭证');
      client_id = process.env.APS_CLIENT_ID;
      client_secret = process.env.APS_CLIENT_SECRET;
    }

    if (!client_id || !client_secret) {
      logger.error('【认证】缺少 client_id 或 client_secret');
      return res.status(400).json({ error: '缺少 client_id 或 client_secret' });
    }

    scopes = scopes.split(' ');

    var req2 = new apsSDK.AuthClientTwoLeggedV2(client_id, client_secret, scopes);
    logger.info('【认证】尝试获取 APS 令牌');

    req2.authenticate()
      .then(function (credentials) {
        req.session.access_token = credentials.access_token;
        logger.info('【认证】成功获取 APS 令牌');
        console.log('Token: ' + credentials.access_token);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({ token: credentials.access_token, expires_in: credentials.expires_in });
      })
      .catch(function (error) {
        logger.error(`【认证】APS 身份验证失败: ${error.statusCode} - ${error.message}`);
        logger.error(error);
        res.status(500).end(error.developerMessage || error.message);
      });
  } catch (err) {
    logger.error(`【认证】异常错误: ${err.message}`);
    logger.error(err);
    res.status(500).end(err.message || 'Internal Server Error');
  }
});

module.exports = router;