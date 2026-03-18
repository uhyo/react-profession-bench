// --- Types ---

export type Rating = 1 | 2 | 3 | 4 | 5;

export type FeedbackCategory =
  | "ui-design"
  | "performance"
  | "documentation"
  | "support"
  | "pricing";

export interface SurveyData {
  name: string;
  email: string;
  company: string;
  rating: Rating;
  categories: FeedbackCategory[];
  comments: string;
  filename: string | null;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  submittedAt: number; // Date.now()
}

// --- Simulated API ---

/**
 * Submits survey data to the simulated server.
 * Takes ~1.5 seconds to respond.
 * Has a 30% chance of failure.
 */
export async function submitSurvey(data: SurveyData): Promise<SubmissionResult> {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

  if (Math.random() < 0.3) {
    return {
      success: false,
      message: "Server error: unable to process submission. Please try again.",
      submittedAt: Date.now(),
    };
  }

  return {
    success: true,
    message: "Survey submitted successfully.",
    submittedAt: Date.now(),
  };
}
