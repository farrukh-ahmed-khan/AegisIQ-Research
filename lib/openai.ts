import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function getOpenAiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function hasOpenAiKey(): boolean {
  return getOpenAiApiKey().length > 0;
}

function getOpenAiClient(): OpenAI {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to your environment and restart the dev server.",
    );
  }

  return new OpenAI({ apiKey });
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export { getOpenAiClient, getOpenAiModel, hasOpenAiKey };
