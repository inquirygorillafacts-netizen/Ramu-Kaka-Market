# Firebase Studio

This is a Next.js starter project built in Firebase Studio. To get started, take a look at `src/app/page.tsx`.

## How to Push Your Code to GitHub

You can store and manage your app's code on GitHub. Here are the steps to push your code to a new repository.

### Step 1: Create a New Repository on GitHub

1.  Go to [GitHub](https://github.com) and log in.
2.  Click the **+** icon in the top-right corner and select **"New repository"**.
3.  Give your repository a name (e.g., `ramu-kaka-market`).
4.  Choose whether to make it public or private.
5.  **Important:** Do **not** initialize the repository with a README, .gitignore, or license file. You already have these files.
6.  Click **"Create repository"**.

### Step 2: Push Your Code from the Terminal

After creating the repository, GitHub will show you a page with some commands. You'll need to run these from a terminal in your project's directory.

1.  **Open a terminal or command prompt** on your computer.
2.  **Navigate to your project's folder.**
3.  **Connect your local project to your new GitHub repository.** Copy the command from the GitHub page that looks like this:
    ```bash
    git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY-NAME.git
    ```
4.  **Verify the new remote:**
    ```bash
    git remote -v
    ```
5.  **Rename the default branch to `main` (if it's not already):**
    ```bash
    git branch -M main
    ```
6.  **Push your code to GitHub:**
    ```bash
    git push -u origin main
    ```

After this initial push, you can use the following commands to save and push future changes:

```bash
# 1. Add your changed files
git add .

# 2. Commit your changes with a message
git commit -m "Describe your changes here"

# 3. Push your changes to GitHub
git push origin main
```
