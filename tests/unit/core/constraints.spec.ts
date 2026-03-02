import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateDescription,
  validateExample,
  validateExamples,
  validateTopic,
  type ValidationError,
} from '../../../src/core/constraints.js';
import type { CustomTopic } from '../../../src/core/types.js';

describe('constraints', () => {
  describe('validateName', () => {
    it('accepts valid name', () => {
      expect(validateName('My Topic')).toEqual([]);
    });

    it('rejects empty name', () => {
      const errors = validateName('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
    });

    it('rejects name over 100 chars', () => {
      const errors = validateName('a'.repeat(101));
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
      expect(errors[0].message).toContain('100');
    });

    it('accepts name exactly 100 chars', () => {
      expect(validateName('a'.repeat(100))).toEqual([]);
    });
  });

  describe('validateDescription', () => {
    it('accepts valid description', () => {
      expect(validateDescription('A useful description')).toEqual([]);
    });

    it('rejects empty description', () => {
      const errors = validateDescription('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('description');
    });

    it('rejects description over 250 chars', () => {
      const errors = validateDescription('a'.repeat(251));
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('250');
    });

    it('accepts description exactly 250 chars', () => {
      expect(validateDescription('a'.repeat(250))).toEqual([]);
    });
  });

  describe('validateExample', () => {
    it('accepts valid example', () => {
      expect(validateExample('An example prompt', 0)).toEqual([]);
    });

    it('rejects empty example', () => {
      const errors = validateExample('', 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toContain('example');
    });

    it('rejects example over 250 chars', () => {
      const errors = validateExample('a'.repeat(251), 2);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('250');
    });
  });

  describe('validateExamples', () => {
    it('accepts 0-5 valid examples', () => {
      expect(validateExamples([])).toEqual([]);
      expect(validateExamples(['one', 'two', 'three'])).toEqual([]);
      expect(validateExamples(['a', 'b', 'c', 'd', 'e'])).toEqual([]);
    });

    it('rejects more than 5 examples', () => {
      const errors = validateExamples(['a', 'b', 'c', 'd', 'e', 'f']);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some((e) => e.message.includes('5'))).toBe(true);
    });

    it('reports individual example validation errors', () => {
      const errors = validateExamples(['valid', 'a'.repeat(251)]);
      expect(errors.some((e) => e.field?.includes('1'))).toBe(true);
    });
  });

  describe('validateTopic', () => {
    const validTopic: CustomTopic = {
      name: 'Test Topic',
      description: 'A description of the topic to block',
      examples: ['Example prompt one', 'Example prompt two'],
    };

    it('accepts valid topic', () => {
      expect(validateTopic(validTopic)).toEqual([]);
    });

    it('rejects topic with all violations', () => {
      const bad: CustomTopic = {
        name: '',
        description: 'a'.repeat(251),
        examples: ['a', 'b', 'c', 'd', 'e', 'f'],
      };
      const errors = validateTopic(bad);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects topic exceeding 1000 char combined total', () => {
      const topic: CustomTopic = {
        name: 'a'.repeat(100),
        description: 'b'.repeat(250),
        examples: ['c'.repeat(250), 'd'.repeat(250), 'e'.repeat(200)],
      };
      // 100 + 250 + 250 + 250 + 200 = 1050 > 1000
      const errors = validateTopic(topic);
      expect(errors.some((e) => e.message.includes('1000'))).toBe(true);
    });

    it('accepts topic at exactly 1000 chars combined', () => {
      const topic: CustomTopic = {
        name: 'a'.repeat(100),
        description: 'b'.repeat(250),
        examples: ['c'.repeat(200), 'd'.repeat(200), 'e'.repeat(250)],
      };
      // 100 + 250 + 200 + 200 + 250 = 1000
      expect(validateTopic(topic)).toEqual([]);
    });
  });
});
