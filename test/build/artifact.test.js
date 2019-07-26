'use strict';

const expect = require('expect.js');
const uuid = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const {
  generateRootArtifactDirectory
} = require('../../lib/build/artifact');

describe('test generateRootArtifactDirectory', () => {
  it('test generateRootArtifactDirectory', async function () {
    const os = require('os');
    const projectRoot = path.join(os.tmpdir(), uuid.v4());
    
    const rootArtifactsDir = await generateRootArtifactDirectory(projectRoot);

    expect(fs.existsSync(rootArtifactsDir)).to.be(true);
    expect(rootArtifactsDir).to.eql(path.join(projectRoot, '.fun', 'build', 'artifacts'));
  });
});


