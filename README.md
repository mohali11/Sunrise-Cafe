# Sunrise Cafe & Bakery

[View the live website](https://sunrisecafe1.netlify.app/)

## What was built
A responsive one-page website for Sunrise Cafe & Bakery featuring its bakery-forward menu, cafe information, photos, customer reviews, and two independently connected signup forms.

## Files
- `index.html` — page content, navigation, menu, contact and newsletter forms, map, metadata, and favicon link.
- `styles.css` — responsive layout, colors, typography, and interaction states.
- `script.js` — hamburger menu, category filters, smooth scrolling, testimonial slider, and both form submission handlers.
- `images/` — favicon and cafe, menu, gallery, and Instagram photos.
- `_headers` — Netlify cache rules for image, CSS, and JavaScript files.
- `handoff-notes.md` — short pre-launch checklist and instructions for sending updates.

## Features
- Contact form connected to Formspree form ID `mrpenrde`.
- Newsletter signup connected to its own Formspree form ID `mwlvgazp`. The newsletter was added as an extra feature; it was not requested in the original brief.
- Google Maps embed, Instagram photo grid, and online ordering link.
- Menu filter for All, Brunch, Bakery, and Drinks; testimonial slider; hamburger menu; and smooth scrolling.

## Open placeholders
- The Square ordering URL is still `https://squareup.com/PLACEHOLDER`.
- Yelp and Facebook links still need their real URLs.
- The displayed address, 2847 S Lamar Blvd, Austin, TX 78704, and its map are fictional stand-ins.
- The cafe, menu, and Instagram photos are stock/demo photos and should be replaced with approved business photos.
- The gallery repeats the three supplied photos to fill six tiles.

## Lighthouse and browser checks
- Reported Lighthouse scores: mobile 99 and desktop 100.
- Tested in Chrome, Brave, and Firefox at 375px, 768px, and 1440px widths.
- Safari was not tested because a Mac was unavailable.

## How to update content
- Edit menu names, prices, and descriptions in the Menu section of `index.html`.
- Edit opening times in the Visit section of `index.html`.
- Replace photos in `images/` and update their matching `src="images/filename"` paths in `index.html`.

## How to redeploy on Netlify
Zip the contents of the `Sunrise-Cafe` folder so `index.html` is at the top level inside the zip. In the site's Netlify **Deploys** tab, drag and drop that zip file.
