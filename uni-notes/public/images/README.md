# Photos

The app looks for real photographs here and falls back to hand-drawn SVG
artwork of Issyk-Kul when a file is missing. Nothing breaks either way — the
fallback is what you see until you add the files.

## Adding your own Issyk-Kul photos

Drop JPEGs into `public/images/issyk-kul/` using exactly these names:

| File | Where it appears | Good subject |
|------|------------------|--------------|
| `sunrise.jpg` | Sign-in screen | Dawn over the lake, mountains behind |
| `shore.jpg` | Notes dashboard banner | The shoreline, that famous blue |
| `valley.jpg` | Sheets dashboard banner | Wide valley or pasture view |
| `peaks.jpg` | Slides dashboard + the "Issyk-Kul" slide theme | Snow peaks across the water |
| `meadow.jpg` | Languages dashboard banner | Meadow, horses, warm light |
| `night.jpg` | AI workspace header | The lake at dusk or night |

No code change is needed — the filename is the wiring.

### Practical notes

- **Size**: roughly 2000px wide is plenty. Compress them (quality ~75) so the
  app stays fast on a tablet; each file under ~400 KB is a good target.
- **Shape**: these are wide banners. Anything around 3:1 to 2:1 crops well.
  A tall portrait photo will be cropped hard top and bottom.
- **Rights**: use your own photos, or ones with a licence that allows it. If you
  use someone else's, record the photographer and licence in
  `public/images/ATTRIBUTION.md` and credit them in the app's Settings screen.

### Why they aren't already here

The environment this was built in has outbound network access restricted, so
photo hosts (Wikimedia Commons, Unsplash) couldn't be reached to fetch and
licence-check real images. The SVG artwork is a stand-in, not a preference —
add the files and it steps aside automatically.
