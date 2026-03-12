import os
import sys
import fnmatch

# Default directories and files to ignore
IGNORE_DIRS = {
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.next', 'out', '.gemini', '__pycache__', 'venv', '.venv',
    '.snapshots', '.test-output', '.custom', 'test-scaffold-output',
    '.turbo', '.vscode', '.idea', 'target', '.agent', '.builder', '.data', 'scripts',
    '.vercel', '.netlify', 'public', '.cache'
}

IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', 'LICENSE', 'README.md', 'CHANGELOG.md'
}

# Add binary extensions to avoid reading them
BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.pdf', '.zip',
    '.tar', '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib',
    '.db', '.sqlite', '.sqlite3', '.pyc', '.pyo', '.woff', '.woff2', '.ttf', '.eot',
    '.map', '.log', '.tmp', '.bak', '.swp'
}

def is_ignored(name, is_dir):
    if is_dir:
        return name in IGNORE_DIRS
    else:
        if name in IGNORE_FILES:
            return True
        _, ext = os.path.splitext(name)
        if ext.lower() in BINARY_EXTENSIONS:
            return True
        return False

def generate_tree(dir_path, prefix=""):
    """Recursively generates a visual tree of the directory structure."""
    tree_str = ""
    try:
        entries = sorted([e for e in os.listdir(dir_path)])
    except PermissionError:
        return tree_str
        
    # Filter entries first
    valid_entries = []
    for entry in entries:
        full_path = os.path.join(dir_path, entry)
        is_dir = os.path.isdir(full_path)
        if not is_ignored(entry, is_dir):
            valid_entries.append((entry, is_dir, full_path))
            
    for i, (entry, is_dir, full_path) in enumerate(valid_entries):
        is_last = (i == len(valid_entries) - 1)
        connector = "└── " if is_last else "├── "
        
        tree_str += f"{prefix}{connector}{entry}\n"
        
        if is_dir:
            extension_prefix = "    " if is_last else "│   "
            tree_str += generate_tree(full_path, prefix + extension_prefix)
            
    return tree_str

def read_file_content(file_path):
    """Attempts to read file content as UTF-8. Returns None if it looks like binary."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        # Fallback to check if it's text with different encoding or just skip if binary
        return "[BINARY FILE OR UNSUPPORTED ENCODING - SKIPPED]"
    except Exception as e:
        return f"[ERROR READING FILE: {str(e)}]"

def process_directory(target_dir, output_file):
    target_dir = os.path.abspath(target_dir)
    dir_name = os.path.basename(target_dir)
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(f"Repository Export: {dir_name}\n")
        out.write("=" * 50 + "\n\n")
        
        out.write("DIRECTORY STRUCTURE\n")
        out.write("-" * 50 + "\n")
        out.write(f"{dir_name}/\n")
        out.write(generate_tree(target_dir))
        out.write("\n\n" + "=" * 50 + "\n\n")
        
        out.write("FILE CONTENTS\n")
        out.write("-" * 50 + "\n\n")
        
        # Walk through directory for file contents
        for root, dirs, files in os.walk(target_dir):
            # Modify dirs in-place to prune ignored directories
            dirs[:] = [d for d in dirs if not is_ignored(d, True)]
            
            for file in sorted(files):
                if is_ignored(file, False):
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, target_dir)
                
                content = read_file_content(file_path)
                
                out.write("-" * 20 + "\n")
                out.write(f"File: {rel_path}\n")
                out.write("-" * 20 + "\n\n")
                
                if content is not None:
                    out.write(content)
                    if not content.endswith('\n'):
                        out.write('\n')
                out.write("\n")
                
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract-text.py <target_directory> <output_file>")
        sys.exit(1)
        
    target_dir = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.isdir(target_dir):
        print(f"Error: Target directory '{target_dir}' does not exist.")
        sys.exit(1)
        
    print(f"Extracting '{target_dir}' to '{output_file}'...")
    process_directory(target_dir, output_file)
    print("Done!")
