// lib/parsers/chatgpt.ts
// Parser for ChatGPT export JSON format

export interface ChatGPTMessage {
  id: string;
  role?: 'user' | 'assistant' | 'system';
  author?: {
    role?: 'user' | 'assistant' | 'system' | 'tool';
  };
  content: {
    parts?: string[];
    text?: string;
    content_type?: string;
  };
  create_time?: number;
}

export interface ChatGPTConversation {
  id: string;
  title: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, ChatGPTMessageNode>;
  messages?: ChatGPTMessage[];
}

export interface ChatGPTMessageNode {
  id: string;
  message?: ChatGPTMessage;
  parent?: string;
  children?: string[];
}

export interface ParsedConversation {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp?: Date;
    source_message_id?: string; // Node ID from mapping for backfill
    raw_payload?: any; // Store raw message for backfill
  }>;
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Parse ChatGPT export JSON into structured conversations
 */
export function parseChatGPTExport(data: any): ParsedConversation[] {
  const conversations: ParsedConversation[] = [];

  // Normalize root shape: handle both array and {conversations:[]} formats
  let conversationArray: any[] = [];
  let rootType = 'unknown';

  if (Array.isArray(data)) {
    rootType = 'array';
    conversationArray = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.conversations)) {
    rootType = 'object_with_conversations';
    conversationArray = data.conversations;
  } else if (data && typeof data === 'object' && (data.mapping || data.title || data.id || data.conversation_id)) {
    rootType = 'single_conversation';
    conversationArray = [data];
  }

  console.log(`[ChatGPT Parser] Root type: ${rootType}, Found ${conversationArray.length} potential conversations`);

  // Parse each conversation
  conversationArray.forEach((item, index) => {
    const parsed = parseSingleConversation(item);
    if (parsed) {
      conversations.push(parsed);
    } else {
      console.warn(`[ChatGPT Parser] Conversation ${index} failed to parse. Keys:`, item ? Object.keys(item) : 'null');
    }
  });

  if (conversations.length === 0 && conversationArray.length > 0) {
    // Log first item structure for debugging
    const firstItem = conversationArray[0];
    console.error('[ChatGPT Parser] No conversations detected. First item keys:', firstItem ? Object.keys(firstItem) : 'null');
    if (firstItem) {
      console.error('[ChatGPT Parser] First item has mapping:', !!firstItem.mapping);
      console.error('[ChatGPT Parser] First item has messages:', !!firstItem.messages);
      console.error('[ChatGPT Parser] First item has id:', !!firstItem.id);
      console.error('[ChatGPT Parser] First item has conversation_id:', !!firstItem.conversation_id);
      if (firstItem.mapping) {
        const mappingKeys = Object.keys(firstItem.mapping);
        console.error('[ChatGPT Parser] Mapping has', mappingKeys.length, 'nodes');
        if (mappingKeys.length > 0) {
          const firstNode = firstItem.mapping[mappingKeys[0]];
          console.error('[ChatGPT Parser] First node has message:', !!firstNode?.message);
        }
      }
    }
  }

  console.log(`[ChatGPT Parser] Successfully parsed ${conversations.length} conversations`);
  return conversations;
}

/**
 * Parse a single conversation from ChatGPT export
 */
function parseSingleConversation(conv: any): ParsedConversation | null {
  if (!conv || typeof conv !== 'object') return null;

  // Check if conversation is valid: must have (id or conversation_id) AND (mapping with messages OR messages array)
  const conversationId = conv.conversation_id || conv.id;
  if (!conversationId) {
    return null; // Invalid: no ID
  }

  // Check if conversation has any messages (either in mapping or messages array)
  const hasMapping = conv.mapping && typeof conv.mapping === 'object';
  const hasMessagesArray = conv.messages && Array.isArray(conv.messages) && conv.messages.length > 0;
  
  if (!hasMapping && !hasMessagesArray) {
    return null; // Invalid: no messages
  }

  // Check if mapping has at least one node with a message
  if (hasMapping) {
    const mapping = conv.mapping as Record<string, ChatGPTMessageNode>;
    const hasMessageInMapping = Object.values(mapping).some((node) => node?.message);
    if (!hasMessageInMapping) {
      return null; // Invalid: mapping exists but no messages
    }
  }

  const title = conv.title || 'Untitled Conversation';
  const messages: ParsedConversation['messages'] = [];

  // Handle mapping format (newer ChatGPT exports) - walk backwards from current_node
  if (hasMapping) {
    const mapping = conv.mapping as Record<string, ChatGPTMessageNode>;
    const current_node = conv.current_node;

    // Extract messages by walking backwards from current_node using parent pointers
    const extractMessagesFromMapping = () => {
      const messageNodes: Array<{ node: ChatGPTMessageNode; nodeId: string; timestamp?: number }> = [];
      const visited = new Set<string>();

      // Start from current_node if available, otherwise find root nodes
      let startNodeId: string | undefined = current_node;
      
      if (!startNodeId) {
        // Fallback: find root nodes (nodes without parents)
        const rootNodes = Object.values(mapping).filter(
          (node) => !node.parent || !mapping[node.parent]
        );
        if (rootNodes.length > 0) {
          // Use the first root node, or find the deepest node
          startNodeId = rootNodes[0]?.id;
        }
      }

      // If we have a start node, walk backwards using parent pointers
      if (startNodeId && mapping[startNodeId]) {
        let currentNodeId: string | undefined = startNodeId;
        
        // Walk backwards collecting all messages
        while (currentNodeId && !visited.has(currentNodeId)) {
          visited.add(currentNodeId);
          const node: ChatGPTMessageNode | undefined = mapping[currentNodeId];
          
          if (node?.message) {
            messageNodes.push({
              node,
              nodeId: currentNodeId,
              timestamp: node.message.create_time,
            });
          }

          // Move to parent
          currentNodeId = node?.parent;
        }
      } else {
        // Fallback: traverse all nodes (breadth-first from roots)
        const rootNodes = Object.values(mapping).filter(
          (node) => !node.parent || !mapping[node.parent]
        );

        const traverseNode = (nodeId: string, visitedSet: Set<string> = new Set()) => {
          if (visitedSet.has(nodeId)) return;
          visitedSet.add(nodeId);

          const node = mapping[nodeId];
          if (!node) return;

          if (node.message) {
            messageNodes.push({
              node,
              nodeId: nodeId,
              timestamp: node.message.create_time,
            });
          }

          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((childId) => traverseNode(childId, visitedSet));
          }
        };

        rootNodes.forEach((node) => {
          if (node.id) traverseNode(node.id);
        });
      }

      // Sort by timestamp (if available) or maintain reverse order (newest first, then reverse)
      messageNodes.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        return 0;
      });

      // Extract message content
      messageNodes.forEach(({ node, nodeId }) => {
        const message = node.message;
        if (!message) return;

        // Extract role from author.role (ChatGPT export format)
        // Format: node.message.author.role or node.message.role
        let role: 'user' | 'assistant' | 'system' | 'tool' = 'user';
        if (message.author?.role) {
          const authorRole = message.author.role.toLowerCase();
          if (['user', 'assistant', 'system', 'tool'].includes(authorRole)) {
            role = authorRole as 'user' | 'assistant' | 'system' | 'tool';
          }
        } else if (message.role) {
          const msgRole = message.role.toLowerCase();
          if (['user', 'assistant', 'system', 'tool'].includes(msgRole)) {
            role = msgRole as 'user' | 'assistant' | 'system' | 'tool';
          }
        }

        let content = '';

        // Extract content
        if (message.content) {
          if (typeof message.content === 'string') {
            content = message.content;
          } else if (message.content.parts && Array.isArray(message.content.parts)) {
            content = message.content.parts.join('\n');
          } else if (message.content.text) {
            content = message.content.text;
          }
        }

        if (content.trim()) {
          messages.push({
            role,
            content: content.trim(),
            timestamp: message.create_time
              ? new Date(message.create_time * 1000)
              : undefined,
            source_message_id: nodeId, // Store node ID for backfill
            raw_payload: message, // Store raw message for backfill
          });
        }
      });
    };

    extractMessagesFromMapping();
  }
  // Handle messages array format (older/simpler exports)
  else if (hasMessagesArray) {
    conv.messages.forEach((msg: any, index: number) => {
      // Extract role from author.role or msg.role
      let role: 'user' | 'assistant' | 'system' | 'tool' = 'user';
      if (msg.author?.role) {
        const authorRole = msg.author.role.toLowerCase();
        if (['user', 'assistant', 'system', 'tool'].includes(authorRole)) {
          role = authorRole as 'user' | 'assistant' | 'system' | 'tool';
        }
      } else if (msg.role) {
        const msgRole = msg.role.toLowerCase();
        if (['user', 'assistant', 'system', 'tool'].includes(msgRole)) {
          role = msgRole as 'user' | 'assistant' | 'system' | 'tool';
        }
      }

      let content = '';

      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (msg.content?.parts && Array.isArray(msg.content.parts)) {
        content = msg.content.parts.join('\n');
      } else if (msg.content?.text) {
        content = msg.content.text;
      }

      if (content.trim()) {
        messages.push({
          role,
          content: content.trim(),
          timestamp: msg.create_time ? new Date(msg.create_time * 1000) : undefined,
          source_message_id: msg.id || `msg-${index}`, // Use message ID if available
          raw_payload: msg, // Store raw message for backfill
        });
      }
    });
  }

  if (messages.length === 0) return null;

  // Determine start/end times
  const timestamps = messages
    .map((m) => m.timestamp)
    .filter((t): t is Date => t !== undefined)
    .sort((a, b) => a.getTime() - b.getTime());

  const startedAt = timestamps[0] || new Date(conv.create_time ? conv.create_time * 1000 : Date.now());
  const endedAt = timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined;

  return {
    id: conversationId,
    title,
    messages,
    startedAt,
    endedAt,
  };
}

