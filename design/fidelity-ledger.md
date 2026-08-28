# Visual fidelity ledger

Reference: `dentivohq-concept.png`. Browser renders were captured at 1440×900 and a 390×844 mobile override.

- Copy and hierarchy: hero headline, support copy, CTAs, appointment title, booking title, and workflow section match the concept; no hero eyebrow was added.
- Palette: true-white surfaces, ink-navy text, teal actions, cool-gray borders, and restrained status colors match the reference.
- Container model: landing uses one product frame, dashboard uses an open table plus detail rail, and booking uses one bordered workspace rather than card grids.
- Typography and spacing: large editorial hero type and compact UI chrome remain distinct and responsive.
- Interaction: dentist filtering, selected appointment detail, booking service/time selection, and console search were exercised in-browser; the filter/detail mismatch discovered during QA was fixed.
- Responsive behavior: landing and dashboard report equal document scroll/client widths at mobile size; the appointment table scrolls internally where needed.
- Intentional deviations: the generated tooth mark is represented by a simple code-native `D` mark pending a final approved logo asset; production data replaces the realistic design fixtures; the clinic-slug rewrite is Cloudflare Pages behavior and is not emulated by Astro dev.
