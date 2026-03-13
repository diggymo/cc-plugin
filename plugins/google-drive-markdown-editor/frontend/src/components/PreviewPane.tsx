import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown-dark.css";

interface PreviewPaneProps {
  content: string;
}

export default function PreviewPane({ content }: PreviewPaneProps) {
  return (
    <div
      className="markdown-body"
      style={{
        height: "100%",
        overflow: "auto",
        padding: "16px 24px",
        backgroundColor: "#0d1117",
        color: "#e6edf3",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
