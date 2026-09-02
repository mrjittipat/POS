import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { verifyRefreshToken } from '../utils/jwt.util';

/**
 * Auth Controller
 * จัดการ Authentication
 */

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    const result = await authService.login(username, password);

    if (!result) {
      res.status(401).json({
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
      return;
    }

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
    });
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response): Promise<void> {
  // In a more advanced system, you might blacklist the token
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ',
  });
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'กรุณาระบุ Refresh Token',
      });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const tokens = verifyRefreshToken(refreshToken);

    // Generate new tokens
    const { generateTokens } = await import('../utils/jwt.util');
    const newTokens = generateTokens({
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    });

    res.json({
      success: true,
      message: 'รีเฟรช Token สำเร็จ',
      data: newTokens,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ',
    });
  }
}

// PUT /api/auth/password
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    const success = await authService.changePassword(userId, oldPassword, newPassword);

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'รหัสผ่านเดิมไม่ถูกต้อง',
      });
      return;
    }

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
    });
  }
}

// PUT /api/auth/profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const { full_name, phone } = req.body;

    const user = await authService.updateProfile(req.user!.userId, full_name, phone);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
      return;
    }

    res.json({
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์',
    });
  }
}

// GET /api/auth/me
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
    });
  }
}
