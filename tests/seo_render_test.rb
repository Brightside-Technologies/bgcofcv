require 'jekyll'
require 'json'
require 'cgi'
require 'minitest/autorun'

# Render the actual shared include without running asset compilation or writing a site.
class SeoRenderTest < Minitest::Test
  def setup
    @@site ||= begin
      site = Jekyll::Site.new(Jekyll.configuration('config' => '_config.yml', 'quiet' => true))
      site.read
      site
    end
  end

  def render(page)
    @@site.liquid_renderer.file('_includes/seo.html')
      .parse(File.read('root/jekyll/_includes/seo.html'))
      .render!({ 'site' => @@site.site_payload['site'], 'page' => page }, registers: { site: @@site })
  end

  # Omitting entity decoding before escaping makes real search text contain &amp;.
  def test_titles_are_human_readable_after_one_html_decode
    output = render('url' => '/program-categories/sports-fitness.html', 'title' => 'Sports &amp; Fitness')
    title = CGI.unescapeHTML(output[/<title>(.*?)<\/title>/m, 1])
    assert_equal 'Sports & Fitness | Boys & Girls Clubs of Coachella Valley', title
  end

  def test_description_markdown_and_quotes_do_not_leak_encoded_entities
    output = render('url' => '/fixture.html', 'title' => 'Fixture', 'seo_description' => 'Boys & Girls enjoy "fitness" and [sports](https://example.com).')
    description = CGI.unescapeHTML(output[/name="description" content="([^"]*)"/, 1])
    assert_includes description, 'Boys & Girls'
    assert_includes description, 'sports'
    refute_match(/&(?:amp|quot|#\d+);|\]\(/, description)
  end

  def test_schema_description_is_plain_text_and_not_html_encoded
    output = render('url' => '/index.html', 'title' => 'Home', 'seo_description' => 'Boys & Girls help local youth.')
    schema = JSON.parse(output[/<script type="application\/ld\+json">(.*?)<\/script>/m, 1])
    assert_equal 'Boys & Girls help local youth.', schema['description']
  end
end
