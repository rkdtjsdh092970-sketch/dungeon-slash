// 빌드별로 균열 몇 단계까지 클리어 가능한지(전투력 상한) 측정: 단계마다 3판 중 승률
const A = require('./simlib.js');
const fs = require('fs'); const src = fs.readFileSync('./builds.js', 'utf8');
