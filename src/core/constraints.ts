import type { CustomTopic } from './types.js';

export interface ValidationError {
  field: string;
  message: string;
}

export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 250;
export const MAX_EXAMPLE_LENGTH = 250;
export const MAX_EXAMPLES = 5;
export const MAX_COMBINED_LENGTH = 1000;

/** @deprecated Use MAX_EXAMPLES */
const MAX_EXAMPLES_COUNT = MAX_EXAMPLES;

export function validateName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!name || name.length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push({ field: 'name', message: `Name must be at most ${MAX_NAME_LENGTH} characters` });
  }
  return errors;
}

export function validateDescription(description: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!description || description.length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
    });
  }
  return errors;
}

export function validateExample(example: string, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!example || example.length === 0) {
    errors.push({ field: `examples[${index}]`, message: `Example ${index} is required` });
  } else if (example.length > MAX_EXAMPLE_LENGTH) {
    errors.push({
      field: `examples[${index}]`,
      message: `Example ${index} must be at most ${MAX_EXAMPLE_LENGTH} characters`,
    });
  }
  return errors;
}

export function validateExamples(examples: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (examples.length > MAX_EXAMPLES_COUNT) {
    errors.push({
      field: 'examples',
      message: `At most ${MAX_EXAMPLES_COUNT} examples allowed`,
    });
  }
  for (let i = 0; i < examples.length; i++) {
    errors.push(...validateExample(examples[i], i));
  }
  return errors;
}

export function validateTopic(topic: CustomTopic): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...validateName(topic.name));
  errors.push(...validateDescription(topic.description));
  errors.push(...validateExamples(topic.examples));

  const combined =
    topic.name.length +
    topic.description.length +
    topic.examples.reduce((sum, ex) => sum + ex.length, 0);

  if (combined > MAX_COMBINED_LENGTH) {
    errors.push({
      field: 'topic',
      message: `Combined length (${combined}) exceeds ${MAX_COMBINED_LENGTH} characters`,
    });
  }

  return errors;
}
