import type { IdentityQuestion, Segment } from '../types';

const lessonCopy = [
  'Review the rule, connect it to Arizona driving conditions, and complete the required interaction before the checkpoint.',
  'Use the scenario to decide what a prudent driver should do next. Your answer is saved for audit review.',
  'The segment ends with three substantive questions. All answers must be correct before continuing.',
];

const makeQuestions = (id: string, topic: string) => [
  {
    id: `${id}-q1`,
    prompt: `What is the safest first step when applying ${topic.toLowerCase()}?`,
    choices: ['Scan ahead and adjust early', 'Wait until the last second', 'Rely only on other drivers'],
    answer: 'Scan ahead and adjust early',
  },
  {
    id: `${id}-q2`,
    prompt: `Why is ${topic.toLowerCase()} covered in an Arizona defensive driving course?`,
    choices: ['It reduces preventable crash risk', 'It replaces court instructions', 'It guarantees dismissal'],
    answer: 'It reduces preventable crash risk',
  },
  {
    id: `${id}-q3`,
    prompt: `Before advancing from a ${topic.toLowerCase()} lesson, the student must:`,
    choices: ['Complete active participation and pass the quiz', 'Skip to the final review', 'Only watch part of the segment'],
    answer: 'Complete active participation and pass the quiz',
  },
];

const topics = [
  'Welcome, eligibility, and course rules',
  'Arizona traffic law basics',
  'Speed management',
  'Following distance',
  'Intersections and right-of-way',
  'Lane changes and blind spots',
  'Distracted driving',
  'Impaired driving',
  'Aggressive driving and road rage',
  'Seat belts and occupant safety',
  'Sharing the road with motorcycles, bicycles, pedestrians, and large trucks',
  'Work zones and school zones',
  'Weather, night driving, and desert driving conditions',
  'Crash prevention and hazard recognition',
  'Consequences of unsafe driving',
  'Final review and course completion',
];

export const segments: Segment[] = topics.map((title, index) => ({
  id: `segment-${String(index + 1).padStart(2, '0')}`,
  order: index + 1,
  title,
  durationMinutes: 15,
  objective: `Apply defensive driving practices for ${title.toLowerCase()}.`,
  participation:
    index % 3 === 0
      ? 'Click each compliance rule acknowledgement.'
      : index % 3 === 1
        ? 'Choose the safest response in the driving scenario.'
        : 'Drag the hazard cards into the correct priority order.',
  lesson: lessonCopy,
  questions: makeQuestions(`segment-${index + 1}`, title),
}));

export const identityQuestions: IdentityQuestion[] = [
  {
    id: 'identity-1',
    category: 'custom',
    prompt: 'Which personal passphrase did you create during registration?',
    choices: ['Desert mirror', 'Citation number', 'Driver license', 'Court date'],
    answer: 'Desert mirror',
  },
  {
    id: 'identity-2',
    category: 'memory',
    prompt: 'Which image did you select as your account verification image?',
    choices: ['Saguaro sunset', 'Traffic citation', 'License plate', 'Court building'],
    answer: 'Saguaro sunset',
  },
  {
    id: 'identity-3',
    category: 'personal-history',
    prompt: 'Which non-public reminder did you choose for verification?',
    choices: ['First car nickname', 'Date of birth', 'Street address', 'Citation number'],
    answer: 'First car nickname',
  },
  {
    id: 'identity-4',
    category: 'custom',
    prompt: 'Which private study phrase did you choose before course unlock?',
    choices: ['Check mirrors twice', 'Legal name', 'Driver license state', 'Violation code'],
    answer: 'Check mirrors twice',
  },
  {
    id: 'identity-alt',
    category: 'memory',
    prompt: 'Which private verification color did you select?',
    choices: ['Copper', 'Court date', 'Phone number', 'Docket number'],
    answer: 'Copper',
  },
];

export const complianceCollections = [
  'users',
  'students',
  'registrations',
  'documents',
  'courses',
  'segments',
  'segmentQuestions',
  'identityQuestions',
  'progress',
  'quizAttempts',
  'identityAttempts',
  'certificates',
  'auditLogs',
  'adminSettings',
  'feeSettings',
];
