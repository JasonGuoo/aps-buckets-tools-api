# APS Buckets Tools API - cURL Examples

This document provides cURL command examples for testing and integrating with APS Buckets Tools API.

## Prerequisites
- Ensure the API service is running on http://localhost:3000 (default port)
- Make sure your `.env` file has valid APS_CLIENT_ID and APS_CLIENT_SECRET

## API Examples

### 1. Create Job and Upload DWG File

```bash
curl -X POST http://localhost:3000/api/job \
  -F "file=@/path/to/your/example.dwg" \
  -H "Content-Type: multipart/form-data"
```

**Success Response Example:**
```json
{
  "success": true,
  "job_id": 123
}
```

### 2. Check Job Status

```bash
curl -X GET http://localhost:3000/api/job/123
```

**Success Response Example:**
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

### 3. Download Result ZIP

```bash
curl -X GET http://localhost:3000/api/job/123/download \
  -o result.zip
```

**This will download the ZIP file and save it as result.zip**

## Complete Workflow Example

Below is a complete workflow script example demonstrating how to upload a file, poll status, and download the result:

```bash
#!/bin/bash

# Upload DWG file
echo "Uploading DWG file..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/job \
  -F "file=@/path/to/your/example.dwg" \
  -H "Content-Type: multipart/form-data")

# Parse job_id
JOB_ID=$(echo $RESPONSE | grep -o '"job_id":[0-9]*' | grep -o '[0-9]*')
echo "Job created successfully, job_id: $JOB_ID"

# Poll job status
echo "Starting to poll job status..."
STATUS="uploading"
while [ "$STATUS" != "finished" ] && [ "$STATUS" != "error" ]; do
  sleep 5
  STATUS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/job/$JOB_ID)
  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | grep -o '[0-9]*')
  echo "Current status: $STATUS, progress: $PROGRESS%"
  
  # Exit if error
  if [ "$STATUS" = "error" ]; then
    ERROR_MSG=$(echo $STATUS_RESPONSE | grep -o '"error_msg":"[^"]*"' | cut -d'"' -f4)
    echo "Processing failed: $ERROR_MSG"
    exit 1
  fi
done

# Download result
if [ "$STATUS" = "finished" ]; then
  echo "Job completed, downloading result..."
  curl -X GET http://localhost:3000/api/job/$JOB_ID/download \
    -o result_$JOB_ID.zip
  echo "Result downloaded as result_$JOB_ID.zip"
fi
```

## Status Values Reference
- **pending**: Waiting for processing
- **uploading**: Uploading
- **uploaded**: Upload completed
- **preparing**: Preparing
- **uploading_aps**: Uploading to APS service
- **converting**: APS conversion in progress
- **converted**: APS conversion completed
- **parsing**: Parsing data
- **parsed**: Parsing completed
- **zipping**: Packaging
- **finished**: Completed
- **error**: Processing error

## Common Error Codes
- **NO_FILE**: No file uploaded
- **DB_ERROR**: Database error
- **SAVE_ERROR**: File saving error
- **NOT_FOUND**: Resource not found
- **INTERNAL_ERROR**: Internal server error 