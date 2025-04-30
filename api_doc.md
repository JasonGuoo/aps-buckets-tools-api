# APS Buckets Tools API Documentation

## Overview
This API provides an end-to-end workflow for DWG file processing: upload → APS conversion → extract properties/layers/images/text → package as ZIP → download. All job status and results can be queried and downloaded by job ID.

---

## Authentication
No authentication is required for API calls, but APS credentials must be configured on the server side via environment variables (see `env.example`).

---

## Endpoints

### 1. Create Job & Upload DWG
- **POST /api/job**
- **Request:** `multipart/form-data`, field: `file` (DWG file)
- **Response:**
```json
{
  "success": true,
  "job_id": 123
}
```
- **Error Example:**
```json
{
  "success": false,
  "error_code": "NO_FILE",
  "message": "No file uploaded."
}
```

### 2. Query Job Status
- **GET /api/job/:id**
- **Response:**
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
- **Status values:** pending, uploading, uploaded, preparing, uploading_aps, converting, converted, parsing, parsed, zipping, finished, error

### 3. Download Result ZIP
- **GET /api/job/:id/download**
- **Response:** ZIP file stream (if finished)
- **Error Example:**
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Result not found."
}
```

---

## Error Response Format
All errors return a JSON object:
```json
{
  "success": false,
  "error_code": "ERR_TYPE",
  "message": "Detailed error message.",
  "job_id": 123 // if applicable
}
```

---

## Usage Flow Example
1. **Upload a DWG file:**
   - `POST /api/job` with `file` field.
   - Receive `job_id`.
2. **Query job status:**
   - `GET /api/job/{job_id}`
   - Poll until `status` is `finished` or `error`.
3. **Download result ZIP:**
   - `GET /api/job/{job_id}/download`
   - The ZIP contains: original DWG, extracted properties (JSON), hierarchy, thumbnail, all text, etc.

---

## Notes
- APS credentials are managed by the server, not required from the client.
- All intermediate and result files are stored on the server, not on Autodesk cloud.
- For large files, processing may take several minutes.
- All job progress and errors can be tracked via the status API.

---

For the Chinese version, see [API 文档（中文版）](./api_doc_zh.md) 