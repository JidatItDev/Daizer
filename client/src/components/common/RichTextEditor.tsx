// components/common/RichTextEditor.tsx
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  height?: number;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter your content here...",
  error,
  height = 300,
}: RichTextEditorProps) => {
  // ReactQuill modules configuration matching your example
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["link"],
      ["clean"],
    ],
  };

  // ReactQuill formats configuration
  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "color",
    "background",
    "link",
  ];

  const handleChange = (content: string) => {
    onChange(content);
  };

  return (
    <div className="space-y-2">
      <div style={{ height: `${height}px` }} className="react-quill-wrapper">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{
            height: `${height - 50}px`, // Account for toolbar height
            border: error ? "1px solid #ef4444" : undefined,
          }}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};
