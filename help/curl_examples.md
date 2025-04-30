# APS Buckets Tools API - cURL 命令示例

本文档提供调用 APS Buckets Tools API 的 cURL 命令示例，方便开发者进行测试和集成。

## 前提条件
- 确保 API 服务已启动并运行在 http://localhost:3000 (默认端口)
- 确保您的 `.env` 文件中已配置有效的 APS_CLIENT_ID 和 APS_CLIENT_SECRET

## API 示例

### 1. 创建任务并上传 DWG 文件

```bash
curl -X POST http://localhost:3000/api/job \
  -F "file=@/path/to/your/example.dwg" \
  -H "Content-Type: multipart/form-data"
```

**成功响应示例：**
```json
{
  "success": true,
  "job_id": 123
}
```

### 2. 查询任务状态

```bash
curl -X GET http://localhost:3000/api/job/123
```

**成功响应示例：**
```json
{
  "success": true,
  "job_id": 123,
  "filename": "example.dwg",
  "status": "converted",
  "progress": 60,
  "created_at": "2024-06-01 12:00:00",
  "updated_at": "2024-06-01 12:10:00",
  "zip_path": "...",
  "error_msg": null
}
```

### 3. 下载结果 ZIP

```bash
curl -X GET http://localhost:3000/api/job/123/download \
  -o result.zip
```

**这将下载 ZIP 文件并保存为 result.zip**

## 完整工作流程示例

以下是一个完整的工作流程脚本示例，演示了如何上传文件、轮询状态并下载结果：

```bash
#!/bin/bash

# 上传 DWG 文件
echo "上传 DWG 文件..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/job \
  -F "file=@/path/to/your/example.dwg" \
  -H "Content-Type: multipart/form-data")

# 解析 job_id
JOB_ID=$(echo $RESPONSE | grep -o '"job_id":[0-9]*' | grep -o '[0-9]*')
echo "任务创建成功，job_id: $JOB_ID"

# 轮询任务状态
echo "开始轮询任务状态..."
STATUS="uploading"
while [ "$STATUS" != "finished" ] && [ "$STATUS" != "error" ]; do
  sleep 5
  STATUS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/job/$JOB_ID)
  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | grep -o '[0-9]*')
  echo "当前状态: $STATUS, 进度: $PROGRESS%"
  
  # 如果出错则退出
  if [ "$STATUS" = "error" ]; then
    ERROR_MSG=$(echo $STATUS_RESPONSE | grep -o '"error_msg":"[^"]*"' | cut -d'"' -f4)
    echo "处理失败: $ERROR_MSG"
    exit 1
  fi
done

# 下载结果
if [ "$STATUS" = "finished" ]; then
  echo "任务完成，下载结果..."
  curl -X GET http://localhost:3000/api/job/$JOB_ID/download \
    -o result_$JOB_ID.zip
  echo "结果已下载为 result_$JOB_ID.zip"
fi
```

## 状态值参考
- **pending**: 等待处理
- **uploading**: 上传中
- **uploaded**: 上传完成
- **preparing**: 准备中
- **uploading_aps**: 上传到 APS 服务
- **converting**: APS 转换中
- **converted**: APS 转换完成
- **parsing**: 解析数据中
- **parsed**: 解析完成
- **zipping**: 打包中
- **finished**: 完成
- **error**: 处理出错

## 常见错误码
- **NO_FILE**: 未上传文件
- **DB_ERROR**: 数据库错误
- **SAVE_ERROR**: 文件保存错误
- **NOT_FOUND**: 资源未找到
- **INTERNAL_ERROR**: 内部服务器错误 