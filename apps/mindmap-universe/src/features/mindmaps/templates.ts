export interface MindMapTemplate {
  id: string
  name: string
  description: string
  root: string
  branches: Array<{ text: string; children: string[] }>
}

export const TEMPLATES: MindMapTemplate[] = [
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Capture free ideas around a problem.',
    root: 'Main idea',
    branches: [
      { text: 'How might we…?', children: ['Idea A', 'Idea B'] },
      { text: 'Constraints', children: [] },
      { text: 'People involved', children: [] },
      { text: 'Next actions', children: [] },
    ],
  },
  {
    id: 'historical-analysis',
    name: 'Historical analysis',
    description: 'Causes, phases and consequences of an event.',
    root: 'Event',
    branches: [
      { text: 'Deep causes', children: ['Economic', 'Political', 'Social'] },
      { text: 'Trigger', children: [] },
      { text: 'Key phases', children: [] },
      { text: 'Consequences', children: ['Short term', 'Long term'] },
      { text: 'Historiographical debate', children: [] },
    ],
  },
  {
    id: 'scientific-research',
    name: 'Scientific research',
    description: 'Structure of a research project or review.',
    root: 'Research question',
    branches: [
      { text: 'Hypothesis', children: ['H1', 'H2'] },
      { text: 'Method', children: ['Data', 'Instruments'] },
      { text: 'Literature', children: [] },
      { text: 'Limitations', children: [] },
      { text: 'Future work', children: [] },
    ],
  },
  {
    id: 'project-planning',
    name: 'Project planning',
    description: 'Scope, milestones and risks of a project.',
    root: 'Project',
    branches: [
      { text: 'Objectives', children: ['MVP'] },
      { text: 'Milestones', children: ['M1', 'M2', 'M3'] },
      { text: 'Team', children: [] },
      { text: 'Risks', children: [] },
      { text: 'Budget', children: [] },
    ],
  },
  {
    id: 'book-summary',
    name: 'Book summary',
    description: 'Summarize a non-fiction book.',
    root: 'Book title',
    branches: [
      { text: 'Core thesis', children: [] },
      { text: 'Key arguments', children: ['Ch. 1-3', 'Ch. 4-6'] },
      { text: 'Evidence', children: [] },
      { text: 'Applications', children: [] },
      { text: 'Critiques', children: [] },
    ],
  },
  {
    id: 'exam-prep',
    name: 'Exam preparation',
    description: 'Organize all exam material.',
    root: 'Exam',
    branches: [
      { text: 'Topic 1', children: ['Definitions', 'Examples'] },
      { text: 'Topic 2', children: [] },
      { text: 'Topic 3', children: [] },
      { text: 'Weak areas', children: [] },
      { text: 'Practice questions', children: [] },
    ],
  },
  {
    id: 'business-strategy',
    name: 'Business strategy',
    description: 'Strategy canvas for a product or company.',
    root: 'Strategy',
    branches: [
      { text: 'Vision', children: [] },
      { text: 'Market', children: ['Competitors'] },
      { text: 'Value proposition', children: [] },
      { text: 'Risks', children: [] },
      { text: 'KPIs', children: [] },
    ],
  },
  {
    id: 'problem-solving',
    name: 'Problem solving',
    description: 'Root cause analysis.',
    root: 'Problem',
    branches: [
      { text: 'Symptoms', children: [] },
      { text: 'Root causes', children: ['5 whys'] },
      { text: 'Options', children: ['Option A', 'Option B'] },
      { text: 'Decision criteria', children: [] },
    ],
  },
]
