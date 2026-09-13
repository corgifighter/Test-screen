# Hearthmere — Production Build

A mobile-first, hosted-web fantasy RPG vertical slice focused on a dense authored Hearthmere village.

## Current production direction
- GLB-first landmark and prop pipeline
- Distinct inn, forge, chapel, mill and watchtower presentation
- Hero character asset with layered equipment and sword silhouette
- Mobile click/tap movement and bridge-aware traversal
- Living villagers, gathering nodes, quest progression and environmental interaction
- Dynamic lighting, water, fire, smoke, embers, birds, motes and foliage motion
- PWA shell and same-origin service worker caching

This project is intentionally evaluated against the Hearthmere production blueprint: environment art, character presentation, materials/lighting, camera/movement, UI/UX, animation, atmosphere/VFX, performance, gameplay foundation and production architecture.


### Production pass
This build includes a higher-detail layered hero and NPC asset set, authored role equipment, tangent-space normal maps for terrain/roads/roofs, roof material treatment on architectural meshes, warmer window materials, and a grounded hero presentation/animation pass.


## v46 renderer/capture hardening
- Capture harness is isolated in `capture.html` and auto-requests a PNG from the real WebGL canvas via `?capture=1`.
- Interaction callbacks are now preserved on interactables so gameplay actions actually fire.
- Service-worker cache namespace advanced to v46.


### v46 deployment hardening
- Runtime bootstrap now catches module startup failures instead of leaving the boot card frozen.
- Asset paths are kept under the repository `assets/` directory, matching the deployed repository layout.
- Three.js and addons use browser-resolvable ESM endpoints with an import map for the `three` package name.
- Service worker cache was bumped to v46 and now caches the actual root-level local assets.
