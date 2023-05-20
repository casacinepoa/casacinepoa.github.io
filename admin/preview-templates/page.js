import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);

// Preview component for a Post
const Page = createClass({
  render() {
    const entry = this.props.entry;
    const title = entry.getIn(['data', 'title'], null);


    return html`
      <article class="contained post">
        <header class="post_header">

            <h1 class="post_title">
              ${title}
            </h1>
        </header>

        <div class="post_content">
          ${this.props.widgetFor("body")}
        </div>
      </article>`;
  }
});

export default Page;
