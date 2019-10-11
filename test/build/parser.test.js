'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const parser = require('../../lib/build/parser');
const fs = require('fs-extra');
const expect = require('expect.js');
const dockerOpts = require('../../lib/docker-opts');

const funymlContent = `
runtime: python3
tasks:
  - apt: local-test
    target: .fun/nas/auto/apt
  - pip: testPipTarget
    target: .fun/nas/auto/pip
  - apt: local-package
    local: false
  - apt: libzbar0
  - shell: ln -sf libzbar.so.0.2.0 libzbar.so
    cwd: /code/.fun/root/usr/lib
  - pip: Pillow
    env: 
      PATH: testpath
      TESTENV: testenv
  - pip: pyzbar
    local: true
  - name: compile R
    shell: |-
      apt-get build-dep -y r-base;
      curl -L https://fc-demo-public.oss-cn-hangzhou.aliyuncs.com/fun/examples/R-3.5.2.tar.gz | tar -zxf -;
      cd R-3.5.2 ; 
      ./configure --prefix=/code/.fun/R/ --enable-R-shlib --with-blas --with-lapack ; 
      make ; 
      make install;
    env: 
      LD_LIBRARY: testLD_LIBRARY
`;

const funfileContent = `RUNTIME python3
WORKDIR /code
RUN fun-install apt-get install local-test -t .fun/nas/auto/apt
RUN fun-install pip install testPipTarget -t .fun/nas/auto/pip
RUN apt-get install local-package
RUN fun-install apt-get install libzbar0
COPY . /code
RUN cd /code/.fun/root/usr/lib && ln -sf libzbar.so.0.2.0 libzbar.so
RUN PATH=testpath:$PATH TESTENV=testenv fun-install pip install Pillow
RUN fun-install pip install pyzbar
RUN LD_LIBRARY=testLD_LIBRARY apt-get build-dep -y r-base; \\
  LD_LIBRARY=testLD_LIBRARY curl -L https://fc-demo-public.oss-cn-hangzhou.aliyuncs.com/fun/examples/R-3.5.2.tar.gz | tar -zxf -; \\
  LD_LIBRARY=testLD_LIBRARY cd R-3.5.2 ;  \\
  LD_LIBRARY=testLD_LIBRARY ./configure --prefix=/code/.fun/R/ --enable-R-shlib --with-blas --with-lapack ;  \\
  LD_LIBRARY=testLD_LIBRARY make ;  \\
  LD_LIBRARY=testLD_LIBRARY make install;`;

const dockerfileContent = `WORKDIR /code
RUN fun-install apt-get install local-test -t .fun/nas/auto/apt
RUN fun-install pip install testPipTarget -t .fun/nas/auto/pip
RUN apt-get install local-package
RUN fun-install apt-get install libzbar0
COPY . /code
RUN cd /code/.fun/root/usr/lib && ln -sf libzbar.so.0.2.0 libzbar.so
RUN PATH=testpath:$PATH TESTENV=testenv fun-install pip install Pillow
RUN fun-install pip install pyzbar
RUN LD_LIBRARY=testLD_LIBRARY apt-get build-dep -y r-base; \\
  LD_LIBRARY=testLD_LIBRARY curl -L https://fc-demo-public.oss-cn-hangzhou.aliyuncs.com/fun/examples/R-3.5.2.tar.gz | tar -zxf -; \\
  LD_LIBRARY=testLD_LIBRARY cd R-3.5.2 ;  \\
  LD_LIBRARY=testLD_LIBRARY ./configure --prefix=/code/.fun/R/ --enable-R-shlib --with-blas --with-lapack ;  \\
  LD_LIBRARY=testLD_LIBRARY make ;  \\
  LD_LIBRARY=testLD_LIBRARY make install;`;

const dockerHubDockerfileContent = `FROM aliyunfc/runtime-python3.6:build-${dockerOpts.IMAGE_VERSION}
${dockerfileContent}`;


const aliregistryDockerfileContent = `FROM registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python3.6:build-${dockerOpts.IMAGE_VERSION}
${dockerfileContent}`;


describe('test funymlToFunfile', () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test funymlToFunfile', async function () {
    sandbox.stub(fs, 'readFileSync').returns(funymlContent);

    const funFile = await parser.funymlToFunfile('path');

    expect(funFile).to.equal(funfileContent);
  });
});

describe('test funfileToDockerfile', () => {

  beforeEach(() => {
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test funfileToDockerfile', async function () {
    sandbox.stub(dockerOpts, 'resolveImageNameForPull').resolves(`aliyunfc/runtime-python3.6:build-${dockerOpts.IMAGE_VERSION}`);
    sandbox.stub(fs, 'readFile').returns(funfileContent);

    const dockerfile = await parser.funfileToDockerfile('path');
    expect(dockerfile).to.equal(dockerHubDockerfileContent);
  });

  it('test funfileToDockerfile for aliregistry', async function () {
    sandbox.stub(dockerOpts, 'resolveImageNameForPull').resolves(`registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python3.6:build-${dockerOpts.IMAGE_VERSION}`);
    sandbox.stub(fs, 'readFile').returns(funfileContent);

    const dockerfile = await parser.funfileToDockerfile('path');
    expect(dockerfile).to.equal(aliregistryDockerfileContent);
  });
});