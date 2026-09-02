import { useState, useEffect, useRef } from 'react';
import { productImagesApi, ProductImage } from '../api/productImages.api';
import { productsApi } from '../api/products.api';
import { useDialog } from '../context/DialogContext';
import { Trash2, Image as ImageIcon, Plus, Upload, X, Search, Edit, RefreshCw } from 'lucide-react';

export default function ProductImages() {
  const { showConfirm, toast } = useDialog();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [uploadForm, setUploadForm] = useState({
    product_name: '',
    image_file: null as File | null,
  });
  const [editForm, setEditForm] = useState({
    product_name: '',
    image_file: null as File | null,
    image_url: '',
  });
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await productImagesApi.getAll();
      setImages(res.data.data);
    } catch (error) {
      console.error('Failed to load product images:', error);
      toast({ message: 'ไม่สามารถโหลดข้อมูลรูปภาพได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ message: 'ไฟล์ใหญ่เกิน 5MB', type: 'error' });
      return;
    }

    setUploadForm({ ...uploadForm, image_file: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ message: 'ไฟล์ใหญ่เกิน 5MB', type: 'error' });
      return;
    }

    setEditForm({ ...editForm, image_file: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageClick = (image: ProductImage) => {
    setEditingImage(image);
    setEditForm({
      product_name: image.product_name,
      image_file: null,
      image_url: image.image_url,
    });
    setEditPreview(null);
    setShowEditModal(true);
  };

  const handleUpload = async () => {
    if (!uploadForm.product_name.trim()) {
      toast({ message: 'กรุณาระบุชื่อสินค้า', type: 'error' });
      return;
    }

    if (!uploadForm.image_file) {
      toast({ message: 'กรุณาเลือกรูปภาพ', type: 'error' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', uploadForm.image_file);

      // อัพโหลดรูปภาพก่อน
      const uploadRes = await productsApi.uploadImage(formData);
      const imageUrl = uploadRes.data.data.url;

      // บันทึกลงตาราง product_images
      await productImagesApi.save(uploadForm.product_name, imageUrl);

      toast({ message: 'เพิ่มรูปภาพสำเร็จ', type: 'success' });
      setShowUploadModal(false);
      setUploadForm({ product_name: '', image_file: null });
      setUploadPreview(null);
      loadData();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัพโหลด';
      toast({ message: errMsg, type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!editingImage) return;

    if (!editForm.product_name.trim()) {
      toast({ message: 'กรุณาระบุชื่อสินค้า', type: 'error' });
      return;
    }

    try {
      let imageUrl = editForm.image_url;

      // ถ้ามีการเลือกรูปภาพใหม่
      if (editForm.image_file) {
        const formData = new FormData();
        formData.append('image', editForm.image_file);
        const uploadRes = await productsApi.uploadImage(formData);
        imageUrl = uploadRes.data.data.url;
      }

      // อัปเดตข้อมูล
      await productImagesApi.update(editingImage.id, editForm.product_name, imageUrl);

      toast({ message: 'แก้ไขรูปภาพสำเร็จ', type: 'success' });
      setShowEditModal(false);
      setEditingImage(null);
      setEditForm({ product_name: '', image_file: null, image_url: '' });
      setEditPreview(null);
      loadData();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไข';
      toast({ message: errMsg, type: 'error' });
    }
  };

  const handleDelete = (image: ProductImage) => {
    showConfirm({
      title: 'ลบรูปภาพ',
      message: `ต้องการลบรูปภาพของสินค้า "${image.product_name}"? การนำเข้าสินค้านี้ในครั้งถัดไปจะไม่มีรูปภาพ`,
      variant: 'danger',
      confirmText: 'ลบ',
      onConfirm: async () => {
        try {
          await productImagesApi.delete(image.id);
          toast({ message: 'ลบรูปภาพสำเร็จ', type: 'success' });
          loadData();
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  const handleSync = async () => {
    showConfirm({
      title: 'รีโหลดรูปภาพ',
      message: 'ระบบจะอัปเดตรูปภาพในตารางสินค้าให้ตรงกับรูปภาพที่บันทึกไว้ (ตามชื่อสินค้า) ต้องการดำเนินการหรือไม่?',
      confirmText: 'รีโหลด',
      onConfirm: async () => {
        try {
          const res = await productImagesApi.sync();
          toast({ message: res.data.message, type: 'success' });
        } catch (error: any) {
          const errMsg = error.response?.data?.message || 'เกิดข้อผิดพลาด';
          toast({ message: errMsg, type: 'error' });
        }
      },
    });
  };

  const filteredImages = images.filter(img =>
    img.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">จัดการรูปภาพสินค้า</h1>
          <p className="text-sm text-gray-500">
            รูปภาพที่บันทึกไว้จะถูกนำกลับมาใช้อัตโนมัติเมื่อนำเข้าสินค้าชื่อเดิม
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} />
            รีโหลด
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            เพิ่มรูปภาพ
          </button>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredImages.map((image) => (
          <div key={image.id} className="card overflow-hidden group">
            <div
              className="relative aspect-square bg-gray-100 cursor-pointer"
              onClick={() => handleImageClick(image)}
            >
              {image.image_url ? (
                <img
                  src={image.image_url}
                  alt={image.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Edit size={24} className="text-white" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image);
                }}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="p-3">
              <p className="font-medium text-sm truncate" title={image.product_name}>
                {image.product_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(image.updated_at).toLocaleDateString('th-TH')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          {search ? 'ไม่พบรูปภาพที่ค้นหา' : 'ยังไม่มีรูปภาพที่บันทึกไว้'}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">เพิ่มรูปภาพสินค้า</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ product_name: '', image_file: null });
                  setUploadPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อสินค้า
                </label>
                <input
                  type="text"
                  value={uploadForm.product_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, product_name: e.target.value })}
                  placeholder="ระบุชื่อสินค้าที่ต้องการผูกรูปภาพ"
                  className="input w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  เมื่อนำเข้าสินค้าชื่อนี้ รูปภาพจะถูกใช้อัตโนมัติ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รูปภาพ
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadPreview ? (
                  <div className="relative">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadForm({ ...uploadForm, image_file: null });
                        setUploadPreview(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary-500 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={32} className="text-gray-400" />
                    <p className="text-sm text-gray-500">คลิกเพื่อเลือกรูปภาพ</p>
                    <p className="text-xs text-gray-400">JPG, PNG (สูงสุด 5MB)</p>
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({ product_name: '', image_file: null });
                    setUploadPreview(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleUpload}
                  className="btn btn-primary flex-1"
                >
                  เพิ่มรูปภาพ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">แก้ไขรูปภาพสินค้า</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingImage(null);
                  setEditForm({ product_name: '', image_file: null, image_url: '' });
                  setEditPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อสินค้า
                </label>
                <input
                  type="text"
                  value={editForm.product_name}
                  onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                  placeholder="ระบุชื่อสินค้าที่ต้องการผูกรูปภาพ"
                  className="input w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  เมื่อนำเข้าสินค้าชื่อนี้ รูปภาพจะถูกใช้อัตโนมัติ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รูปภาพ
                </label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleEditFileChange}
                  className="hidden"
                />

                {editPreview || editForm.image_url ? (
                  <div className="relative">
                    <img
                      src={editPreview || editForm.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => editFileInputRef.current?.click()}
                      className="absolute bottom-2 left-2 p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 shadow-lg"
                    >
                      <Upload size={16} />
                    </button>
                    {editPreview && (
                      <button
                        onClick={() => {
                          setEditForm({ ...editForm, image_file: null });
                          setEditPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary-500 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={32} className="text-gray-400" />
                    <p className="text-sm text-gray-500">คลิกเพื่อเลือกรูปภาพใหม่</p>
                    <p className="text-xs text-gray-400">JPG, PNG (สูงสุด 5MB)</p>
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingImage(null);
                    setEditForm({ product_name: '', image_file: null, image_url: '' });
                    setEditPreview(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleUpdate}
                  className="btn btn-primary flex-1"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
