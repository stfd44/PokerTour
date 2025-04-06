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
