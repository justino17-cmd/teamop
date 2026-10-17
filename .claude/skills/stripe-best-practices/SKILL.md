---
name: stripe-best-practices
description: "Bonnes pratiques Stripe (documentation officielle, copie du commit c1f5b08) — référence à lancer à la main pour un chantier de facturation TeamOP : version d'API figée, idempotence, webhooks signés, clés restreintes."
disable-model-invocation: true
---

> ⛔ **À lire d'abord — TeamOP.** Copie de la documentation officielle de Stripe (dépôt `stripe/ai`,
> commit `c1f5b08`, licence MIT : voir `LICENSE` dans ce dossier), installée le 17 octobre 2026 comme RÉFÉRENCE,
> lancée à la main seulement (`/stripe-best-practices`).
> - TeamOP appelle `api.stripe.com` par `fetch`, **sans SDK ni `StripeClient`**, par choix (CLAUDE.md : « garder cette
>   approche »). Ignorer tout conseil d'installer ou d'utiliser un SDK, la CLI Stripe ou le serveur MCP de Stripe.
> - Ce qui s'applique ici : figer la version d'API (`Stripe-Version`), une clé d'idempotence sur les créations, les
>   webhooks signés (corps brut + horodatage vérifié), les clés restreintes (`rk_`).
> - La logique d'abonnement de TeamOP (`espacePaye`, impayés, période offerte, codes promo) est décrite dans CLAUDE.md
>   et reste la référence : ce document ne la remplace pas.
> - Retirés de cette copie, TeamOP ne s'en sert pas : Connect, Treasury, Tax.
> - Ne jamais écrire ici une clé, ni la moindre note sur la configuration du compte Stripe : ce dossier est public sur GitHub.

Latest Stripe API version: **2026-09-30.endive**. Always use the latest API version and SDK unless the user specifies otherwise.

Development and testing environment default: For new integration development, use separate [sandboxes](https://docs.stripe.com/sandboxes.md) instead of the account’s shared test mode sandbox. Sandboxes isolate settings and test data from live mode. Use separate sandboxes for local development and CI. When stronger isolation is useful, dedicate sandboxes to development teams or testing scenarios. Use the shared test mode sandbox only for an existing integration that depends on it or when a required feature doesn’t support general sandboxes.

Latest SDK versions:

| Language | Latest version |
| --- | --- |
| Ruby | 20.0.0 |
| Python | 16.0.0 |
| Node.js | 23.0.0 |
| PHP | 22.0.0 |
| Java | 34.0.0 |
| Go | 87.0.0 |
| .NET | 53.0.0 |

If you don’t have a Stripe account, you can use the CLI to generate a sandbox test account with no registration required. Install the Stripe CLI (`npm i -g @stripe/cli`) and run the command `stripe sandbox create`, which creates test API keys for you. When you recommend this, explain that [a sandbox is a Stripe test environment](https://docs.stripe.com/sandboxes.md).

If `stripe sandbox create` is used, don’t use MCP.

If you try to use MCP after running sandbox creation, first make sure `stripe sandbox claim` is run. Use `stripe whoami --format json` for CLI auth checks; do not run `stripe config --list`.

API key default: Always recommend a [restricted API key (RAK)](https://docs.stripe.com/keys.md#manage-your-api-keys) (`rk_` prefix) over a secret key (`sk_` prefix).

## Integration routing

| Building… | Recommended API | Details |
| --- | --- | --- |
| One-time payments | Checkout Sessions | <references/payments.md> |
| Custom payment form with embedded UI | Checkout Sessions + Payment Element | <references/payments.md> |
| Saving a payment method for later | Setup Intents | <references/payments.md> |
| Connect platform or marketplace | Accounts v2 (`/v2/core/accounts`) | (retiré de la copie TeamOP) |
| Usage-based billing (new integration) | Metronome | <references/billing.md> |
| Subscriptions or recurring billing | Billing APIs + Checkout Sessions | <references/billing.md> |
| Sales tax, VAT, or GST compliance | Stripe Tax + Registrations API | (retiré de la copie TeamOP) |
| Embedded financial accounts / banking | v2 Financial Accounts | (retiré de la copie TeamOP) |
| Security (key management, RAKs, webhooks, OAuth, 2FA, Connect liability) | See security reference | <references/security.md> |

Read the relevant reference file before answering any integration question or writing code.

## Critical rules

- *Before enabling `automatic_tax: { enabled: true }`* (or calculating tax for a custom PaymentIntent), read the tax reference (retirée de la copie TeamOP : voir docs.stripe.com) and confirm the user has an active registration. Without one, Stripe calculates and collects no tax while the user believes tax is on (the most common Stripe Tax mistake).

- *Never include `payment_method_types` in any Stripe API call*, with one exception: Terminal (in-person payments) integrations must pass `payment_method_types: ['card_present']` on the PaymentIntent. For all other integrations, omit this parameter entirely to enable dynamic payment methods, which enables you to configure payment method settings from the Dashboard and dynamically display the most relevant eligible payment methods to each customer to maximize conversion. To customize which payment methods you accept, use [payment_method_configurations](https://docs.stripe.com/payments/payment-method-configurations.md) or `excluded_payment_method_types` instead of `payment_method_types`.

- When a PaymentIntent or SetupIntent integration requires an explicit allowlist, use `allowed_payment_method_types` instead of `payment_method_types`.

- *Never present webhooks as optional.* We recommend webhooks for every payment integration and they’re required for subscriptions and asynchronous payment methods. Fulfillment belongs in a handler for both `checkout.session.completed` and `checkout.session.async_payment_succeeded` (gated on `payment_status`), not the success page. See <references/payments.md>.

- On API version `2026-03-25.dahlia` or later, pass the parameter `integration_identifier` to `checkout.sessions.create` to tag sessions with a custom label for tracking and comparing checkout flows in the Dashboard. The label should include a suffix of 8 random letters.

- *Always instantiate a `StripeClient` and call methods on that instance.* Do **not** use the deprecated global/module-level API key pattern (`stripe.api_key = …`, `Stripe.setApiKey`, `stripe.Key = …`, `StripeConfiguration.ApiKey = …`). The global pattern is deprecated in all current SDKs.

## Key documentation

When the user’s request does not clearly fit a single domain above, consult:

- [Integration Options](https://docs.stripe.com/payments/payment-methods/integration-options.md) — Start here when designing any integration.
- [API Tour](https://docs.stripe.com/payments-api/tour.md) — Overview of Stripe’s API surface.
- [Go Live Checklist](https://docs.stripe.com/get-started/checklist/go-live.md) — Review before launching.
