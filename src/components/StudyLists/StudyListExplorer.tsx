import { useState } from 'react';
import { StudyListGrid } from './StudyListGrid';
import { StudyListDetail } from './StudyListDetail';

export function StudyListExplorer() {
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  if (selectedListId != null) {
    return (
      <StudyListDetail
        listId={selectedListId}
        onBack={() => setSelectedListId(null)}
      />
    );
  }

  return <StudyListGrid onSelectList={setSelectedListId} />;
}
