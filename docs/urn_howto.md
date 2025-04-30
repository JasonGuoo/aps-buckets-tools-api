# URN (Uniform Resource Name) 使用指南

## 什么是 URN

URN (Uniform Resource Name) 是 Autodesk Platform Services (APS) 中用于唯一标识资源的标识符。在模型转换和查看过程中，URN 是连接不同 API 的关键。

## URN 的编码

在 APS API 中，URN 需要经过 Base64 编码才能使用。编码规则如下：

1. 原始 URN 格式：
```
urn:adsk.objects:os.object:BUCKET_KEY/OBJECT_NAME
```

2. Base64 编码后的格式：
```
dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6QlVDS0VUX0tFWS9PQkpFQ1RfTkFNRQ==
```

### 编码示例

原始 URN：
```
urn:adsk.objects:os.object:my-bucket/model.rvt
```

Base64 编码后的 URN：
```
dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==
```

## URN 的获取方式

### 1. 从文件上传获取

当文件上传到 APS 存储桶后，系统会返回一个 URN。这个 URN 的格式通常如下：

```
urn:adsk.objects:os.object:BUCKET_KEY/OBJECT_NAME
```

其中：
- `BUCKET_KEY`: 存储桶的唯一标识符
- `OBJECT_NAME`: 上传文件的名称

### 2. 从模型转换获取

当文件被成功转换后，系统会返回一个新的 URN，用于标识转换后的资源。这个 URN 的格式通常如下：

```
urn:adsk.objects:os.object:BUCKET_KEY/OBJECT_NAME
```

## URN 的使用方法

### 1. 获取模型清单

```javascript
GET /md/manifests/:urn
```

示例：
```javascript
// 原始 URN
urn:adsk.objects:os.object:my-bucket/model.rvt

// 编码后的 URN
dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==

// 请求
GET /md/manifests/dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==

// 响应
{
    "urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==",
    "derivatives": [
        {
            "name": "model.rvt",
            "hasThumbnail": true,
            "status": "success",
            "progress": "complete",
            "children": [
                {
                    "urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dC9zdmY=",
                    "role": "viewable",
                    "mime": "application/autodesk-svf",
                    "guid": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dC9zdmY="
                }
            ]
        }
    ]
}
```

### 2. 获取模型元数据

```javascript
GET /md/metadatas/:urn
```

示例：
```javascript
// 请求
GET /md/metadatas/dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==

// 响应
{
    "data": {
        "type": "metadata",
        "metadata": [
            {
                "name": "model.rvt",
                "guid": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA="
            }
        ]
    }
}
```

### 3. 获取模型层次结构

```javascript
GET /md/hierarchy?urn=:urn&guid=:guid
```

示例：
```javascript
// 请求
GET /md/hierarchy?urn=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==&guid=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA=

// 响应
{
    "data": {
        "type": "hierarchy",
        "hierarchy": [
            {
                "name": "Level 1",
                "objectid": 1,
                "children": [
                    {
                        "name": "Wall 1",
                        "objectid": 2
                    }
                ]
            }
        ]
    }
}
```

### 4. 获取模型属性

```javascript
GET /md/properties?urn=:urn&guid=:guid
```

示例：
```javascript
// 请求
GET /md/properties?urn=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==&guid=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA=

// 响应
{
    "data": {
        "type": "properties",
        "properties": [
            {
                "objectid": 1,
                "name": "Level 1",
                "properties": {
                    "Area": "1000 sq ft",
                    "Height": "10 ft"
                }
            }
        ]
    }
}
```

### 5. 下载转换后的文件

```javascript
GET /md/download?urn=:urn&derUrn=:derUrn&fileName=:fileName
```

示例：
```javascript
// 请求
GET /md/download?urn=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==&derUrn=dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dC9zdmY=&fileName=model.svf

// 响应
// 返回文件流
```

## 注意事项

1. URN 需要经过 Base64 编码才能在某些 API 中使用
2. 确保 URN 中的特殊字符被正确编码
3. 不同的文件类型可能需要不同的转换参数
4. 转换过程可能需要一定时间，建议使用异步处理
5. 建议在开发环境中使用测试文件进行 URN 相关功能的测试

## 常见问题

1. **URN 无效**
   - 检查 URN 格式是否正确
   - 确认文件是否已成功上传
   - 验证文件是否已完成转换

2. **转换失败**
   - 检查文件格式是否受支持
   - 确认文件是否完整
   - 查看转换日志获取详细信息

3. **访问权限**
   - 确保有正确的访问令牌
   - 验证权限范围是否包含所需操作
   - 检查存储桶权限设置

## 编码工具

你可以使用以下工具进行 URN 的编码和解码：

1. Node.js:
```javascript
// 编码
const encodedUrn = Buffer.from('urn:adsk.objects:os.object:my-bucket/model.rvt').toString('base64');

// 解码
const decodedUrn = Buffer.from('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA==', 'base64').toString();
```

2. Python:
```python
# 编码
import base64
encoded_urn = base64.b64encode('urn:adsk.objects:os.object:my-bucket/model.rvt'.encode()).decode()

# 解码
decoded_urn = base64.b64decode('dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bXktYnVja2V0L21vZGVsLnJ2dA=='.encode()).decode()
```
