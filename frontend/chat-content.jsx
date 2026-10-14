import React from 'react';

export function ChatContent({ message }) {
  const content = message.content || '', parts = [];
  let offset = 0;
  const citations = (message.citations || []).filter(c => Number.isInteger(c.start) && Number.isInteger(c.end) && c.start >= 0 && c.end > c.start && c.end <= content.length && typeof c.url === 'string' && /^https:\/\//.test(c.url)).sort((a, b) => a.start - b.start);
  for (const [index, citation] of citations.entries()) {
    if (citation.start < offset) continue;
    parts.push(content.slice(offset, citation.start));
    parts.push(<a key={`${index}-${citation.start}`} href={citation.url} target="_blank" rel="noopener noreferrer" title={citation.title}>[{index + 1}]</a>);
    offset = citation.end;
  }
  parts.push(content.slice(offset));
  return <p className="chat-content">{parts}</p>;
}
