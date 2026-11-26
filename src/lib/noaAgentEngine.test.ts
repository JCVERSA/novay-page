import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MESSAGE_LENGTH,
  MAX_REQUESTS_PER_USER,
  canConsumeQuota,
  clearConversationKeepQuota,
  createEmptySession,
  getQuotaSnapshot,
  inferNoaEmotion,
  parseCookies,
  recordExchange,
  signSessionId,
  validateChatPrompt,
  verifySignedSessionCookie,
} from './noaAgentEngine.ts';
import { NOVAY_APP_SPEC, buildNoaSystemInstruction } from './novayKnowledge.ts';

test('signed session cookie signs and verifies securely while rejecting tampering', () => {
  const secret = 'test-signing-secret-key';
  const sid = '550e8400-e29b-41d4-a716-446655440000';
  const token = signSessionId(sid, secret);

  assert.equal(verifySignedSessionCookie(token, secret), sid);
  assert.equal(verifySignedSessionCookie(`${sid}.tamperedsignature`, secret), null);
  assert.equal(verifySignedSessionCookie(token, 'wrong-secret'), null);
  assert.equal(verifySignedSessionCookie('bad-id.sig', secret), null);
  assert.equal(verifySignedSessionCookie(undefined, secret), null);
});

test('parseCookies parses cookie header reliably', () => {
  const parsed = parseCookies('foo=bar; novay_noa_sid=abc.def%3D1; theme=dark');
  assert.equal(parsed.foo, 'bar');
  assert.equal(parsed.novay_noa_sid, 'abc.def=1');
  assert.equal(parsed.theme, 'dark');
});

test('validateChatPrompt trims control characters and enforces length limits', () => {
  assert.equal(validateChatPrompt('').ok, false);
  assert.equal(validateChatPrompt('   \n\t ').ok, false);
  assert.equal(validateChatPrompt(123).ok, false);
  assert.equal(validateChatPrompt('a'.repeat(MAX_MESSAGE_LENGTH + 1)).ok, false);

  const valid = validateChatPrompt('  Comment installer\u0000 NoVaY ?  ');
  assert.equal(valid.ok, true);
  assert.equal(valid.text, 'Comment installer NoVaY ?');
});

test('100 request limit is strictly enforced and preserved across conversation resets', () => {
  let session = createEmptySession('550e8400-e29b-41d4-a716-446655440000', 1000);
  assert.equal(canConsumeQuota(session), true);
  assert.deepEqual(getQuotaSnapshot(session), {
    used: 0,
    limit: MAX_REQUESTS_PER_USER,
    remaining: 100,
    limitReached: false,
  });

  for (let i = 0; i < MAX_REQUESTS_PER_USER; i++) {
    assert.equal(canConsumeQuota(session), true);
    session = recordExchange(session, `Question ${i + 1}`, `Réponse ${i + 1}`, 'happy', 2000 + i);
  }

  assert.equal(canConsumeQuota(session), false);
  assert.deepEqual(getQuotaSnapshot(session), {
    used: 100,
    limit: 100,
    remaining: 0,
    limitReached: true,
  });

  // Clearing conversation must keep quota spent so users cannot bypass the 100 limit
  const cleared = clearConversationKeepQuota(session, 5000);
  assert.equal(cleared.messages.length, 0);
  assert.equal(cleared.requestCount, 100);
  assert.equal(canConsumeQuota(cleared), false);
});

test('knowledge base contains accurate NoVaY v3.3.0 specs, installation, and troubleshooting', () => {
  const prompt = buildNoaSystemInstruction();
  assert.equal(NOVAY_APP_SPEC.versionName, '3.3.0');
  assert.equal(NOVAY_APP_SPEC.packageId, 'dot.jcversa.novay');
  assert.match(prompt, /3\.3\.0/);
  assert.match(prompt, /dot\.jcversa\.novay/);
  assert.match(prompt, /Application non installée/);
  assert.match(prompt, /Sources inconnues/i);
  assert.match(prompt, /ZArchiver/);
  assert.match(prompt, /STATE_FAILED/);
  assert.match(prompt, /100 requêtes/);
});

test('inferNoaEmotion maps reply themes cleanly', () => {
  assert.equal(inferNoaEmotion('Oups, erreur', true), 'surprised');
  assert.equal(inferNoaEmotion('Étape 1 : ouvre Paramètres > Sources inconnues.'), 'focused');
  assert.equal(inferNoaEmotion('NoVaY 3.3.0 est prêt !'), 'excited');
  assert.equal(inferNoaEmotion('Voici les détails de ton animé.'), 'happy');
});
