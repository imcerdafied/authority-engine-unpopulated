# 24h Change Review (Codex)

Generated: 2026-02-26 11:00:49 UTC  
Window: last 24 hours from current HEAD

## Scope Summary

- Primary focus: invite/login reliability, onboarding org creation reliability, role/access automation for Conviva users.
- Secondary focus: mobile UX polish and Capability Map temporary placeholder.
- Net result: major auth/onboarding hardening + production DB/Edge changes deployed.

## Commit Timeline (Newest -> Oldest)

1. `cb9283d` - Auto-provision any `@conviva.ai` user into Conviva
- Files:
  - `supabase/migrations/20260226113000_conviva_domain_autoprovision.sql`
- Change intent:
  - DB-level provisioning backstop on `auth.users` insert.
  - Named exec emails => `admin`; all other `@conviva.ai` => `viewer`.
  - Backfill logic for existing users.
- Review focus:
  - Trigger side effects on `auth.users` insert.
  - Role escalation boundaries and domain matching logic.

2. `9452a92` - Add DB backstop for Conviva exec auto-admin provisioning
- Files:
  - `supabase/migrations/20260224250000_update_updated_at_column.sql`
  - `supabase/migrations/20260224260000_org_membership_helpers.sql`
  - `supabase/migrations/20260224270000_get_user_role_in_org.sql`
  - `supabase/migrations/20260226110000_conviva_exec_autoprovision.sql`
- Change intent:
  - Added helper DB functions required by pending migrations.
  - Added explicit exec-email auto-admin provisioning trigger/backfill.
- Review focus:
  - Security definer function permissions and `search_path` safety.
  - Correctness/compatibility of helper functions with existing policies.

3. `fe8fee4` - Harden invite token hydration for first-time OAuth joins
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Increased token retry window and added fallback token extraction from local auth storage.
- Review focus:
  - Token-handling safety and auth-state race behavior.

4. `48fae32` - Auto-assign Conviva invitees as admin on join
- Files:
  - `supabase/functions/join-org/index.ts`
- Change intent:
  - Join function assigns admin role for listed Conviva emails.
- Review focus:
  - Hardcoded allowlist governance.
  - Service-role write path authz.

5. `8d3948e` - Fix invite join OAuth code exchange token handling
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Added `exchangeCodeForSession` support for OAuth callback using `?code=`.
- Review focus:
  - URL param handling and error paths.

6. `b587b70` - Improve mobile UX and replace Capability Map with coming soon
- Files:
  - `src/components/AppLayout.tsx`
  - `src/components/OrgSetup.tsx`
  - `src/pages/CapabilityMap.tsx`
  - `src/pages/Decisions.tsx`
- Change intent:
  - Mobile layout improvements and spacing/readability adjustments.
  - Capability Map replaced with static “coming soon” placeholder.
- Review focus:
  - Mobile viewport/editability regressions.
  - Navigation expectations for disabled feature routes.

7. `d92a6ef` - Set active org from invite link on join redirect
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Ensures invite join lands in target org before redirect to `/`.
- Review focus:
  - Cross-org context correctness and persistence.

8. `415af85` - Add layered OAuth token recovery for invite join flow
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Expanded token recovery path (`hash`, refresh, retry).
- Review focus:
  - Retry behavior and user-facing failure modes.

9. `1edb9a9` - Stabilize invite join auth token handling after OAuth
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Additional invite auth race hardening.
- Review focus:
  - Duplicative logic and long-term maintainability of auth flow.

10. `2c98ab2` - Make org creation tolerant to missing optional org columns
- Files:
  - `src/contexts/OrgContext.tsx`
  - `supabase/functions/create-org/index.ts`
- Change intent:
  - Org creation no longer hard-fails on optional schema mismatches.
- Review focus:
  - Partial-write behavior and fallback consistency.

11. `621fe35` - Surface real onboarding org-create errors and log failures
- Files:
  - `src/components/OrgSetup.tsx`
  - `src/contexts/OrgContext.tsx`
- Change intent:
  - Better user-facing error details + telemetry for failed org creation.
- Review focus:
  - Error disclosure level and telemetry payload hygiene.

12. `ef41e46` - Add resilient fallbacks for onboarding org creation
- Files:
  - `src/contexts/OrgContext.tsx`
- Change intent:
  - Multi-path create-org fallback strategy.
- Review focus:
  - Idempotency and duplicate org creation risk.

13. `be21eb8` - Use create-org edge function for reliable onboarding org creation
- Files:
  - `src/contexts/OrgContext.tsx`
  - `supabase/functions/create-org/index.ts`
- Change intent:
  - New `create-org` Edge Function path introduced.
- Review focus:
  - Service-role data integrity and access controls.

14. `7ca6a5e` - Fix onboarding progression and open invite-link access
- Files:
  - `src/components/OrgSetup.tsx`
  - `src/contexts/OrgContext.tsx`
  - `src/pages/Team.tsx`
  - `supabase/functions/join-org/index.ts`
- Change intent:
  - Onboarding step flow fixes and invite access relaxation.
- Review focus:
  - Security posture changes (domain gating removed/relaxed).

15. `5a2cc1d` - Harden invite join flow for non-2xx edge responses
- Files:
  - `src/pages/Join.tsx`
- Change intent:
  - Better handling for edge function transport/non-2xx errors.
- Review focus:
  - Recovery behavior under intermittent backend failures.

## Production Actions Performed (Outside Git Diffs)

- Deployed Supabase Edge Functions (notably `join-org`, `create-org`) to project `rqhmegnxtdlvytpxamjn` during incident response.
- Ran `supabase db push` and applied pending migrations through `20260226113000`.
- Live data corrections during incident response:
  - Promoted/inserted specific Conviva users into `organization_memberships` as needed to unblock access.
  - Cleared restrictive `allowed_email_domain` values for Conviva during invite troubleshooting.

## Suggested Independent Code Review Checklist

1. Auth/join flow correctness
- `src/pages/Join.tsx`: OAuth callback permutations (`?code=`, hash tokens), retry strategy, duplicate invocation guards.

2. Privileged edge paths
- `supabase/functions/join-org/index.ts`
- `supabase/functions/create-org/index.ts`
- Validate caller auth and org-bound authorization for every service-role write.

3. DB trigger safety and blast radius
- `20260226110000_conviva_exec_autoprovision.sql`
- `20260226113000_conviva_domain_autoprovision.sql`
- Confirm trigger cannot accidentally grant membership outside intended org/domain scope.

4. RLS/helper function interactions
- `20260224260000_org_membership_helpers.sql`
- `20260224270000_get_user_role_in_org.sql`
- Verify behavior aligns with all existing policies and enum assumptions.

5. Onboarding idempotency
- `src/contexts/OrgContext.tsx` create-org fallback paths
- Ensure no duplicate org/membership writes under retries.

6. UI regression checks
- `src/components/OrgSetup.tsx`
- `src/pages/Decisions.tsx`
- `src/pages/CapabilityMap.tsx`
- Focus: mobile viewport/editability, placeholder route clarity, nav behavior.

## Commands Used to Build This Summary

```bash
git log --since='24 hours ago' --date=iso --pretty=format:'%h|%ad|%an|%s'
git show --stat --name-status <commit>
```
