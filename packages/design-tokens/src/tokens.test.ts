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
  gradients,
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
    base: '#F4F7F5',
    section: '#E8F0EB',
    card: '#DCE8E0',
    selected: '#C8DCD0',
    white: '#FFFFFF',
  });
  assert.equal(brand.primary, '#006D32');
  assert.equal(brand.luminous, '#00D166');
  assert.equal(palette.primaryForeground, '#FFFFFF');
  // No blue-tint surfaces / secondary in brand lock
  assert.equal(palette.secondary, '#3D5A4A');
  for (const v of Object.values(surfaces)) {
    assert.ok(!/#(?:F8F9FF|EFF4FF|E5EEFF|D3E4FE)/i.test(v), `blue-tint surface ${v}`);
  }
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
  assert.ok(!/#E4AD3C|#FBE6B3|#CC8730|#F2CE59/i.test(palette.gold + gradients.gold));
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
