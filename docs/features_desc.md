# APS Buckets Tools API 功能说明文档

## 目录结构
- `server.js`: 主服务器文件
- `oauth.js`: OAuth 认证相关功能
- `data.management.js`: 数据管理相关功能
- `model.derivative.js`: 模型转换相关功能
- `config.js`: 配置文件

## 文件功能说明

### 1. server.js
**功能概述**: 主服务器文件，负责设置 Express 服务器和路由配置。

**主要功能**:
- 设置 Express 服务器
- 配置静态文件路由
- 配置会话管理
- 设置 API 路由
  - `/oauth`: OAuth 认证相关
  - `/dm`: 数据管理相关
  - `/md`: 模型转换相关

**使用方法**:
- 默认端口: 3000
- 静态文件目录: `/www`
- 依赖管理: 使用 npm 包管理器

### 2. oauth.js
**功能概述**: 处理 OAuth 2.0 认证流程。

**主要功能**:
- 用户登出 (`/user/logoff`)
- 获取访问令牌 (`/user/token`)
  - 支持 client_id 和 client_secret 认证
  - 支持自定义权限范围 (scopes)

**使用方法**:
```javascript
// 获取访问令牌
POST /user/token
{
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "scopes": "data:read data:write"
}

// 用户登出
GET /user/logoff
```

### 3. data.management.js
**功能概述**: 提供数据管理相关的 API 功能。

**主要功能**:
- 存储桶管理
  - 创建存储桶 (`/buckets`)
  - 删除存储桶 (`/buckets/:id`)
- 文件管理
  - 删除文件 (`/files/:id`)
  - 获取文件公共 URL (`/files/:id/publicurl`)
  - 获取下载 URL (`/downloadurl`)
  - 获取上传 URL (`/uploadurls`)
  - 完成上传 (`/uploadurls` POST)
- 树形结构管理
  - 获取树节点信息 (`/treeNode`)

**使用方法**:
```javascript
// 创建存储桶
POST /dm/buckets
{
    "bucketName": "your_bucket_name",
    "bucketType": "transient",
    "region": "US"
}

// 获取文件树
GET /dm/treeNode?region=US&id=#
```

### 4. model.derivative.js
**功能概述**: 处理模型转换和查看相关功能。

**主要功能**:
- 获取支持的导出格式 (`/formats`)
- 获取模型清单 (`/manifests/:urn`)
- 删除模型清单 (`/manifests/:urn`)
- 获取模型元数据 (`/metadatas/:urn`)
- 获取模型层次结构 (`/hierarchy`)
- 获取模型属性 (`/properties`)
- 下载转换后的文件 (`/download`)
- 导出模型 (`/export`)

**使用方法**:
```javascript
// 获取支持的格式
GET /md/formats

// 导出模型
POST /md/export
{
    "format": "svf",
    "urn": "your_model_urn",
    "region": "US",
    "fileExtType": "rvt",
    "rootFileName": "model.rvt",
    "advanced": {
        "2dviews": "pdf"
    }
}
```

### 5. config.js
**功能概述**: 应用程序配置文件。

**主要配置项**:
- 客户端凭证
  - `client_id`: APS 客户端 ID
  - `client_secret`: APS 客户端密钥
- 权限范围
  - `scopeInternal`: 服务器端所需权限
  - `scopePublic`: 客户端所需权限
- 会话密钥
  - `sessionSecret`: 会话加密密钥

**使用方法**:
- 通过环境变量配置:
  - `APS_CLIENT_ID`
  - `APS_CLIENT_SECRET`
  - `SERVER_SESSION_SECRET`
- 或直接在配置文件中修改默认值

## 注意事项
1. 使用前需要配置正确的 APS 凭证
2. 确保服务器有足够的权限访问所需的 API
3. 文件上传和下载操作需要注意文件大小限制
4. 模型转换可能需要较长时间，建议使用异步处理
5. 建议在生产环境中使用环境变量来存储敏感信息
