# APS Buckets Tools API 接口文档

## 概述
本 API 提供 DWG 文件处理全流程：上传 → APS 转换 → 提取属性/图层/图片/文字 → 打包为 ZIP → 下载。所有任务状态和结果均可通过 job_id 查询和下载。

---

## 认证
API 调用无需认证，但 APS 凭证需在服务器端通过环境变量配置（见 `env.example`）。

---

## 接口列表

### 1. 创建任务并上传 DWG
- **POST /api/job**
- **请求：** `multipart/form-data`，字段：`file`（DWG 文件）
- **响应：**
```json
{
  "success": true,
  "job_id": 123
}
```
- **错误示例：**
```json
{
  "success": false,
  "error_code": "NO_FILE",
  "message": "No file uploaded."
}
```

### 2. 查询任务状态
- **GET /api/job/:id**
- **响应：**
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
- **状态值：** pending, uploading, uploaded, preparing, uploading_aps, converting, converted, parsing, parsed, zipping, finished, error

### 3. 下载结果 ZIP
- **GET /api/job/:id/download**
- **响应：** ZIP 文件流（若已完成）
- **错误示例：**
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Result not found."
}
```

---

## 错误响应格式
所有错误均返回如下 JSON 对象：
```json
{
  "success": false,
  "error_code": "ERR_TYPE",
  "message": "详细错误描述",
  "job_id": 123 // 如适用
}
```

---

## 使用流程示例
1. **上传 DWG 文件：**
   - `POST /api/job`，字段名为 `file`
   - 返回 `job_id`
2. **查询任务状态：**
   - `GET /api/job/{job_id}`
   - 轮询直到 `status` 为 `finished` 或 `error`
3. **下载结果 ZIP：**
   - `GET /api/job/{job_id}/download`
   - ZIP 包含：原始 DWG、提取的属性（JSON）、层次结构、缩略图、全部文字等

---

## 说明
- APS 凭证由服务器统一管理，客户端无需提供。
- 所有中间文件和结果文件均保存在服务器本地，不在 Autodesk 云端。
- 大文件处理可能需要几分钟。
- 任务进度和错误可通过状态接口实时追踪。 