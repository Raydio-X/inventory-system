/**
 * 请求日志中间件（静默模式）
 */
const requestLogger = (req, res, next) => {
  next();
};

module.exports = requestLogger;