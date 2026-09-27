/**
 * Feature switches for decisions that are still open with the client.
 *
 * Each flag defaults to the safe answer, so an unconfigured deployment
 * behaves the way the PRD says it should until someone opts in.
 */

/**
 * Certificate lookup and issuing. Off by default: Kelas Bermain does not
 * issue e-certificates (PRD v2.0, R-06 / K-07) — older events have no
 * certificate codes at all, and some hand out paper on the day. The code
 * stays in the tree so this can be switched back on rather than rebuilt.
 */
export const certificatesEnabled = process.env.FEATURE_CERTIFICATES === "true";
