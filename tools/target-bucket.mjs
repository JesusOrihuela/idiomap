#!/usr/bin/env node
/* Print the canonical bucket file for a target concept.
 *
 *   node tools/target-bucket.mjs --tag es --conceptId es.greetings_hello
 */
import { bucketFor } from './lib-target-store.mjs';

const args = process.argv.slice(2);
const val = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const tag = val('--tag');
const conceptId = val('--conceptId');
if (!tag || !conceptId) {
  console.error('Usage: node tools/target-bucket.mjs --tag <tag> --conceptId <id>');
  process.exit(1);
}
console.log(`shared/json/targets/${tag}/buckets/${bucketFor(conceptId)}.json`);
