/**
 * HTTP状态码常量
 */
module.exports = {
  // 2xx 成功
  OK: 200, // 请求成功
  CREATED: 201, // 资源创建成功
  ACCEPTED: 202, // 请求已接受，但尚未处理完成
  NO_CONTENT: 204, // 请求成功，但无内容返回

  // 3xx 重定向
  MOVED_PERMANENTLY: 301, // 资源已永久移动到新位置
  FOUND: 302, // 资源临时移动到新位置
  NOT_MODIFIED: 304, // 资源未修改，使用缓存版本

  // 4xx 客户端错误
  BAD_REQUEST: 400, // 请求格式错误
  UNAUTHORIZED: 401, // 未授权，需要认证
  FORBIDDEN: 403, // 已认证，但无权限访问
  NOT_FOUND: 404, // 资源未找到
  METHOD_NOT_ALLOWED: 405, // 不支持的HTTP方法
  CONFLICT: 409, // 请求冲突（如资源已存在）
  GONE: 410, // 资源已永久删除
  UNPROCESSABLE_ENTITY: 422, // 语义错误，无法处理
  TOO_MANY_REQUESTS: 429, // 请求过于频繁

  // 5xx 服务器错误
  INTERNAL_SERVER_ERROR: 500, // 服务器内部错误
  NOT_IMPLEMENTED: 501, // 服务器不支持请求的功能
  BAD_GATEWAY: 502, // 网关错误
  SERVICE_UNAVAILABLE: 503, // 服务暂时不可用
  GATEWAY_TIMEOUT: 504, // 网关超时
};
