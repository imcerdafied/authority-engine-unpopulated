# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Google Workspace SSO setup

1. In Supabase Dashboard, open `Authentication -> Providers -> Google` and enable Google provider.
2. In Supabase Dashboard, disable Email provider/password login if you want strict Google-only auth.
3. In Google Cloud Console, create OAuth Client ID (Web application).
4. Add authorized redirect URI:
   - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
5. Copy Google Client ID/Secret into Supabase Google provider config.
6. In Supabase `Authentication -> URL Configuration`, ensure Site URL matches your app domain.
7. Set frontend env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_WORKSPACE_DOMAIN` (optional, e.g. `yourcompany.com`)
8. Apply DB migrations, then set enforced workspace domain:

```sql
UPDATE public.auth_settings
SET workspace_domain = 'yourcompany.com', updated_at = now()
WHERE id = 1;
```

The auth page supports Google SSO only. Invite code gating is still used for non-join onboarding before OAuth redirect.
