const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'src/public/css/styles.css'),
  'utf8'
);

function declarationsFor(rule) {
  const escapedRule = rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = styles.match(new RegExp(`${escapedRule}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `Expected CSS rule ${rule}`);
  return Object.fromEntries(
    [...block[1].matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)]
      .map(([, name, value]) => [name, value.toUpperCase()])
  );
}

function contrastRatio(first, second) {
  function luminance(hex) {
    const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  const luminances = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test('live match uses theme tokens and readable colors in light and dark themes', () => {
  const light = declarationsFor(':root');
  const dark = declarationsFor('body.dark-mode');
  const cases = [
    [light, '--live-text', '--live-card-surface'],
    [light, '--live-muted', '--live-card-surface'],
    [light, '--live-score', '--live-card-surface'],
    [light, '--live-accent', '--live-surface'],
    [light, '--live-status-text', '--live-status-surface'],
    [dark, '--live-text', '--live-card-surface'],
    [dark, '--live-muted', '--live-card-surface'],
    [dark, '--live-score', '--live-card-surface'],
    [dark, '--live-accent', '--live-surface'],
    [dark, '--live-status-text', '--live-status-surface']
  ];

  cases.forEach(([theme, foreground, background]) => {
    assert.ok(theme[foreground] && theme[background], `Missing ${foreground} or ${background}`);
    assert.ok(
      contrastRatio(theme[foreground], theme[background]) >= 4.5,
      `${foreground} must have WCAG AA contrast against ${background}`
    );
  });

  assert.match(styles, /\.live-match-section\s*\{[^}]*background:\s*var\(--live-surface\)/s);
  assert.match(styles, /\.live-match-card\s*\{[^}]*background:\s*var\(--live-card-surface\)/s);
  assert.match(styles, /\.live-match-card__badge\s*\{[^}]*color:\s*var\(--live-status-text\)/s);
});

test('dark theme keeps empty-state text and admin page heading legible', () => {
  assert.match(styles, /body\.dark-mode \.calendar-empty p\s*\{\s*color:\s*#CBD5E1 !important;/);
  assert.match(styles, /body\.dark-mode \.match-card--empty span\s*\{\s*color:\s*#CBD5E1 !important;/);
  assert.match(styles, /body\.dark-mode \.dashboard-page-heading h1\s*\{\s*color:\s*#F8FAFC !important;/);
});
