import React, { useMemo } from 'react'; // Import useMemo
import { Link, useLocation } from 'react-router-dom'; // Ensure useParams is removed
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
      name = 'Tournaments';
      path = '/tournaments';
    } else if (segment === 'tournament') {
      // This is the segment BEFORE the ID
      const tournamentId = pathSegments[index + 1];
      if (tournamentId) {
        // Add "Tournaments" link first if not already present
        if (!breadcrumbs.some(b => b.path === '/tournaments')) {
            breadcrumbs.push({ name: 'Tournaments', path: '/tournaments' });
        }
        // Re-apply explicit type 't' in find
        const tournament = tournaments.find((t: Tournament) => t.id === tournamentId);
        name = tournament?.name || `Tournament ${tournamentId.substring(0, 6)}...`; // Use name or fallback
        path = `/tournament/${tournamentId}`;
        currentPath += `/${tournamentId}`; // Manually advance currentPath
        skipNextSegment = true; // Skip the ID segment in the next iteration
      } else {
        // Should not happen with valid routes, but handle gracefully
        name = 'Tournament';
        path = '/tournaments'; // Link back to list
      }
    } else if (segment === 'create-tournament') {
      name = 'Create Tournament';
      path = '/app/create-tournament';
       // Add "Tournaments" link first if not already present
       if (!breadcrumbs.some(b => b.path === '/tournaments')) {
            breadcrumbs.push({ name: 'Tournaments', path: '/tournaments' });
        }
    } else if (segment === 'edit') {
      name = 'Edit';
      // Path is already correct as it builds upon the tournament path
    } else if (segment === 'settle') {
      name = 'Settle Accounts';
      // Path is already correct
    } else if (segment === 'teams') {
      name = 'Teams';
      path = '/teams';
    } else if (segment === 'stats') {
      name = 'Stats';
      path = '/stats';
    } else if (segment === 'profile') {
      name = 'Profile';
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
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
      <ol className="list-none p-0 inline-flex items-center space-x-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-poker-dark" aria-current="page">
                {crumb.isIcon ? <HomeIcon className="h-4 w-4" /> : crumb.name}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-poker-accent hover:underline flex items-center"
              >
                {crumb.isIcon ? <HomeIcon className="h-4 w-4" /> : crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
