import { useState } from 'react';
import { TopicGrid } from './TopicGrid';
import { TopicDetail } from './TopicDetail';
import { AiSettingsPanel } from '../AiSettings/AiSettingsPanel';
import { ReviewQueue } from '../BatchTagReview/ReviewQueue';

type Tab = 'topics' | 'ai-settings' | 'batch-review';

export function TopicExplorer() {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('topics');

  // Topic detail drills down from the grid — show it inline
  if (activeTab === 'topics' && selectedTopicId != null) {
    return (
      <TopicDetail
        topicId={selectedTopicId}
        onBack={() => setSelectedTopicId(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <nav className="flex border-b border-parchment-border shrink-0 px-4">
        <TabButton
          label="Topics"
          active={activeTab === 'topics'}
          onClick={() => setActiveTab('topics')}
        />
        <TabButton
          label="AI Settings"
          active={activeTab === 'ai-settings'}
          onClick={() => setActiveTab('ai-settings')}
        />
        <TabButton
          label="Batch Review"
          active={activeTab === 'batch-review'}
          onClick={() => setActiveTab('batch-review')}
        />
      </nav>

      {/* Tab content */}
      {activeTab === 'topics' && <TopicGrid onSelectTopic={setSelectedTopicId} />}
      {activeTab === 'ai-settings' && <AiSettingsPanel />}
      {activeTab === 'batch-review' && <ReviewQueue />}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs py-2.5 px-4 transition-colors ${
        active
          ? 'font-semibold border-b-2 border-parchment-accent text-parchment-text'
          : 'text-parchment-muted hover:text-parchment-text hover:bg-parchment-bg'
      }`}
    >
      {label}
    </button>
  );
}
