import Scenery from '../Scenery.jsx';

/**
 * One rendered slide. Used at three sizes — thumbnail, editor canvas and
 * fullscreen — so all three always agree on what a slide looks like.
 *
 * `editable` swaps the text for contentEditable-free inputs handled by the
 * parent; here we only render.
 */

function bulletLines(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SlideView({ slide, theme = 'clean', scale = 'thumb' }) {
  const { layout } = slide;

  return (
    <div className={`slide slide-${scale} theme-${theme} layout-${layout}`}>
      {theme === 'lake' ? <Scenery slot="slides" className="slide-bg" overlay /> : null}

      <div className="slide-inner">
        {layout === 'title' ? (
          <>
            <h2 className="slide-title big">{slide.title}</h2>
            {slide.body ? <p className="slide-subtitle">{slide.body}</p> : null}
          </>
        ) : null}

        {layout === 'section' ? <h2 className="slide-title section">{slide.title}</h2> : null}

        {layout === 'bullets' ? (
          <>
            <h2 className="slide-title">{slide.title}</h2>
            <ul className="slide-bullets">
              {bulletLines(slide.body).map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}

        {layout === 'quote' ? (
          <blockquote className="slide-quote">
            <p>{slide.quote}</p>
            {slide.attribution ? <footer>{slide.attribution}</footer> : null}
          </blockquote>
        ) : null}

        {layout === 'two-column' ? (
          <>
            <h2 className="slide-title">{slide.title}</h2>
            <div className="slide-columns">
              <ul>
                {bulletLines(slide.left).map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              <ul>
                {bulletLines(slide.right).map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
