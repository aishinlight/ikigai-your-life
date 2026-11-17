import type { ModuleKey, ReflectionItem } from "./kamiya";

export type CoachingPreference = "ai" | "human" | "both" | "undecided";
export type Profile = {
  id: string;
  display_name: string | null;
  coaching_preference: CoachingPreference | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Conversation = { id: string; user_id: string; module_key: ModuleKey; created_at: string; updated_at: string };
export type Message = { id: string; conversation_id: string; role: "user" | "assistant"; content: string; created_at: string };
export type Reflection = {
  id: string;
  user_id: string;
  module_key: ModuleKey;
  conversation_id: string | null;
  key_discoveries: ReflectionItem[];
  recurring_themes: ReflectionItem[];
  supporting_examples: ReflectionItem[];
  open_questions: ReflectionItem[];
  further_exploration: ReflectionItem[];
  status: "draft" | "confirmed";
  confirmed_at: string | null;
  updated_at: string;
};
export type NeedRating = { id: string; user_id: string; need_key: string; score: number; note: string | null; updated_at: string };
export type Direction = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  evidence: string[];
  source: "ai" | "user";
  status: "suggested" | "kept" | "dismissed";
  created_at: string;
};
export type ActionPlan = { id: string; user_id: string; chosen_direction: string | null; notes: string | null; updated_at: string };
export type ActionStatus = "todo" | "in_progress" | "completed" | "postponed";
export type ActionItem = {
  id: string;
  plan_id: string;
  title: string;
  details: string | null;
  status: ActionStatus;
  target_date: string | null;
  position: number;
  created_at: string;
};
export type JournalEntry = { id: string; user_id: string; title: string | null; body: string; entry_date: string; created_at: string; updated_at: string };
