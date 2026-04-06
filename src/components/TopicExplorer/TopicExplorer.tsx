import { useState } from 'react';
import { TopicGrid } from './TopicGrid';
import { TopicDetail } from './TopicDetail';

export function TopicExplorer() {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  if (selectedTopicId != null) {
    return (
      <TopicDetail
        topicId={selectedTopicId}
        onBack={() => setSelectedTopicId(null)}
      />
    );
  }

  return <TopicGrid onSelectTopic={setSelectedTopicId} />;
}
