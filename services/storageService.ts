import { Product, Category, AdminUser, HistoryLog } from '../types';

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
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([newLog, ...logs].slice(0, 100))); // Keep last 100 logs
  },

  verifyLogin: (username: string, password: string): boolean => {
    const admins = storageService.getAdmins();
    return admins.some(admin => admin.username === username && admin.password === password);
  }
};