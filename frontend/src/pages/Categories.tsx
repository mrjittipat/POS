import { useState, useEffect } from 'react';
import { categoriesApi } from '../api/categories.api';
import { Plus, Edit, Trash2, X, FolderOpen } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export default function Categories() {
  const { showConfirm, toast } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories((response.data as { success: boolean; data: Category[] }).data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categoriesApi.update(editingId, formData);
      } else {
        await categoriesApi.create(formData);
      }
      resetForm();
      loadCategories();
      toast({ message: editingId ? 'แก้ไขหมวดหมู่สำเร็จ' : 'เพิ่มหมวดหมู่สำเร็จ', type: 'success' });
    } catch (error) {
      toast({ message: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, description: category.description || '' });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'ลบหมวดหมู่',
      message: 'ต้องการลบหมวดหมู่นี้? สินค้าในหมวดหมู่นี้จะไม่ถูลบ',
      variant: 'danger',
      confirmText: 'ลบ',
      onConfirm: async () => {
        try {
          await categoriesApi.delete(id);
          loadCategories();
          toast({ message: 'ลบหมวดหมู่สำเร็จ', type: 'success' });
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">หมวดหมู่สินค้า ({categories.length})</h2>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} />
          เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{category.name}</h3>
                {category.description && (
                  <p className="text-gray-500 text-sm mt-1">{category.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(category.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <FolderOpen size={20} className="text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="เช่น เครื่องดุม, อาหาร..."
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingId ? 'บันทึก' : 'เพิ่มหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
