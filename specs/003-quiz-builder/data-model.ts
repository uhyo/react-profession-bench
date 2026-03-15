export type QuestionType = "single-choice" | "multiple-choice" | "true-false";

interface BaseQuestion {
  id: string;
  text: string;
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: "single-choice";
  options: string[];
  correctIndex: number | null;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice";
  options: string[];
  correctIndices: number[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "true-false";
  correctAnswer: boolean | null;
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion;

export interface Quiz {
  questions: Question[];
}
