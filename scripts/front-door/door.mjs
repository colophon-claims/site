/**
 * Whether the front door takes submissions.
 *
 * It stays shut until the sealing tool's default output can pass both the
 * published checker and this site's ingest: today a bundle `colophon publish`
 * emits is format /10, which the published checker line it pins refuses and
 * ingest does not project. Tracked in Jinn-Network/mono#4760. Opening the door
 * is a reviewed change to this file, nothing else.
 */
export const DOOR = {
  open: false,
  closedMessage: [
    "The front door is not open yet, so nothing was fetched and nothing was listed.",
    "It opens once a bundle the sealing tool emits can pass the published checker and be listed here",
    "(https://github.com/Jinn-Network/mono/issues/4760). Until then, write to the address on",
    "https://colophon.claims/ to publish a claim.",
  ].join(" "),
};
