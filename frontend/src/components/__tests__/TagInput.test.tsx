import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TagInput } from '../TagInput';

function Harness({ initial = [] as string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  return <TagInput value={tags} onChange={setTags} placeholder="Add a tool…" />;
}

describe('TagInput', () => {
  it('adds a trimmed tag on Enter and clears the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText('Add a tool…');
    await user.type(input, '  React  {Enter}');
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('ignores duplicate and empty tags', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React']} />);
    const input = screen.getByPlaceholderText('Add a tool…');
    await user.type(input, 'React{Enter}');
    await user.type(input, '   {Enter}');
    expect(screen.getAllByText('React')).toHaveLength(1);
  });

  it('removes a tag when its remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React', 'GPT-4']} />);
    await user.click(screen.getByRole('button', { name: /remove React/i }));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
  });

  it('removes the last tag on Backspace when the input is empty', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React', 'GPT-4']} />);
    const input = screen.getByPlaceholderText('Add a tool…');
    input.focus();
    await user.keyboard('{Backspace}');
    expect(screen.queryByText('GPT-4')).not.toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });
});
