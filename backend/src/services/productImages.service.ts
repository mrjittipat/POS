import pool from '../config/database';

export interface ProductImage {
  id: number;
  product_name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

// Get all saved product images
export async function getAllProductImages(): Promise<ProductImage[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM product_images ORDER BY product_name ASC'
  );
  return rows as ProductImage[];
}

// Get image by product name
export async function getImageByProductName(productName: string): Promise<ProductImage | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM product_images WHERE product_name = ?',
    [productName]
  );
  const images = rows as ProductImage[];
  return images.length > 0 ? images[0] : null;
}

// Save or update product image
export async function saveProductImage(productName: string, imageUrl: string): Promise<boolean> {
  const [result] = await pool.execute(
    `INSERT INTO product_images (product_name, image_url)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE image_url = ?, updated_at = CURRENT_TIMESTAMP`,
    [productName, imageUrl, imageUrl]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Update product image by ID
export async function updateProductImage(id: number, productName: string, imageUrl: string): Promise<boolean> {
  const [result] = await pool.execute(
    'UPDATE product_images SET product_name = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [productName, imageUrl, id]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete product image
export async function deleteProductImage(id: number): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM product_images WHERE id = ?',
    [id]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete by product name
export async function deleteProductImageByName(productName: string): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM product_images WHERE product_name = ?',
    [productName]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Sync all product images to products table (update image_url where product_name matches)
export async function syncProductImages(): Promise<number> {
  const [result] = await pool.execute(
    `UPDATE products p
     INNER JOIN product_images pi ON p.name = pi.product_name
     SET p.image_url = pi.image_url`
  );
  return (result as { affectedRows: number }).affectedRows;
}
