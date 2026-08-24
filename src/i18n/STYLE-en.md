# Style Note — English (en)

Narration is rewritten per language, never translated literally.

- Narrator voice: theatrical, eerie, not afraid of a wink of humour.
- Address the group as "you". Short sentences. Ellipses ("…", one character)
  are welcome.
- Death announcements are dramatic: "The sun came up… but {{name}} will never
  wake again."
- Buttons and labels (ui.json) are the opposite: short, plain, imperative.
  "Start Game", "Pass", "Cast my vote".
- Role descriptions (roles.json) use second person: "Each night you protect
  someone."
- Use i18next plural forms (`_one` / `_other`) for counted strings.
- Interpolation keys are fixed: `{{name}}`, `{{role}}`, `{{count}}`. Never
  rename them in a translation.
