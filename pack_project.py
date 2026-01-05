import os

# CONFIGURATION
output_file = "FULL_CODEBASE_SNAPSHOT.txt"
ignored_folders = {'node_modules', '.git', '__pycache__', 'dist', 'venv', '.venv', '.vscode'}
ignored_extensions = {'.lock', '.png', '.jpg', '.mp4', '.svg', '.pyc', '.sqlite3', '.db'}

def pack_project():
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Write a header
        outfile.write("PROJECT: ZOMBIES LIKE BRAINS\n")
        outfile.write("STACK: React (Vite) + FastAPI (Python)\n")
        outfile.write("="*50 + "\n\n")

        # Walk through all folders
        for root, dirs, files in os.walk("."):
            # Skip ignored folders
            dirs[:] = [d for d in dirs if d not in ignored_folders]
            
            for file in files:
                file_ext = os.path.splitext(file)[1]
                if file_ext in ignored_extensions or file == output_file or file == "pack_project.py":
                    continue

                path = os.path.join(root, file)
                
                # Write File Name and Content
                outfile.write(f"--- FILE START: {path} ---\n")
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        outfile.write(f.read())
                except Exception:
                    outfile.write("[Binary or Unreadable Content]")
                
                outfile.write(f"\n--- FILE END: {path} ---\n\n")

    print(f"✅ Success! Upload '{output_file}' to your Gemini Gem.")

if __name__ == "__main__":
    pack_project()