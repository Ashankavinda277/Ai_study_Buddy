const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type Document = {
  id: string;
  filename: string;
  status: string;
  size_bytes: number;
  created_at: string;
};

export type DocumentProcessResult = {
  id: string;
  status: string;
  total_chunks: number;
};

export type ChatSource = {
  filename: string;
  page_number: number | null;
};

export type AskResponse = {
  session_id: string;
  answer: string;
  sources: ChatSource[];
};

export type ChatSessionSummary = {
  id: string;
  document_id: string;
  title: string | null;
  created_at: string;
};

export type ChatMessage = {
  role: string;
  content: string;
  sources: ChatSource[] | null;
  created_at: string;
};

export type ChatHistory = {
  session_id: string;
  messages: ChatMessage[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function registerUser(data: { name: string; email: string; password: string }) {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(data: { email: string; password: string }) {
  return request<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function logoutUser() {
  return request<{ detail: string }>("/auth/logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return request<User>("/auth/me");
}

export function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return request<Document>("/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export function listDocuments() {
  return request<Document[]>("/documents");
}

export function processDocument(documentId: string) {
  return request<DocumentProcessResult>(`/documents/${documentId}/process`, {
    method: "POST",
  });
}

export function deleteDocument(documentId: string) {
  return request<{ message: string }>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function askQuestion(question: string, documentId: string, sessionId?: string) {
  return request<AskResponse>("/chat/ask", {
    method: "POST",
    body: JSON.stringify({
      question,
      document_id: documentId,
      session_id: sessionId ?? null,
    }),
  });
}

export function listChatSessions(documentId?: string) {
  const query = documentId ? `?document_id=${encodeURIComponent(documentId)}` : "";
  return request<ChatSessionSummary[]>(`/chat/sessions${query}`);
}

export function getChatHistory(sessionId: string) {
  return request<ChatHistory>(`/chat/sessions/${sessionId}`);
}

export function deleteChatSession(sessionId: string) {
  return request<{ message: string }>(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export type QuizQuestionPublic = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic: string | null;
  difficulty: string | null;
  source_page: number | null;
};

export type QuizPublic = {
  id: number;
  title: string;
  topic: string | null;
  difficulty: string;
  question_count: number;
  status: string;
  questions: QuizQuestionPublic[];
};

export type QuizSubmitResponse = {
  attempt_id: number;
  correct_count: number;
  incorrect_count: number;
  total_questions: number;
  score_percentage: number;
  performance_level: string;
};

export type QuestionReview = {
  question_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string | null;
  topic: string | null;
  source_page: number | null;
};

export type AttemptDetail = {
  id: number;
  quiz_id: number;
  quiz_title: string;
  correct_count: number;
  incorrect_count: number;
  total_questions: number;
  score_percentage: number;
  performance_level: string;
  time_taken: number | null;
  ai_feedback: string | null;
  completed_at: string;
  questions: QuestionReview[];
};

export function fetchQuiz(quizId: number) {
  return request<QuizPublic>(`/quizzes/${quizId}`);
}

export function submitQuiz(
  quizId: number,
  data: { answers: { question_id: number; selected_answer: number | null }[]; time_taken: number }
) {
  return request<QuizSubmitResponse>(`/quizzes/${quizId}/submit`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchAttempt(attemptId: number) {
  return request<AttemptDetail>(`/attempts/${attemptId}`);
}

export type AvailableDocument = {
  id: string;
  filename: string;
  status: string;
};

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionCount = 5 | 10 | 15;

export type QuizGenerateRequest = {
  document_id: string;
  topic: string | null;
  difficulty: Difficulty;
  question_count: QuestionCount;
};

export type QuizGenerateResponse = {
  quiz_id: number;
};

export function fetchAvailableDocuments() {
  return request<AvailableDocument[]>("/quizzes/documents");
}

export function generateQuiz(data: QuizGenerateRequest) {
  return request<QuizGenerateResponse>("/quizzes/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type AttemptSort = "newest" | "oldest" | "score";

export type AttemptSummary = {
  id: number;
  quiz_id: number;
  quiz_title: string;
  document_filename: string;
  topic: string | null;
  difficulty: string;
  score_percentage: number;
  performance_level: string;
  time_taken: number | null;
  completed_at: string;
};

export function fetchAttempts(filters: {
  document_id?: string;
  topic?: string;
  difficulty?: Difficulty;
  sort?: AttemptSort;
} = {}) {
  const params = new URLSearchParams();
  if (filters.document_id) params.set("document_id", filters.document_id);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.sort) params.set("sort", filters.sort);
  const query = params.toString();
  return request<AttemptSummary[]>(`/attempts${query ? `?${query}` : ""}`);
}
