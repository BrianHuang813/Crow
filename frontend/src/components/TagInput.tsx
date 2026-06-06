import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import './TagInput.css';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const tag = draft.trim();
    if (!tag || value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {value.map(tag => (
        <span key={tag} className="tag-input__chip">
          {tag}
          <button
            type="button"
            className="tag-input__remove"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter(t => t !== tag))}
          >
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        className="tag-input__field"
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
