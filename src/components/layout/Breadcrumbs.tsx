import React, { useMemo } from 'react'; // Import useMemo
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import { HomeIcon } from 'lucide-react'; // Using lucide-react as it's already a dependency
import { useTournamentStore } from '../../store/tournamentStore'; // Import store
import type { Tournament } from '../../store/types/tournamentTypes'; // Import Tournament type

interface BreadcrumbPart {
  name: string;
  path: string;
  isIcon?: boolean;
}

// Helper function to generate breadcrumb parts
// Re-apply explicit type for the tournaments parameter
const generateBreadcrumbs = (pathname: string, tournaments: Tournament[]): BreadcrumbPart[] => {
  const pathSegments = pathname.split('/').filter(segment => segment);
  const breadcrumbs: BreadcrumbPart[] = [{ name: 'Home', path: '/', isIcon: true }];

  let currentPath = '';
  let skipNextSegment = false;

  pathSegments.forEach((segment, index) => {
    if (skipNextSegment) {
      skipNextSegment = false;
      return; // Skip this segment (e.g., the tournament ID)
    }

    currentPath += `/${segment}`;
    let name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    let path = currentPath;
    let addCrumb = true;

    // --- Specific Naming and Path Logic ---
    if (segment === 'tournaments') {
      name = 'Tournois';
      path = '/tournaments';
    } else if (segment === 'tournament') {
      // This is the segment BEFORE the ID
      const tournamentId = pathSegments[index + 1];
      if (tournamentId) {
        // Add "Tournois" link first if not already present
        if (!breadcrumbs.some(b => b.path === '/tournaments')) {
            breadcrumbs.push({ name: 'Tournois', path: '/tournaments' });
        }
        // Re-apply explicit type 't' in find
        const tournament = tournaments.find((t: Tournament) => t.id === tournamentId);
        name = tournament?.name || `Tournoi ${tournamentId.substring(0, 6)}...`; // Use name or fallback
        path = `/tournament/${tournamentId}`;
        currentPath += `/${tournamentId}`; // Manually advance currentPath
        skipNextSegment = true; // Skip the ID segment in the next iteration
      } else {
        // Should not happen with valid routes, but handle gracefully
        name = 'Tournoi';
        path = '/tournaments'; // Link back to list
      }
    } else if (segment === 'create' && pathSegments[index - 1] === 'tournaments') {
      name = 'Créer un tournoi';
      path = '/tournaments/create';
    } else if (segment === 'edit') {
      name = 'Modifier';
      // Path is already correct as it builds upon the tournament path
    } else if (segment === 'settle') {
      name = 'Bilan';
      // Path is already correct
    } else if (segment === 'teams') {
      name = 'Communauté';
      path = '/teams';
    } else if (segment === 'stats') {
      name = 'Statistiques';
      path = '/stats';
    } else if (segment === 'settings') {
      name = 'Paramètres';
      path = '/settings';
    } else if (segment === 'profile') {
      name = 'Profil';
      path = '/profile';
    } else {
      // Default case: Use capitalized segment name
      // Check if it's likely an ID or other non-page segment
      if (segment.length > 20 || !isNaN(Number(segment))) { // Basic check for ID-like strings
          addCrumb = false; // Don't add raw IDs as separate crumbs
      }
    }

    if (addCrumb) {
        // Avoid adding duplicates
        if (!breadcrumbs.some(b => b.path === path)) {
            breadcrumbs.push({ name, path });
        }
    }
  });

  return breadcrumbs;
};


export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Get navigate function
  const { tournaments } = useTournamentStore(); // Get tournaments from store

  // Use useMemo to recalculate only when pathname or tournaments change
  const breadcrumbs = useMemo(() => {
      return generateBreadcrumbs(location.pathname, tournaments);
  }, [location.pathname, tournaments]);


  // Don't render breadcrumbs on the home page itself or login page
  if (location.pathname === '/' || location.pathname.startsWith('/login')) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLastCrumb = index === breadcrumbs.length - 1;
          const pathMatches = crumb.path === location.pathname;
          const isSpecificEndpoint = location.pathname.endsWith('/edit') ||
                                     location.pathname.endsWith('/settle') ||
                                     location.pathname === '/tournaments' ||
                                     location.pathname === '/teams' ||
                                     location.pathname === '/stats' ||
                                     location.pathname === '/profile' ||
                                     location.pathname === '/settings' ||
                                     location.pathname === '/tournaments/create';
          const renderAsText = isLastCrumb && pathMatches && isSpecificEndpoint;
          const isTournamentLink = crumb.path.startsWith('/tournament/') && crumb.path.split('/').length === 3;
          const label = crumb.isIcon ? <HomeIcon className="h-4 w-4" /> : crumb.name;
          const buttonClass = [
            'btn rounded-full text-sm font-medium',
            crumb.isIcon ? 'h-9 w-9 px-0' : 'px-3.5 py-1.5',
            renderAsText ? 'btn-gold pointer-events-none' : 'btn-ghost hover:text-poker-gold',
          ].join(' ');
          const ariaLabel = crumb.isIcon ? 'Accueil' : undefined;

          return (
            <li key={crumb.path}>
              {renderAsText ? (
                <span className={buttonClass} aria-current="page" aria-label={ariaLabel}>
                  {label}
                </span>
              ) : isTournamentLink ? (
                <a
                  href={crumb.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(crumb.path, { state: { resetView: true } });
                  }}
                  className={buttonClass}
                  aria-label={ariaLabel}
                >
                  {label}
                </a>
              ) : (
                <Link to={crumb.path} className={buttonClass} aria-label={ariaLabel}>
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
