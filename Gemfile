source "https://rubygems.org"
# Hello! This is where you manage which Jekyll version is used to run.

gem "jekyll", "~> 4.3.1"

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# Jekyll plugins
gem "jekyll-feed", "~> 0.17.0", :group => :jekyll_plugins
gem "jekyll-json-feed", "~> 1.0", :group => :jekyll_plugins
gem "jekyll-seo-tag", "~> 2.8", :group => :jekyll_plugins
gem "jekyll-archives", "~> 2.2", :group => :jekyll_plugins
gem "jekyll-sitemap", "~> 1.4", :group => :jekyll_plugins
gem "jekyll-paginate-v2", "~> 3.0", :group => :jekyll_plugins
