import { useState } from 'react';

export function useTitle(initialTitle: string) {
  const [title, setTitle] = useState(initialTitle);

  function updateTitle(newTitle: string) {
    setTitle(newTitle);
    document.title = newTitle;
  }

  return { title, updateTitle };
}
