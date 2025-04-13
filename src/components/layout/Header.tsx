// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Menu, X, UserCheck as PokerChip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { VERSION } from '../../version';

export const Header = () => {
  const { user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuthStore();

  const menuItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Tournois', path: '/tournaments' },
    { label: 'Teams', path: '/teams' }, // Added the Teams link here
    { label: 'Statistiques', path: '/stats' },
    { label: 'Profil', path: '/profile' },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <header className="bg-poker-black text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <PokerChip className="w-8 h-8 text-poker-gold" />
            <div className="flex items-baseline">
              <span className="text-xl font-bold">PokerTour</span>
              <span className="ml-2 text-xs text-poker-gold">{VERSION}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-300 hover:text-poker-gold transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {/* User Info */}
            {user && (
              <div className="flex items-center space-x-2">
                <img
                  src={user.photoURL || "/default-profile.png"}
                  alt="Profil"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="font-medium">
                  {user.nickname || user.displayName || 'Utilisateur'}
                </span>
                <button className='bg-red-500 p-2 rounded-md' onClick={handleSignOut}>
                  Déconnexion
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 right-0 transform w-64 bg-poker-dark shadow-lg transition-transform duration-300 ease-in-out z-50',
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col pt-20 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="py-2 text-gray-300 hover:text-poker-gold transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <div className='mt-20'>
              <button className='w-full bg-red-500 p-2 rounded-md' onClick={handleSignOut}>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
