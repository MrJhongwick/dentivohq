---
name: release-promotion
description: Assess and execute DentivoHQ staging-to-main promotions and guarded GitHub semantic releases. Use when the user asks whether a release is needed, requests a staging-to-main PR or promotion, asks to publish or create a release, names a patch/minor/major bump, or needs release, Cloudflare production, tag, or deployment verification.
---

# Release Promotion

Use the repository's existing CI, Cloudflare deployment checks, and manual GitHub Release workflow. Never bypass `.github/workflows/release.yml` with a direct tag or `gh release create` command.

Treat this skill as a guarded workflow, not authorization to mutate GitHub or production. A request to assess is read-only. Creating a PR, merging it, and publishing a GitHub release are separate actions and require authorization from the user's request.

## Start with a read-only assessment

1. Inspect `git status --short --branch`; preserve unrelated user changes.
2. Verify the intended GitHub repository with `git remote -v` and the active GitHub account with `gh auth status`.
3. Fetch Git refs without changing the working tree.
4. Identify the latest strict `vMAJOR.MINOR.PATCH` release tag.
5. Review `git log --oneline origin/main..origin/staging` and `git diff --stat origin/main...origin/staging`.
6. Inspect the relevant CI and deployment workflow results for the exact staging SHA.
7. Report one release recommendation:
   - `release not required` when there are no unreleased changes or only internal task/backlog documentation changed;
   - `patch` for compatible fixes, security repairs, performance work, or production-affecting dependency/configuration changes;
   - `minor` for backward-compatible features;
   - `major` for breaking behavior or contracts.
8. State the latest release, relevant SHAs, included change types, and why the recommendation follows. Treat the recommendation as engineering judgment, not a commit-message-only decision.

If `origin/staging`, `.github/workflows/release.yml`, or another required release mechanism does not exist, stop before promotion or publication and report that exact prerequisite. Do not invent branches, workflows, deployment URLs, or repository conventions.

Do not publish when the bump is unspecified. Recommend a bump and ask for confirmation unless the user already confirmed that recommendation in the conversation. A request such as "release patch", "publish a minor release", or "proceed with the recommended bump" authorizes dispatch only after every gate passes.

## Promote staging to main

1. Confirm `origin/staging` contains the intended tested changes and identify any divergence from `origin/main`.
2. Verify staging CI, Cloudflare preview/staging deployments for the relevant SHA, and any changed public workflows before promotion.
3. Create the PR with title `chore(release): promote staging to main`. Keep `staging` as a long-lived branch.
4. Write only `Summary` and `Details` bullets in the PR description; do not add a test-cases section.
5. Wait for required PR CI and Cloudflare checks. Merge only when the user's request authorizes merging.
6. After merge, wait for the `main` push CI, Cloudflare production deployments, and configured health checks.
7. Re-run the assessment and explicitly report whether a GitHub release is needed and the recommended bump.

Creating or merging a promotion PR does not itself publish a GitHub release.

## Publish a confirmed release

Before dispatching, verify all of the following:

- the active GitHub account and repository are the intended DentivoHQ target;
- the selected ref is `main` and its SHA is associated with a merged `staging` to `main` PR;
- every required CI job succeeded for that exact `main` SHA;
- Cloudflare production deployments triggered by the promotion succeeded for that exact SHA;
- the environment-configured landing, dashboard, console, and API health URLs return their expected successful responses;
- the commit does not already have a strict `vMAJOR.MINOR.PATCH` tag;
- the requested bump is exactly `patch`, `minor`, or `major`;
- `.github/workflows/release.yml` exists and exposes the expected manual bump input.

Then:

1. Dispatch `gh workflow run release.yml --ref main -f bump=<bump>`.
2. Resolve the newly created workflow run ID and wait with `gh run watch <run-id> --exit-status`.
3. Verify the resulting release and tag with `gh release view <tag> --json ...` and the GitHub tag-ref API.
4. Confirm the release tag targets the verified production SHA and is neither draft nor duplicated.
5. Record evidence in the repository's task tracker when one exists and the requested workflow requires it.
6. Report the release URL, tag, target SHA, workflow run, deployed application evidence, and whether GitHub marks it as a prerelease.

If the user asks for GitHub's prerelease flag or a version suffix such as `-rc.1`, first verify that `.github/workflows/release.yml` explicitly supports it. Otherwise stop and explain that the workflow needs an intentional enhancement.

## Stop conditions

Do not publish if CI is missing or failed, production is not on the intended SHA, health checks fail, branch provenance is invalid, the commit is already tagged, the release workflow is absent or incompatible, or the bump is ambiguous. Continue safe diagnostics and report the exact failed gate.

Never print secrets, Cloudflare API tokens, database URLs, OAuth credentials, payment credentials, or environment-variable values. Do not weaken branch protection, skip required checks, force-push protected branches, or manufacture health evidence to complete a release.

## Handoff

For every staging-to-main promotion assessment, report:

- `release required` or `release not required`;
- the recommended `patch`, `minor`, or `major` bump when required;
- the commits or change categories driving the recommendation;
- the latest release tag and the staging/main SHAs examined;
- CI, Cloudflare deployment, and health-check evidence actually verified;
- any missing prerequisite or manual confirmation still required.

After a successful merge, remind the user that production deployment may be automatic, but GitHub release publication remains a separate guarded action.
