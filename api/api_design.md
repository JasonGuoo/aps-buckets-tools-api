# Job API 设计文档

## 目标
为外部系统提供一键式 DWG 文件处理服务：上传 DWG → APS 转换 → 解析属性/图层/图片/文字 → 打包 ZIP → 本地保存 → 下载。支持任务状态跟踪和结果下载。

---

## 目录结构

```
server/
  api/
    api_design.md      # 本设计文档
    job.api.js         # Job 相关 API（后续实现）
    db.js              # SQLite 数据库初始化与管理
    ...                # 其他功能模块单独文件
  jobs/                # 生成的 zip 文件存放目录
  job.db               # SQLite 数据库文件
  logs/                # 日志文件目录（建议）
```

---

## 配置与安全规则

- **APS client_id 和 client_secret** 必须通过环境变量或配置文件统一管理，所有 API 内部自动获取，调用者无需传递此类敏感信息。
- 推荐在 `.env` 文件或 `server/config.js` 中配置，并通过 `process.env` 读取。
- 禁止在 API 请求参数中传递 client_id、client_secret。

---

## API 文件拆分原则

- 每个主要功能（如 job、数据库、日志、APS 调用等）应单独拆分为独立文件，便于维护和扩展。
- 例如：
  - `job.api.js`：Job 相关 API 路由
  - `db.js`：SQLite 数据库初始化与操作
  - `logger.js`：日志功能（可选）
  - `aps.js`：APS 相关 API 封装（可选）

---

## API 路由设计

### 1. 创建 Job 并上传 DWG
- **POST /api/job**
- 请求：multipart/form-data，字段：file (DWG 文件)
- 返回：{ job_id }

### 2. 查询 Job 状态
- **GET /api/job/:id**
- 返回：{ job_id, status, progress, error_msg, created_at, updated_at, ... }

### 3. 下载结果 ZIP
- **GET /api/job/:id/download**
- 返回：zip 文件流（若已完成）

---

## Job 流程说明

### 主要调用的 @server 目录下 API 及数据流

1. **上传 DWG**
   - 直接在 job.api.js 处理文件上传，保存到本地（如 jobs/uploaded/）。
   - 在 SQLite job 表插入新记录，status=pending → uploading → uploaded。

2. **APS 转换**
   - 调用 `model.derivative.js` 提供的 APS Model Derivative API：
     - `/md/export`：发起 DWG 转 SVF 等格式的转换任务。
     - `/md/manifests/:urn`：轮询转换状态。
   - 转换完成后，status=converting → converted。
   - APS 返回的转换结果不会自动保存到本地，需要后续解析和下载。

3. **数据提取**
   - 调用 `model.derivative.js` 提供的 APS API：
     - `/md/properties`：获取 DWG 的所有属性（properties），保存为 JSON。
     - `/md/hierarchy`：获取模型层次结构。
     - `/md/download`：下载高分辨率图片（如图层快照等，需根据 APS 支持情况）。
   - 解析 DWG 内所有文字内容（可通过 properties 或 APS 相关接口获取）。
   - 所有解析结果（JSON、图片、文本等）均保存到 jobs/{job_id}/ 目录。
   - status=parsing → parsed。

4. **打包 ZIP**
   - 使用 Node.js 的 archiver 等库，将 jobs/{job_id}/ 目录下所有内容打包为 zip。
   - zip 文件保存到 jobs/{job_id}.zip。
   - status=zipping → finished。
   - 在 job 表中更新 zip_path 字段。

5. **错误处理**
   - 任一步骤失败，status=error，记录 error_msg。

---

## SQLite Job 表结构

| 字段       | 类型     | 说明              |
| ---------- | -------- | ----------------- |
| id         | INTEGER  | 主键，自增        |
| filename   | TEXT     | 原始文件名        |
| status     | TEXT     | 当前状态          |
| progress   | INTEGER  | 进度百分比        |
| created_at | DATETIME | 创建时间          |
| updated_at | DATETIME | 更新时间          |
| zip_path   | TEXT     | 结果 zip 文件路径 |
| error_msg  | TEXT     | 错误信息          |

- status 取值：pending, uploading, uploaded, converting, converted, parsing, parsed, zipping, finished, error

---

## 设计亮点
- **异步任务**：任务提交后立即返回 job_id，后续可查询进度。
- **本地存储**：所有中间文件和结果 zip 均保存在本地服务器。
- **可扩展性**：后续可扩展更多文件类型、更多数据提取能力。
- **安全性**：可结合认证、权限、限流等机制。

---

## 数据更新与结果保存说明

- **每一步操作后，都会更新 SQLite job 表的 status、progress、updated_at 字段。**
- **所有中间数据（如属性 JSON、图片、文字等）和最终 zip 文件，均保存在 jobs/ 目录下，zip_path 字段记录最终包路径。**
- **job 状态流转清晰，便于外部系统轮询和下载。**

---

## Logging 设计

- **日志内容**：
  - 每个 Job 的关键步骤（上传、转换、解析、打包、下载、失败等）均需记录日志。
  - 记录内容包括：时间戳、job_id、操作类型、状态、详细信息、错误堆栈（如有）。
- **日志方式**：
  - 推荐使用如 winston、pino 等日志库，支持按天/大小分割日志文件。
  - 日志文件建议存放于 `server/logs/` 目录，便于运维和问题追踪。
  - 关键日志可同步写入 SQLite job 表的 error_msg 字段。
- **日志级别**：
  - info：正常流程日志
  - warn：可恢复异常
  - error：致命错误及异常堆栈

---

## 错误处理设计

- **错误分类**：
  - 用户输入错误（如文件格式不符、参数缺失）
  - APS API 错误（如 token 失效、转换失败、网络异常）
  - 服务器内部错误（如磁盘空间不足、数据库异常、打包失败等）

- **API 错误响应规范**：
  - 统一返回 JSON 格式：
    ```json
    {
      "success": false,
      "error_code": "ERR_TYPE",
      "message": "详细错误描述",
      "job_id": "..." // 如适用
    }
    ```
  - 对于已知错误，返回明确的 error_code 和 message。
  - 对于未知异常，记录详细日志，返回通用错误提示。

- **错误追踪与恢复**：
  - 每当发生错误，需：
    - 记录详细日志（含堆栈）
    - 更新 job 表 status=error，error_msg=详细信息
    - 返回标准错误响应
  - 支持后续人工或自动重试机制（可扩展）


---

## 分步实现详细说明

### 第一步：初始化 jobs/、logs/ 目录
- 在项目根目录下创建 jobs/ 和 logs/ 文件夹，分别用于存放生成的 zip 文件和日志文件。

### 第二步：初始化 SQLite 数据库及 Job 表结构
- 已在 `api/db.js` 中实现数据库初始化逻辑。
- 只要有模块 `require('./db.js')`，项目启动时会自动检查并创建数据库和 job 表。
- job 表结构已按设计文档要求实现。
- 后续所有数据库操作均通过 `getDb()` 工厂函数获取连接。

### 第三步：创建 job.api.js 文件骨架，配置 API 路由
- 新建 `api/job.api.js`，定义 Express 路由骨架。
- 配置 `/api/job`、`/api/job/:id`、`/api/job/:id/download` 等基础路由。

### 第四步：按功能拆分更多 API 文件（如 db.js、logger.js、aps.js 等）
- 新建 `api/db.js`、`api/aps.js`、`api/aps_extract.js` 等，分别负责数据库、APS API 封装、数据提取等。
- 保持各功能模块解耦，便于维护和扩展。

### 第五步：实现 Job 创建与 DWG 文件上传（POST /api/job）
- 上传目录固定为 `server/jobs/uploaded`，所有 DWG 文件保存于此。
- 文件命名格式为 `job_{jobid}.dwg`，确保唯一性。
- 支持 multipart/form-data 上传，字段名为 `file`。
- 成功后返回 `{ success: true, job_id }`，并在数据库中建立 job 记录，状态自动流转 uploading → uploaded。
- 错误时返回标准 JSON 错误响应。

### 第六步：实现 Job 状态查询（GET /api/job/:id）
- 支持通过 job_id 查询任务详细状态。
- 返回内容包括：job_id、文件名、状态、进度、创建/更新时间、zip 路径、错误信息等。
- 未找到时返回 404，数据库异常时返回 500。

### 第七步：实现 APS 转换任务发起与状态轮询
- 上传后自动异步获取 APS token，上传 DWG 到 APS OSS，发起模型转换。
- 轮询 APS 转换状态，实时更新 job 状态和进度。
- 转换成功或失败都会写入数据库。

### 第八步：实现属性、图层、图片、文字等数据提取
- APS 转换成功后，自动调用 APS API 获取属性、层次结构、缩略图、文字等。
- 解析结果保存为 JSON、图片、文本等文件，放在 jobs/job_{jobid}/ 目录。
- 更新 job 状态为 parsing/parsed，进度提升。

### 第九步：实现本地打包 ZIP 并保存
- 解析完成后，自动将 jobs/job_{jobid}/ 目录和 DWG 文件打包为 zip，保存为 jobs/job_{jobid}.zip。
- 更新数据库 zip_path 和状态。

### 第十步：实现 Job 结果下载（GET /api/job/:id/download）
- 支持下载 jobs/job_{jobid}.zip 文件。
- 若 zip 文件不存在，返回 404。

### 第十一步：集成 logging 日志记录
- 使用 winston 日志库，日志文件按天分割，输出到 server/logs/ 目录。
- 日志内容包括：时间戳、job_id、操作类型、状态、详细信息、错误堆栈等。
- 日志级别分 info、warn、error。
- 在 job.api.js 的关键流程、catch、错误分支等处调用 logger 记录日志。

### 第十二步：完善错误处理与 API 错误响应
- 所有 API 路由均包裹 try/catch，捕获同步和异步异常。
- 所有错误响应均返回统一的 JSON 格式（success, error_code, message）。
- 关键错误和异常均写入日志，便于追踪和排查。
- 下载接口也增加了下载失败的日志记录。

---

## 分步实现 Tracker

- [x] 1. 初始化 jobs/、logs/ 目录
- [x] 2. 初始化 SQLite 数据库及 Job 表结构
- [x] 3. 创建 job.api.js 文件骨架，配置 API 路由
- [x] 4. 按功能拆分更多 API 文件（如 db.js、logger.js、aps.js 等）
- [x] 5. 实现 Job 创建与 DWG 文件上传（POST /api/job）
- [x] 6. 实现 Job 状态查询（GET /api/job/:id）
- [x] 7. 实现 APS 转换任务发起与状态轮询（集成 /md/export, /md/manifests/:urn）
- [x] 8. 实现属性、图层、图片、文字等数据提取（集成 /md/properties, /md/hierarchy, /md/download）
- [x] 9. 实现本地打包 ZIP 并保存
- [x] 10. 实现 Job 结果下载（GET /api/job/:id/download）
- [x] 11. 集成 logging 日志记录
- [x] 12. 完善错误处理与 API 错误响应
- [ ] 13. 编写/完善 API 文档与使用说明
- [ ] 14. 代码测试与优化
