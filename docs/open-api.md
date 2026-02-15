# Ink 开放 API 文档

> Base URL: `https://ink.starapp.net`

---

## 认证

所有开放 API 请求需在 Header 中携带 API Key：

```
Authorization: Bearer ink_your_api_key_here
```

API Key 在「设置 → API Key 管理」中创建，每用户最多 5 个。密钥仅在创建时展示一次，请妥善保存。

---

## 接口列表

### 1. 上传图片

上传封面图或文章配图到 OSS。

```
POST https://ink.starapp.net/api/open/upload
Content-Type: multipart/form-data
Authorization: Bearer ink_xxx
```

**请求参数（form-data）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件，最大 10MB |

**支持格式：** image/jpeg, image/png, image/webp, image/gif

**响应示例：**

```json
{
  "key": "covers/123/1708012345678.png"
}
```

返回的 `key` 用于创建文章时的 `coverKey` 字段。

---

### 2. 创建文章

发布一篇文章到 Ink 平台。

```
POST https://ink.starapp.net/api/open/articles
Content-Type: application/json
Authorization: Bearer ink_xxx
```

**请求参数（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 文章标题（1-200 字符） |
| htmlContent | string | 是 | HTML 正文（最大 2MB） |
| content | string | 否 | Markdown 正文（最大 500KB） |
| coverKey | string | 否 | 封面图 OSS Key（来自上传接口） |
| authorName | string | 否 | 作者名（最大 50 字符，默认使用账户昵称） |
| category | string | 否 | 分类（最大 50 字符） |
| summary | string | 否 | 摘要（最大 500 字符，不传则自动生成） |
| slug | string | 否 | 自定义 URL 别名（不传则自动生成） |
| autoPublish | boolean | 否 | 是否自动发布（默认 true） |

**请求头（可选）：**

| Header | 值 | 说明 |
|--------|------|------|
| X-Force-Create | true | 跳过标题去重检查 |

**响应示例（201）：**

```json
{
  "id": 42,
  "slug": "ai-agent-技术趋势-aB3x",
  "url": "https://ink.starapp.net/zh/knowledge/ai-agent-技术趋势-aB3x"
}
```

**去重规则：** 标题与近 30 天已有文章 Levenshtein 相似度 >80% 时返回 409。可通过 `X-Force-Create: true` 跳过。

---

### 3. 查询文章列表

分页查询当前 API Key 用户的文章。

```
GET https://ink.starapp.net/api/open/articles?page=1&limit=20
Authorization: Bearer ink_xxx
```

**查询参数：**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量（1-50） |

**响应示例：**

```json
{
  "articles": [
    {
      "id": 42,
      "title": "AI Agent 技术趋势",
      "slug": "ai-agent-技术趋势-aB3x",
      "status": "completed",
      "isPublished": true,
      "publishedAt": "2026-02-15T09:00:00.000Z",
      "category": "技术",
      "authorName": "Ink 编辑部",
      "viewCount": 128,
      "createdAt": "2026-02-15T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 4. 查询文章详情

```
GET https://ink.starapp.net/api/open/articles/{id}
Authorization: Bearer ink_xxx
```

---

### 5. 删除文章

```
DELETE https://ink.starapp.net/api/open/articles/{id}
Authorization: Bearer ink_xxx
```

仅可删除当前 API Key 用户的文章。

**响应示例：**

```json
{ "success": true }
```

---

## 典型发布流程

两步 HTTP 调用：先上传封面图，再创建文章。

```bash
# Step 1: 上传封面图
COVER=$(curl -s -X POST https://ink.starapp.net/api/open/upload \
  -H "Authorization: Bearer ink_xxx" \
  -F "file=@cover.png" | jq -r '.key')

# Step 2: 创建文章
curl -s -X POST https://ink.starapp.net/api/open/articles \
  -H "Authorization: Bearer ink_xxx" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"AI Agent 技术趋势\",
    \"htmlContent\": \"<h1>AI Agent</h1><p>内容...</p>\",
    \"coverKey\": \"$COVER\",
    \"authorName\": \"张三\"
  }"
```

---

## 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 请求参数错误（缺少必填字段、文件类型不支持、文件过大） |
| 401 | 未提供 API Key 或 Key 无效/已停用 |
| 404 | 文章不存在 |
| 409 | 标题重复（可用 X-Force-Create 跳过） |
| 500 | 服务器内部错误 |
