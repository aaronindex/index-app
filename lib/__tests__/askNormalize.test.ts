/**
 * Lightweight tests for Ask INDEX normalization + analysis mode.
 * Ensures example phrasings normalize and route to the expected canonical type / analysis mode.
 */

import { normalizeAskIndexQuery } from '../askNormalize';
import { getAnalysisMode } from '../askAnalysisMode';

describe('normalizeAskIndexQuery', () => {
  const run = (q: string, scope: 'index' | 'project' = 'index') => {
    const normalized = normalizeAskIndexQuery(q, scope);
    const analysisMode = getAnalysisMode(normalized);
    return { normalized, analysisMode };
  };

  describe('direction', () => {
    test('Where is this going?', () => {
      const { normalized, analysisMode } = run('Where is this going?');
      expect(normalized.canonicalType).toBe('direction');
      expect(analysisMode).toBe('direction');
    });

    test('What direction is this heading?', () => {
      const { normalized } = run('What direction is this heading?');
      expect(normalized.canonicalType).toBe('direction');
    });
  });

  describe('change', () => {
    test('What changed recently?', () => {
      const { normalized, analysisMode } = run('What changed recently?');
      expect(normalized.canonicalType).toBe('change');
      expect(analysisMode).toBe('change');
    });

    test("What's new?", () => {
      const { normalized } = run("What's new?");
      expect(normalized.canonicalType).toBe('change');
    });
  });

  describe('attention', () => {
    test('Where should I focus?', () => {
      const { normalized, analysisMode } = run('Where should I focus?');
      expect(normalized.canonicalType).toBe('attention');
      expect(analysisMode).toBe('attention');
    });

    test('What needs attention?', () => {
      const { normalized } = run('What needs attention?');
      expect(normalized.canonicalType).toBe('attention');
    });
  });

  describe('signals', () => {
    test('What decisions are here?', () => {
      const { normalized, analysisMode } = run('What decisions are here?');
      expect(normalized.canonicalType).toBe('signals');
      expect(analysisMode).toBe('signals');
    });

    test('Show me the tasks', () => {
      const { normalized } = run('Show me the tasks');
      expect(normalized.canonicalType).toBe('signals');
    });
  });

  describe('tension', () => {
    test('Where is the tension?', () => {
      const { normalized, analysisMode } = run('Where is the tension?');
      expect(normalized.canonicalType).toBe('tension');
      expect(analysisMode).toBe('tension');
    });

    test('What feels conflicted?', () => {
      const { normalized } = run('What feels conflicted?');
      expect(normalized.canonicalType).toBe('tension');
    });
  });

  describe('scope', () => {
    test('preserves currentScope when not specified', () => {
      const n = normalizeAskIndexQuery('What changed recently?', 'project');
      expect(n.scope).toBe('project');
    });

    test('infers index when user says across my index', () => {
      const n = normalizeAskIndexQuery('What changed across my index?', 'project');
      expect(n.scope).toBe('index');
    });
  });

  describe('timeframe', () => {
    test('recent when "recently" present', () => {
      const n = normalizeAskIndexQuery('What changed recently?');
      expect(n.timeframe).toBe('recent');
    });

    test('unspecified when no time reference', () => {
      const n = normalizeAskIndexQuery('Where is this going?');
      expect(n.timeframe).toBe('unspecified');
    });
  });
});
