# project-sites — security & threat model (the OPTIONAL lock)

This applies **only when you build with `--lock <passcode>`** (any of the three site types —
docs, tracker, tutorial). An unlocked page is plain HTML with no security properties — it is
just a static page. The lock wraps the *finished* page in a client-side AES-256-GCM gate that
decrypts in the browser. Read this before telling anyone a locked page is "secure": the
protection is real but narrow, and being precise prevents a false sense of safety.

## What the lock IS

- **Content encrypted at rest.** A locked `.html` contains only ciphertext (AES-256-GCM).
  Anyone who obtains the file — from the static host, a CDN cache, a git repo, an email
  attachment — sees an opaque blob, not the page. That is the whole point: you can
  publish the file on an untrusted/public host and the content stays confidential without
  a server.
- **Passcode-derived key.** The AES key is derived with PBKDF2-SHA256 over a random 16-byte
  salt at a high iteration count (default 600,000; OWASP's SHA-256 floor). No key is stored
  in the file — only salt/IV/ciphertext. A wrong passcode fails at the GCM auth-tag check,
  so there is no partial/garbage plaintext leak.
- **No server, no network.** Decryption happens entirely in the browser via Web Crypto. The
  gate's strict CSP sets `connect-src 'none'`, so even the decrypted page cannot open a
  network connection to exfiltrate itself.

## What it is NOT (the honest limits)

- **Not protection against a weak passcode.** The whole security reduces to the passcode's
  entropy. The file is public, so an attacker can brute-force *offline* at their own pace —
  PBKDF2 only slows each guess (≈ tens of ms). A short or guessable passcode WILL be broken.
  Use a long, random passcode (a 5–6-word diceware phrase or 16+ random chars). This is the
  single most important control. Raise `--iter` to increase per-guess cost.
- **Not protection from the person you gave the passcode to.** Once someone decrypts, they
  have the plaintext and can save/screenshot/reshare it. This gates *access*, not
  *redistribution*.
- **Not integrity against a host that can alter the file.** If an attacker controls the
  hosting and can modify the `.html`, they could replace the gate's JavaScript with a
  version that captures the passcode when typed. Client-side crypto can't defend against a
  tampered delivery. Serve it from a host you trust, over HTTPS, ideally where you'd notice
  changes (a versioned git repo helps).
- **Not a substitute for real auth when you have a server.** A backend can rate-limit, lock
  accounts, and never ship ciphertext to unauthenticated clients. Use the lock specifically
  for the *static, serverless* case.
- **No recovery.** Lose the passcode and the content is gone. There is no backdoor.

## Good fit / bad fit

- **Good:** an internal tutorial/onboarding course/one-pager you want on a static host
  without standing up auth, opened by people who already know the passcode.
- **Bad:** protecting content from the recipients themselves; high-value secrets where a
  determined offline brute-force is in scope and the passcode can't be strong; anything
  needing per-user access, revocation, or audit — use server auth.

## Why these specific choices

- **AES-256-GCM** — authenticated encryption: confidentiality + tamper-detection in one.
  The auth tag means a wrong key (wrong passcode) or corrupted blob fails cleanly rather
  than yielding plausible-looking garbage.
- **PBKDF2-SHA256** — chosen over scrypt/argon2 only because it is natively available on
  BOTH sides with zero dependencies: `node:crypto.pbkdf2Sync` (build) and Web Crypto
  `deriveKey` (browser). scrypt/argon2 resist brute-force better but aren't in Web Crypto,
  so they'd need a bundled WASM lib — a much heavier page. `--iter` is the lever.
- **96-bit IV, random per build** — the GCM standard; a fresh random salt+IV every build
  guarantees an (key, IV) pair is never reused.
- **Envelope compatibility** — the build appends GCM's 16-byte auth tag to the ciphertext
  (`ct = ciphertext || tag`) because Web Crypto's `decrypt` expects it that way; Node's
  `getAuthTag()` returns it separately. This is the one subtle interop detail; the
  round-trip is verified.

## The gate's built-in hardening

The gate template (`assets/gate.template.html`) ships with: a strict CSP
(`connect-src 'none'` blocks exfiltration even post-decrypt; `default-src 'none'`), a
clickjacking frame-buster (refuses to run inside an iframe), a secure-context check (says so
plainly if opened over `file://`), `noindex`/`no-referrer` meta, and a passcode that is
**never persisted** (re-entry after reload is by design). The gate UI is styled by the
inlined `assets/gate.css` (a curated Tailwind utility subset — no CDN, offline + CSP-clean).

## Restyling the gate

The gate is a small login card, intentionally separate from the tutorial's own styling. To
restyle, edit the Tailwind classes in `assets/gate.template.html`; if you use classes not in
the subset, regenerate a full Tailwind build into `assets/gate.css`:

```
npx tailwindcss -i input.css -o assets/gate.css --content assets/gate.template.html --minify
```

Keep it INLINED via the `%%STYLESHEET%%` placeholder. Do NOT switch to the Tailwind CDN — it
violates the gate's CSP and breaks offline use.
