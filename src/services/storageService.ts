import { Product, Category, AdminUser, HistoryLog } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  PRODUCTS: 'autogear_products',
  CATEGORIES: 'autogear_categories',
  SESSION: 'autogear_session',
  ADMINS: 'autogear_admins',
  HISTORY: 'autogear_history',
};

// Initial Mock Data
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Interior Mobil' },
  { id: 'cat_2', name: 'Eksterior & Body' },
  { id: 'cat_3', name: 'Lampu & Kelistrikan' },
  { id: 'cat_4', name: 'Aksesoris Truk' },
  { id: 'cat_5', name: 'Oli & Perawatan' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    code: 'LED-H4-01',
    name: 'Lampu LED Headlight H4 Turbo',
    price: 350000,
    category: 'Lampu & Kelistrikan',
    description: 'Lampu utama LED H4 super terang, 6000K Pure White. Pemasangan PNP, cocok untuk Avanza, Innova, Xenia, dan truk engkel. Dilengkapi kipas pendingin high speed.',
    imageUrl: 'https://images.unsplash.com/photo-1622359676771-419b4c09d2e1?auto=format&fit=crop&q=80&w=400',
    updatedAt: new Date().toISOString(),
  }
];

const DEFAULT_ADMINS: AdminUser[] = [
  { username: 'admin', password: 'admin123' }
];

// ==================== FIXED UPLOAD FUNCTION ====================
export const uploadProductImage = async (file: File): Promise<string> => {
  try {
    console.log('🚀 [UPLOAD] Starting upload for file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toLocaleString()
    });
    
    // 1. Validasi file
    if (!file || file.size === 0) {
      throw new Error('File kosong atau tidak valid');
    }
    
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error(`File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 5MB.`);
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const fileType = file.type.toLowerCase();
    if (!validTypes.includes(fileType) && !fileType.includes('image/')) {
      throw new Error(`Format ${file.type} tidak didukung. Gunakan JPG, PNG, atau WebP.`);
    }
    
    // 2. Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `product_${timestamp}_${randomStr}.${fileExt}`;
    
    console.log('📁 Generated filename:', fileName);
    
    // 3. Upload langsung ke Supabase Storage
    console.log('📤 Uploading to Supabase Storage bucket: product-images');
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg'
      });
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      
      // Error spesifik
      if (error.message?.includes('bucket')) {
        throw new Error('Bucket "product-images" tidak ditemukan. Buat bucket di Supabase Dashboard → Storage.');
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        throw new Error('Akses ditolak. Coba buka Supabase Dashboard → Storage → product-images → Policies dan buat policy "Enable public access".');
      } else if (error.message?.includes('CORS')) {
        throw new Error('CORS error. Instal CORS extension atau cek policies.');
      } else {
        throw new Error(`Upload gagal: ${error.message || 'Unknown error'}`);
      }
    }
    
    console.log('✅ Upload success, data:', data);
    
    // 4. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    console.log('🔗 Public URL:', publicUrl);
    
    if (!publicUrl) {
      throw new Error('Gagal mendapatkan URL gambar');
    }
    
    return publicUrl;
    
  } catch (error: any) {
    console.error('💥 Error in uploadProductImage:', error);
    throw error;
  }
};

// ==================== LOCAL STORAGE FUNCTIONS ====================
export const storageService = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getCategories: (): Category[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(data);
  },

  saveCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getSession: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : { isLoggedIn: false, username: '' };
  },

  setSession: (isLoggedIn: boolean, username: string) => {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ isLoggedIn, username }));
  },

  getAdmins: (): AdminUser[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ADMINS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
    return JSON.parse(data);
  },

  saveAdmins: (admins: AdminUser[]) => {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
  },

  getHistory: (): HistoryLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  addHistory: (log: Omit<HistoryLog, 'id' | 'timestamp'>) => {
    const logs = storageService.getHistory();
    const newLog: HistoryLog = {
      ...log,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([newLog, ...logs].slice(0, 100)));
  },

  verifyLogin: (username: string, password: string): boolean => {
    const admins = storageService.getAdmins();
    return admins.some(admin => admin.username === username && admin.password === password);
  }
};

// Tambahkan fungsi ini
export const deleteProductImage = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl) {
      console.log('🟡 No image URL provided for deletion');
      return;
    }
    
    console.log('🗑️ Attempting to delete image:', imageUrl);
    
    // Extract file path dari URL
    // Contoh URL: https://xxx.supabase.co/storage/v1/object/public/product-images/filename.jpg
    const urlParts = imageUrl.split('/');
    // Cari bagian setelah 'product-images/'
    const productImagesIndex = urlParts.findIndex(part => part === 'product-images');
    
    if (productImagesIndex === -1) {
      console.error('❌ Invalid image URL format:', imageUrl);
      return;
    }

    // Ambil nama file setelah 'product-images/'
    const fileName = urlParts.slice(productImagesIndex + 1).join('/');
    
    console.log('📁 Extracted filename:', fileName);
    
    if (!fileName || fileName.trim() === '') {
      console.error('❌ Could not extract filename from URL');
      return;
    }
    
    // Hapus file dari storage
    const { error } = await supabase.storage
      .from('product-images')
      .remove([fileName]);
    
    if (error) {
      console.error('❌ Failed to delete image:', error);
      throw error;
    }
    
    console.log('✅ Image deleted successfully:', fileName);
    
  } catch (error: any) {
    console.error('💥 Error in deleteProductImage:', error);
    // Jangan throw, biarkan produk tetap terhapus meski gambar gagal
  }
};

// Untuk cleanup semua gambar yang tidak terpakai
export const cleanupOrphanedImages = async (usedImageUrls: string[]): Promise<void> => {
  try {
    // Get all files in bucket
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list();
    
    if (error) throw error;
    
    // Filter orphaned files
    const orphanedFiles = files.filter(file => {
      // Check if any product is using this file
      const fileUrl = `${supabase.storage.from('product-images').getPublicUrl(file.name).data.publicUrl}`;
      return !usedImageUrls.includes(fileUrl);
    });
    
    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned images found');
      return;
    }
    
    console.log(`🗑️ Found ${orphanedFiles.length} orphaned images to delete`);
    
    // Delete orphaned files
    const { error: deleteError } = await supabase.storage
      .from('product-images')
      .remove(orphanedFiles.map(f => f.name));
    
    if (deleteError) throw deleteError;
    
    console.log(`✅ Deleted ${orphanedFiles.length} orphaned images`);
    
  } catch (error) {
    console.error('💥 Cleanup error:', error);
  }
};