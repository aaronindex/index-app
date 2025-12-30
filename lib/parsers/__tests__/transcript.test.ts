// lib/parsers/__tests__/transcript.test.ts
import { parseTranscript, generateAutoTitle } from '../transcript';

describe('parseTranscript', () => {
  test('1. Basic user/assistant markers', () => {
    const text = `User: Hello
Assistant: Hi there
User: How are you?`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe('Hello');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[1].content).toBe('Hi there');
    expect(result.userCount).toBe(2);
    expect(result.assistantCount).toBe(1);
  });

  test('2. Markdown bold markers', () => {
    const text = `**User:** What is React?
**Assistant:** React is a library
**User:** Thanks!`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe('What is React?');
    expect(result.messages[1].role).toBe('assistant');
  });

  test('3. No markers - defaults to single user block', () => {
    const text = `This is just some text
without any markers
at all.`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe(text);
    expect(result.userCount).toBe(1);
    expect(result.assistantCount).toBe(0);
  });

  test('4. Swap roles toggle', () => {
    const text = `User: Hello
Assistant: Hi there`;
    const result = parseTranscript(text, { swapRoles: true });
    expect(result.messages[0].role).toBe('assistant');
    expect(result.messages[1].role).toBe('user');
  });

  test('5. Treat as single block', () => {
    const text = `User: Hello
Assistant: Hi there
User: How are you?`;
    const result = parseTranscript(text, { treatAsSingleBlock: true });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe(text.trim());
  });

  test('6. Case-insensitive markers', () => {
    const text = `USER: Hello
ASSISTANT: Hi there
Me: How are you?`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[2].role).toBe('user');
  });

  test('7. Multi-line messages', () => {
    const text = `User: This is a long message
that spans multiple lines
and should be preserved.
Assistant: This is the response
also multi-line.`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toContain('This is a long message');
    expect(result.messages[0].content).toContain('and should be preserved.');
    expect(result.messages[1].content).toContain('also multi-line.');
  });

  test('8. Empty lines and whitespace handling', () => {
    const text = `User: Hello

Assistant: Hi

User: How are you?`;
    const result = parseTranscript(text);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].content).toBe('Hello');
    expect(result.messages[1].content).toBe('Hi');
  });
});

describe('generateAutoTitle', () => {
  test('Uses first user message', () => {
    const text = `User: What is the meaning of life?
Assistant: 42`;
    const parsed = parseTranscript(text);
    const title = generateAutoTitle(text, parsed);
    expect(title).toBe('What is the meaning of life?');
  });

  test('Truncates long titles', () => {
    const text = `User: ${'A'.repeat(100)}
Assistant: Response`;
    const parsed = parseTranscript(text);
    const title = generateAutoTitle(text, parsed);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  test('Falls back to first line if no user message', () => {
    const text = `Assistant: Hello
User: Hi`;
    const parsed = parseTranscript(text);
    const title = generateAutoTitle(text, parsed);
    expect(title).toBe('Assistant: Hello');
  });
});

