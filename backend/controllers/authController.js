/**
 * 认证控制器
 */
const db = require('../config/database');
const { ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * 用户登录
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 数据验证
    if (!username || !password) {
      throw new ValidationError('用户名和密码不能为空');
    }

    // 查找用户
    const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const user = users[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      },
      message: '登录成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户注册
 */
const register = async (req, res, next) => {
  try {
    const { username, password, name } = req.body;

    // 数据验证
    if (!username || !password || !name) {
      throw new ValidationError('用户名、密码和姓名不能为空');
    }

    // 检查用户名是否已存在
    const existing = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      throw new ValidationError('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.query(
      'INSERT INTO users (username, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, 'user', new Date(), new Date()]
    );

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: result.insertId, username, role: 'user' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.insertId,
          username,
          name,
          role: 'user'
        }
      },
      message: '注册成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('未授权访问');
    }

    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      throw new UnauthorizedError('用户不存在');
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      throw new UnauthorizedError('未授权访问');
    }

    if (!oldPassword || !newPassword) {
      throw new ValidationError('旧密码和新密码不能为空');
    }

    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      throw new UnauthorizedError('用户不存在');
    }

    const user = users[0];

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new ValidationError('旧密码错误');
    }

    // 加密新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, new Date(), userId]
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getCurrentUser,
  changePassword
};
