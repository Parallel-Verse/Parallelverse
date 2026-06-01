import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  initializeApp(serviceAccountPath ? { credential: cert(serviceAccountPath) } : undefined);
}

const db = getFirestore();

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

function questions(segmentId, topic) {
  return [
    {
      id: `${segmentId}-q1`,
      prompt: `What is the safest first step when applying ${topic.toLowerCase()}?`,
      choices: ['Scan ahead and adjust early', 'Wait until the last second', 'Rely only on other drivers'],
      answer: 'Scan ahead and adjust early',
    },
    {
      id: `${segmentId}-q2`,
      prompt: `Why is ${topic.toLowerCase()} covered in an Arizona defensive driving course?`,
      choices: ['It reduces preventable crash risk', 'It replaces court instructions', 'It guarantees dismissal'],
      answer: 'It reduces preventable crash risk',
    },
    {
      id: `${segmentId}-q3`,
      prompt: `Before advancing from a ${topic.toLowerCase()} lesson, the student must:`,
      choices: ['Complete active participation and pass the quiz', 'Skip to the final review', 'Only watch part of the segment'],
      answer: 'Complete active participation and pass the quiz',
    },
  ];
}

const batch = db.batch();

batch.set(db.doc('courses/arizona-defensive-driving-online'), {
  title: 'Arizona Defensive Driving Online Course',
  status: 'approvalPending',
  minimumMinutes: 240,
  maximumMinutes: 270,
  segmentMaximumMinutes: 15,
  recordRetentionYears: 3,
});

topics.forEach((title, index) => {
  const segmentId = `segment-${String(index + 1).padStart(2, '0')}`;
  batch.set(db.doc(`segments/${segmentId}`), {
    id: segmentId,
    courseId: 'arizona-defensive-driving-online',
    order: index + 1,
    title,
    durationMinutes: 15,
    objective: `Apply defensive driving practices for ${title.toLowerCase()}.`,
    participationRequired: true,
  });

  questions(segmentId, title).forEach((question) => {
    batch.set(db.doc(`segmentQuestions/${question.id}`), {
      ...question,
      segmentId,
      substantive: true,
    });
  });
});

[
  ['identity-1', 'Which personal passphrase did you create during registration?', 'Desert mirror'],
  ['identity-2', 'Which image did you select as your account verification image?', 'Saguaro sunset'],
  ['identity-3', 'Which non-public reminder did you choose for verification?', 'First car nickname'],
  ['identity-4', 'Which private study phrase did you choose before course unlock?', 'Check mirrors twice'],
  ['identity-alt', 'Which private verification color did you select?', 'Copper'],
].forEach(([id, prompt, answer]) => {
  batch.set(db.doc(`identityQuestions/${id}`), {
    id,
    prompt,
    choices: [answer, 'Date of birth', 'Driver license number', 'Citation number'],
    answer,
    disallowPublicData: true,
  });
});

batch.set(db.doc('feeSettings/default'), {
  schoolFee: 39,
  stateFee: 24,
  stateSurcharge: 45,
  courtDiversionFeeUrl: '',
});

batch.set(db.doc('adminSettings/branding'), {
  approvalStatusLabel: 'Approval Pending',
  certifiedSchoolNumber: '',
  schoolName: 'Arizona Defensive Driving School',
  authorizedSignatureText: 'Authorized School Representative',
});

await batch.commit();
console.log('Seeded course, segments, questions, identity checks, fees, and admin settings.');
