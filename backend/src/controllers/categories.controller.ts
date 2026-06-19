import { Request, Response } from 'express';
import * as categoriesService from '../services/categories.service';

/**
 * Categories Controller
 */

// GET /api/categories
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await categoriesService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/categories
export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    const id = await categoriesService.createCategory({ name, description });
    res.status(201).json({ success: true, message: 'สร้างหมวดหมู่สำเร็จ', data: { id } });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PUT /api/categories/:id
export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    const success = await categoriesService.updateCategory(id, { name, description });
    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
      return;
    }
    res.json({ success: true, message: 'แก้ไขหมวดหมู่สำเร็จ' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// DELETE /api/categories/:id
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await categoriesService.deleteCategory(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
      return;
    }
    res.json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
