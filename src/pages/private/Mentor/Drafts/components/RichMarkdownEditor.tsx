import React, { useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Undo2,
  Redo2,
} from 'lucide-react'
import './RichMarkdownEditor.css'

type Props = {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  large?: boolean
}

type ToolbarBtnProps = {
  icon: React.ReactNode
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ icon, title, active, disabled, onClick }) => (
  <button
    type="button"
    className={`rme-btn${active ? ' is-active' : ''}`}
    title={title}
    disabled={disabled}
    onMouseDown={(e) => {
      e.preventDefault()        // keep focus in editor
      onClick()
    }}
  >
    {icon}
  </button>
)

const Toolbar: React.FC<{ editor: ReturnType<typeof useEditor> }> = ({ editor }) => {
  if (!editor) return null

  return (
    <div className="rme-toolbar">
      {/* Text formatting */}
      <div className="rme-toolbar-group">
        <ToolbarBtn
          icon={<Bold />}
          title="Bold (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarBtn
          icon={<Italic />}
          title="Italic (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarBtn
          icon={<Strikethrough />}
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarBtn
          icon={<Code />}
          title="Inline Code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
      </div>

      {/* Headings */}
      <div className="rme-toolbar-group">
        <ToolbarBtn
          icon={<Heading3 />}
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarBtn
          icon={<Heading4 />}
          title="Heading 4"
          active={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        />
      </div>

      {/* Lists */}
      <div className="rme-toolbar-group">
        <ToolbarBtn
          icon={<List />}
          title="Bullet List"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarBtn
          icon={<ListOrdered />}
          title="Ordered List"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>

      {/* Block */}
      <div className="rme-toolbar-group">
        <ToolbarBtn
          icon={<Quote />}
          title="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarBtn
          icon={<Code2 />}
          title="Code Block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarBtn
          icon={<Minus />}
          title="Horizontal Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>

      {/* History */}
      <div className="rme-toolbar-group">
        <ToolbarBtn
          icon={<Undo2 />}
          title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarBtn
          icon={<Redo2 />}
          title="Redo (Ctrl+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
    </div>
  )
}

const RichMarkdownEditor: React.FC<Props> = ({ value, onChange, placeholder, large }) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExternalUpdate = useRef(false)
  const lastEmittedMarkdown = useRef(value)

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      if (isExternalUpdate.current) return

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const md: string = editor.storage.markdown.getMarkdown()
        if (md !== lastEmittedMarkdown.current) {
          lastEmittedMarkdown.current = md
          onChange(md)
        }
      }, 300)
    },
    [onChange],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },    // H1/H2 reserved for section headings
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: large ? 'is-large' : '',
      },
    },
  })

  // Sync external value changes (e.g. AI generation fills content)
  useEffect(() => {
    if (!editor) return
    const currentMd: string = editor.storage.markdown.getMarkdown()
    if (value !== currentMd && value !== lastEmittedMarkdown.current) {
      isExternalUpdate.current = true
      editor.commands.setContent(value)
      lastEmittedMarkdown.current = value
      // Allow TipTap to finish its transaction before re-enabling updates
      requestAnimationFrame(() => { isExternalUpdate.current = false })
    }
  }, [value, editor])

  // Cleanup debounce timer
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return (
    <div className="rme-wrap" onClick={() => editor?.commands.focus()}>
      <Toolbar editor={editor} />
      <div className="rme-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default React.memo(RichMarkdownEditor)
