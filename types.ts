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
  username: string;
  password: string;
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