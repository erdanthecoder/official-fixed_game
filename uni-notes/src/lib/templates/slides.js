/**
 * Presentation layouts, themes and starter decks.
 *
 * A deck is `{ title, theme, slides: [...] }`. A slide carries every field any
 * layout might use; the layout decides which ones are rendered, so switching
 * layout never destroys text the user typed.
 */

export const LAYOUTS = [
  { id: 'title', labelKey: 'slides.layoutTitle', icon: '🅣' },
  { id: 'bullets', labelKey: 'slides.layoutBullets', icon: '☰' },
  { id: 'section', labelKey: 'slides.layoutSection', icon: '▭' },
  { id: 'quote', labelKey: 'slides.layoutQuote', icon: '❝' },
  { id: 'two-column', labelKey: 'slides.layoutTwoColumn', icon: '▥' },
];

export const THEMES = [
  { id: 'clean', labelKey: 'slides.themeClean', swatch: '#ffffff' },
  { id: 'lake', labelKey: 'slides.themeLake', swatch: '#1d6f9c' },
  { id: 'night', labelKey: 'slides.themeNight', swatch: '#111827' },
  { id: 'warm', labelKey: 'slides.themeWarm', swatch: '#f0a64a' },
];

let counter = 0;
const slideId = () => `slide_${Date.now().toString(36)}_${(counter += 1)}`;

export function makeSlide(overrides = {}) {
  return {
    id: slideId(),
    layout: 'bullets',
    title: '',
    body: '',
    quote: '',
    attribution: '',
    left: '',
    right: '',
    notes: '',
    ...overrides,
  };
}

function whyThisSchool() {
  return {
    theme: 'lake',
    slides: [
      makeSlide({
        layout: 'title',
        title: 'Why this university',
        body: 'Your name · Year',
        notes: 'Say who you are in one sentence, then move on.',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'What I want to study',
        body: 'The subject\nWhy it interests me\nWhat I have already done in it',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'Why this school specifically',
        body: 'A course only they offer\nA professor or lab\nSomething about the city',
        notes: 'Be specific — generic praise is forgettable.',
      }),
      makeSlide({
        layout: 'two-column',
        title: 'Costs and money',
        left: 'Tuition\nLiving costs\nTravel',
        right: 'Scholarships to apply for\nFamily contribution\nPart-time work',
      }),
      makeSlide({
        layout: 'quote',
        quote: 'Pick a line from their website that actually convinced you.',
        attribution: '— the university',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'My plan',
        body: 'Apply by ______\nEssay done by ______\nTest booked for ______',
      }),
    ],
  };
}

function aboutMe() {
  return {
    theme: 'warm',
    slides: [
      makeSlide({ layout: 'title', title: 'About me', body: 'Your name' }),
      makeSlide({
        layout: 'bullets',
        title: 'Three things about me',
        body: 'Something I have built or made\nSomething I keep doing every week\nSomething I want to get better at',
      }),
      makeSlide({
        layout: 'section',
        title: 'What I care about',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'Where it started',
        body: 'The moment I got interested\nWhat I did next\nWhat I learned the hard way',
        notes: 'Tell one story properly instead of listing five.',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'What I want next',
        body: 'What I want to study\nWhat I want to build\nWho I want to help',
      }),
      makeSlide({ layout: 'title', title: 'Thank you', body: 'Questions welcome' }),
    ],
  };
}

function researchDeck() {
  return {
    theme: 'clean',
    slides: [
      makeSlide({ layout: 'title', title: 'Presentation title', body: 'Your name · Class' }),
      makeSlide({
        layout: 'bullets',
        title: 'The question',
        body: 'What I wanted to find out\nWhy it matters',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'How I looked into it',
        body: 'What I read\nWhat I measured or collected\nWhat I could not do',
      }),
      makeSlide({
        layout: 'two-column',
        title: 'What I found',
        left: 'Result one\nResult two',
        right: 'What surprised me\nWhat I expected',
      }),
      makeSlide({
        layout: 'bullets',
        title: 'What it means',
        body: 'The short answer\nWhat I would do next\nWhat I still do not know',
      }),
      makeSlide({ layout: 'section', title: 'Questions?' }),
    ],
  };
}

export const SLIDE_TEMPLATES = [
  {
    id: 'why-this-school',
    labelKey: 'templates.whyThisSchool',
    hintKey: 'templates.whyThisSchoolHint',
    icon: '🏫',
    build: whyThisSchool,
  },
  {
    id: 'about-me',
    labelKey: 'templates.myselfDeck',
    hintKey: 'templates.myselfDeckHint',
    icon: '🙋',
    build: aboutMe,
  },
  {
    id: 'research',
    labelKey: 'templates.researchDeck',
    hintKey: 'templates.researchDeckHint',
    icon: '🔬',
    build: researchDeck,
  },
];

export function blankDeck() {
  return { theme: 'clean', slides: [makeSlide({ layout: 'title' })] };
}
