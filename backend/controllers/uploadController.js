/**
 * 图片上传控制器
 */
const path = require('path');
const fs = require('fs');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

/**
 * 上传商品图片
 */
const uploadProductImage = (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('请选择要上传的图片');
    }

    // 返回图片URL
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: '图片上传成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除图片
 */
const deleteImage = (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('图片文件不存在');
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadProductImage,
  deleteImage
};