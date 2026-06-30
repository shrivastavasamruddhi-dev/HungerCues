# Git Workflow — HungerCues / Baby Tracker

## Branch Strategy

We follow a simplified **trunk-based development** approach optimised for a small team.

```
main  ←── production (auto-deployed via CD)
  └── feature/xyz       ← all work happens here
  └── fix/xyz
  └── chore/xyz
```

### Rules

| Rule | Detail |
|------|--------|
| `main` is always deployable | No broken code merges to `main` |
| All work in branches | Never commit directly to `main` |
| PRs required | Every merge requires a PR |
| CI must pass | Ruff + pytest + pip-audit must all pass |
| Squash merge preferred | Keeps `main` history clean and readable |

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-name>` | `feature/sleep-timer-v2` |
| Bug fix | `fix/<short-name>` | `fix/auth-token-expiry` |
| Hotfix | `hotfix/<short-name>` | `hotfix/crash-on-login` |
| Chore / infra | `chore/<short-name>` | `chore/update-deps` |
| Release prep | `release/<version>` | `release/0.2.0` |

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or issue refs]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code change without feature/fix |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, deps, docs |
| `security` | Security patch |

### Examples

```
feat(sleep): add live timer with cycle notifications
fix(auth): handle expired Firebase tokens gracefully
chore(deps): update starlette to 1.3.1 (CVE fix)
security(cors): restrict allowed origins to production domains
```

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] Branch is up to date with `main`
- [ ] CI passes locally (`uv run ruff check . && uv run pytest`)
- [ ] No new secrets or credentials introduced
- [ ] `CHANGELOG.md` updated if this is a user-facing change
- [ ] Relevant tests added or updated
- [ ] If a DB migration is included: it is reversible

---

## Release Process

1. **Freeze** — stop merging non-critical PRs
2. **Version bump** — update `pyproject.toml` and `app.json` versions
3. **CHANGELOG** — fill in the `[Unreleased]` section with the new version and date
4. **Tag** — `git tag v0.x.0 && git push --tags`
5. **Monitor** — watch Sentry and Grafana for 30 min post-deploy
6. **Announce** — notify team / testers

---

## Hotfix Process

For critical production bugs:

```bash
git checkout main
git pull
git checkout -b hotfix/critical-auth-bug
# ... fix ...
git push origin hotfix/critical-auth-bug
# Open PR → squash merge → CD deploys automatically
```

---

## Protected Branch Settings (GitHub UI)

Set these on `main`:
- ✅ Require pull request before merging
- ✅ Require status checks: `backend`, `mobile`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow force pushes
- ✅ Do not allow deletions
