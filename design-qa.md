# SimplexApp Blu Premium — design QA

Source visual truth: `/workspace/scratch/0b73bff3f8f5/generated_images/exec-535ab29a-601b-4f39-b269-4a6b917b2b40.png`, revised selected option 2. Implementation: `http://terminal.local:4173/tests/responsive.html`, browser-rendered screenshot `/workspace/scratch/simplex-premium-preview.jpg`. Full comparison evidence: `design-comparison.jpg` (source left, implementation right).

Viewport: 393 × 850 CSS px iframe. Source: 853 × 1844 pixels, resized to 393 × 850. Implementation: 1348 × 926 screenshot, app crop 393 × 850 (473,67–866,917), browser density 1. Both show home, Premium, three featured apps, no modal, unauthenticated. Existing production application, not a mobile-runtime template. No device chrome recreated. Existing catalogue and icon assets preserved; current versions/statuses retained.

## Findings and comparison history

1. Initial comparison: P2 missing search immediately after cover; added a real synchronized search input, Enter navigates to filtered catalogue. P2 overly loose spacing pushed catalogue title below fixed navigation; cover reduced from 194 to 184 px, section gaps reduced to 18 px, featured rows to 96 px, categories to 78 px.
2. Recaptured identical 393 × 850 home after changes. Combined comparison opened and inspected. Catalogue title now above the bottom navigation; all three featured rows and all categories visible. No actionable P0/P1/P2 remains.

## Fidelity surfaces

- Typography: system sans matches the rounded clean source hierarchy reasonably; bold title and app names, cyan emphasis, regular descriptions. Source logo is raster; editable HTML brand remains required by the dynamic site identity. Larger brand (29 px) than normalized source is accepted for readability. No title overlap at 360–430 px; two-line descriptions are intentionally clamped, complete copy exists in detail page.
- Layout: cover and brand share a single raster backdrop; compact mascot on right, live text left; three tinted rows, four category shortcuts, search pill, fixed three-item navigation. Actual catalogue is two columns to preserve touch targets, as required for functional mobile use; source thumbnail strip is not recreated as an inaccessible four-column text grid.
- Colors: cobalt/navy art, white/cyan hero, pale blue/green/violet rows, blue/green/violet buttons, muted readable descriptions, warm productivity and violet game category tokens.
- Images: generated WebP cover 1942 × 809 (80 KB), crisp at mobile scale, correct worker and floating icons, no UI rasterized. Existing supplied app logos/category art retained to preserve app identity. Logo masking uses the already-existing SVG asset, not newly drawn art. No placeholder assets.
- Content: title exactly “Tutte le tue app, più semplici.”; three real apps and their actual cloud records; editable introduction/site identity. New share controls and status badges are explicit additional user requirements and intentionally differ from the source. Admin remains only in footer.

Full comparison is legible at native size; no extra focused crop needed for typography/cards because the 806 × 850 composite permits direct reading. Primary interactions tested in cloud Chrome: home, card image opens details, detail APK URL retained, favourite toggle and favourites view, search/Enter, empty category state, copy-link dialog, Classica preview. Read-only DOM measured scrollWidth == clientWidth at 360/393/412/430 in both themes; images loaded correctly. Console errors checked: only extension metadata error, none from application code. Automated tests pass for server authorization, safe theme persistence, sessions (reopen, migration, logout, offline failure, revocation, refresh deduplication), native share dispatch/cancellation/fallback and existing APK flow.

## Test gaps

Live authenticated Admin UI cannot be exercised without the user's credentials; server validation and client session behavior were tested with mocks, no credentials requested. Native social target selection needs the actual Android phone; desktop browser exercised the fallback. Clipboard unavailable in non-secure local preview uses manual selection; HTTPS production supports the async clipboard where browser permission allows it. Existing apps have no screenshots yet; their empty state remains clear, Admin uploader retained.

## Implementation checklist

- [x] Selected source and revised mobile layout inspected
- [x] Live components and cloud data retained
- [x] Search, details, favourites and categories checked
- [x] Classica preserved and restore command implemented
- [x] Share controls per app and details
- [x] Persistent Admin login with explicit logout
- [x] Tests and browser console checked
- [x] Responsive overflow checks passed

Follow-up polish (P3): optional font refinement and app-specific static social metadata (hash routes currently share generic site metadata); neither affects link sharing.

final result: passed


## Horizontal featured update — user instruction 2026-10-02
The user's latest request supersedes the source's vertical featured rows. Premium featured apps now form one horizontal strip, preserving the same palette, artwork, buttons and dynamic data. Desktop has three columns; phones have readable 156px minimum cards, with horizontal overflow restricted to the featured container. Verified in cloud Chrome local preview: page scrollWidth matches 360/393/412/430 CSS width; all three card tops align; third-app share action scrolls into view and opens the correct Gestionale V&G dialog. Compact text blocks reduce unused spacing; no new imagery or backend changes. Classica rules remain scoped separately. Cache version v8 prevents mixed CSS. Final result remains passed for the revised user-authored layout requirement.

Browser Back checks: Preferiti → Catalogo, app details → Catalogo, Admin → previous view, then Home. Root Back returns to Home through the sentinel instead of navigating away (the browser automation waiting for a different URL timed out at this deliberate same-URL state; the following DOM observation confirmed Home). Tests use cloud Chrome, not physical Android.

## Admin v9
Catalogue-first dashboard with search, icon, explicit Edit action and New app. Focused editor with four semantic fieldsets; settings isolated from routine app editing. Existing catalogue/download/detail/share/PWA preserved.
Browser UI verification using a local mocked backend (no real catalogue writes): edit SpesaScan description, save, see success in list, verify changed description in Home; reopen prefilled editor; cancel, switch settings. Dashboard and editor scrollWidth=clientWidth at360,393,412,430. Auth tests cover reopening/migration, offline retention, refresh deduplication, missing legacy expiry, 401 retry, revoked-session cleanup and preventing refresh from restoring a logged-out session. Cross-tab refresh serialized using Web Locks when available. No physical Samsung or production account sign-in performed; no account credentials are available in this workspace. Production backend permissions and schema unchanged.
