#!/usr/bin/env bash
# Build + deploy du mobile sur Cloudflare Pages (projet "facamwa").
#
# Pré-requis (1 seule fois) : `npx wrangler login`
# Usage :
#   bash scripts/deploy-mobile.sh
#
# Le projet est accessible sur https://facamwa.pages.dev
# (le custom domain facamwa.com sera configuré côté Cloudflare quand on
#  bascule la prod chez Infomaniak).

set -euo pipefail

# Toujours partir de la racine du repo, peu importe d'où on lance le script.
cd "$(dirname "$0")/.."

echo "▶ Build production du mobile..."
(cd mobile && npx ng build --configuration production)

echo "▶ Deploy sur Cloudflare Pages (projet facamwa)..."
npx wrangler pages deploy mobile/www/browser \
  --project-name=facamwa \
  --branch=main \
  --commit-dirty=true

echo "✅ Deploy terminé. URL stable : https://facamwa.pages.dev"
