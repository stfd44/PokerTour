# Documentation du projet

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\.bolt/config.json`

```json
{
  "template": "bolt-vite-react-ts"
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\.bolt/prompt`

```
For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.

By default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.

Use icons from lucide-react for logos.

Use stock photos from unsplash where appropriate, only valid URLs you know exist. Do not download the images, only link to them in image tags.


```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\.gitignore`

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.env
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\collect_project.py`

```python
import os
import subprocess

def collect_source_files_from_git(directory):
    """
    Collects all source files from a Git project (excluding files in .gitignore) and stores them as formatted Markdown text.
    This version does not filter by file extension and correctly identifies the code block language.
    """
    markdown_content = "# Documentation du projet\n\n"

    # Check if the directory is a Git repository
    try:
        subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=directory, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError:
        print(f"⚠️ {directory} n'est pas un dépôt Git. Veuillez initialiser le dépôt ou utiliser un autre dossier.")
        return None

    # Get the list of files tracked by Git, excluding those in .gitignore
    try:
        result = subprocess.run(["git", "ls-files", "-z"], cwd=directory, check=True, capture_output=True, text=True)
        # Split the output by null character (\0) to handle filenames with spaces or special characters
        git_files = result.stdout.split('\0')[:-1]  # Remove the last empty element
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erreur lors de la récupération de la liste des fichiers Git : {e}")
        return None

    for file in git_files:
        file_path = os.path.join(directory, file)
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Determine the code block language based on file extension
            _, file_extension = os.path.splitext(file)
            language = ""
            if file_extension == ".py":
                language = "python"
            elif file_extension == ".yaml" or file_extension == ".yml":
                language = "yaml"
            elif file_extension == ".json":
                language = "json"
            elif file_extension == ".md":
                language = "markdown"
            elif file_extension == ".ts":
                language = "typescript"
            elif file_extension == ".js":
                language = "javascript"
            elif file_extension == ".tsx":
                language = "tsx"
            elif file_extension == ".jsx":
                language = "jsx"
            elif file_extension == ".css":
                language = "css"
            elif file_extension == ".html":
                language = "html"
            elif file_extension == ".toml":
                language = "toml"
            else:
                language = ""  # No specific language for unknown extensions

            # Add file content in Markdown format with the correct language
            markdown_content += f"## Fichier: `{file_path}`\n\n```"
            if language:
                markdown_content += language
            markdown_content += f"\n{content}\n```\n\n"
        except Exception as e:
            print(f"⚠️ Impossible de lire {file_path}: {e}")

    return markdown_content

# Project directory to scan (now a Git repository)
project_directory = "c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour"  # Use the current directory as an example, or change it to your project's path
# Generate the Markdown file
markdown_output = collect_source_files_from_git(project_directory)

if markdown_output:
    # Save to a file
    with open("projet.md", "w", encoding="utf-8") as md_file:
        md_file.write(markdown_output)

    print("✅ Fichier 'projet.md' généré avec succès !")
else:
    print("❌ La génération du fichier 'projet.md' a échoué.")

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\eslint.config.js`

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
      // Allow any authenticated user to update (e.g., join/leave)
      allow update: if request.auth != null;
      // Only allow the creator to delete
      allow delete: if request.auth != null && request.auth.uid == resource.data.creatorId;
    }
    match /tournaments/{tournamentId} {
      allow create: if request.auth != null;
      allow read: if true; // Allow anyone to read tournament details
      // Allow update if user is creator OR if user is a member of the associated team
      allow update: if request.auth != null &&
                       (request.auth.uid == resource.data.creatorId ||
                        get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.members.hasAny([request.auth.uid]));
      // Only allow the creator to delete
      allow delete: if request.auth != null && request.auth.uid == resource.data.creatorId;
    }
  }
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\index.html`

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/poker-chip.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PokerTour - Gestion de Tournois de Poker</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\package-lock.json`

```json
{
  "name": "poker-tour",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "poker-tour",
      "version": "0.0.0",
      "dependencies": {
        "clsx": "^2.1.0",
        "dom": "^0.0.3",
        "firebase": "^10.8.0",
        "lucide-react": "^0.344.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.22.3",
        "tailwind-merge": "^2.2.1",
        "uuid": "^11.1.0",
        "zustand": "^4.5.2"
      },
      "devDependencies": {
        "@eslint/js": "^9.9.1",
        "@types/react": "^18.3.5",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.1",
        "autoprefixer": "^10.4.18",
        "eslint": "^9.9.1",
        "eslint-plugin-react-hooks": "^5.1.0-rc.0",
        "eslint-plugin-react-refresh": "^0.4.11",
        "globals": "^15.9.0",
        "postcss": "^8.4.35",
        "tailwindcss": "^3.4.1",
        "typescript": "^5.5.3",
        "typescript-eslint": "^8.3.0",
        "vite": "^5.4.2"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@ampproject/remapping": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz",
      "integrity": "sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==",
      "dev": true,
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.25.7.tgz",
      "integrity": "sha512-0xZJFNE5XMpENsgfHYTw8FbX4kv53mFLn2i3XPoq69LyhYSCBJtitaHx9QnsVTrsogI4Z3+HtEfZ2/GFPOtf5g==",
      "dev": true,
      "dependencies": {
        "@babel/highlight": "^7.25.7",
        "picocolors": "^1.0.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.25.7.tgz",
      "integrity": "sha512-9ickoLz+hcXCeh7jrcin+/SLWm+GkxE2kTvoYyp38p4WkdFXfQJxDFGWp/YHjiKLPx06z2A7W8XKuqbReXDzsw==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.25.7.tgz",
      "integrity": "sha512-yJ474Zv3cwiSOO9nXJuqzvwEeM+chDuQ8GJirw+pZ91sCGCyOZ3dJkVE09fTV0VEVzXyLWhh3G/AolYTPX7Mow==",
      "dev": true,
      "dependencies": {
        "@ampproject/remapping": "^2.2.0",
        "@babel/code-frame": "^7.25.7",
        "@babel/generator": "^7.25.7",
        "@babel/helper-compilation-targets": "^7.25.7",
        "@babel/helper-module-transforms": "^7.25.7",
        "@babel/helpers": "^7.25.7",
        "@babel/parser": "^7.25.7",
        "@babel/template": "^7.25.7",
        "@babel/traverse": "^7.25.7",
        "@babel/types": "^7.25.7",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.25.7.tgz",
      "integrity": "sha512-5Dqpl5fyV9pIAD62yK9P7fcA768uVPUyrQmqpqstHWgMma4feF1x/oFysBCVZLY5wJ2GkMUCdsNDnGZrPoR6rA==",
      "dev": true,
      "dependencies": {
        "@babel/types": "^7.25.7",
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.25",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.25.7.tgz",
      "integrity": "sha512-DniTEax0sv6isaw6qSQSfV4gVRNtw2rte8HHM45t9ZR0xILaufBRNkpMifCRiAPyvL4ACD6v0gfCwCmtOQaV4A==",
      "dev": true,
      "dependencies": {
        "@babel/compat-data": "^7.25.7",
        "@babel/helper-validator-option": "^7.25.7",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.25.7.tgz",
      "integrity": "sha512-o0xCgpNmRohmnoWKQ0Ij8IdddjyBFE4T2kagL/x6M3+4zUgc+4qTOUBoNe4XxDskt1HPKO007ZPiMgLDq2s7Kw==",
      "dev": true,
      "dependencies": {
        "@babel/traverse": "^7.25.7",
        "@babel/types": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.25.7.tgz",
      "integrity": "sha512-k/6f8dKG3yDz/qCwSM+RKovjMix563SLxQFo0UhRNo239SP6n9u5/eLtKD6EAjwta2JHJ49CsD8pms2HdNiMMQ==",
      "dev": true,
      "dependencies": {
        "@babel/helper-module-imports": "^7.25.7",
        "@babel/helper-simple-access": "^7.25.7",
        "@babel/helper-validator-identifier": "^7.25.7",
        "@babel/traverse": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.25.7.tgz",
      "integrity": "sha512-eaPZai0PiqCi09pPs3pAFfl/zYgGaE6IdXtYvmf0qlcDTd3WCtO7JWCcRd64e0EQrcYgiHibEZnOGsSY4QSgaw==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-simple-access": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-simple-access/-/helper-simple-access-7.25.7.tgz",
      "integrity": "sha512-FPGAkJmyoChQeM+ruBGIDyrT2tKfZJO8NcxdC+CWNJi7N8/rZpSxK7yvBJ5O/nF1gfu5KzN7VKG3YVSLFfRSxQ==",
      "dev": true,
      "dependencies": {
        "@babel/traverse": "^7.25.7",
        "@babel/types": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.25.7.tgz",
      "integrity": "sha512-CbkjYdsJNHFk8uqpEkpCvRs3YRp9tY6FmFY7wLMSYuGYkrdUi7r2lc4/wqsvlHoMznX3WJ9IP8giGPq68T/Y6g==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.25.7.tgz",
      "integrity": "sha512-AM6TzwYqGChO45oiuPqwL2t20/HdMC1rTPAesnBCgPCSF1x3oN9MVUwQV2iyz4xqWrctwK5RNC8LV22kaQCNYg==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.25.7.tgz",
      "integrity": "sha512-ytbPLsm+GjArDYXJ8Ydr1c/KJuutjF2besPNbIZnZ6MKUxi/uTA22t2ymmA4WFjZFpjiAMO0xuuJPqK2nvDVfQ==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.25.7.tgz",
      "integrity": "sha512-Sv6pASx7Esm38KQpF/U/OXLwPPrdGHNKoeblRxgZRLXnAtnkEe4ptJPDtAZM7fBLadbc1Q07kQpSiGQ0Jg6tRA==",
      "dev": true,
      "dependencies": {
        "@babel/template": "^7.25.7",
        "@babel/types": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/highlight": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/highlight/-/highlight-7.25.7.tgz",
      "integrity": "sha512-iYyACpW3iW8Fw+ZybQK+drQre+ns/tKpXbNESfrhNnPLIklLbXr7MYJ6gPEd0iETGLOK+SxMjVvKb/ffmk+FEw==",
      "dev": true,
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.25.7",
        "chalk": "^2.4.2",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.0.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.25.7.tgz",
      "integrity": "sha512-aZn7ETtQsjjGG5HruveUK06cU3Hljuhd9Iojm4M8WWv3wLE6OkE5PWbDUkItmMgegmccaITudyuW5RPYrYlgWw==",
      "dev": true,
      "dependencies": {
        "@babel/types": "^7.25.7"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.25.7.tgz",
      "integrity": "sha512-JD9MUnLbPL0WdVK8AWC7F7tTG2OS6u/AKKnsK+NdRhUiVdnzyR1S3kKQCaRLOiaULvUiqK6Z4JQE635VgtCFeg==",
      "dev": true,
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.25.7.tgz",
      "integrity": "sha512-S/JXG/KrbIY06iyJPKfxr0qRxnhNOdkNXYBl/rmwgDd72cQLH9tEGkDm/yJPGvcSIUoikzfjMios9i+xT/uv9w==",
      "dev": true,
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.25.7.tgz",
      "integrity": "sha512-wRwtAgI3bAS+JGU2upWNL9lSlDcRCqD05BZ1n3X2ONLH1WilFP6O1otQjeMK/1g0pvYcXC7b/qVUB1keofjtZA==",
      "dev": true,
      "dependencies": {
        "@babel/code-frame": "^7.25.7",
        "@babel/parser": "^7.25.7",
        "@babel/types": "^7.25.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.25.7.tgz",
      "integrity": "sha512-jatJPT1Zjqvh/1FyJs6qAHL+Dzb7sTb+xr7Q+gM1b+1oBsMsQQ4FkVKb6dFlJvLlVssqkRzV05Jzervt9yhnzg==",
      "dev": true,
      "dependencies": {
        "@babel/code-frame": "^7.25.7",
        "@babel/generator": "^7.25.7",
        "@babel/parser": "^7.25.7",
        "@babel/template": "^7.25.7",
        "@babel/types": "^7.25.7",
        "debug": "^4.3.1",
        "globals": "^11.1.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse/node_modules/globals": {
      "version": "11.12.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-11.12.0.tgz",
      "integrity": "sha512-WOBp/EEGUiIsJSp7wcv/y6MO+lV9UoncWqxuFfm8eBwzWNgyfBd6Gz+IeKQ9jCmyhoH99g15M3T+QaVHFjizVA==",
      "dev": true,
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.25.7",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.25.7.tgz",
      "integrity": "sha512-vwIVdXG+j+FOpkwqHRcBgHLYNL7XMkufrlaFvL9o6Ai9sJn9+PdyIL5qa0XzTZw084c+u9LOls53eoZWP/W5WQ==",
      "dev": true,
      "dependencies": {
        "@babel/helper-string-parser": "^7.25.7",
        "@babel/helper-validator-identifier": "^7.25.7",
        "to-fast-properties": "^2.0.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.21.5.tgz",
      "integrity": "sha512-1SDgH6ZSPTlggy1yI6+Dbkiz8xzpHJEVAlF/AM1tHPLsf5STom9rwtjE4hKAF20FfXXNTFqEYXyJNWh1GiZedQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.21.5.tgz",
      "integrity": "sha512-vCPvzSjpPHEi1siZdlvAlsPxXl7WbOVUBBAowWug4rJHb68Ox8KualB+1ocNvT5fjv6wpkX6o/iEpbDrf68zcg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.21.5.tgz",
      "integrity": "sha512-c0uX9VAUBQ7dTDCjq+wdyGLowMdtR/GoC2U5IYk/7D1H1JYC0qseD7+11iMP2mRLN9RcCMRcjC4YMclCzGwS/A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.21.5.tgz",
      "integrity": "sha512-D7aPRUUNHRBwHxzxRvp856rjUHRFW1SdQATKXH2hqA0kAZb1hKmi02OpYRacl0TxIGz/ZmXWlbZgjwWYaCakTA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.21.5.tgz",
      "integrity": "sha512-DwqXqZyuk5AiWWf3UfLiRDJ5EDd49zg6O9wclZ7kUMv2WRFr4HKjXp/5t8JZ11QbQfUS6/cRCKGwYhtNAY88kQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.21.5.tgz",
      "integrity": "sha512-se/JjF8NlmKVG4kNIuyWMV/22ZaerB+qaSi5MdrXtd6R08kvs2qCN4C09miupktDitvh8jRFflwGFBQcxZRjbw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.21.5.tgz",
      "integrity": "sha512-5JcRxxRDUJLX8JXp/wcBCy3pENnCgBR9bN6JsY4OmhfUtIHe3ZW0mawA7+RDAcMLrMIZaf03NlQiX9DGyB8h4g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.21.5.tgz",
      "integrity": "sha512-J95kNBj1zkbMXtHVH29bBriQygMXqoVQOQYA+ISs0/2l3T9/kj42ow2mpqerRBxDJnmkUDCaQT/dfNXWX/ZZCQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.21.5.tgz",
      "integrity": "sha512-bPb5AHZtbeNGjCKVZ9UGqGwo8EUu4cLq68E95A53KlxAPRmUyYv2D6F0uUI65XisGOL1hBP5mTronbgo+0bFcA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.21.5.tgz",
      "integrity": "sha512-ibKvmyYzKsBeX8d8I7MH/TMfWDXBF3db4qM6sy+7re0YXya+K1cem3on9XgdT2EQGMu4hQyZhan7TeQ8XkGp4Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.21.5.tgz",
      "integrity": "sha512-YvjXDqLRqPDl2dvRODYmmhz4rPeVKYvppfGYKSNGdyZkA01046pLWyRKKI3ax8fbJoK5QbxblURkwK/MWY18Tg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.21.5.tgz",
      "integrity": "sha512-uHf1BmMG8qEvzdrzAqg2SIG/02+4/DHB6a9Kbya0XDvwDEKCoC8ZRWI5JJvNdUjtciBGFQ5PuBlpEOXQj+JQSg==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.21.5.tgz",
      "integrity": "sha512-IajOmO+KJK23bj52dFSNCMsz1QP1DqM6cwLUv3W1QwyxkyIWecfafnI555fvSGqEKwjMXVLokcV5ygHW5b3Jbg==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.21.5.tgz",
      "integrity": "sha512-1hHV/Z4OEfMwpLO8rp7CvlhBDnjsC3CttJXIhBi+5Aj5r+MBvy4egg7wCbe//hSsT+RvDAG7s81tAvpL2XAE4w==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.21.5.tgz",
      "integrity": "sha512-2HdXDMd9GMgTGrPWnJzP2ALSokE/0O5HhTUvWIbD3YdjME8JwvSCnNGBnTThKGEB91OZhzrJ4qIIxk/SBmyDDA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.21.5.tgz",
      "integrity": "sha512-zus5sxzqBJD3eXxwvjN1yQkRepANgxE9lgOW2qLnmr8ikMTphkjgXu1HR01K4FJg8h1kEEDAqDcZQtbrRnB41A==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.21.5.tgz",
      "integrity": "sha512-1rYdTpyv03iycF1+BhzrzQJCdOuAOtaqHTWJZCWvijKD2N5Xu0TtVC8/+1faWqcP9iBCWOmjmhoH94dH82BxPQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.21.5.tgz",
      "integrity": "sha512-Woi2MXzXjMULccIwMnLciyZH4nCIMpWQAs049KEeMvOcNADVxo0UBIQPfSmxB3CWKedngg7sWZdLvLczpe0tLg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.21.5.tgz",
      "integrity": "sha512-HLNNw99xsvx12lFBUwoT8EVCsSvRNDVxNpjZ7bPn947b8gJPzeHWyNVhFsaerc0n3TsbOINvRP2byTZ5LKezow==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.21.5.tgz",
      "integrity": "sha512-6+gjmFpfy0BHU5Tpptkuh8+uw3mnrvgs+dSPQXQOv3ekbordwnzTVEb4qnIvQcYXq6gzkyTnoZ9dZG+D4garKg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.21.5.tgz",
      "integrity": "sha512-Z0gOTd75VvXqyq7nsl93zwahcTROgqvuAcYDUr+vOv8uHhNSKROyU961kgtCD1e95IqPKSQKH7tBTslnS3tA8A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.21.5.tgz",
      "integrity": "sha512-SWXFF1CL2RVNMaVs+BBClwtfZSvDgtL//G/smwAc5oVK/UPu2Gu9tIaRgFmYFFKrmg3SyAjSrElf0TiJ1v8fYA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.21.5.tgz",
      "integrity": "sha512-tQd/1efJuzPC6rCFwEvLtci/xNFcTZknmXs98FYDfGE4wP9ClFV98nyKrzJKVPMhdDnjzLhdUyMX4PsQAPjwIw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.4.0",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.4.0.tgz",
      "integrity": "sha512-1/sA4dwrzBAyeUoQ6oxahHKmrZvsnLCg4RfxW3ZFGGmQkSNQPFNLV9CUEFQP1x9EYXHTo5p6xdhZM1Ne9p/AfA==",
      "dev": true,
      "dependencies": {
        "eslint-visitor-keys": "^3.3.0"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.11.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.11.1.tgz",
      "integrity": "sha512-m4DVN9ZqskZoLU5GlWZadwDnYo3vAEydiUayB9widCl9ffWx2IvPnp6n3on5rJmziJSw9Bv+Z3ChDVdMwXCY8Q==",
      "dev": true,
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.18.0",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.18.0.tgz",
      "integrity": "sha512-fTxvnS1sRMu3+JjXwJG0j/i4RT9u4qJ+lqS/yCGap4lH4zZGzQ7tu+xZqQmcMZq5OBZDL4QRxQzRjkWcGt8IVw==",
      "dev": true,
      "dependencies": {
        "@eslint/object-schema": "^2.1.4",
        "debug": "^4.3.1",
        "minimatch": "^3.1.2"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.6.0.tgz",
      "integrity": "sha512-8I2Q8ykA4J0x0o7cg67FPVnehcqWTBehu/lmY+bolPFHGjh49YzGBMXTvpqVgEbBdvNCSxj6iFgiIyHzf03lzg==",
      "dev": true,
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.1.0.tgz",
      "integrity": "sha512-4Bfj15dVJdoy3RfZmmo86RK1Fwzn6SstsvK9JS+BaVKqC6QQQQyXekNaC+g+LKNgkQ+2VhGAzm6hO40AhMR3zQ==",
      "dev": true,
      "dependencies": {
        "ajv": "^6.12.4",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.1.0",
        "minimatch": "^3.1.2",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.12.0",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.12.0.tgz",
      "integrity": "sha512-eohesHH8WFRUprDNyEREgqP6beG6htMeUYeCpkEgBCieCMme5r9zFWjzAJp//9S+Kub4rqE+jXe9Cp1a7IYIIA==",
      "dev": true,
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.4.tgz",
      "integrity": "sha512-BsWiH1yFGjXXS2yvrf5LyuoSIIbPrGUWob917o+BTKuZ7qJdxX8aJLRxs1fS9n6r7vESrq1OUqb68dANcFXuQQ==",
      "dev": true,
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.2.0.tgz",
      "integrity": "sha512-vH9PiIMMwvhCx31Af3HiGzsVNULDbyVkHXwlemn/B0TFj/00ho3y55efXrUZTfQipxoHC5u4xq6zblww1zm1Ig==",
      "dev": true,
      "dependencies": {
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@firebase/analytics": {
      "version": "0.10.8",
      "resolved": "https://registry.npmjs.org/@firebase/analytics/-/analytics-0.10.8.tgz",
      "integrity": "sha512-CVnHcS4iRJPqtIDc411+UmFldk0ShSK3OB+D0bKD8Ck5Vro6dbK5+APZpkuWpbfdL359DIQUnAaMLE+zs/PVyA==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/analytics-compat": {
      "version": "0.2.14",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-compat/-/analytics-compat-0.2.14.tgz",
      "integrity": "sha512-unRVY6SvRqfNFIAA/kwl4vK+lvQAL2HVcgu9zTrUtTyYDmtIt/lOuHJynBMYEgLnKm39YKBDhtqdapP2e++ASw==",
      "dependencies": {
        "@firebase/analytics": "0.10.8",
        "@firebase/analytics-types": "0.8.2",
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/analytics-types": {
      "version": "0.8.2",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-types/-/analytics-types-0.8.2.tgz",
      "integrity": "sha512-EnzNNLh+9/sJsimsA/FGqzakmrAUKLeJvjRHlg8df1f97NLUlFidk9600y0ZgWOp3CAxn6Hjtk+08tixlUOWyw=="
    },
    "node_modules/@firebase/app": {
      "version": "0.10.13",
      "resolved": "https://registry.npmjs.org/@firebase/app/-/app-0.10.13.tgz",
      "integrity": "sha512-OZiDAEK/lDB6xy/XzYAyJJkaDqmQ+BCtOEPLqFvxWKUz5JbBmej7IiiRHdtiIOD/twW7O5AxVsfaaGA/V1bNsA==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/app-check": {
      "version": "0.8.8",
      "resolved": "https://registry.npmjs.org/@firebase/app-check/-/app-check-0.8.8.tgz",
      "integrity": "sha512-O49RGF1xj7k6BuhxGpHmqOW5hqBIAEbt2q6POW0lIywx7emYtzPDeQI+ryQpC4zbKX646SoVZ711TN1DBLNSOQ==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/app-check-compat": {
      "version": "0.3.15",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-compat/-/app-check-compat-0.3.15.tgz",
      "integrity": "sha512-zFIvIFFNqDXpOT2huorz9cwf56VT3oJYRFjSFYdSbGYEJYEaXjLJbfC79lx/zjx4Fh+yuN8pry3TtvwaevrGbg==",
      "dependencies": {
        "@firebase/app-check": "0.8.8",
        "@firebase/app-check-types": "0.5.2",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/app-check-interop-types": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.2.tgz",
      "integrity": "sha512-LMs47Vinv2HBMZi49C09dJxp0QT5LwDzFaVGf/+ITHe3BlIhUiLNttkATSXplc89A2lAaeTqjgqVkiRfUGyQiQ=="
    },
    "node_modules/@firebase/app-check-types": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-types/-/app-check-types-0.5.2.tgz",
      "integrity": "sha512-FSOEzTzL5bLUbD2co3Zut46iyPWML6xc4x+78TeaXMSuJap5QObfb+rVvZJtla3asN4RwU7elaQaduP+HFizDA=="
    },
    "node_modules/@firebase/app-compat": {
      "version": "0.2.43",
      "resolved": "https://registry.npmjs.org/@firebase/app-compat/-/app-compat-0.2.43.tgz",
      "integrity": "sha512-HM96ZyIblXjAC7TzE8wIk2QhHlSvksYkQ4Ukh1GmEenzkucSNUmUX4QvoKrqeWsLEQ8hdcojABeCV8ybVyZmeg==",
      "dependencies": {
        "@firebase/app": "0.10.13",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/app-types": {
      "version": "0.9.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-types/-/app-types-0.9.2.tgz",
      "integrity": "sha512-oMEZ1TDlBz479lmABwWsWjzHwheQKiAgnuKxE0pz0IXCVx7/rtlkx1fQ6GfgK24WCrxDKMplZrT50Kh04iMbXQ=="
    },
    "node_modules/@firebase/auth": {
      "version": "1.7.9",
      "resolved": "https://registry.npmjs.org/@firebase/auth/-/auth-1.7.9.tgz",
      "integrity": "sha512-yLD5095kVgDw965jepMyUrIgDklD6qH/BZNHeKOgvu7pchOKNjVM+zQoOVYJIKWMWOWBq8IRNVU6NXzBbozaJg==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@react-native-async-storage/async-storage": "^1.18.1"
      },
      "peerDependenciesMeta": {
        "@react-native-async-storage/async-storage": {
          "optional": true
        }
      }
    },
    "node_modules/@firebase/auth-compat": {
      "version": "0.5.14",
      "resolved": "https://registry.npmjs.org/@firebase/auth-compat/-/auth-compat-0.5.14.tgz",
      "integrity": "sha512-2eczCSqBl1KUPJacZlFpQayvpilg3dxXLy9cSMTKtQMTQSmondUtPI47P3ikH3bQAXhzKLOE+qVxJ3/IRtu9pw==",
      "dependencies": {
        "@firebase/auth": "1.7.9",
        "@firebase/auth-types": "0.12.2",
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/auth-interop-types": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@firebase/auth-interop-types/-/auth-interop-types-0.2.3.tgz",
      "integrity": "sha512-Fc9wuJGgxoxQeavybiuwgyi+0rssr76b+nHpj+eGhXFYAdudMWyfBHvFL/I5fEHniUM/UQdFzi9VXJK2iZF7FQ=="
    },
    "node_modules/@firebase/auth-types": {
      "version": "0.12.2",
      "resolved": "https://registry.npmjs.org/@firebase/auth-types/-/auth-types-0.12.2.tgz",
      "integrity": "sha512-qsEBaRMoGvHO10unlDJhaKSuPn4pyoTtlQuP1ghZfzB6rNQPuhp/N/DcFZxm9i4v0SogjCbf9reWupwIvfmH6w==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/component": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/component/-/component-0.6.9.tgz",
      "integrity": "sha512-gm8EUEJE/fEac86AvHn8Z/QW8BvR56TBw3hMW0O838J/1mThYQXAIQBgUv75EqlCZfdawpWLrKt1uXvp9ciK3Q==",
      "dependencies": {
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/data-connect": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/@firebase/data-connect/-/data-connect-0.1.0.tgz",
      "integrity": "sha512-vSe5s8dY13ilhLnfY0eYRmQsdTbH7PUFZtBbqU6JVX/j8Qp9A6G5gG6//ulbX9/1JFOF1IWNOne9c8S/DOCJaQ==",
      "dependencies": {
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/database": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@firebase/database/-/database-1.0.8.tgz",
      "integrity": "sha512-dzXALZeBI1U5TXt6619cv0+tgEhJiwlUtQ55WNZY7vGAjv7Q1QioV969iYwt1AQQ0ovHnEW0YW9TiBfefLvErg==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "faye-websocket": "0.11.4",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/database-compat": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@firebase/database-compat/-/database-compat-1.0.8.tgz",
      "integrity": "sha512-OpeWZoPE3sGIRPBKYnW9wLad25RaWbGyk7fFQe4xnJQKRzlynWeFBSRRAoLE2Old01WXwskUiucNqUUVlFsceg==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/database": "1.0.8",
        "@firebase/database-types": "1.0.5",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/database-types": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/@firebase/database-types/-/database-types-1.0.5.tgz",
      "integrity": "sha512-fTlqCNwFYyq/C6W7AJ5OCuq5CeZuBEsEwptnVxlNPkWCo5cTTyukzAHRSO/jaQcItz33FfYrrFk1SJofcu2AaQ==",
      "dependencies": {
        "@firebase/app-types": "0.9.2",
        "@firebase/util": "1.10.0"
      }
    },
    "node_modules/@firebase/firestore": {
      "version": "4.7.3",
      "resolved": "https://registry.npmjs.org/@firebase/firestore/-/firestore-4.7.3.tgz",
      "integrity": "sha512-NwVU+JPZ/3bhvNSJMCSzfcBZZg8SUGyzZ2T0EW3/bkUeefCyzMISSt/TTIfEHc8cdyXGlMqfGe3/62u9s74UEg==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "@firebase/webchannel-wrapper": "1.0.1",
        "@grpc/grpc-js": "~1.9.0",
        "@grpc/proto-loader": "^0.7.8",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "engines": {
        "node": ">=10.10.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/firestore-compat": {
      "version": "0.3.38",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-compat/-/firestore-compat-0.3.38.tgz",
      "integrity": "sha512-GoS0bIMMkjpLni6StSwRJarpu2+S5m346Na7gr9YZ/BZ/W3/8iHGNr9PxC+f0rNZXqS4fGRn88pICjrZEgbkqQ==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/firestore": "4.7.3",
        "@firebase/firestore-types": "3.0.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/firestore-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-types/-/firestore-types-3.0.2.tgz",
      "integrity": "sha512-wp1A+t5rI2Qc/2q7r2ZpjUXkRVPtGMd6zCLsiWurjsQpqPgFin3AhNibKcIzoF2rnToNa/XYtyWXuifjOOwDgg==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/functions": {
      "version": "0.11.8",
      "resolved": "https://registry.npmjs.org/@firebase/functions/-/functions-0.11.8.tgz",
      "integrity": "sha512-Lo2rTPDn96naFIlSZKVd1yvRRqqqwiJk7cf9TZhUerwnPKgBzXy+aHE22ry+6EjCaQusUoNai6mU6p+G8QZT1g==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/messaging-interop-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/functions-compat": {
      "version": "0.3.14",
      "resolved": "https://registry.npmjs.org/@firebase/functions-compat/-/functions-compat-0.3.14.tgz",
      "integrity": "sha512-dZ0PKOKQFnOlMfcim39XzaXonSuPPAVuzpqA4ONTIdyaJK/OnBaIEVs/+BH4faa1a2tLeR+Jy15PKqDRQoNIJw==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/functions": "0.11.8",
        "@firebase/functions-types": "0.6.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/functions-types": {
      "version": "0.6.2",
      "resolved": "https://registry.npmjs.org/@firebase/functions-types/-/functions-types-0.6.2.tgz",
      "integrity": "sha512-0KiJ9lZ28nS2iJJvimpY4nNccV21rkQyor5Iheu/nq8aKXJqtJdeSlZDspjPSBBiHRzo7/GMUttegnsEITqR+w=="
    },
    "node_modules/@firebase/installations": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/installations/-/installations-0.6.9.tgz",
      "integrity": "sha512-hlT7AwCiKghOX3XizLxXOsTFiFCQnp/oj86zp1UxwDGmyzsyoxtX+UIZyVyH/oBF5+XtblFG9KZzZQ/h+dpy+Q==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/installations-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/installations-compat/-/installations-compat-0.2.9.tgz",
      "integrity": "sha512-2lfdc6kPXR7WaL4FCQSQUhXcPbI7ol3wF+vkgtU25r77OxPf8F/VmswQ7sgIkBBWtymn5ZF20TIKtnOj9rjb6w==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/installations-types": "0.5.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/installations-types": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/@firebase/installations-types/-/installations-types-0.5.2.tgz",
      "integrity": "sha512-que84TqGRZJpJKHBlF2pkvc1YcXrtEDOVGiDjovP/a3s6W4nlbohGXEsBJo0JCeeg/UG9A+DEZVDUV9GpklUzA==",
      "peerDependencies": {
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/logger": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@firebase/logger/-/logger-0.4.2.tgz",
      "integrity": "sha512-Q1VuA5M1Gjqrwom6I6NUU4lQXdo9IAQieXlujeHZWvRt1b7qQ0KwBaNAjgxG27jgF9/mUwsNmO8ptBCGVYhB0A==",
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/messaging": {
      "version": "0.12.12",
      "resolved": "https://registry.npmjs.org/@firebase/messaging/-/messaging-0.12.12.tgz",
      "integrity": "sha512-6q0pbzYBJhZEtUoQx7hnPhZvAbuMNuBXKQXOx2YlWhSrlv9N1m0ZzlNpBbu/ItTzrwNKTibdYzUyaaxdWLg+4w==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/messaging-interop-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/messaging-compat": {
      "version": "0.2.12",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-compat/-/messaging-compat-0.2.12.tgz",
      "integrity": "sha512-pKsiUVZrbmRgdImYqhBNZlkKJbqjlPkVdQRZGRbkTyX4OSGKR0F/oJeCt1a8jEg5UnBp4fdVwSWSp4DuCovvEQ==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/messaging": "0.12.12",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/messaging-interop-types": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-interop-types/-/messaging-interop-types-0.2.2.tgz",
      "integrity": "sha512-l68HXbuD2PPzDUOFb3aG+nZj5KA3INcPwlocwLZOzPp9rFM9yeuI9YLl6DQfguTX5eAGxO0doTR+rDLDvQb5tA=="
    },
    "node_modules/@firebase/performance": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/performance/-/performance-0.6.9.tgz",
      "integrity": "sha512-PnVaak5sqfz5ivhua+HserxTJHtCar/7zM0flCX6NkzBNzJzyzlH4Hs94h2Il0LQB99roBqoE5QT1JqWqcLJHQ==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/performance-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/performance-compat/-/performance-compat-0.2.9.tgz",
      "integrity": "sha512-dNl95IUnpsu3fAfYBZDCVhXNkASE0uo4HYaEPd2/PKscfTvsgqFAOxfAXzBEDOnynDWiaGUnb5M1O00JQ+3FXA==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/performance": "0.6.9",
        "@firebase/performance-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/performance-types": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/@firebase/performance-types/-/performance-types-0.2.2.tgz",
      "integrity": "sha512-gVq0/lAClVH5STrIdKnHnCo2UcPLjJlDUoEB/tB4KM+hAeHUxWKnpT0nemUPvxZ5nbdY/pybeyMe8Cs29gEcHA=="
    },
    "node_modules/@firebase/remote-config": {
      "version": "0.4.9",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config/-/remote-config-0.4.9.tgz",
      "integrity": "sha512-EO1NLCWSPMHdDSRGwZ73kxEEcTopAxX1naqLJFNApp4hO8WfKfmEpmjxmP5TrrnypjIf2tUkYaKsfbEA7+AMmA==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-compat/-/remote-config-compat-0.2.9.tgz",
      "integrity": "sha512-AxzGpWfWFYejH2twxfdOJt5Cfh/ATHONegTd/a0p5flEzsD5JsxXgfkFToop+mypEL3gNwawxrxlZddmDoNxyA==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/remote-config": "0.4.9",
        "@firebase/remote-config-types": "0.3.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-types": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-types/-/remote-config-types-0.3.2.tgz",
      "integrity": "sha512-0BC4+Ud7y2aPTyhXJTMTFfrGGLqdYXrUB9sJVAB8NiqJswDTc4/2qrE/yfUbnQJhbSi6ZaTTBKyG3n1nplssaA=="
    },
    "node_modules/@firebase/storage": {
      "version": "0.13.2",
      "resolved": "https://registry.npmjs.org/@firebase/storage/-/storage-0.13.2.tgz",
      "integrity": "sha512-fxuJnHshbhVwuJ4FuISLu+/76Aby2sh+44ztjF2ppoe0TELIDxPW6/r1KGlWYt//AD0IodDYYA8ZTN89q8YqUw==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/storage-compat": {
      "version": "0.3.12",
      "resolved": "https://registry.npmjs.org/@firebase/storage-compat/-/storage-compat-0.3.12.tgz",
      "integrity": "sha512-hA4VWKyGU5bWOll+uwzzhEMMYGu9PlKQc1w4DWxB3aIErWYzonrZjF0icqNQZbwKNIdh8SHjZlFeB2w6OSsjfg==",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/storage": "0.13.2",
        "@firebase/storage-types": "0.8.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/storage-types": {
      "version": "0.8.2",
      "resolved": "https://registry.npmjs.org/@firebase/storage-types/-/storage-types-0.8.2.tgz",
      "integrity": "sha512-0vWu99rdey0g53lA7IShoA2Lol1jfnPovzLDUBuon65K7uKG9G+L5uO05brD9pMw+l4HRFw23ah3GwTGpEav6g==",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/util": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@firebase/util/-/util-1.10.0.tgz",
      "integrity": "sha512-xKtx4A668icQqoANRxyDLBLz51TAbDP9KRfpbKGxiCAW346d0BeJe5vN6/hKxxmWwnZ0mautyv39JxviwwQMOQ==",
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/vertexai-preview": {
      "version": "0.0.4",
      "resolved": "https://registry.npmjs.org/@firebase/vertexai-preview/-/vertexai-preview-0.0.4.tgz",
      "integrity": "sha512-EBSqyu9eg8frQlVU9/HjKtHN7odqbh9MtAcVz3WwHj4gLCLOoN9F/o+oxlq3CxvFrd3CNTZwu6d2mZtVlEInng==",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/webchannel-wrapper": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@firebase/webchannel-wrapper/-/webchannel-wrapper-1.0.1.tgz",
      "integrity": "sha512-jmEnr/pk0yVkA7mIlHNnxCi+wWzOFUg0WyIotgkKAb2u1J7fAeDBcVNSTjTihbAYNusCLQdW5s9IJ5qwnEufcQ=="
    },
    "node_modules/@grpc/grpc-js": {
      "version": "1.9.15",
      "resolved": "https://registry.npmjs.org/@grpc/grpc-js/-/grpc-js-1.9.15.tgz",
      "integrity": "sha512-nqE7Hc0AzI+euzUwDAy0aY5hCp10r734gMGRdU+qOPX0XSceI2ULrcXB5U2xSc5VkWwalCj4M7GzCAygZl2KoQ==",
      "dependencies": {
        "@grpc/proto-loader": "^0.7.8",
        "@types/node": ">=12.12.47"
      },
      "engines": {
        "node": "^8.13.0 || >=10.10.0"
      }
    },
    "node_modules/@grpc/proto-loader": {
      "version": "0.7.13",
      "resolved": "https://registry.npmjs.org/@grpc/proto-loader/-/proto-loader-0.7.13.tgz",
      "integrity": "sha512-AiXO/bfe9bmxBjxxtYxFAXGZvMaN5s8kO+jBHAJCON8rJoB5YS/D6X7ZNc6XQkuHNmyl4CYaMI1fJ/Gn27RGGw==",
      "dependencies": {
        "lodash.camelcase": "^4.3.0",
        "long": "^5.0.0",
        "protobufjs": "^7.2.5",
        "yargs": "^17.7.2"
      },
      "bin": {
        "proto-loader-gen-types": "build/bin/proto-loader-gen-types.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.0",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.0.tgz",
      "integrity": "sha512-2cbWIHbZVEweE853g8jymffCA+NCMiuqeECeBBLm8dg2oFdjuGJhgN4UAbI+6v0CKbbhvtXA4qV8YR5Ji86nmw==",
      "dev": true,
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.5",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.5.tgz",
      "integrity": "sha512-KSPA4umqSG4LHYRodq31VDwKAvaTF4xmVlzM8Aeh4PlU1JQ3IG0wiA8C25d3RQ9nJyM3mBHyI53K06VVL/oFFg==",
      "dev": true,
      "dependencies": {
        "@humanfs/core": "^0.19.0",
        "@humanwhocodes/retry": "^0.3.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.3.1.tgz",
      "integrity": "sha512-JBxkERygn7Bv/GbN5Rv8Ul6LVknS+5Bp6RgDC/O8gEBU/yeH5Ui5C/OlWrTb6qct7LjjfT6Re2NxB0ln0yYybA==",
      "dev": true,
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@isaacs/cliui": {
      "version": "8.0.2",
      "resolved": "https://registry.npmjs.org/@isaacs/cliui/-/cliui-8.0.2.tgz",
      "integrity": "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==",
      "dev": true,
      "dependencies": {
        "string-width": "^5.1.2",
        "string-width-cjs": "npm:string-width@^4.2.0",
        "strip-ansi": "^7.0.1",
        "strip-ansi-cjs": "npm:strip-ansi@^6.0.1",
        "wrap-ansi": "^8.1.0",
        "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.5.tgz",
      "integrity": "sha512-IzL8ZoEDIBRWEzlCcRhOaCupYyN5gdIK+Q6fbFdPDg6HqX6jpkItn7DFIpW9LQzXG6Df9sA7+OKnq0qlz/GaQg==",
      "dev": true,
      "dependencies": {
        "@jridgewell/set-array": "^1.2.1",
        "@jridgewell/sourcemap-codec": "^1.4.10",
        "@jridgewell/trace-mapping": "^0.3.24"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/set-array": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@jridgewell/set-array/-/set-array-1.2.1.tgz",
      "integrity": "sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==",
      "dev": true,
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.0.tgz",
      "integrity": "sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==",
      "dev": true
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.25",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.25.tgz",
      "integrity": "sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==",
      "dev": true,
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@pkgjs/parseargs": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/@pkgjs/parseargs/-/parseargs-0.11.0.tgz",
      "integrity": "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==",
      "dev": true,
      "optional": true,
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/@protobufjs/aspromise": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
      "integrity": "sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ=="
    },
    "node_modules/@protobufjs/base64": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/base64/-/base64-1.1.2.tgz",
      "integrity": "sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg=="
    },
    "node_modules/@protobufjs/codegen": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/@protobufjs/codegen/-/codegen-2.0.4.tgz",
      "integrity": "sha512-YyFaikqM5sH0ziFZCN3xDC7zeGaB/d0IUb9CATugHWbd1FRFwWwt4ld4OYMPWu5a3Xe01mGAULCdqhMlPl29Jg=="
    },
    "node_modules/@protobufjs/eventemitter": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/eventemitter/-/eventemitter-1.1.0.tgz",
      "integrity": "sha512-j9ednRT81vYJ9OfVuXG6ERSTdEL1xVsNgqpkxMsbIabzSo3goCjDIveeGv5d03om39ML71RdmrGNjG5SReBP/Q=="
    },
    "node_modules/@protobufjs/fetch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/fetch/-/fetch-1.1.0.tgz",
      "integrity": "sha512-lljVXpqXebpsijW71PZaCYeIcE5on1w5DlQy5WH6GLbFryLUrBD4932W/E2BSpfRJWseIL4v/KPgBFxDOIdKpQ==",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.1",
        "@protobufjs/inquire": "^1.1.0"
      }
    },
    "node_modules/@protobufjs/float": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/float/-/float-1.0.2.tgz",
      "integrity": "sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ=="
    },
    "node_modules/@protobufjs/inquire": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/inquire/-/inquire-1.1.0.tgz",
      "integrity": "sha512-kdSefcPdruJiFMVSbn801t4vFK7KB/5gd2fYvrxhuJYg8ILrmn9SKSX2tZdV6V+ksulWqS7aXjBcRXl3wHoD9Q=="
    },
    "node_modules/@protobufjs/path": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/path/-/path-1.1.2.tgz",
      "integrity": "sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA=="
    },
    "node_modules/@protobufjs/pool": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/pool/-/pool-1.1.0.tgz",
      "integrity": "sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw=="
    },
    "node_modules/@protobufjs/utf8": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/utf8/-/utf8-1.1.0.tgz",
      "integrity": "sha512-Vvn3zZrhQZkkBE8LSuW3em98c0FwgO4nxzv6OdSxPKJIEKY2bGbHn+mhGIPerzI4twdxaP8/0+06HBpwf345Lw=="
    },
    "node_modules/@remix-run/router": {
      "version": "1.21.1",
      "resolved": "https://registry.npmjs.org/@remix-run/router/-/router-1.21.1.tgz",
      "integrity": "sha512-KeBYSwohb8g4/wCcnksvKTYlg69O62sQeLynn2YE+5z7JWEj95if27kclW9QqbrlsQ2DINI8fjbV3zyuKfwjKg==",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.24.0.tgz",
      "integrity": "sha512-Q6HJd7Y6xdB48x8ZNVDOqsbh2uByBhgK8PiQgPhwkIw/HC/YX5Ghq2mQY5sRMZWHb3VsFkWooUVOZHKr7DmDIA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.24.0.tgz",
      "integrity": "sha512-ijLnS1qFId8xhKjT81uBHuuJp2lU4x2yxa4ctFPtG+MqEE6+C5f/+X/bStmxapgmwLwiL3ih122xv8kVARNAZA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.24.0.tgz",
      "integrity": "sha512-bIv+X9xeSs1XCk6DVvkO+S/z8/2AMt/2lMqdQbMrmVpgFvXlmde9mLcbQpztXm1tajC3raFDqegsH18HQPMYtA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.24.0.tgz",
      "integrity": "sha512-X6/nOwoFN7RT2svEQWUsW/5C/fYMBe4fnLK9DQk4SX4mgVBiTA9h64kjUYPvGQ0F/9xwJ5U5UfTbl6BEjaQdBQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.24.0.tgz",
      "integrity": "sha512-0KXvIJQMOImLCVCz9uvvdPgfyWo93aHHp8ui3FrtOP57svqrF/roSSR5pjqL2hcMp0ljeGlU4q9o/rQaAQ3AYA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.24.0.tgz",
      "integrity": "sha512-it2BW6kKFVh8xk/BnHfakEeoLPv8STIISekpoF+nBgWM4d55CZKc7T4Dx1pEbTnYm/xEKMgy1MNtYuoA8RFIWw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.24.0.tgz",
      "integrity": "sha512-i0xTLXjqap2eRfulFVlSnM5dEbTVque/3Pi4g2y7cxrs7+a9De42z4XxKLYJ7+OhE3IgxvfQM7vQc43bwTgPwA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.24.0.tgz",
      "integrity": "sha512-9E6MKUJhDuDh604Qco5yP/3qn3y7SLXYuiC0Rpr89aMScS2UAmK1wHP2b7KAa1nSjWJc/f/Lc0Wl1L47qjiyQw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-powerpc64le-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-powerpc64le-gnu/-/rollup-linux-powerpc64le-gnu-4.24.0.tgz",
      "integrity": "sha512-2XFFPJ2XMEiF5Zi2EBf4h73oR1V/lycirxZxHZNc93SqDN/IWhYYSYj8I9381ikUFXZrz2v7r2tOVk2NBwxrWw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.24.0.tgz",
      "integrity": "sha512-M3Dg4hlwuntUCdzU7KjYqbbd+BLq3JMAOhCKdBE3TcMGMZbKkDdJ5ivNdehOssMCIokNHFOsv7DO4rlEOfyKpg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.24.0.tgz",
      "integrity": "sha512-mjBaoo4ocxJppTorZVKWFpy1bfFj9FeCMJqzlMQGjpNPY9JwQi7OuS1axzNIk0nMX6jSgy6ZURDZ2w0QW6D56g==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.24.0.tgz",
      "integrity": "sha512-ZXFk7M72R0YYFN5q13niV0B7G8/5dcQ9JDp8keJSfr3GoZeXEoMHP/HlvqROA3OMbMdfr19IjCeNAnPUG93b6A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.24.0.tgz",
      "integrity": "sha512-w1i+L7kAXZNdYl+vFvzSZy8Y1arS7vMgIy8wusXJzRrPyof5LAb02KGr1PD2EkRcl73kHulIID0M501lN+vobQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.24.0.tgz",
      "integrity": "sha512-VXBrnPWgBpVDCVY6XF3LEW0pOU51KbaHhccHw6AS6vBWIC60eqsH19DAeeObl+g8nKAz04QFdl/Cefta0xQtUQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.24.0.tgz",
      "integrity": "sha512-xrNcGDU0OxVcPTH/8n/ShH4UevZxKIO6HJFK0e15XItZP2UcaiLFd5kiX7hJnqCbSztUF8Qot+JWBC/QXRPYWQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.24.0.tgz",
      "integrity": "sha512-fbMkAF7fufku0N2dE5TBXcNlg0pt0cJue4xBRE2Qc5Vqikxr4VCgKj/ht6SMdFcOacVA9rqF70APJ8RN/4vMJw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "dev": true,
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.6.8",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.6.8.tgz",
      "integrity": "sha512-ASsj+tpEDsEiFr1arWrlN6V3mdfjRMZt6LtK/Vp/kreFLnr5QH5+DhvD5nINYZXzwJvXeGq+05iUXcAzVrqWtw==",
      "dev": true,
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "dev": true,
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.20.6",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.20.6.tgz",
      "integrity": "sha512-r1bzfrm0tomOI8g1SzvCaQHo6Lcv6zu0EA+W2kHrt8dyrHQxGzBBL4kdkzIS+jBMV+EYcMAEAqXqYaLJq5rOZg==",
      "dev": true,
      "dependencies": {
        "@babel/types": "^7.20.7"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.6.tgz",
      "integrity": "sha512-AYnb1nQyY49te+VRAVgmzfcgjYS91mY5P0TKUDCLEM+gNnA+3T6rWITXRLYCpahpqSQbN5cE+gHpnPyXjHWxcw==",
      "dev": true
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true
    },
    "node_modules/@types/node": {
      "version": "22.10.7",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.10.7.tgz",
      "integrity": "sha512-V09KvXxFiutGp6B7XkpaDXlNadZxrzajcY50EuoLIpQ6WWYCSvf19lVIazzfIzQvhUN2HjX12spLojTnhuKlGg==",
      "dependencies": {
        "undici-types": "~6.20.0"
      }
    },
    "node_modules/@types/prop-types": {
      "version": "15.7.13",
      "resolved": "https://registry.npmjs.org/@types/prop-types/-/prop-types-15.7.13.tgz",
      "integrity": "sha512-hCZTSvwbzWGvhqxp/RqVqwU999pBf2vp7hzIjiYOsl8wqOmUxkQ6ddw1cV3l8811+kdUFus/q4d1Y3E3SyEifA==",
      "devOptional": true
    },
    "node_modules/@types/react": {
      "version": "18.3.11",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-18.3.11.tgz",
      "integrity": "sha512-r6QZ069rFTjrEYgFdOck1gK7FLVsgJE7tTz0pQBczlBNUhBNk0MQH4UbnFSwjpQLMkLzgqvBBa+qGpLje16eTQ==",
      "devOptional": true,
      "dependencies": {
        "@types/prop-types": "*",
        "csstype": "^3.0.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "18.3.0",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-18.3.0.tgz",
      "integrity": "sha512-EhwApuTmMBmXuFOikhQLIBUn6uFg81SwLMOAUgodJF14SOBOCMdU04gDoYi0WOJJHD144TL32z4yDqCW3dnkQg==",
      "dev": true,
      "dependencies": {
        "@types/react": "*"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.8.1.tgz",
      "integrity": "sha512-xfvdgA8AP/vxHgtgU310+WBnLB4uJQ9XdyP17RebG26rLtDrQJV3ZYrcopX91GrHmMoH8bdSwMRh2a//TiJ1jQ==",
      "dev": true,
      "dependencies": {
        "@eslint-community/regexpp": "^4.10.0",
        "@typescript-eslint/scope-manager": "8.8.1",
        "@typescript-eslint/type-utils": "8.8.1",
        "@typescript-eslint/utils": "8.8.1",
        "@typescript-eslint/visitor-keys": "8.8.1",
        "graphemer": "^1.4.0",
        "ignore": "^5.3.1",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.0.0 || ^8.0.0-alpha.0",
        "eslint": "^8.57.0 || ^9.0.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.8.1.tgz",
      "integrity": "sha512-hQUVn2Lij2NAxVFEdvIGxT9gP1tq2yM83m+by3whWFsWC+1y8pxxxHUFE1UqDu2VsGi2i6RLcv4QvouM84U+ow==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.8.1",
        "@typescript-eslint/types": "8.8.1",
        "@typescript-eslint/typescript-estree": "8.8.1",
        "@typescript-eslint/visitor-keys": "8.8.1",
        "debug": "^4.3.4"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.8.1.tgz",
      "integrity": "sha512-X4JdU+66Mazev/J0gfXlcC/dV6JI37h+93W9BRYXrSn0hrE64IoWgVkO9MSJgEzoWkxONgaQpICWg8vAN74wlA==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/types": "8.8.1",
        "@typescript-eslint/visitor-keys": "8.8.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.8.1.tgz",
      "integrity": "sha512-qSVnpcbLP8CALORf0za+vjLYj1Wp8HSoiI8zYU5tHxRVj30702Z1Yw4cLwfNKhTPWp5+P+k1pjmD5Zd1nhxiZA==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/typescript-estree": "8.8.1",
        "@typescript-eslint/utils": "8.8.1",
        "debug": "^4.3.4",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.8.1.tgz",
      "integrity": "sha512-WCcTP4SDXzMd23N27u66zTKMuEevH4uzU8C9jf0RO4E04yVHgQgW+r+TeVTNnO1KIfrL8ebgVVYYMMO3+jC55Q==",
      "dev": true,
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.8.1.tgz",
      "integrity": "sha512-A5d1R9p+X+1js4JogdNilDuuq+EHZdsH9MjTVxXOdVFfTJXunKJR/v+fNNyO4TnoOn5HqobzfRlc70NC6HTcdg==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/types": "8.8.1",
        "@typescript-eslint/visitor-keys": "8.8.1",
        "debug": "^4.3.4",
        "fast-glob": "^3.3.2",
        "is-glob": "^4.0.3",
        "minimatch": "^9.0.4",
        "semver": "^7.6.0",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.1.tgz",
      "integrity": "sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==",
      "dev": true,
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.5.tgz",
      "integrity": "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==",
      "dev": true,
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/semver": {
      "version": "7.6.3",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.6.3.tgz",
      "integrity": "sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==",
      "dev": true,
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.8.1.tgz",
      "integrity": "sha512-/QkNJDbV0bdL7H7d0/y0qBbV2HTtf0TIyjSDTvvmQEzeVx8jEImEbLuOA4EsvE8gIgqMitns0ifb5uQhMj8d9w==",
      "dev": true,
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.4.0",
        "@typescript-eslint/scope-manager": "8.8.1",
        "@typescript-eslint/types": "8.8.1",
        "@typescript-eslint/typescript-estree": "8.8.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.8.1.tgz",
      "integrity": "sha512-0/TdC3aeRAsW7MDvYRwEc1Uwm0TIBfzjPFgg60UU2Haj5qsCs9cc3zNgY71edqE3LbWfF/WoZQd3lJoDXFQpag==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/types": "8.8.1",
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "4.3.2",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-4.3.2.tgz",
      "integrity": "sha512-hieu+o05v4glEBucTcKMK3dlES0OeJlD9YVOAPraVMOInBCwzumaIFiUjr4bHK7NPgnAHgiskUoceKercrN8vg==",
      "dev": true,
      "dependencies": {
        "@babel/core": "^7.25.2",
        "@babel/plugin-transform-react-jsx-self": "^7.24.7",
        "@babel/plugin-transform-react-jsx-source": "^7.24.7",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.14.2"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0"
      }
    },
    "node_modules/acorn": {
      "version": "8.12.1",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.12.1.tgz",
      "integrity": "sha512-tcpGyI9zbizT9JbV6oYE477V6mTlXvvi0T0G3SNIYE2apm/G5huBa1+K89VGeovbg+jycCrfhl3ADxErOuO6Jg==",
      "dev": true,
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.12.6",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.12.6.tgz",
      "integrity": "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==",
      "dev": true,
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-regex": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.1.0.tgz",
      "integrity": "sha512-7HSX4QQb4CspciLpVFwyRe79O3xsIZDDLER21kERQ71oaPodF8jL725AgJMFAYbooIqolJoRLuM81SpeUkpkvA==",
      "dev": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/ansi-styles": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-3.2.1.tgz",
      "integrity": "sha512-VT0ZI6kZRdTh8YyJw3SMbYm/u+NqfsAxEpWO0Pf9sq8/e94WxxOpPKx9FR1FlyCtOVDNOQ+8ntlqFxiRc+r5qA==",
      "dev": true,
      "dependencies": {
        "color-convert": "^1.9.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/any-promise": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/any-promise/-/any-promise-1.3.0.tgz",
      "integrity": "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==",
      "dev": true
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "dev": true
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true
    },
    "node_modules/autoprefixer": {
      "version": "10.4.20",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.4.20.tgz",
      "integrity": "sha512-XY25y5xSv/wEoqzDyXXME4AFfkZI0P23z6Fs3YgymDnKJkCGOnkL0iTxCa85UTqaSgfcqyf3UA6+c7wUvx/16g==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "browserslist": "^4.23.3",
        "caniuse-lite": "^1.0.30001646",
        "fraction.js": "^4.3.7",
        "normalize-range": "^0.1.2",
        "picocolors": "^1.0.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.11",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.11.tgz",
      "integrity": "sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==",
      "dev": true,
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.24.0.tgz",
      "integrity": "sha512-Rmb62sR1Zpjql25eSanFGEhAxcFwfA1K0GuQcLoaJBAcENegrQut3hYdhXFF1obQfiDyqIW/cLM5HSJ/9k884A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "caniuse-lite": "^1.0.30001663",
        "electron-to-chromium": "^1.5.28",
        "node-releases": "^2.0.18",
        "update-browserslist-db": "^1.1.0"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/camelcase-css": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/camelcase-css/-/camelcase-css-2.0.1.tgz",
      "integrity": "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==",
      "dev": true,
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001667",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001667.tgz",
      "integrity": "sha512-7LTwJjcRkzKFmtqGsibMeuXmvFDfZq/nzIjnmgCGzKKRVzjD72selLDK1oPF/Oxzmt4fNcPvTDvGqSDG4tCALw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ]
    },
    "node_modules/chalk": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-2.4.2.tgz",
      "integrity": "sha512-Mti+f9lpJNcwF4tWV8/OrTTtF1gZi+f8FqlyAdouralcFWFQWF2+NgCHShjkCb+IFBLq9buZwE1xckQU4peSuQ==",
      "dev": true,
      "dependencies": {
        "ansi-styles": "^3.2.1",
        "escape-string-regexp": "^1.0.5",
        "supports-color": "^5.3.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/cliui/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/cliui/node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/cliui/node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA=="
    },
    "node_modules/cliui/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="
    },
    "node_modules/cliui/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/clsx": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/color-convert": {
      "version": "1.9.3",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-1.9.3.tgz",
      "integrity": "sha512-QfAUtd+vFdAtFQcC8CCyYt1fYWxSqAiK2cSD6zDB8N3cpsEBAvRxp9zOGg6G/SHHJYAT88/az/IuDGALsNVbGg==",
      "dev": true,
      "dependencies": {
        "color-name": "1.1.3"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.3.tgz",
      "integrity": "sha512-72fSenhMw2HZMTVHeCA9KCmpEIbzWiQsjN+BHcBbS9vr1mtt+vJjPdksIBNUmKAW8TFUDPJK5SUU3QhE9NEXDw==",
      "dev": true
    },
    "node_modules/commander": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/commander/-/commander-4.1.1.tgz",
      "integrity": "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==",
      "dev": true,
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true
    },
    "node_modules/cross-spawn": {
      "version": "7.0.3",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.3.tgz",
      "integrity": "sha512-iRDPJKUPVEND7dHPO8rkbOnPpyDygcDFtWjpeWNCgy8WP2rXcxXL8TskReQl6OrB2G7+UJrags1q15Fudc7G6w==",
      "dev": true,
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/cssesc": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/cssesc/-/cssesc-3.0.0.tgz",
      "integrity": "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==",
      "dev": true,
      "bin": {
        "cssesc": "bin/cssesc"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/csstype": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.1.3.tgz",
      "integrity": "sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==",
      "devOptional": true
    },
    "node_modules/debug": {
      "version": "4.3.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.3.7.tgz",
      "integrity": "sha512-Er2nc/H7RrMXZBFCEim6TCmMk02Z8vLC2Rbi1KEBggpo0fS6l0S1nnapwmIi3yW/+GOJap1Krg4w0Hg80oCqgQ==",
      "dev": true,
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true
    },
    "node_modules/didyoumean": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/didyoumean/-/didyoumean-1.2.2.tgz",
      "integrity": "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==",
      "dev": true
    },
    "node_modules/dlv": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/dlv/-/dlv-1.1.3.tgz",
      "integrity": "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==",
      "dev": true
    },
    "node_modules/dom": {
      "version": "0.0.3",
      "resolved": "https://registry.npmjs.org/dom/-/dom-0.0.3.tgz",
      "integrity": "sha512-Uzda1zIAXO8JG2fm6IbJcdzBrRaC5Q308HTIjCXCQHh7ZVACJOeQzYYvd99plJ2/HUpZQk9IxNI/Y+QrO6poIQ==",
      "license": "MIT"
    },
    "node_modules/eastasianwidth": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/eastasianwidth/-/eastasianwidth-0.2.0.tgz",
      "integrity": "sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==",
      "dev": true
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.33",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.33.tgz",
      "integrity": "sha512-+cYTcFB1QqD4j4LegwLfpCNxifb6dDFUAwk6RsLusCwIaZI6or2f+q8rs5tTB2YC53HhOlIbEaqHMAAC8IOIwA==",
      "dev": true
    },
    "node_modules/emoji-regex": {
      "version": "9.2.2",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-9.2.2.tgz",
      "integrity": "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==",
      "dev": true
    },
    "node_modules/esbuild": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.21.5.tgz",
      "integrity": "sha512-mg3OPMV4hXywwpoDxu3Qda5xCKQi+vCTZq8S9J/EpkhB2HzKXq4SNFZE3+NK93JYxc8VMSep+lOUSC/RVKaBqw==",
      "dev": true,
      "hasInstallScript": true,
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=12"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.21.5",
        "@esbuild/android-arm": "0.21.5",
        "@esbuild/android-arm64": "0.21.5",
        "@esbuild/android-x64": "0.21.5",
        "@esbuild/darwin-arm64": "0.21.5",
        "@esbuild/darwin-x64": "0.21.5",
        "@esbuild/freebsd-arm64": "0.21.5",
        "@esbuild/freebsd-x64": "0.21.5",
        "@esbuild/linux-arm": "0.21.5",
        "@esbuild/linux-arm64": "0.21.5",
        "@esbuild/linux-ia32": "0.21.5",
        "@esbuild/linux-loong64": "0.21.5",
        "@esbuild/linux-mips64el": "0.21.5",
        "@esbuild/linux-ppc64": "0.21.5",
        "@esbuild/linux-riscv64": "0.21.5",
        "@esbuild/linux-s390x": "0.21.5",
        "@esbuild/linux-x64": "0.21.5",
        "@esbuild/netbsd-x64": "0.21.5",
        "@esbuild/openbsd-x64": "0.21.5",
        "@esbuild/sunos-x64": "0.21.5",
        "@esbuild/win32-arm64": "0.21.5",
        "@esbuild/win32-ia32": "0.21.5",
        "@esbuild/win32-x64": "0.21.5"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz",
      "integrity": "sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==",
      "dev": true,
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/eslint": {
      "version": "9.12.0",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.12.0.tgz",
      "integrity": "sha512-UVIOlTEWxwIopRL1wgSQYdnVDcEvs2wyaO6DGo5mXqe3r16IoCNWkR29iHhyaP4cICWjbgbmFUGAhh0GJRuGZw==",
      "dev": true,
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.2.0",
        "@eslint-community/regexpp": "^4.11.0",
        "@eslint/config-array": "^0.18.0",
        "@eslint/core": "^0.6.0",
        "@eslint/eslintrc": "^3.1.0",
        "@eslint/js": "9.12.0",
        "@eslint/plugin-kit": "^0.2.0",
        "@humanfs/node": "^0.16.5",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.3.1",
        "@types/estree": "^1.0.6",
        "@types/json-schema": "^7.0.15",
        "ajv": "^6.12.4",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.2",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.1.0",
        "eslint-visitor-keys": "^4.1.0",
        "espree": "^10.2.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.2",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3",
        "text-table": "^0.2.0"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "5.1.0-rc-fb9a90fa48-20240614",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-5.1.0-rc-fb9a90fa48-20240614.tgz",
      "integrity": "sha512-xsiRwaDNF5wWNC4ZHLut+x/YcAxksUd9Rizt7LaEn3bV8VyYRpXnRJQlLOfYaVy9esk4DFP4zPPnoNVjq5Gc0w==",
      "dev": true,
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react-refresh": {
      "version": "0.4.12",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.4.12.tgz",
      "integrity": "sha512-9neVjoGv20FwYtCP6CB1dzR1vr57ZDNOXst21wd2xJ/cTlM2xLq0GWVlSNTdMn/4BtP6cHYBMCSp1wFBJ9jBsg==",
      "dev": true,
      "peerDependencies": {
        "eslint": ">=7"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.1.0.tgz",
      "integrity": "sha512-14dSvlhaVhKKsa9Fx1l8A17s7ah7Ef7wCakJ10LYk6+GYmP9yDti2oq2SEwcyndt6knfcZyhyxwY3i9yL78EQw==",
      "dev": true,
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.1.0.tgz",
      "integrity": "sha512-Q7lok0mqMUSf5a/AdAZkA5a/gHcO6snwQClVNNvFKCAVlxXucdU8pKydU5ZVZjBx5xr37vGbFFWtLQYreLzrZg==",
      "dev": true,
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/eslint/node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/eslint/node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/eslint/node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true
    },
    "node_modules/eslint/node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint/node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/eslint/node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/espree": {
      "version": "10.2.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.2.0.tgz",
      "integrity": "sha512-upbkBJbckcCNBDBDXEbuhjbP68n+scUd3k/U2EkyM9nw+I/jPiL4cLF/Al06CF96wRltFda16sxDFrxsI1v0/g==",
      "dev": true,
      "dependencies": {
        "acorn": "^8.12.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.1.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.6.0.tgz",
      "integrity": "sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==",
      "dev": true,
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true
    },
    "node_modules/fast-glob": {
      "version": "3.3.2",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.2.tgz",
      "integrity": "sha512-oX2ruAFQwf/Orj8m737Y5adxDQO0LAB7/S5MnxCdTNDd4p6BsyIVsv9JQsATbTSq8KHRpLwIHbVlUNatxd+1Ow==",
      "dev": true,
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.4"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true
    },
    "node_modules/fastq": {
      "version": "1.17.1",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.17.1.tgz",
      "integrity": "sha512-sRVD3lWVIXWg6By68ZN7vho9a1pQcN/WBFaAAsDDFzlJjvoGx0P8z7V1t72grFJfJhu3YPZBuu25f7Kaw2jN1w==",
      "dev": true,
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/faye-websocket": {
      "version": "0.11.4",
      "resolved": "https://registry.npmjs.org/faye-websocket/-/faye-websocket-0.11.4.tgz",
      "integrity": "sha512-CzbClwlXAuiRQAlUyfqPgvPoNKTckTPGfwZV4ZdAhVcP2lh9KUxJg2b5GkE7XbjKQ3YJnQ9z6D9ntLAlB+tP8g==",
      "dependencies": {
        "websocket-driver": ">=0.5.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/firebase": {
      "version": "10.14.1",
      "resolved": "https://registry.npmjs.org/firebase/-/firebase-10.14.1.tgz",
      "integrity": "sha512-0KZxU+Ela9rUCULqFsUUOYYkjh7OM1EWdIfG6///MtXd0t2/uUIf0iNV5i0KariMhRQ5jve/OY985nrAXFaZeQ==",
      "dependencies": {
        "@firebase/analytics": "0.10.8",
        "@firebase/analytics-compat": "0.2.14",
        "@firebase/app": "0.10.13",
        "@firebase/app-check": "0.8.8",
        "@firebase/app-check-compat": "0.3.15",
        "@firebase/app-compat": "0.2.43",
        "@firebase/app-types": "0.9.2",
        "@firebase/auth": "1.7.9",
        "@firebase/auth-compat": "0.5.14",
        "@firebase/data-connect": "0.1.0",
        "@firebase/database": "1.0.8",
        "@firebase/database-compat": "1.0.8",
        "@firebase/firestore": "4.7.3",
        "@firebase/firestore-compat": "0.3.38",
        "@firebase/functions": "0.11.8",
        "@firebase/functions-compat": "0.3.14",
        "@firebase/installations": "0.6.9",
        "@firebase/installations-compat": "0.2.9",
        "@firebase/messaging": "0.12.12",
        "@firebase/messaging-compat": "0.2.12",
        "@firebase/performance": "0.6.9",
        "@firebase/performance-compat": "0.2.9",
        "@firebase/remote-config": "0.4.9",
        "@firebase/remote-config-compat": "0.2.9",
        "@firebase/storage": "0.13.2",
        "@firebase/storage-compat": "0.3.12",
        "@firebase/util": "1.10.0",
        "@firebase/vertexai-preview": "0.0.4"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.3.1.tgz",
      "integrity": "sha512-X8cqMLLie7KsNUDSdzeN8FYK9rEt4Dt67OsG/DNGnYTSDBG4uFAJFBnUeiV+zCVAvwFy56IjM9sH51jVaEhNxw==",
      "dev": true
    },
    "node_modules/foreground-child": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/foreground-child/-/foreground-child-3.3.0.tgz",
      "integrity": "sha512-Ld2g8rrAyMYFXBhEqMz8ZAHBi4J4uS1i/CxGMDnjyFWddMXLVcDp051DZfu+t7+ab7Wv6SMqpWmyFIj5UbfFvg==",
      "dev": true,
      "dependencies": {
        "cross-spawn": "^7.0.0",
        "signal-exit": "^4.0.1"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/fraction.js": {
      "version": "4.3.7",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-4.3.7.tgz",
      "integrity": "sha512-ZsDfxO51wGAXREY55a7la9LScWpwv9RxIrYABrlvOFBlH/ShPnrtsXeuUIfXKKOVicNxQ+o8JTbJvjS4M89yew==",
      "dev": true,
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "patreon",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "dev": true,
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/glob": {
      "version": "10.4.5",
      "resolved": "https://registry.npmjs.org/glob/-/glob-10.4.5.tgz",
      "integrity": "sha512-7Bv8RF0k6xjo7d4A/PxYLbUCfb6c+Vpd2/mB2yRDlew7Jb5hEXiCD9ibfO7wpk8i4sevK6DFny9h7EYbM3/sHg==",
      "dev": true,
      "dependencies": {
        "foreground-child": "^3.1.0",
        "jackspeak": "^3.1.2",
        "minimatch": "^9.0.4",
        "minipass": "^7.1.2",
        "package-json-from-dist": "^1.0.0",
        "path-scurry": "^1.11.1"
      },
      "bin": {
        "glob": "dist/esm/bin.mjs"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/glob/node_modules/brace-expansion": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.1.tgz",
      "integrity": "sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==",
      "dev": true,
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/glob/node_modules/minimatch": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.5.tgz",
      "integrity": "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==",
      "dev": true,
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/globals": {
      "version": "15.11.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-15.11.0.tgz",
      "integrity": "sha512-yeyNSjdbyVaWurlwCpcA6XNBrHTMIeDdj0/hnvX/OLJ9ekOXYbLsLinH/MucQyGvNnXhidTdNhTtJaffL2sMfw==",
      "dev": true,
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/graphemer": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/graphemer/-/graphemer-1.4.0.tgz",
      "integrity": "sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag==",
      "dev": true
    },
    "node_modules/has-flag": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-3.0.0.tgz",
      "integrity": "sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==",
      "dev": true,
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "dev": true,
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/http-parser-js": {
      "version": "0.5.9",
      "resolved": "https://registry.npmjs.org/http-parser-js/-/http-parser-js-0.5.9.tgz",
      "integrity": "sha512-n1XsPy3rXVxlqxVioEWdC+0+M+SQw0DpJynwtOPo1X+ZlvdzTLtDBIJJlDQTnwZIFJrZSzSGmIOUdP8tu+SgLw=="
    },
    "node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ=="
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.0.tgz",
      "integrity": "sha512-veYYhQa+D1QBKznvhUHxb8faxlrwUnxseDAbAp457E0wLNio2bOSKnjYDhMj+YiAq61xrMGhQk9iXVk5FzgQMw==",
      "dev": true,
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/is-binary-path": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-binary-path/-/is-binary-path-2.1.0.tgz",
      "integrity": "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==",
      "dev": true,
      "dependencies": {
        "binary-extensions": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.15.1",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.15.1.tgz",
      "integrity": "sha512-z0vtXSwucUJtANQWldhbtbt7BnL0vxiFjIdDLAatwhDYty2bad6s+rijD6Ri4YuYJubLzIJLUidCh09e1djEVQ==",
      "dev": true,
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true
    },
    "node_modules/jackspeak": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/jackspeak/-/jackspeak-3.4.3.tgz",
      "integrity": "sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==",
      "dev": true,
      "dependencies": {
        "@isaacs/cliui": "^8.0.2"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      },
      "optionalDependencies": {
        "@pkgjs/parseargs": "^0.11.0"
      }
    },
    "node_modules/jiti": {
      "version": "1.21.6",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-1.21.6.tgz",
      "integrity": "sha512-2yTgeWTWzMWkHu6Jp9NKgePDaYHbntiwvYuuJLbbN9vl7DC9DvXKOB2BC3ZZ92D3cvV/aflH0osDfwpHepQ53w==",
      "dev": true,
      "bin": {
        "jiti": "bin/jiti.js"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ=="
    },
    "node_modules/js-yaml": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.0.tgz",
      "integrity": "sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==",
      "dev": true,
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.0.2.tgz",
      "integrity": "sha512-xKqzzWXDttJuOcawBt4KnKHHIf5oQ/Cxax+0PWFG+DFDgHNAdi+TXECADI+RYiFUMmx8792xsMbbgXj4CwnP4g==",
      "dev": true,
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lilconfig": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-2.1.0.tgz",
      "integrity": "sha512-utWOt/GHzuUxnLKxB6dk81RoOeoNeHgbrXiuGk4yyF5qlRz+iIVWu56E2fqGHFrXz0QNUhLB/8nKqvRH66JKGQ==",
      "dev": true,
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/lines-and-columns": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/lines-and-columns/-/lines-and-columns-1.2.4.tgz",
      "integrity": "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==",
      "dev": true
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.camelcase": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.camelcase/-/lodash.camelcase-4.3.0.tgz",
      "integrity": "sha512-TwuEnCnxbc3rAvhf/LbG7tJUDzhqXyFnv3dtzLOPgCG/hODL7WFnsbwktkD7yUV0RrreP/l1PALq/YSg6VvjlA=="
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true
    },
    "node_modules/long": {
      "version": "5.2.4",
      "resolved": "https://registry.npmjs.org/long/-/long-5.2.4.tgz",
      "integrity": "sha512-qtzLbJE8hq7VabR3mISmVGtoXP8KGc2Z/AT8OuqlYD7JTR3oqrgwdjnk07wpj1twXxYmgDXgoKVWUG/fReSzHg=="
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/lucide-react": {
      "version": "0.344.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-0.344.0.tgz",
      "integrity": "sha512-6YyBnn91GB45VuVT96bYCOKElbJzUHqp65vX8cDcu55MQL9T969v4dhGClpljamuI/+KMO9P6w9Acq1CVQGvIQ==",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.2",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.2.tgz",
      "integrity": "sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==",
      "dev": true,
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true
    },
    "node_modules/mz": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/mz/-/mz-2.7.0.tgz",
      "integrity": "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==",
      "dev": true,
      "dependencies": {
        "any-promise": "^1.0.0",
        "object-assign": "^4.0.1",
        "thenify-all": "^1.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.7",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.7.tgz",
      "integrity": "sha512-eSRppjcPIatRIMC1U6UngP8XFcz8MQWGQdt1MTBQ7NaAmvXDfvNxbvWV3x2y6CdEUciCSsDHDQZbhYaB8QEo2g==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true
    },
    "node_modules/node-releases": {
      "version": "2.0.18",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.18.tgz",
      "integrity": "sha512-d9VeXT4SJ7ZeOqGX6R5EM022wpL+eWPooLI+5UpWn2jCT1aosUQEhQP214x33Wkwx3JQMvIm+tIoVOdodFS40g==",
      "dev": true
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/normalize-range": {
      "version": "0.1.2",
      "resolved": "https://registry.npmjs.org/normalize-range/-/normalize-range-0.1.2.tgz",
      "integrity": "sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-hash": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/object-hash/-/object-hash-3.0.0.tgz",
      "integrity": "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==",
      "dev": true,
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/package-json-from-dist": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/package-json-from-dist/-/package-json-from-dist-1.0.1.tgz",
      "integrity": "sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==",
      "dev": true
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true
    },
    "node_modules/path-scurry": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-1.11.1.tgz",
      "integrity": "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==",
      "dev": true,
      "dependencies": {
        "lru-cache": "^10.2.0",
        "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0"
      },
      "engines": {
        "node": ">=16 || 14 >=14.18"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/path-scurry/node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "dev": true
    },
    "node_modules/picocolors": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.0.tgz",
      "integrity": "sha512-TQ92mBOW0l3LeMeyLV6mzy/kWr8lkd/hp3mTg7wYK7zJhuBStmGMBG0BdeDZS/dZx1IukaX6Bk11zcln25o1Aw==",
      "dev": true
    },
    "node_modules/picomatch": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.1.tgz",
      "integrity": "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==",
      "dev": true,
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pify": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/pify/-/pify-2.3.0.tgz",
      "integrity": "sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/pirates": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/pirates/-/pirates-4.0.6.tgz",
      "integrity": "sha512-saLsH7WeYYPiD25LDuLRRY/i+6HaPYr6G1OUlN39otzkSTxKnubR9RTxS3/Kk50s1g2JTgFwWQDQyplC5/SHZg==",
      "dev": true,
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/postcss": {
      "version": "8.4.47",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.4.47.tgz",
      "integrity": "sha512-56rxCq7G/XfB4EkXq9Egn5GCqugWvDFjafDOThIdMBsI15iqPqR5r15TfSr1YPYeEI19YeaXMCbY6u88Y76GLQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "nanoid": "^3.3.7",
        "picocolors": "^1.1.0",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-import": {
      "version": "15.1.0",
      "resolved": "https://registry.npmjs.org/postcss-import/-/postcss-import-15.1.0.tgz",
      "integrity": "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==",
      "dev": true,
      "dependencies": {
        "postcss-value-parser": "^4.0.0",
        "read-cache": "^1.0.0",
        "resolve": "^1.1.7"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "postcss": "^8.0.0"
      }
    },
    "node_modules/postcss-js": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/postcss-js/-/postcss-js-4.0.1.tgz",
      "integrity": "sha512-dDLF8pEO191hJMtlHFPRa8xsizHaM82MLfNkUHdUtVEV3tgTp5oj+8qbEqYM57SLfc74KSbw//4SeJma2LRVIw==",
      "dev": true,
      "dependencies": {
        "camelcase-css": "^2.0.1"
      },
      "engines": {
        "node": "^12 || ^14 || >= 16"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/postcss/"
      },
      "peerDependencies": {
        "postcss": "^8.4.21"
      }
    },
    "node_modules/postcss-load-config": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/postcss-load-config/-/postcss-load-config-4.0.2.tgz",
      "integrity": "sha512-bSVhyJGL00wMVoPUzAVAnbEoWyqRxkjv64tUl427SKnPrENtq6hJwUojroMz2VB+Q1edmi4IfrAPpami5VVgMQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "lilconfig": "^3.0.0",
        "yaml": "^2.3.4"
      },
      "engines": {
        "node": ">= 14"
      },
      "peerDependencies": {
        "postcss": ">=8.0.9",
        "ts-node": ">=9.0.0"
      },
      "peerDependenciesMeta": {
        "postcss": {
          "optional": true
        },
        "ts-node": {
          "optional": true
        }
      }
    },
    "node_modules/postcss-load-config/node_modules/lilconfig": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-3.1.2.tgz",
      "integrity": "sha512-eop+wDAvpItUys0FWkHIKeC9ybYrTGbU41U5K7+bttZZeohvnY7M9dZ5kB21GNWiFT2q1OoPTvncPCgSOVO5ow==",
      "dev": true,
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/antonk52"
      }
    },
    "node_modules/postcss-nested": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/postcss-nested/-/postcss-nested-6.2.0.tgz",
      "integrity": "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "postcss-selector-parser": "^6.1.1"
      },
      "engines": {
        "node": ">=12.0"
      },
      "peerDependencies": {
        "postcss": "^8.2.14"
      }
    },
    "node_modules/postcss-selector-parser": {
      "version": "6.1.2",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-6.1.2.tgz",
      "integrity": "sha512-Q8qQfPiZ+THO/3ZrOrO0cJJKfpYCagtMUkXbnEfmgUjwXg6z/WBeOyS9APBBPCTSiDV+s4SwQGu8yFsiMRIudg==",
      "dev": true,
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/protobufjs": {
      "version": "7.4.0",
      "resolved": "https://registry.npmjs.org/protobufjs/-/protobufjs-7.4.0.tgz",
      "integrity": "sha512-mRUWCc3KUU4w1jU8sGxICXH/gNS94DvI1gxqDvBzhj1JpcsimQkYiOJfwsPUykUI5ZaspFbSgmBLER8IrQ3tqw==",
      "hasInstallScript": true,
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.2",
        "@protobufjs/base64": "^1.1.2",
        "@protobufjs/codegen": "^2.0.4",
        "@protobufjs/eventemitter": "^1.1.0",
        "@protobufjs/fetch": "^1.1.0",
        "@protobufjs/float": "^1.0.2",
        "@protobufjs/inquire": "^1.1.0",
        "@protobufjs/path": "^1.1.2",
        "@protobufjs/pool": "^1.1.0",
        "@protobufjs/utf8": "^1.1.0",
        "@types/node": ">=13.7.0",
        "long": "^5.0.0"
      },
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/react": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react/-/react-18.3.1.tgz",
      "integrity": "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==",
      "dependencies": {
        "loose-envify": "^1.1.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-18.3.1.tgz",
      "integrity": "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==",
      "dependencies": {
        "loose-envify": "^1.1.0",
        "scheduler": "^0.23.2"
      },
      "peerDependencies": {
        "react": "^18.3.1"
      }
    },
    "node_modules/react-refresh": {
      "version": "0.14.2",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.14.2.tgz",
      "integrity": "sha512-jCvmsr+1IUSMUyzOkRcvnVbX3ZYC6g9TDrDbFuFmRDq7PD4yaGbLKNQL6k2jnArV8hjYxh7hVhAZB6s9HDGpZA==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-router": {
      "version": "6.28.2",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-6.28.2.tgz",
      "integrity": "sha512-BgFY7+wEGVjHCiqaj2XiUBQ1kkzfg6UoKYwEe0wv+FF+HNPCxtS/MVPvLAPH++EsuCMReZl9RYVGqcHLk5ms3A==",
      "dependencies": {
        "@remix-run/router": "1.21.1"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8"
      }
    },
    "node_modules/react-router-dom": {
      "version": "6.28.2",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-6.28.2.tgz",
      "integrity": "sha512-O81EWqNJWqvlN/a7eTudAdQm0TbI7hw+WIi7OwwMcTn5JMyZ0ibTFNGz+t+Lju0df4LcqowCegcrK22lB1q9Kw==",
      "dependencies": {
        "@remix-run/router": "1.21.1",
        "react-router": "6.28.2"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8",
        "react-dom": ">=16.8"
      }
    },
    "node_modules/read-cache": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/read-cache/-/read-cache-1.0.0.tgz",
      "integrity": "sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==",
      "dev": true,
      "dependencies": {
        "pify": "^2.3.0"
      }
    },
    "node_modules/readdirp": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-3.6.0.tgz",
      "integrity": "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==",
      "dev": true,
      "dependencies": {
        "picomatch": "^2.2.1"
      },
      "engines": {
        "node": ">=8.10.0"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.8",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.8.tgz",
      "integrity": "sha512-oKWePCxqpd6FlLvGV1VU0x7bkPmmCNolxzjMf4NczoDnQcIWrAF+cPtZn5i6n+RfD2d9i0tzpKnG6Yk168yIyw==",
      "dev": true,
      "dependencies": {
        "is-core-module": "^2.13.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/reusify": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.0.4.tgz",
      "integrity": "sha512-U9nH88a3fc/ekCF1l0/UP1IosiuIjyTh7hBvXVMHYgVcfGvt897Xguj2UOLDeI5BG2m7/uwyaLVT6fbtCwTyzw==",
      "dev": true,
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rollup": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.24.0.tgz",
      "integrity": "sha512-DOmrlGSXNk1DM0ljiQA+i+o0rSLhtii1je5wgk60j49d1jHT5YYttBv1iWOnYSTG+fZZESUOSNiAl89SIet+Cg==",
      "dev": true,
      "dependencies": {
        "@types/estree": "1.0.6"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.24.0",
        "@rollup/rollup-android-arm64": "4.24.0",
        "@rollup/rollup-darwin-arm64": "4.24.0",
        "@rollup/rollup-darwin-x64": "4.24.0",
        "@rollup/rollup-linux-arm-gnueabihf": "4.24.0",
        "@rollup/rollup-linux-arm-musleabihf": "4.24.0",
        "@rollup/rollup-linux-arm64-gnu": "4.24.0",
        "@rollup/rollup-linux-arm64-musl": "4.24.0",
        "@rollup/rollup-linux-powerpc64le-gnu": "4.24.0",
        "@rollup/rollup-linux-riscv64-gnu": "4.24.0",
        "@rollup/rollup-linux-s390x-gnu": "4.24.0",
        "@rollup/rollup-linux-x64-gnu": "4.24.0",
        "@rollup/rollup-linux-x64-musl": "4.24.0",
        "@rollup/rollup-win32-arm64-msvc": "4.24.0",
        "@rollup/rollup-win32-ia32-msvc": "4.24.0",
        "@rollup/rollup-win32-x64-msvc": "4.24.0",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/scheduler": {
      "version": "0.23.2",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.23.2.tgz",
      "integrity": "sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==",
      "dependencies": {
        "loose-envify": "^1.1.0"
      }
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/signal-exit": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-4.1.0.tgz",
      "integrity": "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==",
      "dev": true,
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-5.1.2.tgz",
      "integrity": "sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==",
      "dev": true,
      "dependencies": {
        "eastasianwidth": "^0.2.0",
        "emoji-regex": "^9.2.2",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width-cjs": {
      "name": "string-width",
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true
    },
    "node_modules/string-width-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.1.0.tgz",
      "integrity": "sha512-iq6eVVI64nQQTRYq2KtEg2d2uU7LElhTJwsH4YzIHZshxlgZms/wIc4VoDQTlG/IvVIrBKG06CrZnp0qv7hkcQ==",
      "dev": true,
      "dependencies": {
        "ansi-regex": "^6.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-ansi-cjs": {
      "name": "strip-ansi",
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/sucrase": {
      "version": "3.35.0",
      "resolved": "https://registry.npmjs.org/sucrase/-/sucrase-3.35.0.tgz",
      "integrity": "sha512-8EbVDiu9iN/nESwxeSxDKe0dunta1GOlHufmSSXxMD2z2/tMZpDMpvXQGsc+ajGo8y2uYUmixaSRUc/QPoQ0GA==",
      "dev": true,
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.2",
        "commander": "^4.0.0",
        "glob": "^10.3.10",
        "lines-and-columns": "^1.1.6",
        "mz": "^2.7.0",
        "pirates": "^4.0.1",
        "ts-interface-checker": "^0.1.9"
      },
      "bin": {
        "sucrase": "bin/sucrase",
        "sucrase-node": "bin/sucrase-node"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/supports-color": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-5.5.0.tgz",
      "integrity": "sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==",
      "dev": true,
      "dependencies": {
        "has-flag": "^3.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tailwind-merge": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/tailwind-merge/-/tailwind-merge-2.6.0.tgz",
      "integrity": "sha512-P+Vu1qXfzediirmHOC3xKGAYeZtPcV9g76X+xg2FD4tYgR71ewMA35Y3sCz3zhiN/dwefRpJX0yBcgwi1fXNQA==",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/dcastil"
      }
    },
    "node_modules/tailwindcss": {
      "version": "3.4.13",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.13.tgz",
      "integrity": "sha512-KqjHOJKogOUt5Bs752ykCeiwvi0fKVkr5oqsFNt/8px/tA8scFPIlkygsf6jXrfCqGHz7VflA6+yytWuM+XhFw==",
      "dev": true,
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "arg": "^5.0.2",
        "chokidar": "^3.5.3",
        "didyoumean": "^1.2.2",
        "dlv": "^1.1.3",
        "fast-glob": "^3.3.0",
        "glob-parent": "^6.0.2",
        "is-glob": "^4.0.3",
        "jiti": "^1.21.0",
        "lilconfig": "^2.1.0",
        "micromatch": "^4.0.5",
        "normalize-path": "^3.0.0",
        "object-hash": "^3.0.0",
        "picocolors": "^1.0.0",
        "postcss": "^8.4.23",
        "postcss-import": "^15.1.0",
        "postcss-js": "^4.0.1",
        "postcss-load-config": "^4.0.1",
        "postcss-nested": "^6.0.1",
        "postcss-selector-parser": "^6.0.11",
        "resolve": "^1.22.2",
        "sucrase": "^3.32.0"
      },
      "bin": {
        "tailwind": "lib/cli.js",
        "tailwindcss": "lib/cli.js"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/text-table": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/text-table/-/text-table-0.2.0.tgz",
      "integrity": "sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw==",
      "dev": true
    },
    "node_modules/thenify": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/thenify/-/thenify-3.3.1.tgz",
      "integrity": "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==",
      "dev": true,
      "dependencies": {
        "any-promise": "^1.0.0"
      }
    },
    "node_modules/thenify-all": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/thenify-all/-/thenify-all-1.6.0.tgz",
      "integrity": "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==",
      "dev": true,
      "dependencies": {
        "thenify": ">= 3.1.0 < 4"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/to-fast-properties": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/to-fast-properties/-/to-fast-properties-2.0.0.tgz",
      "integrity": "sha512-/OaKK0xYrs3DmxRYqL/yDc+FxFUVYhDlXMhRmv3z915w2HF1tnN1omB354j8VUGO/hbRzyD6Y3sA7v7GS/ceog==",
      "dev": true,
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/ts-api-utils": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-1.3.0.tgz",
      "integrity": "sha512-UQMIo7pb8WRomKR1/+MFVLTroIvDVtMX3K6OUir8ynLyzB8Jeriont2bTAtmNPa1ekAgN7YPDyf6V+ygrdU+eQ==",
      "dev": true,
      "engines": {
        "node": ">=16"
      },
      "peerDependencies": {
        "typescript": ">=4.2.0"
      }
    },
    "node_modules/ts-interface-checker": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/ts-interface-checker/-/ts-interface-checker-0.1.13.tgz",
      "integrity": "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==",
      "dev": true
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w=="
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/typescript": {
      "version": "5.6.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.6.3.tgz",
      "integrity": "sha512-hjcS1mhfuyi4WW8IWtjP7brDrG2cuDZukyrYrSauoXGNgx0S7zceP07adYkJycEr56BOUTNPzbInooiN3fn1qw==",
      "dev": true,
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/typescript-eslint": {
      "version": "8.8.1",
      "resolved": "https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.8.1.tgz",
      "integrity": "sha512-R0dsXFt6t4SAFjUSKFjMh4pXDtq04SsFKCVGDP3ZOzNP7itF0jBcZYU4fMsZr4y7O7V7Nc751dDeESbe4PbQMQ==",
      "dev": true,
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "8.8.1",
        "@typescript-eslint/parser": "8.8.1",
        "@typescript-eslint/utils": "8.8.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/undici": {
      "version": "6.19.7",
      "resolved": "https://registry.npmjs.org/undici/-/undici-6.19.7.tgz",
      "integrity": "sha512-HR3W/bMGPSr90i8AAp2C4DM3wChFdJPLrWYpIS++LxS8K+W535qftjt+4MyjNYHeWabMj1nvtmLIi7l++iq91A==",
      "engines": {
        "node": ">=18.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.20.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.20.0.tgz",
      "integrity": "sha512-Ny6QZ2Nju20vw1SRHe3d9jVu6gJ+4e3+MMpqu7pqE5HT6WsTSlce++GQmK5UXS8mzV8DSYHrQH+Xrf2jVcuKNg=="
    },
    "node_modules/update-browserslist-db": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.1.1.tgz",
      "integrity": "sha512-R8UzCaa9Az+38REPiJ1tXlImTJXlVfgHZsglwBD/k6nj76ctsH1E3q4doGrukiLQd3sGQYu56r5+lo5r94l29A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.0"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/use-sync-external-store": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/use-sync-external-store/-/use-sync-external-store-1.4.0.tgz",
      "integrity": "sha512-9WXSPC5fMv61vaupRkCKCxsPxBocVnwakBEkMIHHpkTTg6icbJtg6jzgtLDm4bl3cSHAca52rYWih0k4K3PfHw==",
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true
    },
    "node_modules/uuid": {
      "version": "11.1.0",
      "resolved": "https://registry.npmjs.org/uuid/-/uuid-11.1.0.tgz",
      "integrity": "sha512-0/A9rDy9P7cJ+8w1c9WD9V//9Wj15Ce2MPz8Ri6032usz+NfePxx5AcN3bN+r6ZL6jEo066/yNYB3tn4pQEx+A==",
      "funding": [
        "https://github.com/sponsors/broofa",
        "https://github.com/sponsors/ctavan"
      ],
      "license": "MIT",
      "bin": {
        "uuid": "dist/esm/bin/uuid"
      }
    },
    "node_modules/vite": {
      "version": "5.4.8",
      "resolved": "https://registry.npmjs.org/vite/-/vite-5.4.8.tgz",
      "integrity": "sha512-FqrItQ4DT1NC4zCUqMB4c4AZORMKIa0m8/URVCZ77OZ/QSNeJ54bU1vrFADbDsuwfIPcgknRkmqakQcgnL4GiQ==",
      "dev": true,
      "dependencies": {
        "esbuild": "^0.21.3",
        "postcss": "^8.4.43",
        "rollup": "^4.20.0"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^18.0.0 || >=20.0.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^18.0.0 || >=20.0.0",
        "less": "*",
        "lightningcss": "^1.21.0",
        "sass": "*",
        "sass-embedded": "*",
        "stylus": "*",
        "sugarss": "*",
        "terser": "^5.4.0"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        }
      }
    },
    "node_modules/websocket-driver": {
      "version": "0.7.4",
      "resolved": "https://registry.npmjs.org/websocket-driver/-/websocket-driver-0.7.4.tgz",
      "integrity": "sha512-b17KeDIQVjvb0ssuSDF2cYXSg2iztliJ4B9WdsuB6J952qCPKmnVq4DyW5motImXHDC1cBT/1UezrJVsKw5zjg==",
      "dependencies": {
        "http-parser-js": ">=0.5.1",
        "safe-buffer": ">=5.1.0",
        "websocket-extensions": ">=0.1.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/websocket-extensions": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/websocket-extensions/-/websocket-extensions-0.1.4.tgz",
      "integrity": "sha512-OqedPIGOfsDlo31UNwYbCFMSaO9m9G/0faIHj5/dZFDMFqPTcx6UwqyOy3COEaEOg/9VsGIpdqn62W5KhoKSpg==",
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-8.1.0.tgz",
      "integrity": "sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==",
      "dev": true,
      "dependencies": {
        "ansi-styles": "^6.1.0",
        "string-width": "^5.0.1",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs": {
      "name": "wrap-ansi",
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dev": true,
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true
    },
    "node_modules/wrap-ansi-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true
    },
    "node_modules/wrap-ansi-cjs/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi/node_modules/ansi-styles": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-6.2.1.tgz",
      "integrity": "sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==",
      "dev": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true
    },
    "node_modules/yaml": {
      "version": "2.5.1",
      "resolved": "https://registry.npmjs.org/yaml/-/yaml-2.5.1.tgz",
      "integrity": "sha512-bLQOjaX/ADgQ20isPJRvF0iRUHIxVhYvr53Of7wGcWlO2jvtUlH5m87DsmulFVxRpNLOnI4tB6p/oh8D7kpn9Q==",
      "dev": true,
      "bin": {
        "yaml": "bin.mjs"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/yargs": {
      "version": "17.7.2",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-17.7.2.tgz",
      "integrity": "sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==",
      "dependencies": {
        "cliui": "^8.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.3",
        "y18n": "^5.0.5",
        "yargs-parser": "^21.1.1"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs-parser": {
      "version": "21.1.1",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-21.1.1.tgz",
      "integrity": "sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yargs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="
    },
    "node_modules/yargs/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yargs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zustand": {
      "version": "4.5.6",
      "resolved": "https://registry.npmjs.org/zustand/-/zustand-4.5.6.tgz",
      "integrity": "sha512-ibr/n1hBzLLj5Y+yUcU7dYw8p6WnIVzdJbnX+1YpaScvZVF2ziugqHs+LAmHw4lWO9c/zRj+K1ncgWDQuthEdQ==",
      "dependencies": {
        "use-sync-external-store": "^1.2.2"
      },
      "engines": {
        "node": ">=12.7.0"
      },
      "peerDependencies": {
        "@types/react": ">=16.8",
        "immer": ">=9.0.6",
        "react": ">=16.8"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "immer": {
          "optional": true
        },
        "react": {
          "optional": true
        }
      }
    }
  }
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\package.json`

```json
{
  "name": "poker-tour",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.0",
    "dom": "^0.0.3",
    "firebase": "^10.8.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3",
    "tailwind-merge": "^2.2.1",
    "uuid": "^11.1.0",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0",
    "vite": "^5.4.2"
  }
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/App.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import Teams from './pages/Teams/Teams';
import { useAuthStore } from './store/useAuthStore';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import { useTeamStore } from './store/useTeamStore';

function App() {
  const { user, setUser } = useAuthStore();
  const { fetchTeams } = useTeamStore();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchTeams();
      }
    });
    return () => unsubscribe();
  }, [setUser, fetchTeams]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/*"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <MainLayout user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/teams"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Teams user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/tournaments"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Tournaments user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/stats"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Stats user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Profile user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/Login.tsx`

```tsx
// src/components/Login.tsx
import React, { useEffect } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore'; // Import useAuthStore
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, user, setUser } = useAuthStore(); // Get the login function from the store
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    const userConnected = await signInWithGoogle();
    if(userConnected){
      setUser(userConnected);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-poker-light">
      <h1 className="text-4xl font-bold text-poker-black mb-8">PokerTour</h1>
      <button
        onClick={handleGoogleSignIn}
        className="bg-poker-gold hover:bg-poker-dark text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out"
      >
        Se connecter avec Google
      </button>
    </div>
  );
};

export default Login;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/layout/Header.tsx`

```tsx
// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Menu, X, UserCheck as PokerChip, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore'; // Corrected import path

interface HeaderProps {
  user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
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
            <span className="text-xl font-bold">PokerTour</span>
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
                  {user.displayName || user.email || 'Utilisateur'}
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

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/CreateTournament.tsx`

```tsx
// src/components/tournament/CreateTournament.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { User } from 'firebase/auth';

interface CreateTournamentProps {
    user: User | null;
}

export function CreateTournament({ user }: CreateTournamentProps) {
    const navigate = useNavigate();
    const { addTournament, fetchTournaments } = useTournamentStore();
    const { teams, fetchTeams } = useTeamStore();
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        buyin: '',
        maxPlayers: '',
        location: '',
        teamId: '', // Add teamId to formData
    });

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            addTournament(
                {
                  name: formData.name,
                  date: formData.date,
                  buyin: Number(formData.buyin),
                  maxPlayers: Number(formData.maxPlayers),
                  location: formData.location,
                },
                user.uid,
                formData.teamId // Pass teamId to addTournament
            ).then(() => {
                fetchTournaments(user.uid);
                navigate('/');
            });
          }    
      };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/tournaments')}
                className="flex items-center text-poker-black hover:text-poker-red mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-lg shadow-md p-8">
                <h1 className="text-3xl font-bold text-poker-black mb-6">
                    Créer un nouveau tournoi
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nom du tournoi
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="Ex: Tournoi du Vendredi"
                        />
                    </div>

                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                        </label>
                        <input
                            type="datetime-local"
                            id="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label htmlFor="buyin" className="block text-sm font-medium text-gray-700 mb-1">
                            Buy-in (€)
                        </label>
                        <input
                            type="number"
                            id="buyin"
                            value={formData.buyin}
                            onChange={handleChange}
                            required
                            min="0"
                            step="5"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="20"
                        />
                    </div>

                    <div>
                        <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre maximum de joueurs
                        </label>
                        <input
                            type="number"
                            id="maxPlayers"
                            value={formData.maxPlayers}
                            onChange={handleChange}
                            required
                            min="2"
                            max="100"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="9"
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            Lieu
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="Ex: 123 rue du Poker"
                        />
                    </div>

                    <div>
                        <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-1">
                            Équipe
                        </label>
                        <select
                            id="teamId"
                            value={formData.teamId}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        >
                            <option value="">Sélectionner une équipe</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-poker-red text-white py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                        Créer le tournoi
                    </button>
                </form>
            </div>
        </div>
    );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/GameForm.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { UserCheck, UserX } from 'lucide-react';
import type { Game, Player, Tournament } from '../../store/tournamentStore';

interface GameFormProps {
  tournament: Tournament;
  setIsCreating: (isCreating: boolean) => void;
  editingGame: Game | null;
  setEditingGame: (game: Game | null) => void;
  tournamentId: string;
}

interface GameFormType {
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number;
  players: Player[];
}

const initialGameForm: GameFormType = {
  startingStack: 10000,
  blinds: {
    small: 25,
    big: 50
  },
  blindLevels: 20,
  players: []
};

export function GameForm({ tournament, setIsCreating, editingGame, setEditingGame, tournamentId }: GameFormProps) {
  const addGame = useTournamentStore(state => state.addGame);
  const updateGame = useTournamentStore(state => state.updateGame);
  const [gameForm, setGameForm] = useState<GameFormType>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editingGame) {
      setGameForm({
        startingStack: editingGame.startingStack,
        blinds: { ...editingGame.blinds },
        blindLevels: editingGame.blindLevels,
        players: [...editingGame.players]
      });
      setSelectedPlayers(new Set(editingGame.players.map(p => p.id)));
    } else {
      setGameForm(initialGameForm);
      setSelectedPlayers(new Set());
    }
  }, [editingGame]);

  const resetForm = () => {
    setGameForm(initialGameForm);
    setSelectedPlayers(new Set());
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      player => selectedPlayers.has(player.id)
    );

    if (editingGame) {
      updateGame(tournamentId!, editingGame.id, {
        ...gameForm,
        players: selectedPlayersList
      });
    } else {
      addGame(tournamentId!, {
        ...gameForm,
        players: selectedPlayersList
      });
    }

    setIsCreating(false);
    resetForm();
    setEditingGame(null);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-poker-black mb-4">
        {editingGame ? 'Modifier la partie' : 'Créer une nouvelle partie'}
      </h2>
      <form onSubmit={handleCreateGame} className="space-y-6">
        {/* ... (Form fields - startingStack, blinds, blindLevels) ... */}
        <div>
          <label htmlFor="startingStack" className="block text-sm font-medium text-gray-700 mb-1">
            Stack de départ
          </label>
          <input
            type="number"
            id="startingStack"
            value={gameForm.startingStack}
            onChange={(e) => setGameForm(prev => ({
              ...prev,
              startingStack: parseInt(e.target.value)
            }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            min="1000"
            step="1000"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="smallBlind" className="block text-sm font-medium text-gray-700 mb-1">
              Petite blind
            </label>
            <input
              type="number"
              id="smallBlind"
              value={gameForm.blinds.small}
              onChange={(e) => setGameForm(prev => ({
                ...prev,
                blinds: {
                  ...prev.blinds,
                  small: parseInt(e.target.value)
                }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
              min="5"
              step="5"
              required
            />
          </div>

          <div>
            <label htmlFor="bigBlind" className="block text-sm font-medium text-gray-700 mb-1">
              Grosse blind
            </label>
            <input
              type="number"
              id="bigBlind"
              value={gameForm.blinds.big}
              onChange={(e) => setGameForm(prev => ({
                ...prev,
                blinds: {
                  ...prev.blinds,
                  big: parseInt(e.target.value)
                }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
              min="10"
              step="10"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="blindLevels" className="block text-sm font-medium text-gray-700 mb-1">
            Durée des niveaux (minutes)
          </label>
          <input
            type="number"
            id="blindLevels"
            value={gameForm.blindLevels}
            onChange={(e) => setGameForm(prev => ({
              ...prev,
              blindLevels: parseInt(e.target.value)
            }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            min="5"
            step="5"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joueurs à la table
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tournament.registrations.map((player) => (
              <label
                key={player.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlayers.has(player.id)
                    ? 'bg-poker-gold/10 border-poker-gold'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.has(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  className="sr-only"
                />
                <UserCheck className={`w-5 h-5 mr-2 ${
                  selectedPlayers.has(player.id) ? 'text-poker-gold' : 'text-gray-400'
                }`} />
                <span className="text-sm">{player.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              resetForm();
              setEditingGame(null);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-poker-gold text-white px-6 py-2 rounded hover:bg-yellow-600 transition-colors"
          >
            {editingGame ? 'Mettre à jour' : 'Créer la partie'}
          </button>
        </div>
      </form>
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/GameList.tsx`

```tsx
import React from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { Users, Timer, Coins, PlayCircle, Edit2, Eye, StopCircle, Trash2 } from 'lucide-react';
import type { Game, Tournament } from '../../store/tournamentStore';

interface GameListProps {
  tournament: Tournament;
  setViewingGame: (game: Game | null) => void;
  setIsCreating: (isCreating: boolean) => void;
  setEditingGame: (game: Game | null) => void;
  userId: string | undefined;
}

export function GameList({ tournament, setViewingGame, setIsCreating, setEditingGame, userId }: GameListProps) {
  const startGame = useTournamentStore(state => state.startGame);
  const endGame = useTournamentStore(state => state.endGame);
  const deleteGame = useTournamentStore(state => state.deleteGame);

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsCreating(true);
  };

  const handleEndGame = (gameId: string) => {
    endGame(tournament.id, gameId);
  };

  const handleDeleteGame = (gameId: string) => {
    if (userId && window.confirm("Êtes-vous sûr de vouloir supprimer cette partie ?")) {
      deleteGame(tournament.id, gameId, userId);
    }
  };

  return (
    <div className="grid gap-6">
      {tournament.games.map((game) => (
        <div key={game.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  game.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                  game.status === 'in_progress' ? 'bg-green-100 text-green-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {game.status === 'pending' ? 'En attente' :
                   game.status === 'in_progress' ? 'En cours' :
                   'Terminée'}
                </span>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-1" />
                  <span>{game.players.filter(p => !p.eliminated).length} en jeu / {game.players.length} total</span>
                </div>
              </div>

              <div className="flex space-x-6 text-gray-600">
                <div className="flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-poker-gold" />
                  <span>Stack: {game.startingStack.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <Timer className="w-5 h-5 mr-2 text-poker-gold" />
                  <span>Niveaux: {game.blindLevels}min</span>
                </div>
              </div>

              <div className="text-gray-600">
                Blinds: {game.blinds.small}/{game.blinds.big}
              </div>
            </div>

            <div className="flex space-x-2">
              {game.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleEditGame(game)}
                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 transition-colors flex items-center"
                  >
                    <Edit2 className="w-5 h-5 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={() => startGame(tournament.id, game.id, game.players)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                    disabled={game.players.length < 2}
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Démarrer
                  </button>
                  {userId && (
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Supprimer
                    </button>
                  )}
                </>
              )}

              {game.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => setViewingGame(game)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Voir la table
                  </button>
                  <button
                    onClick={() => handleEndGame(game.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Arrêter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {tournament.games.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          Aucune partie n'a encore été créée pour ce tournoi.
        </div>
      )}
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/GameTimer.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import type { Game } from '../../store/tournamentStore';
import { useTournamentStore } from '../../store/tournamentStore';

interface GameTimerProps {
  game: Game;
}

interface GameTimerData {
  timeLeft: string;
  currentBlinds: { small: number; big: number };
  nextBlinds: { small: number; big: number };
}

export function GameTimer({ game }: GameTimerProps) {
  const [gameTimer, setGameTimer] = useState<GameTimerData | null>(null);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const endGame = useTournamentStore(state => state.endGame);

  // Fonction pour calculer les blindes du niveau suivant
  const calculateNextBlinds = (currentSmall: number, currentBig: number): { small: number; big: number } => {
    return {
      small: currentSmall * 2,
      big: currentBig * 2
    };
  };

  const animate = (time: number) => {
    if (previousTimeRef.current != null) {
      const deltaTime = time - previousTimeRef.current;

      if (!game.startedAt) return;

      const startTime = new Date(game.startedAt).getTime();
      const now = new Date().getTime();
      const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
      const currentLevel = Math.floor(elapsedMinutes / game.blindLevels);
      const nextLevelTime = (currentLevel + 1) * game.blindLevels * 60 * 1000;
      const timeToNextLevel = nextLevelTime - (now - startTime);

      const minutes = Math.floor(timeToNextLevel / (1000 * 60));
      const seconds = Math.floor((timeToNextLevel % (1000 * 60)) / 1000);

      const currentBlinds = {
        small: game.blinds.small * Math.pow(2, currentLevel),
        big: game.blinds.big * Math.pow(2, currentLevel)
      };

      const nextBlinds = calculateNextBlinds(currentBlinds.small, currentBlinds.big);

      setGameTimer({
        timeLeft: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        currentBlinds,
        nextBlinds
      });

      if (timeToNextLevel <= 0) {
        endGame(game.tournamentId, game.id);
      }
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [game]);

  if (!gameTimer) return null;

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="w-6 h-6 text-poker-gold mr-2" />
          <div>
            <div className="text-sm text-gray-600">Temps restant niveau</div>
            <div className="text-2xl font-bold">{gameTimer.timeLeft}</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Blindes actuelles</div>
          <div className="text-xl font-semibold">
            {gameTimer.currentBlinds.small}/
            {gameTimer.currentBlinds.big}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-600">Prochaines blindes</div>
        <div className="text-lg text-poker-gold">
          {gameTimer.nextBlinds.small}/
          {gameTimer.nextBlinds.big}
        </div>
      </div>
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/GameView.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle, UserCheck, UserX, UserMinus } from 'lucide-react';
import type { Game } from '../../store/tournamentStore';
import { GameTimer } from './GameTimer';

interface GameViewProps {
  game: Game;
  setViewingGame: (game: Game | null) => void;
  tournamentId: string;
}

export function GameView({ game, setViewingGame, tournamentId }: GameViewProps) {
  const updateGame = useTournamentStore(state => state.updateGame);
  const endGame = useTournamentStore(state => state.endGame);
  const [gameTimer, setGameTimer] = useState<any>(null);

  const handlePlayerElimination = (playerId: string) => {
    const updatedPlayers = game.players.map(player =>
      player.id === playerId
        ? { ...player, eliminated: !player.eliminated }
        : player
    );

    updateGame(tournamentId, game.id, { players: updatedPlayers });

    setViewingGame({
      ...game,
      players: updatedPlayers
    });

    const activePlayers = updatedPlayers.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
      handleEndGame(`${activePlayers[0].name} remporte la partie !`);
    }
  };

  const handleEndGame = (message?: string) => {
    endGame(tournamentId, game.id);
    setViewingGame(null);
    if (message) {
      alert(message);
    }
  };

  useEffect(() => {
    setGameTimer(game);
  }, [game]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleEndGame()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
          >
            <StopCircle className="w-5 h-5 mr-2" />
            Arrêter la partie
          </button>
          <button
            onClick={() => setViewingGame(null)}
            className="text-gray-600 hover:text-gray-800"
          >
            Retour aux parties
          </button>
        </div>
      </div>

      {gameTimer && (
        <GameTimer game={gameTimer} />
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
        <div className="grid gap-3">
          {game.players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.eliminated
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center">
                {player.eliminated ? (
                  <UserX className="w-5 h-5 text-red-500 mr-2" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-500 mr-2" />
                )}
                <span className={player.eliminated ? 'line-through text-gray-500' : ''}>
                  {player.name}
                </span>
              </div>
              <button
                onClick={() => handlePlayerElimination(player.id)}
                className={`px-3 py-1 rounded-md text-sm flex items-center ${
                  player.eliminated
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {player.eliminated ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Réintégrer
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Éliminer
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/TournamentGames.tsx`

```tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { GameForm } from './GameForm';
import { GameView } from './GameView';
import { GameList } from './GameList';
import type { Game } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const tournament = useTournamentStore(state =>
    state.tournaments.find(t => t.id === tournamentId)
  );
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);

  const handleCreateGameClick = () => {
    setIsCreating(true);
    setEditingGame(null);
  };

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tournoi introuvable</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {viewingGame ? (
        <GameView game={viewingGame} setViewingGame={setViewingGame} tournamentId={tournamentId} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-poker-black">
              {tournament.name} - Parties
            </h1>
            <button
              onClick={handleCreateGameClick}
              className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
            >
              Nouvelle partie
            </button>
          </div>

          {isCreating && (
            <GameForm
              tournament={tournament}
              setIsCreating={setIsCreating}
              editingGame={editingGame}
              setEditingGame={setEditingGame}
              tournamentId={tournamentId}
              userId={user?.uid}
            />
          )}
          <GameList tournament={tournament} setViewingGame={setViewingGame} setIsCreating={setIsCreating} setEditingGame={setEditingGame} userId={user?.uid} />
        </>
      )}
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/components/tournament/TournamentList.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { Calendar, Users, MapPin, Check, X, ChevronDown, ChevronUp, PlayCircle, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface TournamentListProps {
    user: User | null;
}

export function TournamentList({ user }: TournamentListProps) {
  const navigate = useNavigate();
  const { tournaments, registerToTournament, unregisterFromTournament, startTournament, fetchTournaments, deleteTournament } = useTournamentStore();
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({});
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
        fetchTournaments(user.uid); // Pass userId to fetchTournaments
    }
}, [fetchTournaments, user]);

  const handleRegistration = async (tournamentId: string) => {
      if (user) {
          const isAlreadyRegistered = tournaments.find(t => t.id === tournamentId)?.registrations.some(p => p.id === user.uid);
          
          if(isAlreadyRegistered){
              setRegistrationStates(prev => {
                const updatedStates = { ...prev };
                delete updatedStates[tournamentId];
                return updatedStates;
              });
          } else {
             setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'pending' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
            registerToTournament(tournamentId, user.uid, { id: user.uid, name: user.displayName ?? "User" });
            setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'confirmed' })); 
          }
      }
  };

  const handleUnregistration = async (tournamentId: string) => {
      if (user) {
          await unregisterFromTournament(tournamentId, user.uid);
          setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'none' }));
      }
  };

  const handleStartTournament = (tournamentId: string) => {
    if (user) {
        startTournament(tournamentId, user.uid);
        navigate(`/app/tournament/${tournamentId}`);
    }
  };

  const toggleTournamentExpansion = (tournamentId: string) => {
    setExpandedTournaments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tournamentId)) {
        newSet.delete(tournamentId);
      } else {
        newSet.add(tournamentId);
      }
      return newSet;
    });
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (user && window.confirm("Êtes-vous sûr de vouloir supprimer ce tournoi ?")) {
      try {
        await deleteTournament(tournamentId, user.uid);
      } catch (error) {
        console.error('Error deleting tournament:', error);
        alert((error as Error).message);
      }
    }
  };

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucun tournoi n'est programmé pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {tournaments.map((tournament) => {
        const isRegistered = user ? tournament.registrations.some(p => p.id === user.uid) : false;
        const registrationState = registrationStates[tournament.id];
        const isFull = tournament.registrations.length >= tournament.maxPlayers;
        const isExpanded = expandedTournaments.has(tournament.id);
        const canStart = tournament.status === 'scheduled' && tournament.registrations.length >= 2;
        const isStarted = tournament.status === 'in_progress';
        const isCreator = user?.uid === tournament.creatorId;

        return (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-poker-black">{tournament.name}</h3>
              <span className="bg-poker-red text-white px-3 py-1 rounded-full text-sm">
                {tournament.buyin}€
              </span>
            </div>
            
            <div className="space-y-2 text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{new Date(tournament.date).toLocaleString('fr-FR', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}</span>
              </div>
              
              <div 
                className="flex items-center cursor-pointer hover:text-poker-gold transition-colors"
                onClick={() => toggleTournamentExpansion(tournament.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 mr-2 text-poker-gold" />
                ) : (
                  <ChevronDown className="w-5 h-5 mr-2 text-poker-gold" />
                )}
                <Users className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{tournament.registrations.length} / {tournament.maxPlayers} joueurs</span>
              </div>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-48' : 'max-h-0'
              }`}>
                <div className="pl-9 pt-2 space-y-1">
                  {tournament.registrations.length > 0 ? (
                    tournament.registrations.map((player, index) => (
                      <div 
                        key={player.id}
                        className="flex items-center text-sm py-1"
                      >
                        <span className="w-6 text-poker-gold">{index + 1}.</span>
                        <span>{player.name}</span>
                        {user && player.id === user.uid && (
                          <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Aucun joueur inscrit
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{tournament.location}</span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div>
                {isStarted ? (
                  <button
                    onClick={() => navigate(`/app/tournament/${tournament.id}`)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Accéder au tournoi
                  </button>
                ) : canStart ? (
                  <button
                    onClick={() => handleStartTournament(tournament.id)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Débuter le tournoi
                  </button>
                ) : null}
              </div>
              
              <div className="flex items-center space-x-4">
                {isRegistered ? (
                  <>
                    <span className="flex items-center text-green-600">
                      <Check className="w-5 h-5 mr-1" />
                      Inscrit
                    </span>
                    <button
                      onClick={() => handleUnregistration(tournament.id)}
                      className="flex items-center text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5 mr-1" />
                      Se désinscrire
                    </button>
                  </>
                ) : registrationState === 'pending' ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-poker-gold mr-2"></div>
                    Inscription en cours...
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegistration(tournament.id)}
                    disabled={isFull || isStarted}
                    className={`bg-poker-gold text-white px-4 py-2 rounded transition-colors ${
                      isFull || isStarted
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-yellow-600'
                    }`}
                  >
                    {isFull ? 'Complet' : isStarted ? 'En cours' : 'Rejoindre'}
                  </button>
                )}
                {isCreator && (
                  <button
                    onClick={() => handleDeleteTournament(tournament.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
};

export const handleDatabaseError = (error: any) => {
  console.error('Database error:', error);
  alert((error as Error).message);
};

export const isCreator = async (docRef: any, userId: string) => {
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return data.creatorId === userId;
  } else {
    return false;
  }
};

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/main.tsx`

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </React.StrictMode>
);

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/Home.tsx`

```tsx
// src/pages/Home.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore, Tournament } from '../store/tournamentStore';
import { User } from 'firebase/auth';
import { Calendar, Users, MapPin, PlayCircle, Trophy, Plus, Trash2 } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';

interface HomeProps {
    user: User | null;
}

const Home: React.FC<HomeProps> = ({ user }) => {
    const navigate = useNavigate();
    const { fetchTournaments, tournaments, deleteTournament } = useTournamentStore();
    const { teams } = useTeamStore();

    useEffect(() => {
        if (user) {
            fetchTournaments(user.uid);
        }
    }, [fetchTournaments, user, teams]);

    // Filter and sort upcoming tournaments
    const upcomingTournaments = tournaments
        .filter((tournament: Tournament) => tournament.status === 'scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

    // Filter the user's tournament
    const userTournaments = tournaments.filter((tournament: Tournament) => {
        const isUserRegistered = tournament.registrations.some((p) => p.id === user?.uid);
        const isUserInTeam = teams.some(team => team.id === tournament.teamId);
        return isUserRegistered && isUserInTeam;
    });

    const handleDeleteTournament = async (tournamentId: string) => {
        if (user && window.confirm("Êtes-vous sûr de vouloir supprimer ce tournoi ?")) {
            try {
                await deleteTournament(tournamentId, user.uid);
                fetchTournaments(user.uid);
            } catch (error) {
                console.error('Error deleting tournament:', error);
                alert((error as Error).message);
            }
        }
    };

    const handleCreateTournament = () => {
        navigate('/app/create-tournament', { state: { userId: user?.uid } });
    };

    const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
        <div key={tournament.id} className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
            <div>
                <h3 className="font-semibold text-lg">{tournament.name}</h3>
                <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(tournament.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.location}</span>
                    <Users className="w-4 h-4" />
                    <span>{tournament.registrations.length} / {tournament.maxPlayers}</span>
                </div>
            </div>
            <div className='flex items-center'>
                <button
                    onClick={() => navigate('/tournaments')}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors mr-2"
                >
                    <PlayCircle className='w-4 h-4 mr-2' /> Rejoindre
                </button>
                {user?.uid === tournament.creatorId && (
                    <button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-poker-light">
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Welcome Section */}
                    <section className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-poker-black mb-4">
                            Bienvenue sur PokerTour
                        </h1>
                        <p className="text-xl text-gray-600">
                            Organisez et gérez vos tournois de poker comme un professionnel
                        </p>
                    </section>

                    {/* Main Actions */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {/* Create Tournament */}
                        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <h2 className="text-2xl font-bold text-poker-red mb-4 flex items-center">
                                <Plus className="w-6 h-6 mr-2" /> Créer un Tournoi
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Configurez rapidement votre prochain tournoi avec notre interface intuitive
                            </p>
                            <button
                                onClick={handleCreateTournament}
                                className="bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                            >
                                Commencer
                            </button>
                        </div>

                        {/* Join Tournament */}
                        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <h2 className="text-2xl font-bold text-poker-gold mb-4 flex items-center">
                                <Users className="w-6 h-6 mr-2" /> Rejoindre un Tournoi
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Participez à des tournois existants et suivez vos performances
                            </p>
                            <button
                                onClick={() => navigate('/tournaments')}
                                className="bg-poker-gold text-white px-6 py-2 rounded-md hover:bg-yellow-600 transition-colors"
                            >
                                Voir les tournois
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Tournaments */}
                    {upcomingTournaments.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-poker-black mb-4 flex items-center">
                                <Calendar className="w-6 h-6 mr-2" /> Prochains Tournois
                            </h2>
                            <div className="grid gap-4">
                                {upcomingTournaments.map((tournament: Tournament) => (
                                    <TournamentCard tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* User's Tournaments */}
                    {userTournaments.length > 0 && user && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-poker-black mb-4 flex items-center">
                                <Trophy className="w-6 h-6 mr-2" /> Mes Tournois
                            </h2>
                            <div className="grid gap-4">
                                {userTournaments.map((tournament: Tournament) => (
                                    <TournamentCard tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Home;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/MainLayout.tsx`

```tsx
// src/pages/MainLayout.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CreateTournament } from '../components/tournament/CreateTournament';
import { TournamentList } from '../components/tournament/TournamentList';
import { TournamentGames } from '../components/tournament/TournamentGames';
import { User } from 'firebase/auth';
import Home from './Home';

interface MainLayoutProps {
  user: User | null;
}

export function MainLayout({ user }: MainLayoutProps) {
  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/app/create-tournament" element={<CreateTournament user={user} />} />
          <Route path="/tournaments" element={<TournamentList user={user} />} />
          <Route path="/tournament/:tournamentId" element={<TournamentGames />} />
        </Routes>
      </div>
    </div>
  );
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/Profile.tsx`

```tsx
import React from 'react';
import { User } from 'firebase/auth';

interface ProfileProps {
  user: User | null;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  return (
    <div>
      <h1>Profile</h1>
    </div>
  );
};

export default Profile;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/Stats.tsx`

```tsx
import React from 'react';
import { User } from 'firebase/auth';

interface StatsProps {
  user: User | null;
}

const Stats: React.FC<StatsProps> = ({ user }) => {
  return (
    <div>
      <h1>Stats</h1>
    </div>
  );
};

export default Stats;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/Teams/Teams.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { useTeamStore, Team } from '../../store/useTeamStore';
import { User } from 'firebase/auth';
import { Trash2, UserPlus, UserMinus, LogIn } from 'lucide-react'; // Import LogIn icon

interface TeamsProps {
  user: User | null;
}

const Teams: React.FC<TeamsProps> = ({ user }) => {
  const { teams, createTeam, fetchTeams, leaveTeam, joinTeam, deleteTeam, joinTeamByTag } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');
  const [joinTag, setJoinTag] = useState(''); // State for join tag input
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // State for feedback messages

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = async () => {
    if (newTeamName.trim() !== '') {
      if (user) {
        await createTeam(newTeamName);
        setNewTeamName('');
      } else {
        console.error('User not logged in.');
      }
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (user) {
      await leaveTeam(teamId, user.uid);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (user) {
      await joinTeam(teamId, user.uid);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (user && window.confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
      try {
        await deleteTeam(teamId, user.uid);
      } catch (error) {
        console.error('Error deleting team:', error);
        alert((error as Error).message);
      }
    }
  };

  const handleJoinByTag = async () => {
    if (joinTag.trim() === '') {
      setJoinMessage({ type: 'error', text: 'Veuillez entrer un tag d\'équipe.' });
      return;
    }
    setJoinMessage(null); // Clear previous messages
    try {
      await joinTeamByTag(joinTag.trim());
      setJoinMessage({ type: 'success', text: 'Équipe rejointe avec succès !' });
      setJoinTag(''); // Clear input on success
      setTimeout(() => setJoinMessage(null), 3000); // Clear message after 3 seconds
    } catch (error) {
      if (error instanceof Error) {
        setJoinMessage({ type: 'error', text: error.message });
      } else {
        setJoinMessage({ type: 'error', text: 'Une erreur inconnue est survenue.' });
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestion des Équipes</h1>

      {/* Create Team Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Créer une nouvelle équipe</h2>
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Nom de l'équipe"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md mr-2 flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCreateTeam}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Créer
          </button>
        </div>
      </div>

      {/* Join Team by Tag Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Rejoindre une équipe par Tag</h2>
        <div className="flex items-center mb-2">
          <input
            type="text"
            placeholder="Tag de l'équipe (ex: nom_equipe_1234)"
            value={joinTag}
            onChange={(e) => setJoinTag(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md mr-2 flex-grow focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleJoinByTag}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Rejoindre
          </button>
        </div>
        {joinMessage && (
          <p className={`text-sm mt-2 ${joinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {joinMessage.text}
          </p>
        )}
      </div>


      {/* Team List */}
      <h2 className="text-xl font-semibold mb-4">Mes Équipes</h2>
      {teams.length > 0 ? (
        <ul className="space-y-4">
          {teams.map((team: Team) => (
            <li key={team.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <span className="font-semibold text-lg">{team.name}</span>
                  <span className="text-sm text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded">#{team.tag}</span>
                  <p className="text-xs text-gray-500">Créée le: {team.createdAt.toLocaleDateString()}</p>
                </div>
                <div className='flex items-center space-x-2 flex-shrink-0'>
                  {user && team.creatorId === user.uid && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      title="Supprimer l'équipe"
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <Trash2 className='w-4 h-4'/>
                    </button>
                  )}
                  {team.members.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleLeaveTeam(team.id)}
                      title="Quitter l'équipe"
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <UserMinus className='w-4 h-4'/>
                    </button>
                  ) : team.pastMembers.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleJoinTeam(team.id)}
                      title="Rejoindre l'équipe"
                      className="bg-green-100 hover:bg-green-200 text-green-700 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <UserPlus className='w-4 h-4'/>
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Membres: {team.members.length}
              </p>
              {/* Optional: Display member list */}
              {/* <ul className="text-xs text-gray-500 mt-1 pl-4 list-disc">
                {team.members.map(memberId => <li key={memberId}>{memberId}</li>)} // Replace with actual member names if available
              </ul> */}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 italic">Vous n'êtes membre d'aucune équipe pour le moment.</p>
      )}
    </div>
  );
};

export default Teams;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/pages/Tournaments.tsx`

```tsx
// src/pages/Tournaments.tsx
import React, { useEffect } from 'react';
import { User } from 'firebase/auth';
import { useTournamentStore, Tournament } from '../store/tournamentStore';
import { TournamentList } from '../components/tournament/TournamentList';

interface TournamentsProps {
    user: User | null;
}

const Tournaments: React.FC<TournamentsProps> = ({ user }) => {
    const { tournaments, fetchTournaments } = useTournamentStore();

    useEffect(() => {
        if (user) {
            fetchTournaments(user.uid); // Pass userId to fetchTournaments
        }
    }, [fetchTournaments, user]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
            <TournamentList user={user} />
        </div>
    );
};

export default Tournaments;

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/store/tournamentStore.ts`

```typescript
import { create } from 'zustand';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { useTeamStore } from './useTeamStore'; // Import useTeamStore

export interface Player {
  id: string;
  name: string;
  eliminated?: boolean;
}

export interface Blinds {
  small: number;
  big: number;
}

export interface Game {
  id: string;
  tournamentId: string;
  startingStack: number;
  blinds: Blinds;
  blindLevels: number;
  players: Player[];
  status: 'pending' | 'in_progress' | 'ended';
  startedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  buyin: number;
  maxPlayers: number;
  location: string;
  registrations: Player[];
  creatorId: string;
  games: Game[];
  status: 'scheduled' | 'in_progress' | 'ended';
  teamId: string; // Add teamId to Tournament interface
}

interface TournamentStore {
  tournaments: Tournament[];
  fetchTournaments: (userId: string) => Promise<void>; // Add userId parameter
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'status'>, userId: string, teamId: string) => Promise<void>; // Add teamId parameter
  deleteTournament: (tournamentId: string, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, player: Player) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  addGame: (tournamentId: string, gameData: Omit<Game, 'id' | 'status'>) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async (userId) => { // Add userId parameter
    try {
        const { teams } = useTeamStore.getState(); // Get the teams from useTeamStore
        const userTeams = teams.map(team => team.id); // Get the user's team IDs
        if (userTeams.length === 0) {
            set({ tournaments: [] }); // If the user is not in any team, display no tournament
            return;
        }
        const q = query(collection(db, "tournaments"), where("teamId", "in", userTeams)); // Query tournaments where teamId is in userTeams
        const querySnapshot = await getDocs(q);
        const tournaments: Tournament[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Tournament[];
        set({ tournaments });
    } catch (error) {
        handleDatabaseError(error);
    }
  },

  // Adding a Tournament
  addTournament: async (tournamentData, userId, teamId) => { // Add teamId parameter
    try {
      const docRef = await addDoc(collection(db, "tournaments"), {
        ...tournamentData,
        registrations: [],
        creatorId: userId,
        games: [],
        status: 'scheduled',
        teamId: teamId, // Add teamId to Firestore document
      });
      set((state) => ({
        tournaments: [
          ...state.tournaments,
          {
            id: docRef.id,
            ...tournamentData,
            registrations: [],
            creatorId: userId,
            games: [],
            status: 'scheduled',
            teamId: teamId, // Add teamId to local state
          },
        ],
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Tournament
  deleteTournament: async (tournamentId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await deleteDoc(tournamentRef);
      set((state) => ({
        tournaments: state.tournaments.filter((t) => t.id !== tournamentId),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Registering to a Tournament
  registerToTournament: async (tournamentId: string, userId: string, player: Player) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      await updateDoc(tournamentRef, {
        registrations: arrayUnion(player),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: [...t.registrations, player] }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Unregistering from a Tournament
  unregisterFromTournament: async (tournamentId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const playerToRemove = tournamentData.registrations.find((p: Player) => p.id === userId);
      if (!playerToRemove) {
        throw new Error("Player not found in registrations");
      }
      await updateDoc(tournamentRef, {
        registrations: arrayRemove(playerToRemove),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: t.registrations.filter((p) => p.id !== userId) }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Tournament
  startTournament: async (tournamentId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await updateDoc(tournamentRef, {
        status: 'in_progress',
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, status: 'in_progress' }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Adding a Game
  addGame: async (tournamentId: string, gameData: Omit<Game, 'id' | 'status'>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const gameId = Date.now().toString();
      const newGame = {
        id: gameId,
        ...gameData,
        status: 'pending',
      };
      await updateDoc(tournamentRef, {
        games: arrayUnion(newGame),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, games: [...t.games, newGame] }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Updating a Game
  updateGame: async (tournamentId: string, gameId: string, gameData: Partial<Game>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, ...gameData } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Game
  startGame: async (tournamentId: string, gameId: string, players: Player[]) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, status: 'in_progress', startedAt: new Date().toISOString(), players: players } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Ending a Game
  endGame: async (tournamentId: string, gameId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, status: 'ended' } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Game
  deleteGame: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      const updatedGames = tournamentData.games.filter((game: Game) => game.id !== gameId);
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
}));

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/store/useAuthStore.ts`

```typescript
import { create } from 'zustand';
import { User } from 'firebase/auth';
import { auth, provider } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  login: async () => {
    try {
      
    } catch (error) {
      console.error('Error during login:', error);
    }
  },
  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
}));

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/store/useTeamStore.ts`

```typescript
import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

// Fonction pour générer un ID unique à 4 chiffres
const generateUniqueId = async (): Promise<string> => {
  while (true) {
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const teamRef = doc(db, 'teams', id);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) {
      return id;
    }
  }
};

export interface Team {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  pastMembers: string[];
  createdAt: Date;
  tag: string;
}

interface TeamStore {
  teams: Team[];
  currentTeam: Team | null;
  createTeam: (name: string) => Promise<void>;
  fetchTeams: () => Promise<void>;
  addMember: (teamId: string, userId: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  leaveTeam: (teamId: string, userId: string) => Promise<void>;
  joinTeam: (teamId: string, userId: string) => Promise<void>;
  deleteTeam: (teamId: string, userId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  isCreator: (teamId: string, userId: string) => Promise<boolean>;
  joinTeamByTag: (tag: string) => Promise<void>; // Add this line
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  currentTeam: null,
  createTeam: async (name) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.error('User not logged in.');
      return;
    }

    const uniqueId = await generateUniqueId();
    const tag = `${name.toLowerCase().replace(/\s+/g, '_')}_${uniqueId}`;


    const newTeam = {
      name,
      creatorId: user.uid,
      members: [user.uid],
      pastMembers: [],
      createdAt: serverTimestamp(), // Use serverTimestamp() instead of new Date()
      tag: tag, // Ajout du tag
    };

    try {
      const docRef = await addDoc(collection(db, 'teams'), newTeam);
      set((state) => ({
        teams: [...state.teams, { ...newTeam, id: docRef.id, createdAt: new Date() }], // Add the createdAt field to the new team
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
    fetchTeams: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    try {
      const q = query(collection(db, 'teams'), where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedTeams: Team[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTeams.push({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Team); // Convert the Timestamp to a Date object
      });
      set({ teams: fetchedTeams });
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  addMember: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: [...team.members, userId] } : team
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  removeMember: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayRemove(userId),
        pastMembers: arrayUnion(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: team.members.filter((memberId) => memberId !== userId), pastMembers: [...team.pastMembers, userId] } : team
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  leaveTeam: async (teamId, userId) => {
    try {
      await get().removeMember(teamId, userId);
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  joinTeam: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(userId),
        pastMembers: arrayRemove(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: [...team.members, userId], pastMembers: team.pastMembers.filter((memberId) => memberId !== userId) } : team
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  deleteTeam: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      if (!await get().isCreator(teamId, userId)) {
        throw new Error("You are not the creator of this team");
      }
      await deleteDoc(teamRef);
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== teamId),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  setCurrentTeam: (team) => set({ currentTeam: team }),
  isCreator: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      return await isCreator(teamRef, userId);
    } catch (error) {
      handleDatabaseError(error);
      return false;
    }
  },
  joinTeamByTag: async (tag) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      throw new Error('Utilisateur non connecté.');
    }

    try {
      const q = query(collection(db, 'teams'), where('tag', '==', tag));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Équipe non valide ou inexistante');
      }

      const teamDoc = querySnapshot.docs[0];
      const teamId = teamDoc.id;
      const teamData = teamDoc.data() as Omit<Team, 'id'>;

      if (teamData.members.includes(user.uid)) {
        throw new Error('Vous êtes déjà membre de cette équipe');
      }

      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(user.uid),
        pastMembers: arrayRemove(user.uid),
      });

      // Update local state - refetch teams to get the updated list
      await get().fetchTeams();

    } catch (error) {
      // Rethrow specific errors or handle database errors
      if (error instanceof Error && (error.message === 'Équipe non valide ou inexistante' || error.message === 'Vous êtes déjà membre de cette équipe')) {
        throw error;
      } else {
        handleDatabaseError(error);
        throw new Error('Une erreur est survenue lors de la tentative de rejoindre l\'équipe.'); // Generic error for UI
      }
    }
  },
}));

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        poker: {
          red: '#E31B23',
          gold: '#D4AF37',
          black: '#1A1A1A',
          dark: '#2A2A2A',
          light: '#F5F5F5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}

```

## Fichier: `c:/Users/SD.ALMACARBOVAC/Documents/SDperso/Code/PokerTour/PokerTour\vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

```

