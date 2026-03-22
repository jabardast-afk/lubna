const crisisNeedles = [
  "suicide",
  "kill myself",
  "self harm",
  "hurt myself",
  "end my life",
  "खुद को नुकसान",
  "जीना नहीं चाहती",
  "மரணம்",
  "আত্মহত্যা"
];

export function shouldTriggerCrisisSupport(input: string): boolean {
  const lowered = input.toLowerCase();
  return crisisNeedles.some((needle) => lowered.includes(needle));
}
