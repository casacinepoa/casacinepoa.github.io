source "https://rubygems.org"
# Hello! This is where you manage which Jekyll version is used to run.

gem "jekyll", "~> 4.3.3"

install_if -> { Gem.win_platform? } do
  gem "wdm", "~> 0.1.1"
  gem "tzinfo", "~> 2.0.4"
  gem "tzinfo-data"
end

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# Jekyll plugins
gem "jekyll-feed", "~> 0.17.0", :group => :jekyll_plugins
gem "jekyll-json-feed", "~> 1.0", :group => :jekyll_plugins
gem "jekyll-seo-tag", "~> 2.8", :group => :jekyll_plugins
gem "jekyll-sitemap", "~> 1.4", :group => :jekyll_plugins
gem "jekyll-paginate-v2", "~> 3.0", :group => :jekyll_plugins
gem "jekyll-compose", "~> 0.12.0", :group => :jekyll_plugins
gem "jekyll-auto-authors", "~> 1.0", :group => :jekyll_plugins
gem "jekyll-redirect-from", "~> 0.16.0", :group => :jekyll_plugins
