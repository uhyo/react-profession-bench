export type Session = "morning" | "afternoon" | "evening";

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "none";

export interface PersonalInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  bio: string;
}

export interface EventPreferences {
  eventDate: string; // ISO date string (YYYY-MM-DD)
  session: Session | "";
  dietaryRestrictions: DietaryRestriction[];
  specialRequests: string;
}

export interface RegistrationData {
  personalInfo: PersonalInfo;
  eventPreferences: EventPreferences;
}
