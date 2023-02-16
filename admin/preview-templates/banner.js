import htm from "https://unpkg.com/htm?module";

const html = htm.bind(h);

// Preview component for a Banner
const Banner = createClass({
  render() {
    const entry = this.props.entry;

    return html`
    <section class="contained inverted home-feature">
      <a class="feature-image" href="${entry.getIn(['data', 'link'])}">
        <img src="${entry.getIn(['data', 'image'])}" alt="" role="presentation" />
      </a>

      <div class="feature-content">
        <h2 class="feature-title">
          <a href="${entry.getIn(['data', 'link'])}">
            ${entry.getIn(['data', 'title'])}
          </a>
        </h2>

        <div class="feature-description">
          ${this.props.widgetFor("body")}
        </div>
      </div>
    </section>
    `;
  }
});

export default Banner;
