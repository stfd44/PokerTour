import os
import json
from pathlib import Path

PROJECT_ROOT = Path('.')
OUTPUT_FILE = 'projet.md'
SRC_DIR = PROJECT_ROOT / 'src'

# Files to analyze for key code snippets
KEY_FILES_TO_INCLUDE = [
    'src/main.tsx',
    'src/App.tsx',
    'src/lib/firebase.ts',
    'src/store/tournamentStore.ts',
    'src/store/useAuthStore.ts',
    'src/pages/MainLayout.tsx',
    'vite.config.ts',
    'package.json'
]

# File extensions to consider source code
CODE_EXTENSIONS = ('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md', '.py', '.sh', '.yaml', '.yml')

def get_technologies(root_dir):
    """Identifies technologies used in the project."""
    tech = set()
    package_json_path = root_dir / 'package.json'
    vite_config_path_ts = root_dir / 'vite.config.ts'
    vite_config_path_js = root_dir / 'vite.config.js'
    tsconfig_path = root_dir / 'tsconfig.json'
    tailwind_config_path = root_dir / 'tailwind.config.js'
    firebase_lib_path = root_dir / 'src' / 'lib' / 'firebase.ts'
    firestore_rules_path = root_dir / 'firestore.rules'

    if package_json_path.exists():
        tech.add("Node.js/npm")
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
                deps = pkg.get('dependencies', {})
                dev_deps = pkg.get('devDependencies', {})
                if 'react' in deps or 'react' in dev_deps:
                    tech.add("React")
                if 'vite' in dev_deps:
                    tech.add("Vite")
                if 'typescript' in dev_deps or 'typescript' in deps:
                    tech.add("TypeScript")
                if 'tailwindcss' in dev_deps or 'tailwindcss' in deps:
                    tech.add("Tailwind CSS")
                if 'firebase' in deps:
                    tech.add("Firebase SDK")
                if 'zustand' in deps:
                    tech.add("Zustand (State Management)")
                # Add more specific checks if needed
        except Exception as e:
            print(f"Warning: Could not parse package.json: {e}")

    if vite_config_path_ts.exists() or vite_config_path_js.exists():
        tech.add("Vite") # Confirm Vite
    if tsconfig_path.exists():
        tech.add("TypeScript") # Confirm TypeScript
    if tailwind_config_path.exists():
        tech.add("Tailwind CSS") # Confirm Tailwind
    if firebase_lib_path.exists() or firestore_rules_path.exists():
        tech.add("Firebase (Firestore likely)")

    return sorted(list(tech))

def get_project_structure(root_dir, indent=''):
    """Generates a string representation of the project structure."""
    structure = ""
    items = sorted(list(root_dir.iterdir())) # Sort items for consistent order
    for i, item in enumerate(items):
        is_last = i == len(items) - 1
        prefix = indent + ('└── ' if is_last else '├── ')
        structure += f"{prefix}{item.name}\n"
        if item.is_dir() and item.name != 'node_modules' and not item.name.startswith('.'):
            new_indent = indent + ('    ' if is_last else '│   ')
            structure += get_project_structure(item, new_indent)
    return structure

def read_file_content(file_path):
    """Reads the content of a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file {file_path}: {e}"

def generate_markdown():
    """Generates the Markdown content."""
    markdown = "# Analyse du Projet PokerTour\n\n"

    # --- Technologies ---
    markdown += "## Technologies Utilisées\n\n"
    technologies = get_technologies(PROJECT_ROOT)
    if technologies:
        for tech in technologies:
            markdown += f"- {tech}\n"
    else:
        markdown += "Impossible d'identifier automatiquement les technologies.\n"
    markdown += "\n"

    # --- Structure du Projet ---
    markdown += "## Structure du Projet (Focus sur `src`)\n\n"
    markdown += "```\n"
    markdown += f"{PROJECT_ROOT.name}/\n"
    # Only show src structure in detail if it exists
    if SRC_DIR.exists() and SRC_DIR.is_dir():
         markdown += get_project_structure(SRC_DIR, indent='├── ') # Start indent for src
    else:
         markdown += get_project_structure(PROJECT_ROOT) # Show full structure if src not found
    markdown += "```\n\n"

    # --- Points Clés de l'Architecture ---
    markdown += "## Points Clés de l'Architecture\n\n"
    markdown += "**Frontend:**\n"
    markdown += "- **Framework UI:** React (via Vite + TypeScript).\n"
    markdown += "- **Routing:** Probablement géré via `react-router-dom` (à vérifier dans `package.json` ou l'utilisation dans `App.tsx`/`main.tsx`).\n"
    markdown += "- **State Management:** Zustand (basé sur `src/store`).\n"
    markdown += "- **Styling:** Tailwind CSS.\n"
    markdown += "- **Structure:** Organisation par fonctionnalités/types (`components`, `pages`, `store`, `lib`).\n\n"

    markdown += "**Backend/Base de Données:**\n"
    markdown += "- **Service:** Firebase (probablement Firestore pour la base de données NoSQL temps réel).\n"
    markdown += "- **Authentification:** Firebase Authentication (supposé, basé sur `useAuthStore.ts` et `firebase.ts`).\n"
    markdown += "- **Règles de sécurité:** Définies dans `firestore.rules`.\n\n"

    markdown += "**Fonctionnalités Principales (déduites des noms de fichiers):**\n"
    markdown += "- Gestion de l'authentification utilisateur (`Login.tsx`, `useAuthStore.ts`).\n"
    markdown += "- Création et gestion de tournois (`CreateTournament.tsx`, `TournamentList.tsx`, `tournamentStore.ts`).\n"
    markdown += "- Gestion des parties dans un tournoi (`GameForm.tsx`, `GameList.tsx`, `GameTimer.tsx`, `GameView.tsx`).\n"
    markdown += "- Affichage des statistiques (`Stats.tsx`).\n"
    markdown += "- Gestion des équipes (`Teams.tsx`, `useTeamStore.ts`).\n"
    markdown += "- Profil utilisateur (`Profile.tsx`).\n\n"


    # --- Extraits de Code Clés ---
    markdown += "## Extraits de Code Clés\n\n"
    for file_rel_path in KEY_FILES_TO_INCLUDE:
        file_abs_path = PROJECT_ROOT / file_rel_path
        if file_abs_path.exists() and file_abs_path.is_file():
            markdown += f"### `{file_rel_path}`\n\n"
            content = read_file_content(file_abs_path)
            ext = file_abs_path.suffix.lower()
            lang = ext.lstrip('.')
            if ext in CODE_EXTENSIONS:
                 # Adjust language hint for common cases
                 if lang == 'ts': lang = 'typescript'
                 if lang == 'tsx': lang = 'typescript' # Often works better than 'tsx'
                 if lang == 'js': lang = 'javascript'
                 if lang == 'jsx': lang = 'javascript' # Often works better than 'jsx'
                 if lang == 'json': lang = 'json'
                 if lang == 'css': lang = 'css'
                 if lang == 'html': lang = 'html'
                 markdown += f"```{lang}\n"
                 markdown += content + "\n"
                 markdown += "```\n\n"
            else:
                 markdown += "```\n"
                 markdown += content + "\n"
                 markdown += "```\n\n"
        else:
            markdown += f"### `{file_rel_path}`\n\n"
            markdown += f"*Fichier non trouvé ou n'est pas un fichier.*\n\n"

    return markdown

if __name__ == "__main__":
    print(f"Génération du fichier {OUTPUT_FILE}...")
    markdown_content = generate_markdown()
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        print(f"Fichier {OUTPUT_FILE} généré avec succès dans {PROJECT_ROOT.resolve()}")
    except Exception as e:
        print(f"Erreur lors de l'écriture du fichier {OUTPUT_FILE}: {e}")
