import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

// Blog bodies are unsanitized user input, so rehype-sanitize is not optional — without it a post
// containing <script>alert(1)</script> would execute for every reader. The default schema is
// GitHub's: it strips scripts, event handlers and javascript: URLs while leaving ordinary markup.
//
// One component so the reader and the create-page preview can never diverge on what publishes.
export function Markdown({ children }: { children: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {children}
        </ReactMarkdown>
    );
}

export default Markdown;
