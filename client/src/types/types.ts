interface ResponseType {
  question: string;
  response: string;
  prompt: string;
  context: ContextType[];
}

interface ContextType {
  text: string;
  score: number;
}

export type { ResponseType, ContextType };
