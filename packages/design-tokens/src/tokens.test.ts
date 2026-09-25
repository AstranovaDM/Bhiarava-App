import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  canonicalPlotStatusFill,
  canonicalPlotStatusInk,
  canonicalPlotStatusSolid,
} from '../../domain/src/plot-status-colors';
import {
  PLOT_STATUS_KEYS,
  brand,
  cssVar,
  palette,
  plotStatusFill,
  plotStatusInk,
  plotStatusSolid,
  surfaces,
} from './index';

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('.dark'));

function rootVar(name: string): string | undefined {
  const match = new RegExp(`\\s${name}:\\s*([^;]+);`).exec(rootBlock);
  return match?.[1]?.trim();
}

test('locked surface ladder and brand greens', () => {
  assert.deepEqual(surfaces, {
    base: '#F8F9FF',
    section: '#EFF4FF',
    card: '#E5EEFF',
    selected: '#D3E4FE',
    white: '#FFFFFF',
  });
  assert.equal(brand.primary, '#006D32');
  assert.equal(brand.luminous, '#00D166');
});

test('tokens.css matches TS surfaces and palette', () => {
  assert.equal(rootVar('--surface'), surfaces.base);
  assert.equal(rootVar('--surface-lowest'), surfaces.white);
  assert.equal(rootVar('--surface-low'), surfaces.section);
  assert.equal(rootVar('--surface-c'), surfaces.card);
  assert.equal(rootVar('--surface-high'), surfaces.selected);
  assert.equal(rootVar('--surface-highest'), surfaces.selected);
  assert.equal(rootVar('--primary'), brand.primary);
  assert.equal(rootVar('--primary-luminous'), brand.luminous);
  assert.equal(rootVar('--secondary'), palette.secondary);
  assert.equal(rootVar('--gold'), palette.gold);
  assert.equal(rootVar('--destructive'), palette.destructive);
  assert.equal(rootVar('--foreground'), palette.foreground);
  assert.equal(rootVar('--muted-foreground'), palette.mutedForeground);
});

test('plot status colors mirror @bhairava/domain and tokens.css', () => {
  assert.deepEqual(plotStatusSolid, canonicalPlotStatusSolid);
  assert.deepEqual(plotStatusFill, canonicalPlotStatusFill);
  assert.deepEqual(plotStatusInk, canonicalPlotStatusInk);
  for (const status of PLOT_STATUS_KEYS) {
    assert.equal(rootVar(cssVar.plotStatus(status)), plotStatusSolid[status], status);
    assert.equal(rootVar(cssVar.plotStatus(status, 'fill')), plotStatusFill[status], status);
    assert.equal(rootVar(cssVar.plotStatus(status, 'ink')), plotStatusInk[status], status);
  }
});
