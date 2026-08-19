import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MainLayout } from '../../pages/MainLayout';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

const MENU_ITEMS = [
  { label: 'Accueil', path: '/' },
  { label: 'Tournois', path: '/tournaments' },
  { label: 'Communauté', path: '/teams' },
  { label: 'Statistiques', path: '/stats' },
  { label: 'Profil', path: '/profile' },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [goldPulse, setGoldPulse] = useState(0);
  const scrollYRef = useRef(0);
  const restoreScrollRef = useRef(false);

  const closeMenu = (restoreScroll = true) => {
    restoreScrollRef.current = restoreScroll;
    setIsMenuOpen(false);
  };

  useEffect(() => {
    closeMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeMenu();
        }
      };

      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKeyDown);
      };
    }

    if (restoreScrollRef.current) {
      window.scrollTo(0, scrollYRef.current);
    }
    restoreScrollRef.current = false;
  }, [isMenuOpen]);

  const openMenu = () => {
    scrollYRef.current = window.scrollY;
    setIsMenuOpen(true);
    setGoldPulse((value) => value + 1);
  };

  const handleSignOut = async () => {
    closeMenu();
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <div className={cn('app-shell', isMenuOpen && 'is-menu-open')}>
      <aside id="mobile-nav" className="app-shell__menu" aria-hidden={!isMenuOpen}>
        <nav className="flex h-full flex-col px-5 pt-24 pb-8">
          <div className="flex flex-col">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'py-3 text-lg text-gray-200 transition-colors hover:text-poker-gold',
                  location.pathname === item.path && 'text-poker-gold'
                )}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={() => closeMenu(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {user && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <button
                type="button"
                className="btn btn-red w-full"
                onClick={handleSignOut}
                tabIndex={isMenuOpen ? 0 : -1}
              >
                Déconnexion
              </button>
            </div>
          )}
        </nav>
      </aside>

      {goldPulse > 0 && isMenuOpen && (
        <div key={goldPulse} className="menu-gold-wash lg:hidden" aria-hidden="true" />
      )}

      <div
        className="app-shell__page"
        style={isMenuOpen ? { top: `-${scrollYRef.current}px` } : undefined}
        onClick={isMenuOpen ? closeMenu : undefined}
      >
        <Header
          isMenuOpen={isMenuOpen}
          onToggleMenu={(event) => {
            event.stopPropagation();
            if (isMenuOpen) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
        />
        <MainLayout />
      </div>
    </div>
  );
}
