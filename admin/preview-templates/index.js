import Banner from "/admin/preview-templates/banner.js";
import Post from "/admin/preview-templates/post.js";
import Page from "/admin/preview-templates/page.js";

CMS.registerPreviewTemplate("banner", Banner);
CMS.registerPreviewTemplate("post", Post);
CMS.registerPreviewTemplate("news", Post);
CMS.registerPreviewTemplate("essay", Post);
CMS.registerPreviewTemplate("page", Page);

CMS.registerPreviewStyle("/assets/css/screen.css");
// Register any CSS file on the home page as a preview style
fetch("/")
  .then(response => response.text())
  .then(html => {
    const f = document.createElement("html");
    f.innerHTML = html;
    Array.from(f.getElementsByTagName("link")).forEach(tag => {
      if (tag.rel == "stylesheet" && !tag.media) {
        CMS.registerPreviewStyle(tag.href);
      }
    });
  });
