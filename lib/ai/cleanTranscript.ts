import { generateText } from './groq';

export async function cleanTranscript(rawTranscript: string): Promise<string> {
  if (!rawTranscript.trim()) return '';

  const userPrompt = `Clean up this spoken transcript. Rules:
1. Remove all filler words: um, uh, like, you know, kind of, sort of, basically
2. Fix run-on sentences with proper punctuation
3. NEVER change any numbers, percentages, dollar amounts, or proper nouns
4. Preserve the speaker's exact meaning and tone
5. Return only the cleaned text, nothing else

Transcript: ${rawTranscript}`;

  return (await generateText('', userPrompt)).trim();
}
