export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  username: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
}

export interface AdminFormData {
  username: string;
  password: string;
  email?: string;
}

export interface HistoryLog {
  id: string;
  username: string;
  action: 'TAMBAH' | 'EDIT' | 'HAPUS' | 'TAMBAH_KATEGORI' | 'HAPUS_KATEGORI';
  productName: string;
  productCode: string;
  timestamp: string;
}

export type ViewMode = 'grid' | 'list';