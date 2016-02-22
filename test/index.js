import { readFileSync } from 'fs';
import { EOL } from 'os';
import { dirname, resolve, relative } from 'path';

import assert from 'power-assert';
import { sync as glob } from 'glob';
import { transform as babel } from 'babel-core';

import { name } from '../package';

const walked = new Set();

describe(`Babel plugin ${name}`, () => {
  const files = glob(`${__dirname}/**/{actual,expected}`);
  files.forEach((p) => {
    const dir = dirname(p);

    if(walked.has(dir)) {
      return;
    }
    walked.add(dir);

    const testName = relative(__dirname, dir);

    let actual, expected;
    try {
      actual = readFileSync(resolve(dir, 'actual')).toString();
      expected = readFileSync(resolve(dir, 'expected')).toString();
    } catch (e) {
      return;
    }

    it(testName, () => {
      const compiled = babel(actual, {
        plugins: [
          '../src/'
        ]
      }).code;

      assert(compiled + EOL === expected);
    });
  });
});
