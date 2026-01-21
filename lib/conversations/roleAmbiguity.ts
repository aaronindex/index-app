// lib/conversations/roleAmbiguity.ts
// Helper functions to detect role ambiguity in conversations

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
}

/**
 * Detect if a conversation has role ambiguity
 * 
 * A conversation is role-ambiguous if:
 * - All messages have the same role (typically all 'user' or all 'assistant')
 * - Only one message exists
 * - No alternating pattern between user and assistant
 */
export function isRoleAmbiguous(messages: Message[]): boolean {
  if (messages.length === 0) {
    return false;
  }

  // Single message is ambiguous
  if (messages.length === 1) {
    return true;
  }

  // Check if all messages have the same role
  const firstRole = messages[0].role;
  const allSameRole = messages.every((msg) => msg.role === firstRole);
  if (allSameRole) {
    return true;
  }

  // Check if there's no alternating pattern
  // If we only have one type of role (user or assistant), it's ambiguous
  const uniqueRoles = new Set(messages.map((msg) => msg.role));
  const hasUser = uniqueRoles.has('user');
  const hasAssistant = uniqueRoles.has('assistant');

  // If we have both user and assistant, check for reasonable alternation
  if (hasUser && hasAssistant) {
    // Count consecutive messages with same role
    let consecutiveSameRole = 1;
    let maxConsecutive = 1;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role) {
        consecutiveSameRole++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveSameRole);
      } else {
        consecutiveSameRole = 1;
      }
    }

    // If more than 5 consecutive messages with same role, likely ambiguous
    if (maxConsecutive > 5) {
      return true;
    }

    // If we have very few of one role type, might be ambiguous
    const userCount = messages.filter((m) => m.role === 'user').length;
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;
    
    // If one role type is less than 10% of messages, likely mislabeled
    const total = messages.length;
    if (userCount / total < 0.1 || assistantCount / total < 0.1) {
      return true;
    }

    return false;
  }

  // If we only have one type of role (user or assistant), it's ambiguous
  return !hasUser || !hasAssistant;
}
