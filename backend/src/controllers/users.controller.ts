import { Request, Response } from 'express';
import * as usersService from '../services/users.service';

/**
 * Users Controller
 * จัดการข้อมูลผู้ใช้งาน
 */

// GET /api/users
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    // manager มองเห็นได้เฉพาะพนักงานขาย
    const role = req.user!.role === 'manager' ? 'cashier' : undefined;

    const { users, total } = await usersService.getUsers(page, limit, role);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/users
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, full_name, role, phone } = req.body;
    // manager สร้างได้เฉพาะพนักงานขาย
    const finalRole = req.user!.role === 'manager' ? 'cashier' : role;

    const id = await usersService.createUser({
      username,
      password,
      full_name,
      role: finalRole,
      phone,
    });

    res.status(201).json({
      success: true,
      message: 'สร้างผู้ใช้งานสำเร็จ',
      data: { id },
    });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    const err = error as { code?: string };
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
      return;
    }
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PUT /api/users/:id
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { full_name, role, phone, is_active } = req.body;

    const actorIsManager = req.user!.role === 'manager';
    const success = await usersService.updateUser(
      id,
      {
        full_name,
        role,
        phone,
        is_active,
      },
      actorIsManager
    );

    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
      return;
    }

    res.json({ success: true, message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// DELETE /api/users/:id
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Prevent self-deletion
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' });
      return;
    }

    const actorIsManager = req.user!.role === 'manager';
    const success = await usersService.deleteUser(id, actorIsManager);

    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
      return;
    }

    res.json({ success: true, message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PUT /api/users/:id/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword) {
      res.status(400).json({ success: false, message: 'กรุณาระบุรหัสผ่านเดิม' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    const actorIsManager = req.user!.role === 'manager';
    const result = await usersService.resetPassword(id, oldPassword, newPassword, actorIsManager);

    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
