#!/usr/bin/env bash
# Generates the shadcn/ui primitives this app imports. Run once after npm install.
# Accept whichever primitive layer `shadcn init` selects; do not mix Base UI and Radix.
set -euo pipefail

npx shadcn@latest add \
  button card input label slider tabs tooltip badge \
  skeleton alert sonner scroll-area separator popover alert-dialog chart
