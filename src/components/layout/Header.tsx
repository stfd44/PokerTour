// src/components/layout/Header.tsx
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { VERSION } from '../../version';

interface HeaderProps {
  isMenuOpen?: boolean;
  onToggleMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const Header = ({ isMenuOpen = false, onToggleMenu }: HeaderProps) => {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Tournois', path: '/tournaments' },
    { label: 'Communauté', path: '/teams' },
    { label: 'Statistiques', path: '/stats' },
    { label: 'Profil', path: '/profile' },
    { label: 'Paramètres', path: '/settings' },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <header className="bg-poker-black/90 text-white shadow-lg sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/poker-tour-logo.png"
              alt="PokerTour"
              className="h-8 w-8 rounded-md object-contain"
            />
            <div className="flex items-baseline">
              <span className="text-xl font-bold">PokerTour</span>
              <span className="ml-2 text-xs text-poker-gold">{VERSION}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-300 hover:text-poker-gold transition-colors whitespace-nowrap"
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
                <span className="font-medium truncate max-w-[150px] whitespace-nowrap">
                  {user.nickname || user.displayName || 'Utilisateur'}
                </span>
                <button className='btn btn-red py-1.5 px-3 text-xs' onClick={handleSignOut}>
                  Déconnexion
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={onToggleMenu}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
