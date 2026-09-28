import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync('index.html', 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, '진단 스크립트를 찾을 수 있어야 한다');
const logic = script.slice(script.indexOf('const AX'), script.indexOf('function finish'));
const api = Function(`${logic}; return { Q, scoreFor: values => { ans = values; return score(); }, gapBand, lowAxis };`)();

const gap = (inside, outside) => Math.abs(inside - outside);
assert.equal(gap(50, 71), 21, '사진의 50점·71점 결과는 21점 간극이어야 한다');
assert.equal(gap(71, 50), 21, '방향이 반대여도 간극은 21점이어야 한다');
assert.equal(gap(50, 50), 0, '같은 점수일 때만 간극은 0이다');
assert.equal(api.gapBand(21, 50, 71), '일상 응답 점수가 21점 더 높게 나왔습니다.');
assert.equal(api.gapBand(21, 71, 50), '수련 중 추정 점수가 21점 더 높게 나왔습니다.');

const raw = [4,4,3, 4,4,4, 3,3,4, 4,4,5];
const photoAnswers = raw.map((value, index) => api.Q[index].r ? 6 - value : value);
const photoScore = api.scoreFor(photoAnswers);
assert.deepEqual(photoScore, { ax: { rel: 67, self: 75, sense: 58, focus: 83 }, tot: 71 },
  '첨부 화면의 축 점수와 전체 실측 점수는 같은 답변에서 재현되어야 한다');
assert.equal(api.lowAxis(photoScore.ax), 'sense', '첨부 화면에서는 감각 축이 최저점이므로 끌려가는 사람이 맞아야 한다');

assert.match(source, /gap\s*=\s*Math\.abs\(est\s*-\s*s\.tot\)/,
  '화면 계산은 est와 tot의 절대 차이를 사용해야 한다');
assert.doesNotMatch(source, /gap\s*=\s*Math\.max\(0\s*,\s*est\s*-\s*s\.tot\)/,
  '매트 밖 점수가 높을 때 간극을 0으로 자르면 안 된다');
console.log('scoring regression checks passed');
