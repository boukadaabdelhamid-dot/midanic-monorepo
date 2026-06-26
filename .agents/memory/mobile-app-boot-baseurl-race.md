---
name: Mobile app boot base-URL race
description: Boot-time authenticated requests in the Expo app must wait for the server base URL to be applied.
---

# Mobile app boot base-URL race

**Rule:** In the Expo app, any boot-time authenticated request (e.g. a session
refresh) must be gated on the server base URL already being applied — never fired
from a plain mount effect.

**Why:** The shared API client's base URL is set asynchronously by an outer
server-config provider on mount. React runs child effects before parent effects,
so an auth provider nested inside it can fire a request before the base URL is set
— resolving against a relative URL with no host (fails on native, wrong origin on
web). Restoring a persisted session from local storage is safe immediately; only
the network call needs the base URL.

**How to apply:** Future mobile work that makes authenticated calls during/after
boot should depend on the gated auth state, not fire requests before server config
is ready.
