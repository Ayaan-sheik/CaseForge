import { generateText } from './groq';

export async function cleanTranscript(rawTranscript: string): Promise<string> {
  if (!rawTranscript.trim()) return '';

  const userPrompt = `Clean up this spoken transcript so it reads as clear, grammatical written English. Rules:
1. Remove all filler words: um, uh, like, you know, kind of, sort of, basically
2. Fix grammar: verb tense, subject-verb agreement, articles (a/an/the), pluralization, and capitalization
3. Fix run-on sentences and fragments with proper punctuation and sentence boundaries
4. NEVER change any numbers, percentages, dollar amounts, dates, or proper nouns (names of people, companies, products)
5. Preserve the speaker's exact meaning, claims, and tone — do not add, embellish, or remove information
6. Return only the cleaned text, nothing else

Transcript: ${rawTranscript}`;

  return (await generateText('', userPrompt)).trim();
}
