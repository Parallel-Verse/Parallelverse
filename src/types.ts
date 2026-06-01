export type View = 'home' | 'register' | 'eligibility' | 'payment' | 'course' | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'locked' | 'completed';

export type AuditEvent =
  | 'registration'
  | 'login'
  | 'logout'
  | 'course_start'
  | 'segment_start'
  | 'segment_end'
  | 'inactivity_timeout'
  | 'quiz_attempt'
  | 'identity_check'
  | 'admin_verification'
  | 'certificate_generation'
  | 'completion_export';

export interface StudentProfile {
  uid: string;
  legalName: string;
  dob: string;
  licenseState: string;
  licenseNumber: string;
  address: string;
  phone: string;
  email: string;
  courtJurisdiction: string;
  citationNumber: string;
  docketNumber: string;
  violationCode: string;
  violationDate: string;
  courtDate: string;
  eligibilitySignature: string;
  approvalStatus: ApprovalStatus;
  courseUnlocked: boolean;
  identityReviewRequired: boolean;
  ineligibilityFlags: string[];
  createdAt: string;
}

export interface EligibilityAnswers {
  priorCourseWithin12Months: boolean;
  violationEligible: boolean;
  seriousInjuryOrFatality: boolean;
  commercialVehicleCdl: boolean;
  courtOrdered: boolean;
  sevenDayWindow: boolean;
}

export interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}

export interface Segment {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
  objective: string;
  participation: string;
  lesson: string[];
  questions: Question[];
}

export interface IdentityQuestion extends Question {
  category: 'memory' | 'custom' | 'personal-history';
}

export interface ProgressState {
  currentSegmentIndex: number;
  completedSegmentIds: string[];
  activeSeconds: number;
  segmentSeconds: Record<string, number>;
  quizPassed: Record<string, boolean>;
  identityChecksPassed: number;
  lockedReason?: string;
  lastActivityAt?: string;
  completedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  event: AuditEvent;
  userId: string;
  timestamp: string;
  details: string;
  userAgent: string;
}
