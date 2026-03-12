# editable sounds and images

## Deploy for free (GitHub Pages, no credit card)

1. **Push this repo to GitHub**  
   Create a new repository on [github.com/new](https://github.com/new), then:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Turn on GitHub Pages from Actions**  
   In your repo: **Settings → Pages**  
   - **Source**: choose **GitHub Actions** (not “Deploy from a branch”).

3. **Trigger a deploy**  
   Every push to `main` will run the workflow and deploy.  
   After the first run, your game will be at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

No cost, no credit card. Uses GitHub’s free Pages and Actions.
