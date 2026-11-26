import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blendEmotionParams,
  clampLookVector,
  computeScrollChoreography,
  getEmotionParams,
  getMascotReactionMessage,
  resolveMascotPalette,
  stepScalarSpring,
  stepSpring2D,
} from './mascotEngine';

test('scroll choreography shifts position, size, zone, state, and emotion smoothly across the page', () => {
  const hero = computeScrollChoreography(0, 1440, 900);
  const promise = computeScrollChoreography(0.18, 1440, 900);
  const featuresMid = computeScrollChoreography(0.34, 1440, 900);
  const ocean = computeScrollChoreography(1.0, 1440, 900);

  assert.equal(hero.zone, 'hero');
  assert.equal(hero.state, 'greeting');
  assert.equal(hero.emotion, 'neutral');
  assert.ok(hero.x > 1300, 'Hero places mascot safely in outer right gutter');
  assert.equal(hero.size, 98);

  assert.equal(promise.zone, 'promise');
  assert.equal(promise.state, 'curious');
  assert.ok(promise.x < 120, 'Promise places mascot safely in outer left gutter');
  assert.ok(promise.size < hero.size, 'Mascot scales down smoothly after hero');

  assert.equal(featuresMid.zone, 'features');
  assert.equal(featuresMid.emotion, 'excited');

  assert.equal(ocean.zone, 'ocean');
  assert.equal(ocean.state, 'resting');
  assert.equal(ocean.emotion, 'sleepy');
  assert.ok(ocean.x > 1280, 'Ocean settles mascot on lower-right above waves');
});

test('mobile choreography keeps mascot safely inside compact viewport bounds', () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const target = computeScrollChoreography(progress, 390, 844);
    assert.equal(target.isMobile, true);
    assert.ok(target.size <= 56 && target.size >= 44);
    assert.ok(target.x - target.size / 2 >= 8);
    assert.ok(target.x + target.size / 2 <= 386);
    assert.ok(target.y + target.size / 2 <= 844);
  }
});

test('clampLookVector scales proportionally inside radius and clamps unit circle outside', () => {
  const inside = clampLookVector(100, -50, 200);
  assert.equal(inside.x, 0.5);
  assert.equal(inside.y, -0.25);

  const outside = clampLookVector(600, 800, 200);
  assert.ok(Math.abs(Math.hypot(outside.x, outside.y) - 1) < 1e-6);
  assert.ok(outside.x > 0 && outside.y > 0);
});

test('spring integrators converge toward target smoothly without NaN or divergence', () => {
  let scalar = { value: 0, velocity: 0 };
  for (let i = 0; i < 180; i++) {
    scalar = stepScalarSpring(scalar, 120, 140, 18, 1 / 60);
  }
  assert.ok(Math.abs(scalar.value - 120) < 0.25);

  let pos = { x: 100, y: 100, vx: 0, vy: 0 };
  for (let i = 0; i < 180; i++) {
    pos = stepSpring2D(pos, 800, 500, 130, 18, 1 / 60);
  }
  assert.ok(Math.abs(pos.x - 800) < 0.5);
  assert.ok(Math.abs(pos.y - 500) < 0.5);
});

test('emotion parameters and blending cover all expressive states cleanly', () => {
  const happy = getEmotionParams('happy');
  const sleepy = getEmotionParams('sleepy');
  const surprised = getEmotionParams('surprised');

  assert.equal(happy.arcCurve, 1);
  assert.equal(sleepy.arcCurve, -1);
  assert.ok(surprised.eyeScale > 1.2);

  const mid = blendEmotionParams(sleepy, happy, 0.5);
  assert.equal(mid.arcCurve, 0);
  assert.ok(mid.opennessL > sleepy.opennessL && mid.opennessL < happy.opennessL);
});

test('resolveMascotPalette adapts body and eye contrast to light/dark themes and phone accents', () => {
  const light = resolveMascotPalette('light', 'noir_crimson');
  const dark = resolveMascotPalette('dark', 'noir_crimson');
  const slate = resolveMascotPalette('dark', 'midnight_slate');

  assert.notEqual(light.bodyTop, dark.bodyTop);
  assert.notEqual(light.eye, dark.eye);
  assert.equal(slate.hanko, '#0284C7');
  assert.ok(getMascotReactionMessage('wink', 'features').length > 0);
});
