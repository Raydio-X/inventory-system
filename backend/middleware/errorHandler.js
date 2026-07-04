/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 确定错误状态码
  const status = err.status || 500;

  // 构造错误响应
  const errorResponse = {
    success: false,
    error: {
      message: err.message || '服务器内部错误',
      status: status,
      timestamp: new Date().toISOString()
    }
  };

  // 开发环境下返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || null;
  }

  // 返回错误响应
  res.status(status).json(errorResponse);
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * 404错误
 */
class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 验证错误
 */
class ValidationError extends AppError {
  constructor(message = '数据验证失败', details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 权限错误
 */
class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止访问错误
 */
class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 冲突错误
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;
module.exports.NotFoundError = NotFoundError;
module.exports.ValidationError = ValidationError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.ConflictError = ConflictError;