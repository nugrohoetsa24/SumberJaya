import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Catalog } from './pages/Catalog';
import { AdminDashboard } from './components/AdminDashboard';
import { storageService } from './services/storageService';
import { Product, Category } from './types';
import { Login } from './components/Login';

const App: React.FC = () => {
  const [view, setView] = useState<'catalog' | 'login' | 'admin'>('catalog');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);

  // Initialize data
  useEffect(() => {
    setProducts(storageService.getProducts());
    setCategories(storageService.getCategories());
    
    const session = storageService.getSession();
    if (session.isLoggedIn) {
      setIsAdmin(true);
      setCurrentUsername(session.username);
    }
  }, []);

  const handleLogin = (username: string) => {
    setIsAdmin(true);
    setCurrentUsername(username);
    storageService.setSession(true, username);
    setView('admin');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentUsername('');
    storageService.setSession(false, '');
    setView('catalog');
  };

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    storageService.saveProducts(newProducts);
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    storageService.saveCategories(newCategories);
  };

  const handleEditFromCatalog = (product: Product) => {
    setProductToEdit(product);
    setView('admin');
    setDashboardKey(prev => prev + 1);
  };

  const handleDeleteFromCatalog = (productId: string) => {
    const newProducts = products.filter(p => p.id !== productId);
    handleUpdateProducts(newProducts);
  };

  const handleDashboardClick = () => {
    setView('admin');
    setDashboardKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        isAdmin={isAdmin}
        onLoginClick={() => setView('login')}
        onLogoutClick={handleLogout}
        onDashboardClick={handleDashboardClick}
        onHomeClick={() => setView('catalog')}
      />

      <main className="flex-grow">
        {view === 'catalog' && (
          <Catalog 
            products={products} 
            categories={categories} 
            isAdmin={isAdmin}
            onEditProduct={handleEditFromCatalog}
            onDeleteProduct={handleDeleteFromCatalog}
          />
        )}

        {view === 'login' && (
          <div className="max-w-md mx-auto mt-20 px-4">
             <Login onLoginSuccess={handleLogin} />
          </div>
        )}

        {view === 'admin' && isAdmin && (
          <AdminDashboard 
            key={dashboardKey}
            products={products}
            categories={categories}
            onUpdateProducts={handleUpdateProducts}
            onUpdateCategories={handleUpdateCategories}
            productToEdit={productToEdit}
            onClearProductToEdit={() => setProductToEdit(null)}
            adminUsername={currentUsername}
          />
        )}
        
        {view === 'admin' && !isAdmin && (
           <div className="text-center mt-20">
             <h2 className="text-2xl font-bold text-gray-700">Akses Ditolak</h2>
             <button onClick={() => setView('login')} className="mt-4 text-indigo-600 underline">Silahkan Login</button>
           </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sumber Jaya - Aksesoris. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
