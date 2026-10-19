import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVersions, releaseNotesFor, pinDocLinks } from './versions.mjs';

test('one entry per minor, newest patch, newest minor first', () => {
  const tags = ['v0.33.0', 'v0.33.10', 'v0.33.2', 'v0.34.0', 'v0.24.1', 'v0.24.0'];
  assert.deepEqual(
    pickVersions(tags).map((v) => [v.slug, v.tag]),
    [
      ['v0.34', 'v0.34.0'],
      ['v0.33', 'v0.33.10'],
      ['v0.24', 'v0.24.1'],
    ],
  );
});

test('0.24 and newer get real docs, older minors get release notes', () => {
  const tags = ['v1.0.0', 'v0.24.0', 'v0.23.1', 'v0.3.0'];
  assert.deepEqual(
    pickVersions(tags).map((v) => [v.minor, v.kind]),
    [
      ['1.0', 'docs'],
      ['0.24', 'docs'],
      ['0.23', 'notes'],
      ['0.3', 'notes'],
    ],
  );
});

const CHANGELOG = `# Changelog

Intro text.

## [0.13.0](https://example.test/compare/v0.12.1...v0.13.0) (2026-04-10)

### Added

* thirteen

## [0.12.1](https://example.test/compare/v0.12.0...v0.12.1) (2026-04-09)

### Fixed

* twelve-one

## [0.12.0](https://example.test/compare/v0.11.0...v0.12.0) (2026-04-08)

* twelve-zero

## [0.1.0] - 2026-04-03

### Added

- first

---

## [0.0.3-beta] - 2024

- beta
`;

test('release notes of an old minor = its CHANGELOG sections, newest patch first', () => {
  assert.equal(
    releaseNotesFor(CHANGELOG, '0.12'),
    `## [0.12.1](https://example.test/compare/v0.12.0...v0.12.1) (2026-04-09)

### Fixed

* twelve-one

## [0.12.0](https://example.test/compare/v0.11.0...v0.12.0) (2026-04-08)

* twelve-zero`,
  );
});

test('release notes stop at the next version and drop the trailing rule', () => {
  assert.equal(releaseNotesFor(CHANGELOG, '0.1'), `## [0.1.0] - 2026-04-03

### Added

- first`);
  assert.equal(releaseNotesFor(CHANGELOG, '0.2'), '');
});

test('absolute /docs links in old docs stay inside that version', () => {
  const mdx = [
    'See [config](/docs/admins/configuration) and [admins](/docs/admins).',
    'Back [home](/docs) or [anchor](/docs/users/crm/records#find-similar-records).',
    '<Card href="/docs/users" title="Users" />',
    'Untouched: [ext](https://x.test/docs/a), [other](/docsearch), `/docs/in-code`.',
  ].join('\n');
  assert.equal(
    pinDocLinks(mdx, 'v0.33'),
    [
      'See [config](/docs/v0.33/admins/configuration) and [admins](/docs/v0.33/admins).',
      'Back [home](/docs/v0.33) or [anchor](/docs/v0.33/users/crm/records#find-similar-records).',
      '<Card href="/docs/v0.33/users" title="Users" />',
      'Untouched: [ext](https://x.test/docs/a), [other](/docsearch), `/docs/in-code`.',
    ].join('\n'),
  );
});
