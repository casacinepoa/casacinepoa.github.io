import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);

// Preview component for a Post
const Post = createClass({
  render() {
    const entry = this.props.entry;
    const title = entry.getIn(['data', 'title'], null);


    return html`
      <article class="contained post">
        <header class="post_header">
            <span class="post_meta">

                <a class="meta_info _author" href="#" rel="author">
                  Nome do Autor
                </a>

              <time class="meta_info _date" datetime="#">
                Data do Post
              </time>
            </span>

            <h1 class="post_title">
              ${title}
            </h1>
        </header>

        <div class="post_content">
          ${this.props.widgetFor("body")}
        </div>

        <footer class="post_footer post_meta">
          <span class="meta_info _tags-title">
            Mais sobre:
          </span>

          <ul class="meta_info _tags-list">
            ${entry.getIn(["data", "tags"], []).map(tag => html`
              <li class="post_tag">
                <a href="#" rel="tag">${tag}</a>
              </li>
            `)}
          </ul>
        </footer>
      </article>`;
  }
});

export default Post;
