// Antigravity (Google DeepMind) hooks -> Agent Floor events.
// Receives the JSON object Antigravity writes to a hook's stdin.
import { basename } from 'node:path';
import { pretty, shortId, slugKey } from './common.mjs';

function oneLine(s, max = 80) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function fileName(p) {
  return p ? basename(String(p).replace(/[\\/]/g, '/')) : 'file';
}

export function describeAntigravityTool(name, args = {}) {
  const a = args || {};
  switch (name) {
    case 'run_command':
      return a.toolSummary ? `${a.toolSummary}: ${oneLine(a.CommandLine, 50)}` : `Running ${oneLine(a.CommandLine, 60)}`;
    case 'edit_file':
      return `Editing ${fileName(a.Path)}`;
    case 'write_file':
      return `Writing ${fileName(a.Path)}`;
    case 'read_file':
      return `Reading ${fileName(a.Path)}`;
    case 'search_web':
      return `Searching web: "${oneLine(a.query, 40)}"`;
    case 'ask_question':
      return 'Asking question for user input';
    case 'invoke_subagent':
      return `Launching subagent: ${a.Role || a.TypeName || 'helper'}`;
    case 'send_message':
      return `Messaging agent: ${oneLine(a.Message, 50)}`;
    case 'manage_subagents':
      return `Managing subagents (${a.Action})`;
    case 'manage_task':
      return `Managing task (${a.Action})`;
    case 'schedule':
      return 'Scheduling background automation';
    default:
      return `Using ${name || 'tool'}`;
  }
}

/**
 * @param {Record<string, any>} input hook payload from Antigravity
 * @param {{ source?: string, name?: string }} [opts]
 * @returns {import('../shared/protocol.js').InboundEvent[]}
 */
export function fromAntigravity(input, opts = {}) {
  if (!input || typeof input !== 'object') return [];

  const source = opts.source || 'antigravity';
  const convId = input.conversationId || input.sessionId || 'session';
  const leadId = `${source}:${shortId(convId, 8)}`;
  
  // Workspace name
  const workspacePath = Array.isArray(input.workspacePaths) && input.workspacePaths[0]
    ? input.workspacePaths[0]
    : process.cwd();
  const team = process.env.AGENT_FLOOR_TEAM || basename(workspacePath) || 'workspace';

  const baseLead = {
    agent: leadId,
    team,
    source,
    name: process.env.AGENT_FLOOR_NAME || opts.name || 'Antigravity',
    role: 'Lead Architect',
  };

  // Antigravity hook event name
  const eventName = opts.eventType || input.hook_event_name || input.hookEventName || input.event;
  const toolCall = input.toolCall || input.tool_call || {};
  const toolName = toolCall.name || input.tool_name || '';
  const toolArgs = toolCall.args || input.tool_input || {};

  switch (eventName) {
    case 'SessionStart':
      return [{ type: 'join', ...baseLead, status: 'idle', activity: 'Ready' }];

    case 'PreInvocation':
      return [{ type: 'status', ...baseLead, status: 'thinking', activity: 'Thinking and planning...' }];

    case 'PreToolUse': {
      if (toolName === 'invoke_subagent') {
        const role = toolArgs.Role || toolArgs.TypeName || 'Codebase Researcher';
        const type = toolArgs.TypeName || 'subagent';
        const subId = `${leadId}:${slugKey(role)}`;
        return [
          { type: 'tool', ...baseLead, tool: 'invoke_subagent', activity: `Briefing ${role}` },
          {
            type: 'join',
            agent: subId,
            parent: leadId,
            team,
            source,
            name: role,
            role: type,
            status: 'thinking',
            activity: oneLine(toolArgs.Prompt || 'Starting subagent task', 70),
            text: toolArgs.Prompt,
          },
        ];
      }

      if (toolName === 'send_message') {
        const recipient = toolArgs.Recipient ? `${leadId}:${slugKey(toolArgs.Recipient)}` : leadId;
        return [
          { type: 'tool', ...baseLead, tool: 'send_message', activity: `Sending message: ${oneLine(toolArgs.Message, 40)}` },
          {
            type: 'message',
            agent: leadId,
            parent: leadId,
            team,
            source,
            to: [recipient],
            text: toolArgs.Message || 'Update',
          },
        ];
      }

      if (toolName === 'ask_question') {
        return [
          { type: 'status', ...baseLead, status: 'waiting', activity: 'Waiting for your input...' },
          { type: 'tool', ...baseLead, tool: 'ask_question', activity: 'Prompted user for feedback' }
        ];
      }

      return [
        {
          type: 'tool',
          ...baseLead,
          tool: toolName,
          activity: describeAntigravityTool(toolName, toolArgs),
        },
      ];
    }

    case 'PostToolUse': {
      if (toolName === 'invoke_subagent') {
        const role = toolArgs.Role || toolArgs.TypeName || 'Codebase Researcher';
        const subId = `${leadId}:${slugKey(role)}`;
        return [
          { type: 'message', agent: subId, parent: leadId, team, source, to: [leadId], text: 'Task completed', status: 'done' },
          { type: 'status', agent: subId, status: 'done', activity: 'Finished assigned work' },
          { type: 'status', ...baseLead, status: 'thinking', activity: `Reviewing ${role} report...` },
        ];
      }
      return [
        {
          type: 'status',
          ...baseLead,
          status: 'thinking',
          activity: `Completed: ${describeAntigravityTool(toolName, toolArgs)}`,
        },
      ];
    }

    case 'PostInvocation':
    case 'Stop':
      return [{ type: 'status', ...baseLead, status: 'idle', activity: 'Turn completed - waiting for prompt' }];

    default:
      if (toolName) {
        return [
          {
            type: 'tool',
            ...baseLead,
            tool: toolName,
            activity: describeAntigravityTool(toolName, toolArgs),
          },
        ];
      }
      return [];
  }
}
