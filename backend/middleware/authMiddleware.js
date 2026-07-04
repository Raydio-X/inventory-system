/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errorHandler');

/**
 * JWT认证中间件
 */
const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未提供认证令牌');
    }
    
    const token = authHeader.substring(7); // 去掉 'Bearer '
    
    // 验证token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // 将用户信息附加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('无效的认证令牌'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('认证令牌已过期'));
    } else {
      next(error);
    }
  }
};

/**
 * 可选认证中间件（不强制要求认证）
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      );
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // 认证失败时不报错，继续执行
    next();
  }
};

/**
 * 权限检查中间件
 */
const checkPermission = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      next(new UnauthorizedError('未授权访问'));
      return;
    }
    
    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      next(new UnauthorizedError('权限不足'));
      return;
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  checkPermission
};