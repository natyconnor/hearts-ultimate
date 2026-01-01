import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";

/**
 * Generates a random slug in the format: "adjective-animal-number"
 * Example: "brave-lion-42"
 */
export function generateSlug(): string {
  const adjective = uniqueNamesGenerator({
    dictionaries: [adjectives],
    length: 1,
    style: "lowerCase",
  });

  const animal = uniqueNamesGenerator({
    dictionaries: [animals],
    length: 1,
    style: "lowerCase",
  });

  // Generate a random number between 1 and 999
  const number = Math.floor(Math.random() * 999) + 1;

  return `${adjective}-${animal}-${number}`;
}
