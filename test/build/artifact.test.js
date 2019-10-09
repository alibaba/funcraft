
'use strict';

const expect = require('expect.js');
const uuid = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const tmpDir = require('temp-dir');

const {
  generateRootArtifactDirectory,
  generateArtifactDirectory,
  cleanDirectory
} = require('../../lib/build/artifact');

describe('test generateRootArtifactDirectory', () => {
  it('test generateRootArtifactDirectory', async function () {
    const baseDir = path.join(tmpDir, uuid.v4());
    
    const rootArtifactsDir = await generateRootArtifactDirectory(baseDir);

    expect(fs.existsSync(rootArtifactsDir)).to.be(true);
    expect(rootArtifactsDir).to.eql(path.join(baseDir, '.fun', 'build', 'artifacts'));
  });
});

describe('test generateArtifactDirectory', () => {
  it('test generateArtifactDirectory', async function () {
    const baseDir = path.join(tmpDir, uuid.v4());
    
    const artifactDir = await generateArtifactDirectory(baseDir, 'service', 'function');

    expect(fs.existsSync(artifactDir)).to.be(true);
    expect(artifactDir).to.eql(path.join(baseDir, 'service', 'function'));
  });
});

describe('test cleanDirectory', () => {
  it('test cleanDirectory', async () => {
    const baseDir = path.join(tmpDir, uuid.v4());

    await fs.createFile(path.join(baseDir, 'a'));
    
    await cleanDirectory(baseDir);

    expect(await fs.readdir(baseDir)).to.eql([]);
  });
});


