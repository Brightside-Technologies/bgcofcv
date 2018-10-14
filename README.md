Opiniated Jekyll boilerplate for static websites deployed to Netlify. If not using Netlify, disregard `netlify.toml`.

**Note** : assumes all site javascript exists in site.js. Bundling is only done for vendors

# Features

-   Includes Bootrstrap 4 and jQuery
-   Uses Browserify as a vendors bundler
-   Build scripts
    -   Minify css with `gulp-clean-css`
    -   Auto prefix css with `gulp-autoprefixer`
    -   Minify js with `gulp-uglify`
    -   Minify html with `gulp-htmlmin`
    -   Optimize images with `gulp-imagemin` (included, not used)
-   Includes `netlify.toml` for Netlify deployment configurations
-   Includes Open Graph, Twitter, and SEO tags
-   Google Analytics script
-   Emoji support via `jemoji` jekyll plugin
-   Cross-browser line-clamping using pure css
-   Includes `normalize.css`
-   Responsive images
    -   Solution includes `gulp-responsive` to generate different versions of images and a jekyll include file to abstract the functionality into a reusable block to generate an `<img>` with `srcset` or `div` with in-line `image-set()` style for background images.
-   Auto-generated `sitemap.xml` via `jekyll-sitemap`
-   Cache busting through `gulp-buster`
-   Includes `robots.txt`

# TODO

-   Resoponsive-images
    -   add parameter for default size.
    -   Can `{%include%}` return a string only (to interpolate in `src` or inline style)?
-   Remove dead css with `css-purify`
-   ~Strip vendor comments (gulp-strip-comments)~ This is done by the minification process.
-   Add optional rss feed
-   Explore oEmbed support
