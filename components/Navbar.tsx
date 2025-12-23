import React from 'react';
import { Package, Lock, LogOut } from 'lucide-react';

interface NavbarProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onDashboardClick: () => void;
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isAdmin, 
  onLoginClick, 
  onLogoutClick,
  onDashboardClick,
  onHomeClick
}) => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={onHomeClick}>
            <div className="flex-shrink-0 flex items-center text-blue-700">
              <Package className="h-8 w-8 mr-2" />
              <span className="font-bold text-xl tracking-tight uppercase italic">Sumber Jaya</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin ? (
              <>
                <button 
                  onClick={onDashboardClick}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </button>
                <button 
                  onClick={onLogoutClick}
                  className="flex items-center text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={onLoginClick}
                className="flex items-center text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Lock className="h-4 w-4 mr-2" />
                Admin Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};