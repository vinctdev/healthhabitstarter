function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let listLevel = 0;

  for (const line of lines) {
    const processed = renderInline(line);

    const listMatch = processed.match(/^(\s*)([-*])\s+(.*)/);

    if (listMatch) {
      const indent = listMatch[1].length;
      const content = listMatch[3];
      const newLevel = Math.floor(indent / 2) + 1;

      while (newLevel > listLevel) {
        result.push("<ul>");
        listLevel++;
      }
      while (newLevel < listLevel) {
        result.push("</ul>");
        listLevel--;
      }

      result.push(`<li>${content}</li>`);
      continue;
    }

    while (listLevel > 0) {
      result.push("</ul>");
      listLevel--;
    }

    if (processed.trim()) {
      result.push(`<p>${processed}</p>`);
    } else {
      result.push("<br />");
    }
  }

  while (listLevel > 0) {
    result.push("</ul>");
    listLevel--;
  }

  return result.join("");
}

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  if (!content) return null;
  return (
    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
  );
}
