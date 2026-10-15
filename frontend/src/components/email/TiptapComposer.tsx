'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'isomorphic-dompurify';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Smartphone, 
  Monitor,
  User,
  Building,
  Mail,
  Undo,
  Redo
} from 'lucide-react';

interface TiptapComposerProps {
  initialContent?: string;
  onChange?: (html: string) => void;
}

export default function TiptapComposer({ initialContent = '<p>Write your premium email campaign copy here...</p>', onChange }: TiptapComposerProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 text-xs text-zinc-900',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const injectMergeToken = (token: string) => {
    editor.chain().focus().insertContent(`{{${token}}}`).run();
  };

  const sanitizeHTML = (dirty: string) => {
    if (typeof window === 'undefined') return dirty;
    try {
      const doc = new DOMParser().parseFromString(dirty, 'text/html');
      const dangerousTags = doc.querySelectorAll('script, iframe, object, embed, base');
      dangerousTags.forEach(el => el.remove());
      const allElements = doc.body.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
            el.removeAttribute(attr.name);
          }
        });
      });
      return doc.body.innerHTML;
    } catch {
      return dirty;
    }
  };

  const getPreviewHTML = () => {
    let html = editor.getHTML();
    // Replace merge tokens with mock values for visualization
    html = html.replace(/\{\{first_name\}\}/g, 'John');
    html = html.replace(/\{\{company\}\}/g, 'Acme Corp');
    html = html.replace(/\{\{email\}\}/g, 'john.doe@acme.com');
    return sanitizeHTML(html);
  };

  return (
    <div className="border border-[#E8E8E6] rounded-[10px] bg-white overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
      
      {/* LEFT PANE: TEXT EDITOR */}
      <div className="flex flex-col border-r border-[#E8E8E6]">
        {/* Editor Toolbar */}
        <div className="bg-zinc-50 border-b border-[#E8E8E6] p-2 flex flex-wrap items-center justify-between gap-2 select-none">
          {/* Format Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`h-7 w-7 rounded-[4px] flex items-center justify-center transition-all cursor-pointer ${
                editor.isActive('bold') ? 'bg-black text-white' : 'hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`h-7 w-7 rounded-[4px] flex items-center justify-center transition-all cursor-pointer ${
                editor.isActive('italic') ? 'bg-black text-white' : 'hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`h-7 w-7 rounded-[4px] flex items-center justify-center transition-all cursor-pointer ${
                editor.isActive('bulletList') ? 'bg-black text-white' : 'hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`h-7 w-7 rounded-[4px] flex items-center justify-center transition-all cursor-pointer ${
                editor.isActive('orderedList') ? 'bg-black text-white' : 'hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <span className="w-[1px] h-4 bg-[#E8E8E6] mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              className="h-7 w-7 rounded-[4px] flex items-center justify-center hover:bg-zinc-200 text-zinc-700 cursor-pointer"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              className="h-7 w-7 rounded-[4px] flex items-center justify-center hover:bg-zinc-200 text-zinc-700 cursor-pointer"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          {/* Merge Tokens Picker */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-1">Insert Merge Token:</span>
            <button
              type="button"
              onClick={() => injectMergeToken('first_name')}
              className="h-7 px-2 border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100 rounded-[4px] text-[10px] font-bold text-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-zinc-500" />
              <span>First Name</span>
            </button>
            <button
              type="button"
              onClick={() => injectMergeToken('company')}
              className="h-7 px-2 border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100 rounded-[4px] text-[10px] font-bold text-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <Building className="h-3.5 w-3.5 text-zinc-500" />
              <span>Company</span>
            </button>
            <button
              type="button"
              onClick={() => injectMergeToken('email')}
              className="h-7 px-2 border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100 rounded-[4px] text-[10px] font-bold text-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 bg-white overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* RIGHT PANE: LIVE PREVIEW VIEWPORT */}
      <div className="flex flex-col bg-zinc-50">
        {/* Preview Control bar */}
        <div className="bg-zinc-50 border-b border-[#E8E8E6] p-2 flex items-center justify-between select-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-fg-secondary ml-2">Live Viewport Preview</span>
          
          <div className="flex bg-[#E8E8E6] p-0.5 rounded-[6px]">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`h-7 px-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                previewMode === 'desktop' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`h-7 px-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                previewMode === 'mobile' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Viewport Frame Container */}
        <div className="flex-1 p-6 flex justify-center items-start overflow-y-auto">
          <div 
            className={`bg-white border border-[#E8E8E6] shadow-sm rounded-lg min-h-[400px] overflow-hidden transition-all duration-300 ${
              previewMode === 'mobile' ? 'w-full max-w-[360px]' : 'w-full max-w-full'
            }`}
          >
            {/* Mock Email header visual */}
            <div className="bg-zinc-100 border-b border-[#E8E8E6] p-3 text-[10px] text-zinc-500 space-y-1 select-none">
              <div><span className="font-bold text-zinc-700">From:</span> Acme Corp support &lt;support@acme.com&gt;</div>
              <div><span className="font-bold text-zinc-700">Subject:</span> Campaign Broadcast Visualizer</div>
            </div>
            
            {/* Rendered output content */}
            <div 
              className="p-6 prose prose-sm max-w-none text-xs text-zinc-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getPreviewHTML()) }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
