/**
 * Loading tips.
 *
 * Short, useful, one at a time — the kind you actually read while something
 * loads. Half teach a shortcut, half are advice about applying to university.
 * A couple are just encouraging, because a blank essay page is miserable.
 *
 * Kept out of translations.js because these are arrays, and because they're the
 * one bit of copy that benefits from being easy to add to.
 */

const en = [
  'Ctrl+B, Ctrl+I and Ctrl+U work in Notes, exactly as you would expect.',
  'In Sheets, start a cell with = to write a formula. Try =SUM(B2:B8).',
  'Press F2 to edit a cell without wiping what is already in it.',
  'Reloading is safe. Anything you typed is written down before it can be lost.',
  'Share a document from UniSave and the other person edits the same copy — no versions flying about.',
  'Invite someone as a viewer when you want an opinion but not an editor.',
  'Ask Uni AI why a paragraph is weak, not just to rewrite it. You learn more.',
  'Deadlines and tuition change every year. Check them on the university’s own site.',
  'Flashcards work best in short daily bursts, not one long evening.',
  'In Present mode: arrow keys or space to move, Esc to get out.',
  'The whole app speaks English, Русский and Кыргызча — switch in Settings.',
  'Stuck on an essay? Write the worst possible version first. Fixing beats starting.',
  'Insert the Application Checklist into any note and tick the boxes as you go.',
  'A comparison table beats a feeling. Put the numbers side by side.',
  'Name your documents like a person, not a computer. Future you has to find them.',
  'Sheets can count down for you: =DAYS("2027-01-05") gives days remaining.',
];

const ru = [
  'Ctrl+B, Ctrl+I и Ctrl+U работают в Заметках именно так, как вы ожидаете.',
  'В Таблицах начните ячейку с =, чтобы написать формулу. Попробуйте =SUM(B2:B8).',
  'Нажмите F2, чтобы изменить ячейку, не стирая её содержимое.',
  'Перезагружать безопасно. Всё, что вы напечатали, записывается заранее.',
  'Поделитесь документом через UniSave — вы будете править одну и ту же копию.',
  'Приглашайте как «читателя», если нужен совет, но не соавтор.',
  'Спрашивайте у ИИ, почему абзац слабый, а не «перепиши». Так вы научитесь большему.',
  'Сроки и стоимость меняются каждый год. Проверяйте на сайте самого вуза.',
  'Карточки работают лучше короткими ежедневными подходами, чем одним вечером.',
  'В режиме показа: стрелки или пробел — вперёд, Esc — выйти.',
  'Приложение говорит на английском, русском и кыргызском — переключите в Настройках.',
  'Не идёт эссе? Напишите самый плохой вариант. Править легче, чем начинать.',
  'Вставьте «Чек-лист заявки» в любую заметку и отмечайте пункты по ходу.',
  'Таблица сравнения лучше ощущений. Поставьте числа рядом.',
  'Называйте документы по-человечески. Вам же их потом искать.',
  'Таблицы умеют считать дни: =DAYS("2027-01-05") покажет, сколько осталось.',
];

const ky = [
  'Ctrl+B, Ctrl+I жана Ctrl+U Жазууларда күткөндөй иштейт.',
  'Таблицаларда уячаны = менен баштаңыз. =SUM(B2:B8) сынап көрүңүз.',
  'Уячанын ичиндегисин өчүрбөй өзгөртүү үчүн F2 басыңыз.',
  'Кайра жүктөө коопсуз. Жазганыңыз жоголордон мурун сакталат.',
  'UniSave аркылуу документти бөлүшсөңүз, экөөңүз бир эле көчүрмөнү оңдойсуз.',
  'Кеңеш керек, бирок кошумча автор керек болбосо — «окуучу» катары чакырыңыз.',
  'ИИден абзац эмне үчүн начар экенин сураңыз, «кайра жаз» дебеңиз. Көбүрөөк үйрөнөсүз.',
  'Мөөнөт жана баа жыл сайын өзгөрөт. Вуздун өз сайтынан текшериңиз.',
  'Карточкалар күн сайын кыска убакытта жакшы иштейт, бир кечте эмес.',
  'Көрсөтүү режиминде: жебелер же боштук — алдыга, Esc — чыгуу.',
  'Колдонмо англис, орус жана кыргыз тилинде — Тууралоолордон алмаштырыңыз.',
  'Эссе жазылбай жатабы? Эң жаман вариантты жазыңыз. Оңдоо баштоодон жеңил.',
  '«Арыз тизмесин» каалаган жазууга кыстарып, белгилеп бара бериңиз.',
  'Салыштыруу таблицасы сезимден артык. Сандарды катар коюңуз.',
  'Документтерди адамча атаңыз. Кийин өзүңүз издейсиз.',
  'Таблицалар күн санай алат: =DAYS("2027-01-05") канча күн калганын көрсөтөт.',
];

const TIPS = { en, ru, ky };

export function tipsFor(language) {
  return TIPS[language] ?? TIPS.en;
}

/** A tip chosen from the list, wrapping round rather than repeating at random. */
export function tipAt(language, index) {
  const list = tipsFor(language);
  return list[((index % list.length) + list.length) % list.length];
}
