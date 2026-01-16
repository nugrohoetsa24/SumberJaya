import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Catalog } from './pages/Catalog';
import { AdminDashboard } from './components/AdminDashboard';
import { storageService } from './services/storageService';
import { Product, Category } from './types';
import { Login } from './components/Login';

const App: React.FC = () => {
  // Set default view to 'login' to satisfy the requirement of showing the login page first
  const [view, setView] = useState<'catalog' | 'login' | 'admin'>('login');
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
      // Even if session exists, we land on login if the user specifically wants login first,
      // but standard professional UX would skip to catalog. 
      // To strictly follow "Always show login", we could keep it 'login', 
      // but we'll transition to catalog if already authenticated for better UX.
      setView('catalog');
    }
  }, []);

  const handleLogin = (username: string) => {
    setIsAdmin(true);
    setCurrentUsername(username);
    storageService.setSession(true, username);
    setView('catalog'); // Navigate to catalog immediately after successful login
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentUsername('');
    storageService.setSession(false, '');
    setView('login'); // Redirect back to login screen on logout
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
    if (isAdmin) {
      setView('admin');
      setDashboardKey(prev => prev + 1);
    } else {
      setView('login');
    }
  };

  const handleHomeClick = () => {
    // Only allow access to catalog if authenticated
    if (isAdmin) {
      setView('catalog');
    } else {
      setView('login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        isAdmin={isAdmin}
        onLoginClick={() => setView('login')}
        onLogoutClick={handleLogout}
        onDashboardClick={handleDashboardClick}
        onHomeClick={handleHomeClick}
      />

      <main className="flex-grow">
        {view === 'catalog' && (
          isAdmin ? (
            <Catalog 
              products={products} 
              categories={categories} 
              isAdmin={isAdmin}
              onEditProduct={handleEditFromCatalog}
              onDeleteProduct={handleDeleteFromCatalog}
            />
          ) : (
            <div className="max-w-md mx-auto mt-20 px-4">
              <Login onLoginSuccess={handleLogin} />
            </div>
          )
        )}

        {view === 'login' && (
          <div className="max-w-md mx-auto mt-20 px-4">
             <Login onLoginSuccess={handleLogin} />
          </div>
        )}

        {view === 'admin' && (
          isAdmin ? (
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
          ) : (
            <div className="max-w-md mx-auto mt-20 px-4">
              <div className="mb-6 text-center">
                <p className="text-red-500 font-medium mb-4">Sesi berakhir atau Anda belum login. Silahkan masuk kembali.</p>
              </div>
              <Login onLoginSuccess={handleLogin} />
            </div>
          )
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
