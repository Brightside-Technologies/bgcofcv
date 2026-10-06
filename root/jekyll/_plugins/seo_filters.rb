require 'cgi'

module SeoFilters
  # Markdown produces entities; normalize them before escaping HTML attributes
  # or serializing JSON-LD so both formats expose the same readable text.
  def decode_html_entities(value)
    CGI.unescapeHTML(value.to_s)
  end
end

Liquid::Template.register_filter(SeoFilters)
