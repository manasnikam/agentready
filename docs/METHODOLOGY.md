# AgentReady audit methodology (v0.1 draft)

Owner: Nilakshi Nikam (domain lead, GRC) · Status: draft for review

## Purpose
Produce repeatable, publishable measurements of whether AI agents can complete
representative tasks on a website, and quantify the improvement from exposing
WebMCP tools.

## Task definition
v0.1 measures one task class: **find_and_cart_product** — "find any in-stock
product and add it to the cart; complete when the cart visibly contains ≥1 item."
Checkout, login, and payment are out of scope (and CAPTCHAs/logins are recorded
as failures, never bypassed).

Tasks must be: (a) verifiable from page state, (b) identical across all sites in
a category, (c) achievable by a first-time human visitor in under 2 minutes.

## Run protocol
- ≥5 runs per mode per site; fresh browser context per run; no cookies carried over.
- Browsers: Cloudflare Browser Run (edge headless Chrome via CDP); local Chromium
  accepted for development but published editions run on Browser Run for
  consistency of environment.
- Modes: `ui` (agent operates the page via an element snapshot) and `webmcp`
  (agent calls the site's registered tools).
- Max 25 steps (ui) / 10 tool calls (webmcp), 30s navigation timeout.
- Model and prompt are pinned per benchmark edition and disclosed.

## Metrics
- Success rate per mode, with 95% CI (normal approximation; small-n noted).
- Steps-to-complete (completed runs only) and wall-clock duration.
- Failure taxonomy: auth_wall, captcha, popup_interference, ambiguous_ui,
  navigation_loop, missing_info, timeout, tool_error, other.

## Score
readiness = 100 × (0.70 × best_success_rate + 0.15 × has_webmcp + 0.15 × efficiency)
- best_success_rate: webmcp rate if tools exist, else ui rate.
- efficiency: linear from avg 4 steps (1.0) to 20 steps (0.0).
Weights are v0.1 judgment calls; revisit after 50 real site audits.

## Integrity rules
1. Never publish a score for a real company from synthetic fixtures.
2. Publish CI alongside every score; suppress scores where CI half-width > 20pp
   until more runs are collected.
3. Disclose model, date, and prompt version with every published edition.
4. Re-audit on request; corrections are versioned, not silently edited.
5. Respect robots directives and rate limits; identify the crawler honestly if
   a site operator asks.

## Known limitations (v0.1)
- Single task class; single model; element-snapshot UI mode understates sites
  that depend on visual layout; small n per site.
