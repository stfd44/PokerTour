import React, { useState } from 'react';
import { Menu, X, UserCheck as PokerChip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Tournois', path: '/tournaments' },
    { label: 'Statistiques', path: '/stats' },
    { label: 'Profil', path: '/profile' },
  ];

  return (
    <header className="bg-poker-black text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <PokerChip className="w-8 h-8 text-poker-gold" />
            <span className="text-xl font-bold">PokerTour</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-300 hover:text-poker-gold transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
        </div>
      </div>
    </header>
  );
}