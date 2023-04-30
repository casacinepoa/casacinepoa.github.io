import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);

// Preview component for a Banner
const Banner = createClass({
  render() {
    const entry = this.props.entry;

    return html`
    <section class="contained inverted home_banner">
      <a class="image" href="${entry.getIn(['data', 'link'])}">
        <img src="${entry.getIn(['data', 'image'])}" alt="" role="presentation" />
      </a>

      <div class="content">
        <h2 class="title">
          <a href="${entry.getIn(['data', 'link'])}">
            ${entry.getIn(['data', 'title'])}
          </a>
        </h2>

        <div class="description">
          ${this.props.widgetFor("body")}
        </div>
      </div>
    </section>
    `;
  }
});

export default Banner;
